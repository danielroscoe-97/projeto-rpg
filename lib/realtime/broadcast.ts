import { createClient } from "@/lib/supabase/client";
import { REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from "@supabase/supabase-js";
import { transitionTo, getConnectionState } from "./connection-state";
import type {
  RealtimeEvent,
  SanitizedEvent,
  SanitizedCombatant,
  SanitizedCombatantAdd,
  SanitizedCombatantAddReorder,
  SanitizedStateSync,
  SanitizedInitiativeReorder,
  SanitizedPlayerHpUpdate,
  SanitizedMonsterHpUpdate,
  SanitizedStatsUpdate,
} from "@/lib/types/realtime";
import type { Combatant } from "@/lib/types/combat";
import { getHpStatus, getHpPercentage } from "@/lib/utils/hp-status";
import { captureError, captureWarning } from "@/lib/errors/capture";
import {
  enqueueAction,
  getSyncStatus,
  setSyncStatus,
  replayQueue,
} from "@/lib/realtime/offline-queue";
import { broadcastViaServer } from "@/lib/realtime/broadcast-server";

let channel: RealtimeChannel | null = null;
let currentSessionId: string | null = null;

/** Monotonically increasing sequence number for broadcast ordering.
 *  Players can use this to detect and discard stale/out-of-order events. */
let _broadcastSeq = 0;
export function getBroadcastSeq(): number { return _broadcastSeq; }

/** Promise that resolves when the current DM channel is subscribed. */
let channelReady: Promise<void> | null = null;

/** Pending deferred cleanup timer. See `scheduleDmChannelCleanup`.
 *  A new consumer calling `getDmChannel` cancels a pending cleanup so the
 *  existing (SUBSCRIBED) channel is reused instead of being torn down and
 *  immediately recreated — which races phx_leave against phx_join on the
 *  same topic and is a reliable way to get TIMED_OUT on the new subscribe. */
let pendingCleanupTimer: ReturnType<typeof setTimeout> | null = null;

/** Auto-reconnect timer for subscribe failures. See `createAndSubscribe`. */
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
/** Exponential backoff state for subscribe retries. Reset on SUBSCRIBED. */
let reconnectBackoffMs = 1_000;
/** Subscribe-retry attempt counter. Reset on SUBSCRIBED. When it hits the
 *  ceiling we stop retrying to avoid a zombie loop hammering the broker
 *  (R2 — Beta #4 postmortem 2026-04-24). */
let reconnectAttempts = 0;
const RECONNECT_ATTEMPTS_CEILING = 15;

/** Grace window between component unmount and actual channel teardown.
 *  Sized to absorb router.replace remounts (`/app/combat/new → /app/combat/[id]`)
 *  which consistently finish well under a second. Tuned conservatively because
 *  a longer grace is cheap (channel sits subscribed a bit longer) while a
 *  shorter grace risks racing the fresh mount. */
const UNMOUNT_CLEANUP_GRACE_MS = 2_000;

/** Subscribe timeout in ms. Longer than realtime-js's 10s default because
 *  the DM client multiplexes presence + session + campaign-invite channels on
 *  one WebSocket and phx_join can queue behind them. Player-side uses the
 *  same tolerance (PlayerJoinClient reconnect logic triggers at the same
 *  time scale). */
const SUBSCRIBE_TIMEOUT_MS = 30_000;

/** Subscribe retry ceiling. Doubles each failure until it hits this. Caps the
 *  worst-case retry interval so the DM recovers automatically once the
 *  underlying realtime issue clears. Mirrors the player-side ceiling. */
const RECONNECT_BACKOFF_CEILING_MS = 30_000;

/** Initial backoff for the first subscribe failure. */
const RECONNECT_BACKOFF_INITIAL_MS = 1_000;

/** Shared teardown for both `cleanupDmChannel` (immediate) and the deferred
 *  path. Resets every piece of module-level state so a subsequent
 *  `getDmChannel` call starts from a clean slate. */
function teardownChannel(): void {
  if (pendingCleanupTimer) {
    clearTimeout(pendingCleanupTimer);
    pendingCleanupTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS;
  reconnectAttempts = 0;
  if (channel) {
    const supabase = createClient();
    supabase.removeChannel(channel);
  }
  channel = null;
  currentSessionId = null;
  channelReady = null;
}

/** Get or create the DM broadcast channel for a session.
 *  Recreates the channel when the session ID changes (guards stale singleton).
 *  Also recreates when the existing channel was externally removed/closed
 *  (e.g. by EncounterSetup calling supabase.removeChannel).
 *
 *  On subscribe failure (TIMED_OUT / CHANNEL_ERROR), schedules an automatic
 *  reconnect with exponential backoff. Consumers get a channel instance back
 *  immediately so they can attach listeners; those listeners will be replayed
 *  onto the reconnected channel IF they were registered via `onDmChannel`. */
export function getDmChannel(sessionId: string): RealtimeChannel {
  // A consumer wants the channel — cancel any scheduled cleanup from a
  // previous unmount. Critical for the `/app/combat/new → /app/combat/[id]`
  // router.replace transition: the old CombatSessionClient unmounts and
  // the new one mounts back-to-back on the SAME session id; preserving the
  // live channel avoids the subscribe/unsubscribe race on Supabase Realtime.
  if (pendingCleanupTimer) {
    clearTimeout(pendingCleanupTimer);
    pendingCleanupTimer = null;
  }

  const supabase = createClient();

  if (channel && currentSessionId === sessionId) {
    // Guard against stale channel that was removed externally
    const state = (channel as unknown as { state: string }).state;
    if (state !== "closed" && state !== "leaving" && state !== "errored") {
      return channel;
    }
    // Channel is dead — fully remove it from the realtime client's registry
    // (supabase.removeChannel does leave + drop from the client.channels
    // array; plain channel.unsubscribe leaves the errored instance sitting
    // in the registry and starves the fresh subscribe of its server-side
    // slot, which surfaces as a back-to-back TIMED_OUT loop).
    console.warn("[broadcast] DM channel was in stale state:", state, "— recreating");
    supabase.removeChannel(channel);
    channel = null;
    currentSessionId = null;
    channelReady = null;
  }
  // Session changed — fully remove the old channel before creating a new one,
  // and reset backoff so the new session's first retry doesn't start mid-curve.
  if (channel && currentSessionId !== sessionId) {
    supabase.removeChannel(channel);
    channel = null;
    currentSessionId = null;
    channelReady = null;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS;
    reconnectAttempts = 0;
  }

  createAndSubscribe(sessionId);
  return channel!;
}

/** Internal: create a fresh channel instance for `sessionId`, subscribe, and
 *  schedule a retry on failure. Factored out so the retry path can re-enter
 *  without duplicating the create+subscribe logic. */
function createAndSubscribe(sessionId: string): void {
  const supabase = createClient();
  const fresh = supabase.channel(`session:${sessionId}`, {
    config: { broadcast: { self: false } },
  });

  channel = fresh;
  currentSessionId = sessionId;
  // CR-01: emit connecting transition before subscribe. `attempt` is the
  // logical attempt number (1-based); `reconnectAttempts` holds the count
  // of prior failures.
  transitionTo({
    kind: "connecting",
    attempt: reconnectAttempts + 1,
    since: Date.now(),
  });
  // P-8: realtime-js can emit TIMED_OUT then CHANNEL_ERROR (or vice-versa)
  // in cascade failures. Without this guard the attempt counter would
  // double-increment per real failure and trip the ceiling in ~7 failures
  // instead of 15.
  let errorHandledForThisLifecycle = false;
  channelReady = new Promise<void>((resolve) => {
    fresh.subscribe((status: REALTIME_SUBSCRIBE_STATES | string, err?: Error) => {
      if (status === "SUBSCRIBED") {
        reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS; // reset on success
        reconnectAttempts = 0;
        errorHandledForThisLifecycle = false;
        // P-3: restore sync status if a prior ceiling-hit marked us offline.
        // Caller surfaces (useCombatResilience, sync indicator) observe this.
        if (getSyncStatus() === "offline") setSyncStatus("online");
        // CR-01: emit connected transition. currentSeq reflects the latest
        // broadcast seq at subscribe time — consumers (useEventResume in
        // CR-03) compare with their last-seen seq to detect a gap.
        transitionTo({
          kind: "connected",
          subscribedAt: Date.now(),
          currentSeq: _broadcastSeq,
        });
        resolve();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (errorHandledForThisLifecycle) return;
        errorHandledForThisLifecycle = true;
        // P-7: report the attempt number for THIS failure (post-increment),
        // not the pre-increment count — otherwise the first error logs `0`.
        const nextAttempt = reconnectAttempts + 1;
        captureError(err ?? new Error(`Channel ${status} for session ${sessionId}`), {
          component: "broadcast",
          action: "subscribe",
          category: "realtime",
          sessionId,
          extra: { reconnectAttempts: nextAttempt },
        });
        // Auto-reconnect with exponential backoff — mirror of the
        // player-side pattern in PlayerJoinClient. Guards:
        //   1. Only retry if we're still on the same session (avoid stomping
        //      a session change or an explicit cleanup).
        //   2. Only retry if `channel` still points at THIS instance — a
        //      parallel reclaim may have replaced it already.
        //   3. Cap total attempts (R2 — Beta #4 postmortem 2026-04-24) so
        //      a broker-wide outage doesn't turn into an infinite retry
        //      loop that hammers the edge once capacity returns.
        //   4. On ceiling hit, surface "offline" so sync indicators warn
        //      the DM — previously `resolve()` pretended everything was
        //      fine and DM kept broadcasting into the void (P-3).
        if (nextAttempt > RECONNECT_ATTEMPTS_CEILING) {
          captureError(new Error(`Broadcast reconnect ceiling hit (${RECONNECT_ATTEMPTS_CEILING})`), {
            component: "broadcast",
            action: "subscribe_ceiling",
            category: "realtime",
            sessionId,
          });
          setSyncStatus("offline");
          // CR-01 + F5: distinguish ceiling cause. `navigator.onLine === false`
          // means the OS network stack reports offline (Wi-Fi off, plane mode);
          // anything else after burning the budget is a broker-side issue
          // (Supabase outage, DNS, CDN). Tagging the reason lets the dashboard
          // (Estabilidade Combate) split the metric — different remediation:
          //   - network_offline → user fixes their network, no action needed
          //   - broker_down → page DM, escalate, check Supabase status
          const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
          transitionTo({
            kind: "degraded",
            reason: isOffline ? "network_offline" : "broker_down",
            since: Date.now(),
          });
          resolve();
          return;
        }
        reconnectAttempts = nextAttempt;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        const base = Math.min(reconnectBackoffMs, RECONNECT_BACKOFF_CEILING_MS);
        // R2: jitter [0, 500ms) to decorrelate reconnect storms across
        // many clients returning at once after a broker blip.
        // P-5: clamp the total delay to the advertised ceiling so existing
        // tests that advance timers by exactly 30_000ms don't flake when
        // jitter lands near the top of its range.
        const jitter = Math.random() * 500;
        const delay = Math.min(base + jitter, RECONNECT_BACKOFF_CEILING_MS);
        reconnectBackoffMs = Math.min(base * 2, RECONNECT_BACKOFF_CEILING_MS);
        // CR-01: emit reconnecting transition. Skeleton UI in
        // PlayerJoinClient (CR-03) reacts to this after a 500ms debounce.
        transitionTo({
          kind: "reconnecting",
          attempt: nextAttempt,
          since: Date.now(),
          backoffMs: delay,
        });
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (currentSessionId === sessionId && channel === fresh) {
            // Tear down the errored instance and start fresh.
            const sb = createClient();
            sb.removeChannel(fresh);
            createAndSubscribe(sessionId);
          }
        }, delay);
        resolve(); // Don't hang callers waiting on channelReady.
      }
    }, SUBSCRIBE_TIMEOUT_MS);
  });
}

