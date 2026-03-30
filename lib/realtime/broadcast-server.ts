import { createClient } from "@/lib/supabase/client";
import type { RealtimeEvent } from "@/lib/types/realtime";

/**
 * Broadcast via server-side API route.
 * The server sanitizes and rebroadcasts to the player channel.
 * Returns true if successful, false if the server is unreachable (triggers fallback).
 */
export async function broadcastViaServer(
  sessionId: string,
  event: RealtimeEvent
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return false; // No auth — fall back to client-side
    }

    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, event }),
    });

    if (res.status === 429) {
      console.warn("[broadcast-server] Rate limited");
      return false;
    }

    return res.ok;
  } catch {
    // Network error — fall back to client-side
    return false;
  }
}
