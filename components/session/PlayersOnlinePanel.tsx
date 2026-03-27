"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";

export interface OnlinePlayer {
  id: string;
  name: string;
  isOnline: boolean;
  characterName?: string;
  joinedAt: string;
}

interface PlayersOnlinePanelProps {
  players: OnlinePlayer[];
}

export function PlayersOnlinePanel({ players }: PlayersOnlinePanelProps) {
  const t = useTranslations("combat");

  if (players.length === 0) return null;

  const onlineCount = players.filter((p) => p.isOnline).length;

  return (
    <div
      className="bg-card border border-border rounded-lg px-4 py-3"
      data-testid="players-online-panel"
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-gold" aria-hidden="true" />
        <span className="text-muted-foreground text-xs font-medium">
          {t("players_online_count", { online: onlineCount, total: players.length })}
        </span>
      </div>
      <ul className="space-y-1.5" role="list" aria-label={t("players_online_label")}>
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center gap-2 text-sm"
            data-testid={`player-online-${player.id}`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${
                player.isOnline ? "bg-green-400" : "bg-muted-foreground/40"
              }`}
              aria-label={player.isOnline ? t("player_status_online") : t("player_status_offline")}
            />
            <span className={player.isOnline ? "text-foreground" : "text-muted-foreground"}>
              {player.characterName || player.name}
            </span>
            {!player.characterName && (
              <span className="text-muted-foreground/60 text-xs">
                ({t("player_guest_label")})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
