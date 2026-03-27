import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeEvent, RealtimeStatsUpdate } from "@/lib/types/realtime";
import { getHpStatus } from "@/lib/utils/hp-status";

let channel: RealtimeChannel | null = null;
let currentSessionId: string | null = null;

/** Get or create the DM broadcast channel for a session.
 *  Recreates the channel when the session ID changes (guards stale singleton). */
export function getDmChannel(sessionId: string): RealtimeChannel {
  if (channel && currentSessionId === sessionId) return channel;
  // Session changed — tear down old channel first
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
  const supabase = createClient();
  channel = supabase.channel(`session:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel.subscribe();
  currentSessionId = sessionId;
  return channel;
}

/** Strip DM-only fields before broadcasting to players. */
function stripDmFields<T extends { dm_notes?: unknown }>(c: T): Omit<T, "dm_notes"> {
  const { dm_notes: _dm_notes, ...safe } = c;
  return safe;
}

/** Strip sensitive monster stats (HP, AC, spell_save_dc) from a combatant.
 *  Players see only hp_status (LIGHT/MODERATE/HEAVY/CRITICAL) for non-player combatants. */
function stripMonsterStats<T extends { is_player?: boolean; current_hp?: number; max_hp?: number; temp_hp?: number; ac?: number; spell_save_dc?: number | null }>(
  c: T
): Record<string, unknown> {
  if (c.is_player) return c as Record<string, unknown>;
  const { current_hp: _current_hp, max_hp: _max_hp, temp_hp: _temp_hp, ac: _ac, spell_save_dc: _spell_save_dc, ...safe } = c;
  return {
    ...safe,
    hp_status: getHpStatus(_current_hp ?? 0, _max_hp ?? 0),
  };
}

/** Replace real name with display_name for non-player combatants (anti-metagaming). */
function applyDisplayName(c: Record<string, unknown>): Record<string, unknown> {
  if (!c.is_player && c.display_name) {
    return { ...c, name: c.display_name, display_name: undefined };
  }
  // Always strip display_name from player broadcast — DM-only field
  const { display_name: _display_name, ...safe } = c;
  return safe;
}

/** Sanitize a full combatant object for player broadcast. */
function sanitizeCombatant<T extends { dm_notes?: unknown; is_player?: boolean; current_hp?: number; max_hp?: number; temp_hp?: number; ac?: number; spell_save_dc?: number | null }>(
  c: T
): Record<string, unknown> {
  return applyDisplayName(stripMonsterStats(stripDmFields(c) as T));
}

/** Remove sensitive data from any combatant objects in the event payload. */
function sanitizePayload(event: RealtimeEvent): RealtimeEvent {
  if (event.type === "combat:combatant_add") {
    return { ...event, combatant: sanitizeCombatant(event.combatant) } as unknown as RealtimeEvent;
  }
  if (event.type === "session:state_sync") {
    return { ...event, combatants: event.combatants.map(sanitizeCombatant) } as unknown as RealtimeEvent;
  }
  if (event.type === "combat:initiative_reorder") {
    return { ...event, combatants: event.combatants.map(sanitizeCombatant) } as unknown as RealtimeEvent;
  }
  if (event.type === "combat:hp_update") {
    if (event.is_player) {
      // Player characters — send full HP data including max_hp
      const { is_player: _is_player, ...rest } = event;
      return rest as unknown as RealtimeEvent;
    }
    // Monster/NPC — strip exact HP, send only status label
    return {
      type: event.type,
      combatant_id: event.combatant_id,
      hp_status: getHpStatus(event.current_hp, event.max_hp ?? event.current_hp),
    } as unknown as RealtimeEvent;
  }
  if (event.type === "combat:stats_update") {
    // Strip AC, spell_save_dc, HP, and display_name from broadcast — only name changes reach players.
    // display_name is a DM-only anti-metagaming alias — must never reach the player.
    // Player HP/AC updates reach via combat:hp_update instead.
    const statsPayload = event as RealtimeStatsUpdate & { display_name?: string | null };
    const { ac: _ac2, spell_save_dc: _sdc2, max_hp: _mhp2, current_hp: _chp2, display_name: _dn2, ...safe } = statsPayload;
    return { ...safe, type: event.type } as unknown as RealtimeEvent;
  }
  return event;
}

/** Broadcast a combat event to all connected players. */
export function broadcastEvent(sessionId: string, event: RealtimeEvent): void {
  const ch = getDmChannel(sessionId);
  const safeEvent = sanitizePayload(event);
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