/** Wait for the DM channel to be subscribed. Resolves immediately if already subscribed. */
export function waitForChannel(): Promise<void> {
  return channelReady ?? Promise.resolve();
}

/** Invalidate the DM channel singleton so the next getDmChannel call recreates it.
 *  Call this when the channel has been externally removed (e.g. via supabase.removeChannel).
 *  NOTE: EncounterSetup no longer calls this — it now uses the singleton via
 *  getDmChannel directly, avoiding the two-channels-same-topic race that caused
 *  CHANNEL_ERROR / TIMED_OUT on player late-join broadcasts. */
export function resetDmChannel(): void {
  if (pendingCleanupTimer) {
    clearTimeout(pendingCleanupTimer);
    pendingCleanupTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS;
  reconnectAttempts = 0;
  channel = null;
  currentSessionId = null;
  channelReady = null;
  // CR-01: emit the walk-down after the actual reset so listeners observing
  // the final "idle" state see a consistent module. Walk closed → idle so
  // consumers can distinguish "we tore down" (closed) from "we're ready for
  // a new connect" (idle). Redundant same-state transitions are no-ops
  // in the state machine (via invalid-transition warning + ignore).
  transitionTo({ kind: "closed" });
  transitionTo({ kind: "idle" });
}

/** Sanitize a full combatant for player broadcast.
 *  Strips DM notes and applies display_name anti-metagaming.
 *  Legendary action counts flow through (decision 2026-04-23 — party visibility). */
function sanitizeCombatant(c: Combatant): SanitizedCombatant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit DM-only fields + internal IDs
  const { dm_notes, display_name, session_token_id: _stid, ...base } = c;

  if (c.is_player) {
    // Players: keep all stats, just strip dm_notes and display_name
    return {
      ...base,
      current_hp: c.current_hp,
      max_hp: c.max_hp,
      temp_hp: c.temp_hp,
      ac: c.ac,
      spell_save_dc: c.spell_save_dc,
    };
  }

  // Monsters/NPCs: strip exact stats, add hp_status
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit sensitive fields
  const { current_hp, max_hp, temp_hp, ac, spell_save_dc, ...safe } = base;

  // P-6 (Beta #4 review): trim before truthy-check so a whitespace-only
  // alias ("   ") doesn't render as a blank row to players.
  const trimmedDisplayName = typeof display_name === "string" ? display_name.trim() : "";
  const result: SanitizedCombatant = {
    ...safe,
    // Apply display_name as the visible name (anti-metagaming)
    name: trimmedDisplayName || base.name,
    hp_status: getHpStatus(c.current_hp, c.max_hp),
    hp_percentage: getHpPercentage(c.current_hp, c.max_hp),
  };

  return result;
}

