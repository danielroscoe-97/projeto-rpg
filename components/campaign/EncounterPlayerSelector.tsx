"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, User, Heart, Shield, Sparkles, ChevronDown } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";

interface Props {
  characters: PlayerCharacter[];
  selectedCharacterIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onLevelChange?: (charId: string, level: number | null) => void;
}

export function EncounterPlayerSelector({
  characters,
  selectedCharacterIds,
  onSelectionChange,
  onLevelChange,
}: Props) {
  const t = useTranslations("encounter_builder");
  const [collapsed, setCollapsed] = useState(false);

  const allSelected =
    characters.length > 0 && characters.every((c) => selectedCharacterIds.includes(c.id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(characters.map((c) => c.id));
    }
  }

  function toggleCharacter(charId: string) {
    if (selectedCharacterIds.includes(charId)) {
      onSelectionChange(selectedCharacterIds.filter((id) => id !== charId));
    } else {
      onSelectionChange([...selectedCharacterIds, charId]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 group"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${
              collapsed ? "-rotate-90" : ""
            }`}
          />
          <h3 className="text-sm font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
            {t("player_selector_title")}
          </h3>
          {collapsed && selectedCharacterIds.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">
              ({selectedCharacterIds.length})
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? t("deselect_all") : t("select_all")}
          </button>
        )}
      </div>

      {!collapsed && characters.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">{t("no_players")}</p>
      ) : null}

      {!collapsed && characters.length > 0 ? (
        <div className="space-y-1.5">
          {characters.map((char) => {
            const isSelected = selectedCharacterIds.includes(char.id);
            const hasLevel = char.level != null;
            const subtitle = [char.race, char.class].filter(Boolean).join(" ");

            return (
              <button
                key={char.id}
                type="button"
                onClick={() => toggleCharacter(char.id)}
                className={`group/player w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 text-left ${
                  isSelected
                    ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_12px_-6px_rgba(251,191,36,0.15)]"
                    : "border-white/[0.04] bg-card/50 opacity-60 hover:opacity-80"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-amber-500 border-amber-500"
                      : "border-zinc-600 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-black" />}
                </div>

                {/* Token avatar */}
                <div className="shrink-0 relative">
                  {char.token_url ? (
                    <img
                      src={char.token_url}
                      alt={char.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/25 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-600/10 ring-2 ring-amber-400/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-400/60" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {char.name}
                  </p>
                  {subtitle && (
                    <p className="text-[11px] text-muted-foreground/70 truncate">{subtitle}</p>
                  )}
                </div>

                {/* Stat badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Inline level editor */}
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      hasLevel
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {onLevelChange ? (
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={char.level ?? ""}
                        placeholder="—"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            onLevelChange(char.id, null);
                            return;
                          }
                          const val = Math.min(20, Math.max(1, parseInt(raw) || 1));
                          onLevelChange(char.id, val);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "" && char.level == null) return;
                          if (e.target.value === "") {
                            onLevelChange(char.id, 1);
                          }
                        }}
                        className="w-6 h-4 text-center text-[10px] font-medium bg-transparent border-none outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                    ) : (
                      <span>{char.level ?? "—"}</span>
                    )}
                  </span>
                  {char.max_hp > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/15">
                      <Heart className="w-2.5 h-2.5" />
                      {char.max_hp}
                    </span>
                  )}
                  {char.ac > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/15">
                      <Shield className="w-2.5 h-2.5" />
                      {char.ac}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!collapsed && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <span>
            {selectedCharacterIds.length} {t("selected_count")}
          </span>
        </div>
      )}
    </div>
  );
}
