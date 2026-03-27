"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

interface PresencePlayer {
  id: string;
  name: string;
  joined_at: number;
  is_online: boolean;
}

interface PlayersOnlinePanelProps {
  sessionId: string;
  /** Callback when player count changes — used for soft gate */
  onPlayerCountChange?: (count: number) => void;
}

const OFFLINE_DELAY_MS = 5000;

export function PlayersOnlinePanel({ sessionId, onPlayerCountChange }: PlayersOnlinePanelProps) {
  const t = useTranslations("combat");
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const offlineTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:${sessionId}`, {
      config: { presence: { key: sessionId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ id: string; name: string; joined_at: number }>();
        const allPresent = Object.values(state).flat();

        setPlayers((prev) => {
          const presentIds = new Set(allPresent.map((p) => p.id));
          const updated: PresencePlayer[] = [];

          // Add/update present players
          for (const p of allPresent) {
            // Clear any pending offline timer
            const timer = offlineTimersRef.current.get(p.id);
            if (timer) {
              clearTimeout(timer);
              offlineTimersRef.current.delete(p.id);
            }
            updated.push({ id: p.id, name: p.name, joined_at: p.joined_at, is_online: true });
          }

          // Keep previously known players that just went offline (grace period)
          for (const existing of prev) {
            if (!presentIds.has(existing.id)) {
              if (existing.is_online) {
                // Start offline timer
                const timer = setTimeout(() => {
                  offlineTimersRef.current.delete(existing.id);
                  setPlayers((curr) =>
                    curr.map((p) => p.id === existing.id ? { ...p, is_online: false } : p)
                  );
                }, OFFLINE_DELAY_MS);
                offlineTimersRef.current.set(existing.id, timer);
                updated.push({ ...existing, is_online: true });
              } else {
                updated.push(existing);
              }
            }
          }

          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      for (const timer of offlineTimersRef.current.values()) {
        clearTimeout(timer);
      }
      offlineTimersRef.current.clear();
    };
  }, [sessionId]);

  // Notify parent of online count changes
  useEffect(() => {
    const onlineCount = players.filter((p) => p.is_online).length;
    onPlayerCountChange?.(onlineCount);
  }, [players, onPlayerCountChange]);

  if (players.length === 0) return null;

  const onlineCount = players.filter((p) => p.is_online).length;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2" data-testid="players-online-panel">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t("players_online", { count: onlineCount })}
        </span>
      </div>
      <ul className="space-y-1">
        {players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 text-sm" data-testid={`player-presence-${player.id}`}>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                player.is_online ? "bg-green-500" : "bg-zinc-500"
              }`}
              aria-label={player.is_online ? t("player_online") : t("player_offline")}
            />
            <span className={`text-foreground truncate ${!player.is_online ? "opacity-50" : ""}`}>
              {player.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