/** Validate required fields exist on a sanitized event before broadcast. */
function validateEvent(event: SanitizedEvent): boolean {
  if (!event.type) {
    captureWarning("Broadcast event missing type field", {
      component: "broadcast",
      category: "realtime",
      extra: { event },
    });
    return false;
  }
  return true;
}

/** Sanitize a DM event for player-safe broadcast.
 *  Removes sensitive data and returns a properly typed SanitizedEvent.
 *  Returns null when the event should be suppressed entirely (e.g. hidden combatant_add). */
function sanitizePayload(event: RealtimeEvent): SanitizedEvent | null {
  // Audio and weather events pass through unchanged — no sensitive data (no monster stats/HP)
  if (event.type === "audio:play_sound") return event;
  if (event.type === "session:weather_change") return event;

  // Combat stats pass through unchanged — aggregated data, no sensitive fields
  if (event.type === "session:combat_stats") return event;

  // session:ended passes through — no sensitive data (A.3)
  if (event.type === "session:ended") return event;

  // session:poll_results passes through — aggregate data only, no player names (C.15-B)
  if (event.type === "session:poll_results") return event;

  // Turn advance: adjust the turn index for the player-visible combatant list
  if (event.type === "combat:turn_advance") {
    return {
      ...event,
      current_turn_index: adjustTurnIndexForPlayers(event.current_turn_index),
    };
  }

  if (event.type === "combat:combatant_add") {
    // Never broadcast hidden combatants to players
    if (event.combatant.is_hidden) {
      return null;
    }
    const result: SanitizedCombatantAdd = {
      type: event.type,
      combatant: sanitizeCombatant(event.combatant),
    };
    return result;
  }

  // S1.2: combat:combatant_add_reorder — single atomic broadcast replacing
  // the legacy combatant_add + state_sync pair.
  if (event.type === "combat:combatant_add_reorder") {
    // Suppress entirely if the new combatant is hidden from players.
    if (event.combatant.is_hidden) {
      return null;
    }
    // B-2 FIX: initiative_map may reference hidden combatants. Raw passthrough
    // would (a) leak presence/position of hidden combatants to players, and
    // (b) make the player handler flag every add in a session with ≥1 hidden
    // combatant as a desync (flooding fetchFullState). Mask hidden IDs with
    // stable opaque placeholders ("hidden:<hash>") so order is preserved
    // without revealing identity.
    const sanitizedMap = sanitizeInitiativeMapForPlayers(event.initiative_map);
    const result: SanitizedCombatantAddReorder = {
      type: event.type,
      combatant: sanitizeCombatant(event.combatant),
      initiative_map: sanitizedMap,
      current_turn_index: adjustTurnIndexForPlayers(event.current_turn_index),
      round_number: event.round_number,
      encounter_id: event.encounter_id,
    };
    return result;
  }

  // combat:hidden_change — when revealing, broadcast as combatant_add; when hiding, broadcast as combatant_remove
  // This is handled by the caller (useCombatActions), so hidden_change never reaches sanitizePayload directly.
  // But as a safety net, block it from leaking raw hidden state to players.
  if (event.type === "combat:hidden_change") {
    // Should never reach here — caller converts to add/remove. Block as safety net.
    return { type: "combat:combatant_remove", combatant_id: event.combatant_id } as SanitizedEvent;
  }

  if (event.type === "session:state_sync") {
    // Filter out hidden combatants from the full state sync
    const visibleCombatants = event.combatants.filter((c) => !c.is_hidden);

    // Adjust turn index: map DM's index to the visible combatant list
    // If the current turn combatant is hidden, use -1 to signal "DM's turn"
    let adjustedTurnIndex = event.current_turn_index;
    const turnCombatant = event.combatants[event.current_turn_index];
    if (turnCombatant) {
      if (turnCombatant.is_hidden) {
        adjustedTurnIndex = -1; // Hidden NPC's turn — player sees "DM's turn"
      } else {
        const visibleIdx = visibleCombatants.findIndex((c) => c.id === turnCombatant.id);
        adjustedTurnIndex = visibleIdx >= 0 ? visibleIdx : event.current_turn_index;
      }
    }

    const result: SanitizedStateSync = {
      type: event.type,
      combatants: visibleCombatants.map(sanitizeCombatant),
      current_turn_index: adjustedTurnIndex,
      round_number: event.round_number,
      ...(event.encounter_id ? { encounter_id: event.encounter_id } : {}),
    };
    return result;
  }

  if (event.type === "combat:initiative_reorder") {
    // Filter out hidden combatants from reorder broadcasts
    const visibleCombatants = event.combatants.filter((c) => !c.is_hidden);

    // Adjust turn index for visible list (same logic as state_sync)
    let adjustedTurnIndex = event.current_turn_index;
    const turnCombatant = event.combatants[event.current_turn_index];
    if (turnCombatant) {
      if (turnCombatant.is_hidden) {
        adjustedTurnIndex = -1;
      } else {
        const visibleIdx = visibleCombatants.findIndex((c) => c.id === turnCombatant.id);
        adjustedTurnIndex = visibleIdx >= 0 ? visibleIdx : event.current_turn_index;
      }
    }

    const result: SanitizedInitiativeReorder = {
      type: event.type,
      combatants: visibleCombatants.map(sanitizeCombatant),
      current_turn_index: adjustedTurnIndex,
    };
    return result;
  }

  if (event.type === "combat:hp_update") {
    if (event.is_player) {
      // Player characters — send full HP data
      const result: SanitizedPlayerHpUpdate = {
        type: event.type,
        combatant_id: event.combatant_id,
        current_hp: event.current_hp,
        temp_hp: event.temp_hp,
        max_hp: event.max_hp,
        hp_status: event.max_hp
          ? getHpStatus(event.current_hp, event.max_hp)
          : undefined,
        death_saves: event.death_saves,
      };
      return result;
    }
    // Monster/NPC — only status label + percentage, no exact HP
    const maxHp = event.max_hp ?? event.current_hp;
    const result: SanitizedMonsterHpUpdate = {
      type: event.type,
      combatant_id: event.combatant_id,
      hp_status: getHpStatus(event.current_hp, maxHp),
      hp_percentage: getHpPercentage(event.current_hp, maxHp),
    };
    return result;
  }

  if (event.type === "combat:stats_update") {
    // For non-players: only send display_name as visible name, never the real name
    // For players: forward name changes directly
    const visibleName = event.is_player
      ? event.name
      : (event.display_name !== undefined ? (event.display_name || undefined) : undefined);
    const result: SanitizedStatsUpdate = {
      type: event.type,
      combatant_id: event.combatant_id,
      name: visibleName,
      // Legendary action counts pass through so the whole party sees them live
      // (decision 2026-04-23). Recharge state stays DM-only by design.
      ...(event.legendary_actions_used !== undefined ? { legendary_actions_used: event.legendary_actions_used } : {}),
      ...(event.legendary_actions_total !== undefined ? { legendary_actions_total: event.legendary_actions_total } : {}),
    };
    return result;
  }

  // player:death_save is player→DM only, never broadcast to other players
  if (event.type === "player:death_save") return null;

  // player:poll_vote is player→DM only, never broadcast to other players
  if (event.type === "player:poll_vote") return null;

  // player:hp_action is player→DM only, effect reaches others via combat:hp_update
  if (event.type === "player:hp_action") return null;

  // player:self_condition_toggle is player→DM only — DM re-broadcasts as combat:condition_change
  if (event.type === "player:self_condition_toggle") return null;

  // W5 (F19) + P2 consolidation: combat_invite events (legacy campaign-scoped
  // and new user-scoped) belong to separate broadcast channels
  // (`campaign:{id}:invites` and `user-invites:{userId}`) and are server-
  // originated. They must never be rebroadcast from the DM's `session:{id}`
  // channel. Split into two narrowing checks so TS can exclude
  // `RealtimeCombatInvite` from the `return event` below.
  if (event.type === "campaign:combat_invite") return null;
  if (event.type === "user:combat_invite") return null;

  // Events that pass through unchanged (no sensitive data)
  return event;
}

