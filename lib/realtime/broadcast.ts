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
import { getHpStatus } from "@/lib/utils/hp-status";
import { captureError, captureWarning } from "@/lib/errors/capture";

let channel: RealtimeChannel | null = null;
let currentSessionId: string | null = null;

/** Get or create the DM broadcast channel for a session.
 *  Recreates the channel when the session ID changes (guards stale singleton).
 *  Also recreates when the existing channel was externally removed/closed
 *  (e.g. by EncounterSetup calling supabase.removeChannel). */
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
  }
  // Session changed or channel is stale — tear down old channel first
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  const supabase = createClient();
  channel = supabase.channel(`session:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel.subscribe((status, err) => {
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      captureError(err ?? new Error(`Channel ${status} for session ${sessionId}`), {
        component: "broadcast",
        action: "subscribe",
        category: "realtime",
        sessionId,
      });
    }
  });
  currentSessionId = sessionId;
  return channel;
}

/** Invalidate the DM channel singleton so the next getDmChannel call recreates it.
 *  Call this when the channel has been externally removed (e.g. via supabase.removeChannel). */
export function resetDmChannel(): void {
  channel = null;
  currentSessionId = null;
}

/** Sanitize a full combatant for player broadcast.
 *  Strips DM notes, monster stats, and applies display_name anti-metagaming. */
function sanitizeCombatant(c: Combatant): SanitizedCombatant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit DM-only field
  const { dm_notes, display_name, ...base } = c;

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
      };
      return result;
    }
    // Monster/NPC — only status label, no exact HP
    const result: SanitizedMonsterHpUpdate = {
      type: event.type,
      combatant_id: event.combatant_id,
      hp_status: getHpStatus(event.current_hp, event.max_hp ?? event.current_hp),
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
 *  Guards against sending to a stale channel whose session doesn't match. */
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

  const ch = getDmChannel(sessionId);
  const safeEvent = sanitizePayload(event);
  if (!safeEvent || !validateEvent(safeEvent)) return;
  ch.send({
    type: "broadcast",
    event: safeEvent.type,
    payload: safeEvent,
  });
}

/** Cleanup the DM channel (call when leaving session). */
export function cleanupDmChannel(): void {
  if (channel) {
    channel.unsubscribe();
    channel = null;
    currentSessionId = null;
  }
}
