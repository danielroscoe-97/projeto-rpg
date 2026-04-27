"use client";

/**
 * useCampaignCombatState — Wave 3a Story C4.
 *
 * Tracks whether a combat is currently active for the player's campaign,
 * exposing the round number + current/next turn names so HeroiTab can
 * surface the CombatBanner (C5) and the in-ribbon "Entrar no Combate →"
 * CTA (C1).
 *
 * ## Channel strategy
 *
 * Subscribes to the **consolidated** `campaign:${campaignId}` channel
 * (per `project_realtime_rate_limit_root_cause` memory + Wave 3 kickoff
 * §C4). We do NOT create a per-combat channel — the 200-channel cap and
 * CDC pool exhaustion postmortem (2026-04-24) burned that lesson in.
 *
 * Three events are observed:
 *
 *   `combat:started`      — `{ round, currentTurn, nextTurn?, combatId }`
 *   `combat:ended`        — `{ combatId, snapshot? }`
 *   `combat:turn_advance` — replays the same payload Mestre broadcasts on
 *                           `session:${id}` (round + current_turn_index +
 *                           next_combatant_id). Used for live updates
 *                           after `combat:started` lands.
 *
 * `combat:started` and `combat:ended` are emitted by `CombatSessionClient`
 * (companion commit) on the `campaign:${id}` channel exactly once per
 * combat. `combat:turn_advance` is mirrored from the Mestre's broadcast
 * pipeline on the same channel (so this hook never has to know which
 * `session:${id}` topic to attach to).
 *
 * ## Polling fallback
 *
 * If no realtime event arrives for `POLL_FALLBACK_THRESHOLD_MS` we poll
 * the DB directly: `encounters.is_active = true` joined to a session in
 * the player's campaign. Polling stops the moment realtime resumes. The
 * fallback exists for the worst-case scenario where the campaign channel
 * is gone (broker outage, ceiling hit) but the player still has DB access
 * via the standard `useCharacterStatus` flow.
 *
 * ## Combat-ended handoff (Story A6)
 *
 * Optional `onCombatEnded(snapshot)` callback fires synchronously on the
 * `combat:ended` event. HeroiTab passes
 * `(snap) => recordCombatEnded(snap)` so the post-combat modal hydrates
 * from the same broadcast payload. The hook does NOT mount the modal
 * itself — that stays in the consumer.
 *
 * ## Cleanup
 *
 * The Supabase channel is removed on unmount via `supabase.removeChannel`
 * (the canonical "drop from registry" path — see `lib/realtime/broadcast.ts`
 * for why bare `unsubscribe` leaks). Fallback timers are cleared in the
 * same effect return so an unmount mid-poll never leaves a setTimeout
 * pointing at a freed component.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PostCombatSnapshot } from "./usePostCombatState";

/** When >X ms passed without any realtime event for this campaign, fall
 *  back to polling. 30s matches the spec §C4 NFR. */
const POLL_FALLBACK_THRESHOLD_MS = 30_000;
/** Polling interval once the fallback engages. 10s matches spec §C4. */
const POLL_INTERVAL_MS = 10_000;

export interface CampaignCombatTurn {
  /** Combatant DB id (matches `combatants.id`). */
  combatantId: string;
  /** Display name — already sanitized DM-side per spec §3 anti-metagaming. */
  name: string;
}

export interface CampaignCombatState {
  /** Active combat detected for this campaign. */
  active: boolean;
  /** Round number. Undefined when `active === false`. */
  round?: number;
  /** Whose turn it is right now. */
  currentTurn?: CampaignCombatTurn;
  /** Whose turn comes next (when known). */
  nextTurn?: CampaignCombatTurn;
  /** Encounter id for the in-flight combat — used to build navigation. */
  combatId?: string;
  /** Session id for the in-flight combat — same encounter, different ID space. */
  sessionId?: string;
}

export interface UseCampaignCombatStateOptions {
  /** Required — the campaign whose combats we want to observe. */
  campaignId: string;
  /** Player's character id, used to filter combat events that belong to
   *  the player's party. Currently unused by the realtime path (broadcast
   *  is campaign-scoped) but kept in the signature so polling can scope
   *  to encounters where this character is a combatant. */
  characterId?: string;
  /**
   * Fired synchronously when `combat:ended` is observed (whether via
   * broadcast or polling transition). HeroiTab uses this to bridge into
   * `usePostCombatState.recordCombatEnded`.
   */
  onCombatEnded?: (snapshot: PostCombatSnapshot) => void;
  /** Disable the hook entirely (handy for tests). */
  enabled?: boolean;
}

const EMPTY: CampaignCombatState = { active: false };

/**
 * Internal: parse a `combat:turn_advance` payload broadcast on the
 * campaign channel. The Mestre re-broadcasts the same shape it sends on
 * `session:${id}`, but the campaign-channel mirror also enriches it
 * with `current_combatant_name` + `next_combatant_name` so this hook
 * doesn't need a `combatants` lookup of its own (which would cost an
 * extra Supabase RPC per turn change).
 */
interface TurnAdvancePayload {
  type: "combat:turn_advance";
  round_number: number;
  current_turn_index: number;
  current_combatant_id?: string;
  current_combatant_name?: string;
  next_combatant_id?: string;
  next_combatant_name?: string;
  combat_id?: string;
  session_id?: string;
}

interface CombatStartedPayload {
  type: "combat:started";
  round: number;
  combat_id: string;
  session_id: string;
  current_turn?: { combatant_id: string; name: string };
  next_turn?: { combatant_id: string; name: string };
}