/** Check if a combatant-targeted event should be suppressed because the combatant is hidden.
 *  Accepts an optional lookup function to resolve combatant hidden status by ID. */
let _hiddenLookup: ((id: string) => boolean) | null = null;
/** Lookup function to get all combatants from the store (for turn index adjustment). */
let _combatantsLookup: (() => Combatant[]) | null = null;

/** Register a callback to check if a combatant is hidden by ID.
 *  Called once by the combat session to wire the store lookup. */
export function registerHiddenLookup(fn: (id: string) => boolean, combatantsGetter?: () => Combatant[]): void {
  _hiddenLookup = fn;
  if (combatantsGetter) _combatantsLookup = combatantsGetter;
}

function isCombatantHidden(combatantId: string): boolean {
  return _hiddenLookup ? _hiddenLookup(combatantId) : false;
}

/** B-2: Produce a stable opaque placeholder ID for a hidden combatant.
 *  Using a simple hash so the same hidden combatant reliably gets the same
 *  placeholder across broadcasts (supports client dedup + idempotent reducer).
 *  Not cryptographic — just deterministic. Length kept short to avoid payload
 *  bloat when a session has many hidden combatants. */
function maskHiddenId(id: string): string {
  let h = 2166136261; // FNV-1a 32-bit offset basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `hidden:${h.toString(36)}`;
}

