"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/types/realtime";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

interface UseRealtimeChannelOptions {
  sessionId: string;
  onEvent: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

/**
 * Subscribe to a session's Realtime channel (player-side, read-only).
 * Returns connection status for UI indicators.
 */
export function useRealtimeChannel({
  sessionId,
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Track when connection was last lost for polling fallback
  const disconnectedAtRef = useRef<number | null>(null);
  const [shouldPoll, setShouldPoll] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const supabase = createClient();
    const ch = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    // Listen for all event types
    const eventTypes: RealtimeEventType[] = [
      "combat:hp_update",
      "combat:turn_advance",
      "combat:condition_change",
      "combat:combatant_add",
      "combat:combatant_remove",
      "combat:initiative_reorder",
      "combat:version_switch",
      "combat:defeated_change",
      "combat:stats_update",
      "session:state_sync",
    ];

    for (const eventType of eventTypes) {
      ch.on("broadcast", { event: eventType }, (msg) => {
        onEventRef.current(msg.payload as RealtimeEvent);
      });
    }

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setStatus("connected");
        disconnectedAtRef.current = null;
        setShouldPoll(false);
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setStatus("disconnected");
        if (!disconnectedAtRef.current) {
          disconnectedAtRef.current = Date.now();
        }
        // Enable polling fallback after 3s disconnect (NFR9)
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        pollTimerRef.current = setTimeout(() => {
          pollTimerRef.current = null;
          if (disconnectedAtRef.current && Date.now() - disconnectedAtRef.current >= 3000) {
            setShouldPoll(true);
          }
        }, 3000);
      } else {
        setStatus("connecting");
      }
    });

    channelRef.current = ch;

    return () => {
      cleanup();
      setStatus("disconnected");
    };
  }, [sessionId, enabled, cleanup]);

  return { status, shouldPoll, cleanup };
}
