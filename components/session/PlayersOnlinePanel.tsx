"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

type PlayerStatus = "online" | "idle" | "offline";

interface PresencePlayer {
  id: string;
  name: string;
  joined_at: number;
  is_online: boolean;
  status: PlayerStatus;
}

interface PlayersOnlinePanelProps {
  sessionId: string;
  /** Callback when player count changes — used for soft gate */
  onPlayerCountChange?: (count: number) => void;
  /** Broadcast-driven status overrides from DM channel (player:disconnecting/idle/active) */
  broadcastStatuses?: Record<string, PlayerStatus>;
  /** Compact inline mode — single row with dots instead of full card */
  compact?: boolean;
}

const OFFLINE_DELAY_MS = 5000;
const STALE_CHECK_INTERVAL_MS = 30_000; // DM polls last_seen_at every 30s (halved from 15s to reduce DB reads)
const ACTIVE_THRESHOLD_MS = 180_000; // 3x heartbeat interval (60s) — avoids false-offline from JS throttling
const IDLE_THRESHOLD_MS = 300_000; // 5min

export function PlayersOnlinePanel({ sessionId, onPlayerCountChange, broadcastStatuses, compact }: PlayersOnlinePanelProps) {
  const t = useTranslations("combat");
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const offlineTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Presence channel — Supabase Presence for real-time tracking
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:${sessionId}`, {
      config: { presence: { key: sessionId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ id: string; name: string; joined_at: number }>();
        const allPresent = Object.values(state).flat();

        // Deduplicate by player ID (handles multi-device connections)
        const deduped = new Map<string, { id: string; name: string; joined_at: number }>();
        for (const p of allPresent) {
          const existing = deduped.get(p.id);
          if (!existing || p.joined_at > existing.joined_at) {
            deduped.set(p.id, p);
          }
        }
        const uniquePresent = Array.from(deduped.values());

        setPlayers((prev) => {
          const presentIds = new Set(uniquePresent.map((p) => p.id));
          const updated: PresencePlayer[] = [];

          // Add/update present players
          for (const p of uniquePresent) {
            // Clear any pending offline timer
            const timer = offlineTimersRef.current.get(p.id);
            if (timer) {
              clearTimeout(timer);
              offlineTimersRef.current.delete(p.id);
            }
            updated.push({ id: p.id, name: p.name, joined_at: p.joined_at, is_online: true, status: "online" });
          }

          // Keep previously known players that just went offline (grace period)
          for (const existing of prev) {
            if (!presentIds.has(existing.id)) {
              if (existing.is_online) {
                // Start offline timer
                const timer = setTimeout(() => {
                  offlineTimersRef.current.delete(existing.id);
                  setPlayers((curr) =>
                    curr.map((p) => p.id === existing.id ? { ...p, is_online: false, status: "offline" } : p)
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

    const timers = offlineTimersRef.current;
    return () => {
      supabase.removeChannel(channel);
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, [sessionId]);

  // Apply broadcast-based status overrides from parent (e.g. CombatSessionClient)
  useEffect(() => {
    if (!broadcastStatuses || Object.keys(broadcastStatuses).length === 0) return;
    setPlayers((prev) => {
      let changed = false;
      const updated = prev.map((p) => {
        const override = broadcastStatuses[p.name];
        if (override && override !== p.status) {
          changed = true;
          return { ...p, status: override, is_online: override !== "offline" };
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [broadcastStatuses]);

  // Quinn: DM stale detection timer — polls last_seen_at every 15s as absolute fallback
  // Works even if ALL broadcasts failed (network died, adblockers, etc.)
  useEffect(() => {
    const supabase = createClient();

    const checkPresence = async () => {
      try {
        const { data: tokens } = await supabase
          .from("session_tokens")
          .select("id, player_name, last_seen_at")
          .eq("session_id", sessionId)
          .eq("is_active", true)
          .not("player_name", "is", null);

        if (!tokens) return;

        const now = Date.now();
        const dbStatuses = new Map<string, PlayerStatus>();
        for (const t of tokens) {
          if (!t.player_name) continue;
          if (!t.last_seen_at) {
            dbStatuses.set(t.player_name, "offline");
          } else {
            const elapsed = now - new Date(t.last_seen_at).getTime();
            if (elapsed < ACTIVE_THRESHOLD_MS) {
              dbStatuses.set(t.player_name, "online");
            } else if (elapsed < IDLE_THRESHOLD_MS) {
              dbStatuses.set(t.player_name, "idle");
            } else {
              dbStatuses.set(t.player_name, "offline");
            }
          }
        }

        setPlayers((prev) => {
          let changed = false;
          const updated = prev.map((p) => {
            const dbStatus = dbStatuses.get(p.name);
            if (dbStatus && dbStatus !== p.status) {
              changed = true;
              return { ...p, status: dbStatus, is_online: dbStatus !== "offline" };
            }
            return p;
          });
          return changed ? updated : prev;
        });
      } catch {
        /* stale check is best-effort */
      }
    };

    checkPresence();
    const id = setInterval(checkPresence, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionId]);

  // Notify parent of online count changes
  useEffect(() => {
    const onlineCount = players.filter((p) => p.is_online).length;
    onPlayerCountChange?.(onlineCount);
  }, [players, onPlayerCountChange]);

  if (players.length === 0) return null;

  const onlineCount = players.filter((p) => p.is_online).length;

  // Compact inline mode — single row with status dots and names
  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0" data-testid="players-online-panel">
        <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-hide">
          {players.map((player) => (
            <span
              key={player.id}
              className={`inline-flex items-center gap-1 text-xs whitespace-nowrap ${player.status === "offline" ? "opacity-50" : ""}`}
              data-testid={`player-presence-${player.id}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  player.status === "online" ? "bg-green-500"
                  : player.status === "idle" ? "bg-yellow-500"
                  : "bg-zinc-500"
                }`}
                aria-label={
                  player.status === "online" ? t("player_online")
                  : player.status === "idle" ? t("player_idle")
                  : t("player_offline")
                }
              />
              <span className="text-muted-foreground">{player.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2" data-testid="players-online-panel">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t("players_online", { count: onlineCount })}
        </span>
      </div>
      <ul className="space-y-1 max-h-56 overflow-y-auto">
        {players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 text-sm" data-testid={`player-presence-${player.id}`}>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                player.status === "online" ? "bg-green-500"
                : player.status === "idle" ? "bg-yellow-500"
                : "bg-zinc-500"
              }`}
              aria-label={
                player.status === "online" ? t("player_online")
                : player.status === "idle" ? t("player_idle")
                : t("player_offline")
              }
            />
            <span className={`text-foreground truncate ${player.status === "offline" ? "opacity-50" : ""}`}>
              {player.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