/** B-2: Sanitize an initiative_map for player broadcast.
 *  Replaces any hidden combatant's real ID with an opaque placeholder that
 *  preserves order without leaking identity or falsely flagging desync on
 *  the player. */
function sanitizeInitiativeMapForPlayers(
  map: ReadonlyArray<{ id: string; initiative_order: number | null }>,
): Array<{ id: string; initiative_order: number | null; is_hidden?: true }> {
  return map.map((entry) => {
    if (isCombatantHidden(entry.id)) {
      return { id: maskHiddenId(entry.id), initiative_order: entry.initiative_order, is_hidden: true };
    }
    return { id: entry.id, initiative_order: entry.initiative_order };
  });
}

/** Adjust a DM-side turn index to the player-visible index (excluding hidden combatants).
 *  Returns -1 if the turn is on a hidden combatant (signals "DM's turn" to players). */
function adjustTurnIndexForPlayers(dmIndex: number): number {
  if (!_combatantsLookup) return dmIndex;
  const allCombatants = _combatantsLookup();
  const turnCombatant = allCombatants[dmIndex];
  if (!turnCombatant) return dmIndex;
  if (turnCombatant.is_hidden) return -1;
  // Count visible combatants before this one
  let visibleIdx = 0;
  for (let i = 0; i < dmIndex; i++) {
    if (!allCombatants[i].is_hidden) visibleIdx++;
  }
  return visibleIdx;
}

