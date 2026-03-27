"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { LinkPlayerCharacterDialog } from "@/components/session/LinkPlayerCharacterDialog";
import type { PlayerCharacter } from "@/lib/types/database";

export interface OnlinePlayer {
  id: string;
  name: string;
  isOnline: boolean;
  characterName?: string;
  joinedAt: string;
  linkedCharacterId?: string | null;
}

interface PlayersOnlinePanelProps {
  players: OnlinePlayer[];
  /** Campaign characters available for linking (DM only) */
  availableCharacters?: PlayerCharacter[];
  /** Called when DM links/unlinks a player to a character */
  onLinkCharacter?: (tokenId: string, characterId: string | null) => Promise<void>;
}

export function PlayersOnlinePanel({ players, availableCharacters, onLinkCharacter }: PlayersOnlinePanelProps) {
  const t = useTranslations("combat");

  if (players.length === 0) return null;

  const onlineCount = players.filter((p) => p.isOnline).length;
  // Characters already linked to other players — exclude from available list
  const linkedCharIds = new Set(players.map((p) => p.linkedCharacterId).filter(Boolean));

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
            <span className={`flex-1 ${player.isOnline ? "text-foreground" : "text-muted-foreground"}`}>
              {player.characterName || player.name}
            </span>
            {!player.characterName && !player.linkedCharacterId && (
              <span className="text-muted-foreground/60 text-xs">
                ({t("player_guest_label")})
              </span>
            )}
            {/* DM link/unlink button */}
            {onLinkCharacter && availableCharacters && (
              <LinkPlayerCharacterDialog
                tokenId={player.id}
                playerName={player.name}
                availableCharacters={availableCharacters.filter(
                  (c) => c.id === player.linkedCharacterId || !linkedCharIds.has(c.id)
                )}
                linkedCharacterId={player.linkedCharacterId ?? null}
                onLink={onLinkCharacter}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
