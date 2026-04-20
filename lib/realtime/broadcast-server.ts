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

    // B01 (beta test 3): /api/broadcast returns 404 when the session has been
    // deleted/ended but a straggler broadcast is still in flight. That's an
    // expected race — the DM client silences the fire-and-forget failure and
    // falls back to the client-direct path (see broadcast.ts). Treat 404 as a
    // benign "session gone" signal instead of a network error.
    if (res.status === 404) {
      return false;
    }

    return res.ok;
  } catch {
    // Network error — fall back to client-side
    return false;
  }
}