/** Broadcast a combat event to all connected players.
 *  Guards against sending to a stale channel whose session doesn't match.
 *  Waits for the channel to be subscribed before sending. */
export function broadcastEvent(sessionId: string, event: RealtimeEvent): void {
  if (currentSessionId && currentSessionId !== sessionId) {
    captureWarning(`Blocked broadcast to stale session ${sessionId} (current: ${currentSessionId})`, {
      component: "broadcast",
      action: "send",
      category: "realtime",
      sessionId,
    });
    return;
  }

  // SECURITY: Never broadcast hidden combatants to the player channel
  if (event.type === "combat:combatant_add" && event.combatant.is_hidden) {
    return;
  }

  // SECURITY: Suppress per-combatant events for hidden combatants
  const combatantTargetedTypes: string[] = [
    "combat:hp_update",
    "combat:condition_change",
    "combat:defeated_change",
    "combat:stats_update",
    "combat:player_notes_update",
    "combat:version_switch",
    "combat:reaction_toggle",
  ];
  if (combatantTargetedTypes.includes(event.type) && "combatant_id" in event) {
    if (isCombatantHidden((event as { combatant_id: string }).combatant_id)) {
      return;
    }
  }

  // If browser is offline, enqueue immediately
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setSyncStatus("offline");
    enqueueAction(sessionId, event);
    return;
  }

  const ch = getDmChannel(sessionId);
  const safeEvent = sanitizePayload(event);
  if (!safeEvent || !validateEvent(safeEvent)) return;

  // Inject sequence number for ordering — players can discard stale events
  const seq = ++_broadcastSeq;
  const payloadWithSeq = { ...safeEvent, _seq: seq };

  // CR-02 (revised 2026-04-26): journal recording is server-side only
  // (in /api/broadcast). The previous client-side `recordEvent` call was
  // a no-op in production because the in-memory Map module-level was not
  // shared with the serverless function that read it. Server now writes
  // to combat_events table; payload gets `_journal_seq` injected by the
  // server broadcast path so players can track it for resume.

  const doSend = async () => {
    try {
      const sendPromise = ch.send({
        type: "broadcast",
        event: safeEvent.type,
        payload: payloadWithSeq,
      });
      // 3s timeout — don't block the DM on slow networks
      const status = await Promise.race([
        sendPromise,
        new Promise<"timed out">((resolve) => setTimeout(() => resolve("timed out"), 3000)),
      ]);
      if (status === "error" || status === "timed out") {
        setSyncStatus("offline");
        enqueueAction(sessionId, event);
      } else {
        if (getSyncStatus() === "offline") setSyncStatus("online");
        // P-2: successful send proves the channel is healthy. Decay any
        // lingering retry budget so transient flaps earlier in the session
        // don't later trip the ceiling during a mid-combat blip.
        if (reconnectAttempts > 0) {
          reconnectAttempts = 0;
          reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS;
        }
      }
    } catch {
      setSyncStatus("offline");
      enqueueAction(sessionId, event);
    }
  };

  const state = (ch as unknown as { state: string }).state;
  if (state === "joined") {
    doSend();
  } else if (state === "closed" || state === "errored") {
    setSyncStatus("offline");
    enqueueAction(sessionId, event);
  } else {
    waitForChannel().then(doSend);
  }

  // S1.2 + N2: events that require a single ordered sender (combatant_add_reorder)
  // can't go through the dual-broadcast path — the server-direct send would race
  // the client-direct send and break FIFO assumptions on the receiver. BUT they
  // still need journal coverage so reconnecting players can resume past the
  // event window.
  //
  // Solution: post to /api/broadcast with `skipRebroadcast: true`. The server
  // records the event in `combat_events` (the journal) but does NOT emit it on
  // the player channel — preserving the single-sender invariant while closing
  // the journal gap. Without this, a player who dropped during a monster-add
  // would always cascade into a /state full refetch on reconnect.
  if (shouldSkipServerBroadcast(event)) {
    broadcastViaServer(sessionId, event, { skipRebroadcast: true }).catch(() => {});
    return;
  }

  // Server-side broadcast for secure sanitization (anti-metagaming gate).
  // Fire-and-forget: supplementary to client-side broadcast.
  broadcastViaServer(sessionId, event).catch(() => {});
}