interface CombatEndedPayload {
  type: "combat:ended";
  combat_id: string;
  session_id: string;
  /** Snapshot of the player's post-combat state, used by usePostCombatState
   *  in the consumer. The Mestre side computes one snapshot per player and
   *  scopes the broadcast accordingly; this hook receives whatever payload
   *  arrived (snapshots are filtered DM-side). */
  snapshot?: PostCombatSnapshot;
}

export function useCampaignCombatState(
  options: UseCampaignCombatStateOptions,
): CampaignCombatState {
  const { campaignId, characterId, onCombatEnded, enabled = true } = options;

  const [state, setState] = useState<CampaignCombatState>(EMPTY);

  // Stable ref so the realtime callback doesn't capture a stale handler.
  const onCombatEndedRef = useRef(onCombatEnded);
  onCombatEndedRef.current = onCombatEnded;

  // `lastEventAt` powers the polling fallback. Updated on every realtime
  // event we observe for this campaign — even unrelated ones don't hurt
  // because their presence proves the channel is alive.
  const lastEventAtRef = useRef<number>(Date.now());

  // Public state setter wrapper — also bumps `lastEventAt` so polling
  // can quiesce as soon as realtime resumes.
  const noteEvent = useCallback(() => {
    lastEventAtRef.current = Date.now();
  }, []);

  // ── Realtime subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !campaignId) return;
    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`campaign:${campaignId}`);

    channel.on("broadcast", { event: "combat:started" }, ({ payload }: { payload: CombatStartedPayload }) => {
      noteEvent();
      setState({
        active: true,
        round: payload.round,
        combatId: payload.combat_id,
        sessionId: payload.session_id,
        currentTurn: payload.current_turn
          ? { combatantId: payload.current_turn.combatant_id, name: payload.current_turn.name }
          : undefined,
        nextTurn: payload.next_turn
          ? { combatantId: payload.next_turn.combatant_id, name: payload.next_turn.name }
          : undefined,
      });
    });

    channel.on("broadcast", { event: "combat:ended" }, ({ payload }: { payload: CombatEndedPayload }) => {
      noteEvent();
      // Bridge to A6 if a snapshot is present — caller decides what to
      // do with it (HeroiTab → recordCombatEnded). Defensive nullish so
      // a Mestre that didn't ship a snapshot still triggers reset.
      if (payload.snapshot && onCombatEndedRef.current) {
        try {
          onCombatEndedRef.current(payload.snapshot);
        } catch {
          // Snapshot delivery is best-effort — never let a consumer
          // exception nuke the state transition.
        }
      }
      setState(EMPTY);
    });

    channel.on("broadcast", { event: "combat:turn_advance" }, ({ payload }: { payload: TurnAdvancePayload }) => {
      noteEvent();
      setState((prev) => {
        // Ignore turn_advance arriving before combat:started (race on
        // first connect): we don't have a combat_id yet so the resulting
        // state would be partial.
        if (!prev.active && !payload.combat_id) return prev;
        return {
          active: true,
          round: payload.round_number,
          combatId: payload.combat_id ?? prev.combatId,
          sessionId: payload.session_id ?? prev.sessionId,
          currentTurn: payload.current_combatant_id && payload.current_combatant_name
            ? { combatantId: payload.current_combatant_id, name: payload.current_combatant_name }
            : prev.currentTurn,
          nextTurn: payload.next_combatant_id && payload.next_combatant_name
            ? { combatantId: payload.next_combatant_id, name: payload.next_combatant_name }
            : prev.nextTurn,
        };
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Subscribed = channel is alive even before the first event.
        noteEvent();
      }
      // CLOSED / CHANNEL_ERROR / TIMED_OUT: leave `lastEventAt` untouched
      // so the polling fallback engages on its normal threshold.
    });

    return () => {
      // `removeChannel` (not bare `unsubscribe`) so the client registry
      // drops the instance — same rationale as `lib/realtime/broadcast.ts`.
      supabase.removeChannel(channel);
    };
  }, [campaignId, enabled, noteEvent]);

  // ── Polling fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !campaignId) return;

    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      const sinceLast = Date.now() - lastEventAtRef.current;
      if (sinceLast < POLL_FALLBACK_THRESHOLD_MS) {
        // Realtime is healthy — quiesce. Re-arm at the threshold so we
        // catch the next outage without a constant interval running.
        timer = setTimeout(tick, POLL_FALLBACK_THRESHOLD_MS - sinceLast + 100);
        return;
      }

      try {
        // Find the active encounter for this campaign. We use a single
        // RPC-style query rather than 2 round-trips: sessions in the
        // campaign joined to encounters where `is_active = true`. The
        // !inner join filter relies on the existing `session_id`
        // foreign key + RLS in the encounters table.
        const { data, error } = await supabase
          .from("encounters")
          .select("id, session_id, round_number, current_turn_index, sessions!inner(campaign_id)")
          .eq("is_active", true)
          .eq("sessions.campaign_id", campaignId)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data) {
          // No active encounter — make sure state reflects that.
          setState((prev) => (prev.active ? EMPTY : prev));
        } else {
          setState((prev) => ({
            active: true,
            round: data.round_number,
            combatId: data.id,
            sessionId: data.session_id,
            currentTurn: prev.currentTurn,
            nextTurn: prev.nextTurn,
          }));
        }
      } catch {
        // Polling is best-effort. Errors are silent because the realtime
        // path is the primary signal; a transient DB blip would otherwise
        // spam the toast layer.
      }

      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_FALLBACK_THRESHOLD_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // characterId currently unused by polling but kept in deps so a
    // future "scope to my-character encounters" refinement re-runs the
    // effect when it changes.
  }, [campaignId, characterId, enabled]);

  return state;
}
