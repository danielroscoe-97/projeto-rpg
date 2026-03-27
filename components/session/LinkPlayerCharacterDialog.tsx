"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, Unlink } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

interface LinkPlayerCharacterDialogProps {
  /** The guest player's token ID */
  tokenId: string;
  /** The guest player's display name */
  playerName: string;
  /** Available characters from the campaign (not yet linked to other players) */
  availableCharacters: PlayerCharacter[];
  /** Currently linked character ID, if any */
  linkedCharacterId: string | null;
  /** Called when DM links or unlinks a character */
  onLink: (tokenId: string, characterId: string | null) => Promise<void>;
}

export function LinkPlayerCharacterDialog({
  tokenId,
  playerName,
  availableCharacters,
  linkedCharacterId,
  onLink,
}: LinkPlayerCharacterDialogProps) {
  const t = useTranslations("combat");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const linkedChar = availableCharacters.find((c) => c.id === linkedCharacterId);

  const handleLink = async (characterId: string) => {
    setIsLoading(true);
    try {
      await onLink(tokenId, characterId);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      await onLink(tokenId, null);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (linkedChar) {
    return (
      <div className="flex items-center gap-1.5" data-testid={`linked-char-${tokenId}`}>
        <span className="text-gold text-xs">{linkedChar.name}</span>
        <button
          type="button"
          onClick={handleUnlink}
          disabled={isLoading}
          className="text-muted-foreground/60 hover:text-red-400 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
          aria-label={t("unlink_character")}
          title={t("unlink_character")}
          data-testid={`unlink-btn-${tokenId}`}
        >
          <Unlink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" data-testid={`link-char-${tokenId}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={availableCharacters.length === 0}
        className="text-muted-foreground/60 hover:text-gold transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center disabled:opacity-30"
        aria-label={t("link_character")}
        title={t("link_character_title", { name: playerName })}
        data-testid={`link-btn-${tokenId}`}
      >
        <Link className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          data-testid={`link-dropdown-${tokenId}`}
        >
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
            {t("link_character_label")}
          </div>
          {availableCharacters.map((char) => (
            <button
              key={char.id}
              type="button"
              onClick={() => handleLink(char.id)}
              disabled={isLoading}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              data-testid={`link-option-${char.id}`}
            >
              <span className="font-medium">{char.name}</span>
              <span className="text-muted-foreground/60 text-xs ml-2">
                HP {char.max_hp} · CA {char.ac}
              </span>
            </button>
          ))}
          {availableCharacters.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {t("no_characters_available")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