/**
 * S1.2 — Event types that MUST NOT go through the server re-broadcast path.
 *
 * The server broadcast adds a second ordered sender (server → channel vs
 * client → channel), which breaks FIFO assumptions on the receiver side.
 * For events that are already fully sanitized client-side AND whose ordering
 * is load-bearing (race-prone rapid emits), skip the server path.
 *
 * Exported for tests.
 */
export function shouldSkipServerBroadcast(event: RealtimeEvent): boolean {
  return event.type === "combat:combatant_add_reorder";
}

/** Replay queued offline actions for a session.
 *  Call this when connectivity is restored.
 *
 *  F4 (2026-04-26): replayed events route through /api/broadcast (server-side
 *  path), NOT via direct ch.send. Why: the server is now the single point of
 *  journal recording (combat_events table). A purely client-direct replay
 *  would broadcast to live players but leave the journal empty for those
 *  events — a player who reconnects mid-replay would miss them on resume
 *  and silently drift. broadcastViaServer guarantees both the journal write
 *  and the rebroadcast under the same code path used by live broadcasts.
 *
 *  Trade-off: each replayed event is one extra HTTP roundtrip vs. the
 *  prior direct ch.send. Acceptable because (a) replay only runs on
 *  reconnection, not in the hot path, and (b) the existing dedup guard in
 *  replayQueue (idempotencyKey) bounds the burst. */
