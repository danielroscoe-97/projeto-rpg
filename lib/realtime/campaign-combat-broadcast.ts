/**
 * Campaign-channel combat broadcasts — Wave 3a Story C4 companion.
 *
 * The Mestre's `CombatSessionClient` already broadcasts every combat
 * event on its own `session:${sessionId}` channel (sanitized by
 * `lib/realtime/broadcast.ts`). Wave 3a adds a SECOND, narrow set of
 * notifications on the consolidated `campaign:${campaignId}` channel so
 * any listener in the campaign — `useCampaignCombatState` in HeroiTab,
 * the Briefing widget on the campaign HQ, future Watch mode — can know
 * when combat starts / ends without having to discover and subscribe to
 * a per-session channel each time.
 *
 * ## Why a separate module
 *
 * `lib/realtime/broadcast.ts` is locked to the single-sender, single-
 * topic invariant for the existing combat events. We don't want to fold
 * campaign-channel sends into that pipeline because:
 *   1. The 200-channel cap (CDC pool postmortem 2026-04-24) means we
 *      reuse the EXISTING `campaign:${id}` channel that
 *      `subscribeToCampaignMembers` and `player-identity-upgraded` already
 *      manage. Mixing those into the broadcast singleton would entangle
 *      sanitization rules.
 *   2. These broadcasts are best-effort notifications, not the
 *      authoritative event stream. The `session:${id}` topic remains the
 *      source of truth for the in-combat client; the campaign mirror is
 *      a "go check the combat" hint.
 *
 * ## Lifecycle
 *
 * - `broadcastCombatStarted` is called once after the Mestre clicks
 *   "Iniciar Combate" — right after the existing `session:state_sync`
 *   broadcast in `handleStartCombat`.
 * - `broadcastCombatEnded` is called once during `handleEndEncounter`,
 *   after the Mestre confirms the end-combat dialog and right before
 *   `doEndEncounter` flips `encounters.is_active = false`.
 * - `broadcastCombatTurnAdvanceMirror` is fired alongside the existing
 *   `combat:turn_advance` broadcast so HeroiTab in another tab/device
 *   gets live "round / current turn / next turn" without subscribing to
 *   the session channel.
 *
 * Each function creates a transient channel, sends, and removes — same
 * pattern as `broadcastIdentityUpgraded` in `lib/supabase/player-identity.ts`.
 * Channels created here never count against the persistent 200-channel
 * subscriber cap because they're sub/send/unsub in <200ms.
 */

import { createClient } from "@/lib/supabase/client";
import { captureWarning } from "@/lib/errors/capture";
import type { PostCombatSnapshot } from "@/lib/hooks/usePostCombatState";

/**
 * Payload for `combat:started` on `campaign:${id}`.
 *
 * Snake-case keys to mirror the broadcast convention in
 * `lib/types/realtime.ts` (turn_advance + state_sync + hp_update all use
 * snake_case). Keeps the payload immediately compatible with the player-
 * facing event handlers without a translation layer.
 */
export interface CampaignCombatStartedPayload {
  type: "combat:started";
  combat_id: string;
  session_id: string;
  round: number;
  current_turn?: { combatant_id: string; name: string };
  next_turn?: { combatant_id: string; name: string };
}

export interface CampaignCombatEndedPayload {
  type: "combat:ended";
  combat_id: string;
  session_id: string;
  /**
   * Per-player snapshot used by `usePostCombatState.recordCombatEnded`.
   * Optional because the Mestre may end combat before per-player
   * snapshots can be assembled (rare; a player who reconnects in that
   * window misses the modal but `combat_active` still flips off).
   */
  snapshot?: PostCombatSnapshot;
}

export interface CampaignTurnAdvanceMirrorPayload {
  type: "combat:turn_advance";
  combat_id: string;
  session_id: string;
  round_number: number;
  current_turn_index: number;
  current_combatant_id?: string;
  current_combatant_name?: string;
  next_combatant_id?: string;
  next_combatant_name?: string;
}

type Payload =
  | CampaignCombatStartedPayload
  | CampaignCombatEndedPayload
  | CampaignTurnAdvanceMirrorPayload;

