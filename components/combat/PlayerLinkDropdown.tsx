"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link2, Unlink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Combatant } from "@/lib/types/combat";

interface PlayerCharacterOption {
  id: string;
  name: string;
  max_hp: number;
  ac: number;
  spell_save_dc: number | null;
}

interface PlayerLinkDropdownProps {
  combatant: Combatant;
  campaignId: string | null;
  /** All combatants — used to check which characters are already linked */
  allCombatants: Combatant[];
  onLink: (combatantId: string, characterId: string, stats: PlayerCharacterOption) => void;
  onUnlink: (combatantId: string) => void;
}

export function PlayerLinkDropdown({
  combatant,
  campaignId,
  allCombatants,
  onLink,
  onUnlink,
}: PlayerLinkDropdownProps) {
  const t = useTranslations("combat");
  const [characters, setCharacters] = useState<PlayerCharacterOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Already-linked character IDs in this encounter
  const linkedCharIds = new Set(
    allCombatants
      .filter((c) => c.player_character_id && c.id !== combatant.id)
      .map((c) => c.player_character_id!)
  );

  // Load characters from campaign on first open
  useEffect(() => {
    if (!open || loaded || !campaignId) return;
    const supabase = createClient();
    supabase
      .from("player_characters")
      .select("id, name, max_hp, ac, spell_save_dc")
      .eq("campaign_id", campaignId)
      .then(({ data }) => {
        setCharacters((data as PlayerCharacterOption[]) ?? []);
        setLoaded(true);
      });
  }, [open, loaded, campaignId]);

  // Already linked — show unlink button
  if (combatant.player_character_id) {
    return (
      <button
        type="button"
        onClick={() => {
          onUnlink(combatant.id);
          toast.success(t("player_unlinked"));
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/30 rounded hover:bg-amber-900/20 transition-colors"
        title={t("player_unlink")}
      >
        <Unlink className="w-3 h-3" />
        {t("player_unlink")}
      </button>
    );
  }

  // No campaign — can't link
  if (!campaignId) return null;

  // Not a player — don't show
  if (!combatant.is_player) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border rounded hover:text-foreground hover:border-gold/40 transition-colors"
        title={t("player_link_title")}
      >
        <Link2 className="w-3 h-3" />
        {t("player_link")}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 left-0 min-w-[200px] bg-card border border-border rounded-md shadow-lg py-1">
          {characters.length === 0 && loaded && (
            <p className="px-3 py-2 text-xs text-muted-foreground/60">
              {t("player_link_none")}
            </p>
          )}
          {!loaded && (
            <p className="px-3 py-2 text-xs text-muted-foreground/60">...</p>
          )}
          {characters.map((char) => {
            const isLinked = linkedCharIds.has(char.id);
            return (
              <button
                key={char.id}
                type="button"
                disabled={isLinked}
                onClick={() => {
                  onLink(combatant.id, char.id, char);
                  toast.success(t("player_linked", { name: char.name }));
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  isLinked
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-white/[0.06]"
                }`}
                title={isLinked ? t("player_link_already", { name: allCombatants.find((c) => c.player_character_id === char.id)?.name ?? "" }) : undefined}
              >
                <span className="font-medium">{char.name}</span>
                <span className="text-muted-foreground/60 ml-1.5">
                  HP {char.max_hp} · CA {char.ac}
                </span>
                {isLinked && (
                  <span className="text-muted-foreground/40 ml-1">
                    ({t("player_link_in_use")})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
