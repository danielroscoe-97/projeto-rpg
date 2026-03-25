import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeEvent } from "@/lib/types/realtime";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dm_notes, ...safe } = c;
  return safe;
}

/** Remove dm_notes from any combatant objects in the event payload. */
function sanitizePayload(event: RealtimeEvent): RealtimeEvent {
  if (event.type === "combat:combatant_add") {
    return { ...event, combatant: stripDmFields(event.combatant) } as RealtimeEvent;
  }
  if (event.type === "session:state_sync") {
    return { ...event, combatants: event.combatants.map(stripDmFields) } as RealtimeEvent;
  }
  if (event.type === "combat:initiative_reorder") {
    return { ...event, combatants: event.combatants.map(stripDmFields) } as RealtimeEvent;
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