/**
 * Defer-cleanup window for transient broadcast channels.
 *
 * Issue #90 P2-5: When the subscribe race resolves via timeout (1500ms
 * ceiling) instead of via the SUBSCRIBED status callback, `channel.send`
 * lands on a still-joining channel. realtime-js queues the payload until
 * the join handshake completes. If we then `removeChannel` synchronously
 * inside `finally`, the queued message can be dropped before delivery —
 * receivers never see the broadcast.
 *
 * Defense in depth:
 *  1. We `await` the send Promise so realtime-js can flush the queue
 *     onto the wire before the timeout race resolves cleanup.
 *  2. We delay `removeChannel` by `CLEANUP_DELAY_MS` so the broker has
 *     a tail window to ship any in-flight WebSocket frame before we
 *     tear the channel down. 100ms covers typical RTTs by an order of
 *     magnitude without holding the channel slot long enough to
 *     pressure the 200-channel cap (postmortem 2026-04-24): even at
 *     5 broadcasts/second the steady-state outstanding count stays
 *     <1 (5 × 0.1s).
 *  3. Receivers are also protected by HeroiTab's persistent
 *     `campaign:${id}` subscription + the 30s polling fallback in
 *     `useCampaignCombatState`. This module's job is only to MINIMIZE
 *     drop windows, not to guarantee delivery; the polling fallback is
 *     the authoritative recovery path on packet loss.
 */
const CLEANUP_DELAY_MS = 100;

async function send(campaignId: string, payload: Payload): Promise<void> {
  if (!campaignId) return;
  const supabase = createClient();
  const channel = supabase.channel(`campaign:${campaignId}`);
  let subscribed = false;
  try {
    // Subscribe to put the channel in the `joined` state required by
    // `send`. We don't await the subscribe explicitly — Supabase queues
    // outbound messages until `SUBSCRIBED`, so a single `await` on
    // `channel.send` is enough on the happy path. If the subscribe is
    // still pending after the send timeout, the catch below silences it
    // (best-effort guarantee documented above).
    subscribed = await new Promise<boolean>((resolve) => {
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") resolve(true);
      });
      // Hard ceiling so a wedged broker doesn't block the Mestre's UI.
      setTimeout(() => resolve(false), 1500);
    });
    // P2-5: AWAIT the send (don't just race against a timeout) so
    // realtime-js flushes the message onto the wire before the cleanup
    // delay starts ticking. The Promise.race still bounds us against a
    // wedged send (e.g. WS frame stuck behind a stalled queue).
    const result = await Promise.race([
      channel.send({ type: "broadcast", event: payload.type, payload }),
      new Promise<"timed out">((resolve) => setTimeout(() => resolve("timed out"), 2000)),
    ]);
    if (result === "error" || result === "timed out") {
      captureWarning("Campaign combat broadcast send failed", {
        component: "campaign-combat-broadcast",
        category: "realtime",
        extra: {
          campaignId,
          type: payload.type,
          result,
          subscribed,
        },
      });
    }
  } catch (err) {
    captureWarning("Campaign combat broadcast threw", {
      component: "campaign-combat-broadcast",
      category: "realtime",
      extra: { campaignId, type: payload.type, error: String(err) },
    });
  } finally {
    // P2-5: defer cleanup so any in-flight frame can land before the
    // channel is torn down. Same pattern as `broadcastIdentityUpgraded`
    // in `lib/supabase/player-identity.ts`, but with the explicit delay
    // documented above. We swallow errors because the channel may have
    // already been recycled by Supabase's internal disconnect handling.
    setTimeout(() => {
      void (async () => {
        try {
          await supabase.removeChannel(channel);
        } catch {
          /* best-effort */
        }
      })();
    }, CLEANUP_DELAY_MS);
  }
}

export function broadcastCombatStarted(
  campaignId: string | null | undefined,
  payload: Omit<CampaignCombatStartedPayload, "type">,
): void {
  if (!campaignId) return; // Quick Combat sessions skip — no campaign listeners.
  void send(campaignId, { type: "combat:started", ...payload });
}

export function broadcastCombatEnded(
  campaignId: string | null | undefined,
  payload: Omit<CampaignCombatEndedPayload, "type">,
): void {
  if (!campaignId) return;
  void send(campaignId, { type: "combat:ended", ...payload });
}

export function broadcastCombatTurnAdvanceMirror(
  campaignId: string | null | undefined,
  payload: Omit<CampaignTurnAdvanceMirrorPayload, "type">,
): void {
  if (!campaignId) return;
  void send(campaignId, { type: "combat:turn_advance", ...payload });
}
