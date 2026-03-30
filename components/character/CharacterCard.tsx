"use client";

import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

interface CharacterCardProps {
  character: PlayerCharacter;
  onClick?: () => void;
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  const t = useTranslations("character");

  const subtitle = [character.race, character.class]
    .filter(Boolean)
    .join(" ");
  const levelStr = character.level ? `${t("level")} ${character.level}` : null;

  return (
    <div
      data-testid={`character-card-${character.id}`}
      className="p-4 bg-card rounded-lg border border-border hover:border-border/80 transition-colors cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-center gap-3">
        {/* Token avatar */}
        <div className="flex-shrink-0">
          {character.token_url ? (
            <img
              src={character.token_url}
              alt={character.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center ring-2 ring-amber-400/20">
              <User className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-medium text-sm truncate">
            {character.name}
          </h3>
          {(subtitle || levelStr) && (
            <p className="text-muted-foreground text-xs truncate">
              {[subtitle, levelStr].filter(Boolean).join(" \u00b7 ")}
            </p>
          )}
        </div>

        {/* Stat badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {character.max_hp > 0 && (
            <span
              data-testid="card-stat-hp"
              className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border"
            >
              HP {character.max_hp}
            </span>
          )}
          {character.ac > 0 && (
            <span
              data-testid="card-stat-ac"
              className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border"
            >
              AC {character.ac}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