export async function replayOfflineQueue(sessionId: string): Promise<void> {
  setSyncStatus("syncing");
  const result = await replayQueue(sessionId, async (sid, evt) => {
    // Validate locally before paying the network cost — same check the
    // server does, but cheaper to fail fast on a malformed queued event.
    const safeEvent = sanitizePayload(evt);
    if (!safeEvent || !validateEvent(safeEvent)) return;

    // For events that opt out of server rebroadcast (combatant_add_reorder),
    // we still need journal coverage AND we still need to deliver the event.
    // Do BOTH: client-direct send to live players + server-side journal-only.
    if (shouldSkipServerBroadcast(evt)) {
      const ch = getDmChannel(sid);
      await waitForChannel();
      const seq = ++_broadcastSeq;
      await ch.send({
        type: "broadcast",
        event: safeEvent.type,
        payload: { ...safeEvent, _seq: seq },
      });
      await broadcastViaServer(sid, evt, { skipRebroadcast: true });
      return;
    }

    // Default path: server records in journal AND emits on the channel.
    await broadcastViaServer(sid, evt);
  });

  setSyncStatus(result.failed > 0 ? "error" : "online");
}

/** Cleanup the DM channel (call when leaving session).
 *  Immediate, synchronous teardown — for explicit end-session flows
 *  (e.g. `handleEndEncounter`) where we know we're leaving for good.
 *  Uses `supabase.removeChannel` (not bare `channel.unsubscribe`) to fully
 *  drop the channel from the client registry — a leftover errored instance
 *  would starve the next subscribe on the same topic. */
export function cleanupDmChannel(): void {
  teardownChannel();
  // CR-01: emit closed after teardown so consumers can tear down their own
  // resources (resume listeners, skeleton timers) in the correct order.
  transitionTo({ kind: "closed" });
}

/** F5 — proactive `network_offline` / recovery transitions.
 *
 *  Without this listener, the only way to enter `degraded` is to burn through
 *  the 15-attempt ceiling (90s+ at default backoff). When the OS network
 *  goes down, that's wasteful: realtime-js will fail every attempt anyway,
 *  and meanwhile the user sees no signal. Listening on `offline` short-
 *  circuits straight to `degraded { reason: "network_offline" }`, which
 *  lets the sync indicator UI flag the connection immediately and the
 *  Estabilidade Combate dashboard count the right reason.
 *
 *  On `online`, if we're degraded *because* of network_offline, kick off a
 *  fresh subscribe immediately. Other degrade reasons (ceiling_hit /
 *  broker_down) require explicit user retry — recovery via `online` would
 *  hammer the broker if it was actually down.
 *
 *  Module-level listeners: registered once, never cleaned up. Browser tab
 *  unload tears them down implicitly. Idempotent — only acts when there's
 *  a live session. */
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    if (!currentSessionId) return; // no active channel; nothing to degrade
    const state = getConnectionState();
    if (state.kind === "degraded" || state.kind === "closed") return;
    transitionTo({
      kind: "degraded",
      reason: "network_offline",
      since: Date.now(),
    });
  });

  window.addEventListener("online", () => {
    if (!currentSessionId) return;
    const state = getConnectionState();
    if (state.kind !== "degraded" || state.reason !== "network_offline") return;
    // Reset retry budget so the recovery attempt isn't pre-burned by prior
    // failures while offline.
    reconnectAttempts = 0;
    reconnectBackoffMs = RECONNECT_BACKOFF_INITIAL_MS;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    // Re-enter `connecting` via createAndSubscribe; the FSM accepts
    // `degraded → connecting`.
    createAndSubscribe(currentSessionId);
  });
}

/** Deferred cleanup — tears down the channel only if no new consumer claims
 *  it within {@link UNMOUNT_CLEANUP_GRACE_MS}. Use this on React unmount
 *  paths where the next mount may be the SAME session on a different route
 *  (e.g. `/app/combat/new` → `/app/combat/[id]`): an immediate teardown
 *  would race the fresh subscribe and leave the new channel in
 *  TIMED_OUT / CHANNEL_ERROR.
 *
 *  `getDmChannel` cancels any pending cleanup on reclaim, so this is safe to
 *  call aggressively. If no reclaim happens (real navigation away), the
 *  cleanup fires and the singleton is torn down as before. */
export function scheduleDmChannelCleanup(): void {
  if (pendingCleanupTimer) clearTimeout(pendingCleanupTimer);
  pendingCleanupTimer = setTimeout(() => {
    pendingCleanupTimer = null;
    teardownChannel();
    // CR-01: emit closed so consumers tear down subscriptions on the same
    // timer boundary as the channel teardown (mirrors cleanupDmChannel).
    transitionTo({ kind: "closed" });
  }, UNMOUNT_CLEANUP_GRACE_MS);
}
