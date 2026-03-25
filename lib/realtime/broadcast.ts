import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeEvent } from "@/lib/types/realtime";

let channel: RealtimeChannel | null = null;

/** Get or create the DM broadcast channel for a session. */
export function getDmChannel(sessionId: string): RealtimeChannel {
  if (channel) return channel;
  const supabase = createClient();
  channel = supabase.channel(`session:${sessionId}`, {
    config: { broadcast: { self: false } },
  });
  channel.subscribe();
  return channel;
}

/** Broadcast a combat event to all connected players. */
export function broadcastEvent(sessionId: string, event: RealtimeEvent): void {
  const ch = getDmChannel(sessionId);
  ch.send({
    type: "broadcast",
    event: event.type,
    payload: event,
  });
}

/** Cleanup the DM channel (call when leaving session). */
export function cleanupDmChannel(): void {
  if (channel) {
    channel.unsubscribe();
    channel = null;
  }
}
