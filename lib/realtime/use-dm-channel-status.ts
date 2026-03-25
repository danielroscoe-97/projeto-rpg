"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConnectionStatus } from "@/lib/realtime/use-realtime-channel";

/**
 * Observe the DM broadcast channel subscription status for a given session.
 * Returns a ConnectionStatus that the Navbar can display as a sync dot.
 *
 * Unlike the player-side hook, this does NOT process incoming events —
 * the DM is the broadcaster. It only tracks whether the channel is alive.
 */
export function useDmChannelStatus(sessionId: string | null): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    sessionId ? "connecting" : "disconnected",
  );

  useEffect(() => {
    if (!sessionId) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    const supabase = createClient();

    // We create a lightweight presence-only channel to track connectivity.
    // The actual broadcast channel is managed by broadcast.ts singleton.
    const ch = supabase.channel(`dm-status:${sessionId}`);

    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        setStatus("connected");
      } else if (s === "CLOSED" || s === "CHANNEL_ERROR") {
        setStatus("disconnected");
      } else {
        setStatus("connecting");
      }
    });

    return () => {
      ch.unsubscribe();
    };
  }, [sessionId]);

  return status;
}
