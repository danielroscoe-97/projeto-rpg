import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  RealtimeEvent,
  SanitizedEvent,
  SanitizedCombatant,
  SanitizedCombatantAdd,
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

/** Get or create the DM broadcast channel for a session.
 *  Recreates the channel when the session ID changes (guards stale singleton).
 *  Also recreates when the existing channel was externally removed/closed
 *  (e.g. by EncounterSetup calling supabase.removeChannel). */
/** Promise that resolves when the current DM channel is subscribed. */
let channelReady: Promise<void> | null = null;

export function getDmChannel(sessionId: string): RealtimeChannel {
  if (channel && currentSessionId === sessionId) {
    // Guard against stale channel that was removed externally
    const state = (channel as unknown as { state: string }).state;
    if (state !== "closed" && state !== "leaving" && state !== "errored") {
      return channel;
    }
    // Channel is dead — fall through to recreate
    console.warn("[broadcast] DM channel was in stale state:", state, "— recreating");
    channel = null;
    channelReady = null;
  }
  // Session changed or channel is stale — tear down old channel first
  if (channel) {
    channel.unsubscribe();
    channel = null;
    channelReady = null;
  }
  const supabase = createClient();
  channel = supabase.channel(`session:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channelReady = new Promise<void>((resolve) => {
    channel!.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        captureError(err ?? new Error(`Channel ${status} for session ${sessionId}`), {
          component: "broadcast",
          action: "subscribe",
          category: "realtime",
          sessionId,
        });
        resolve(); // Resolve anyway to avoid hanging
      }
    });
  });
  currentSessionId = sessionId;
  return channel;
}

/** Wait for the DM channel to be subscribed. Resolves immediately if already subscribed. */
export function waitForChannel(): Promise<void> {
  return channelReady ?? Promise.resolve();
}

/** Invalidate the DM channel singleton so the next getDmChannel call recreates it.
 *  Call this when the channel has been externally removed (e.g. via supabase.removeChannel). */
export function resetDmChannel(): void {
  channel = null;
  currentSessionId = null;
  channelReady = null;
}

/** Sanitize a full combatant for player broadcast.
 *  Strips DM notes, monster stats, LA counts, and applies display_name anti-metagaming. */
function sanitizeCombatant(c: Combatant): SanitizedCombatant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit DM-only fields + LA counts
  const { dm_notes, display_name, legendary_actions_total: _lat, legendary_actions_used: _lau, ...base } = c;

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

  const result: SanitizedCombatant = {
    ...safe,
    // Apply display_name as the visible name (anti-metagaming)
    name: display_name || base.name,
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
    const result: SanitizedInitiativeReorder = {
      type: event.type,
      combatants: visibleCombatants.map(sanitizeCombatant),
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
    };
    return result;
  }

  // player:death_save is player→DM only, never broadcast to other players
  if (event.type === "player:death_save") return null;

  // player:poll_vote is player→DM only, never broadcast to other players
  if (event.type === "player:poll_vote") return null;

  // player:hp_action is player→DM only, effect reaches others via combat:hp_update
  if (event.type === "player:hp_action") return null;

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

  const doSend = () => {
    try {
      ch.send({
        type: "broadcast",
        event: safeEvent.type,
        payload: safeEvent,
      });
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

  // Phase 1 (dual mode): Also send via server-side API for secure sanitization.
  // Server re-sanitizes and broadcasts to players — this is the anti-metagaming gate.
  // Fire-and-forget: server broadcast is supplementary; client already sent above.
  // In Phase 3, client-side send above will be removed and only server remains.
  broadcastViaServer(sessionId, event).catch(() => {
    // Server broadcast failed — client-side already handled it above
  });
}

/** Replay queued offline actions for a session.
 *  Call this when connectivity is restored. */
export async function replayOfflineQueue(sessionId: string): Promise<void> {
  setSyncStatus("syncing");
  const result = await replayQueue(sessionId, async (sid, evt) => {
    const ch = getDmChannel(sid);
    const safeEvent = sanitizePayload(evt);
    if (!safeEvent || !validateEvent(safeEvent)) return;
    await waitForChannel();
    ch.send({
      type: "broadcast",
      event: safeEvent.type,
      payload: safeEvent,
    });
  });

  setSyncStatus(result.failed > 0 ? "error" : "online");
}

/** Cleanup the DM channel (call when leaving session). */
export function cleanupDmChannel(): void {
  if (channel) {
    channel.unsubscribe();
    channel = null;
    currentSessionId = null;
    channelReady = null;
  }
}
