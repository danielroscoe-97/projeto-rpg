"use client";

import { useTranslations } from "next-intl";
import { Shield, Zap, Footprints, Sparkles } from "lucide-react";
const ABILITY_SCORES = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int_score", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha_score", label: "CHA" },
] as const;

type AbilityKey = (typeof ABILITY_SCORES)[number]["key"];

function getModifier(score: number | null): string {
  if (score == null) return "—";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

interface CharacterCoreStatsProps {
  ac: number;
  initiativeBonus: number | null;
  speed: number | null;
  inspiration: boolean;
  spellSaveDc: number | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  intScore: number | null;
  wis: number | null;
  chaScore: number | null;
  onToggleInspiration: () => void;
}

export function CharacterCoreStats({
  ac,
  initiativeBonus,
  speed,
  inspiration,
  spellSaveDc,
  str,
  dex,
  con,
  intScore,
  wis,
  chaScore,
  onToggleInspiration,
}: CharacterCoreStatsProps) {
  const t = useTranslations("player_hq.sheet");

  const abilityValues: Record<AbilityKey, number | null> = {
    str,
    dex,
    con,
    int_score: intScore,
    wis,
    cha_score: chaScore,
  };

  const hasAnyAbility = Object.values(abilityValues).some((v) => v != null);

  return (
    <div className="space-y-3">
      {/* Core stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* AC */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">{ac}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("ac_label")}</p>
        </div>

        {/* Initiative */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {initiativeBonus != null ? (initiativeBonus >= 0 ? `+${initiativeBonus}` : initiativeBonus) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("init_label")}</p>
        </div>

        {/* Speed */}
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <Footprints className="w-4 h-4 text-amber-400 mx-auto mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {speed != null ? `${speed}ft` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("speed_label")}</p>
        </div>

        {/* Inspiration */}
        <button
          type="button"
          onClick={onToggleInspiration}
          className={`bg-card border rounded-lg p-3 text-center transition-all ${
            inspiration
              ? "border-amber-400/50 bg-amber-400/10"
              : "border-border"
          }`}
          aria-pressed={inspiration}
          aria-label={t("inspiration_label")}
        >
          <Sparkles
            className={`w-4 h-4 mx-auto mb-1 transition-colors ${
              inspiration ? "text-amber-400" : "text-muted-foreground"
            }`}
            aria-hidden="true"
          />
          <p className={`text-lg font-bold ${inspiration ? "text-amber-400" : "text-muted-foreground"}`}>
            {inspiration ? "!" : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase">{t("inspiration_label")}</p>
        </button>
      </div>

      {/* Spell Save DC (if set) */}
      {spellSaveDc != null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-950/20 border border-purple-500/20 rounded-md">
          <span className="text-xs text-purple-300 font-medium">{t("spell_save_dc")}</span>
          <span className="text-sm font-bold tabular-nums text-purple-200 ml-auto">
            {spellSaveDc}
          </span>
        </div>
      )}

      {/* Ability Scores — always visible (EP-1 A2: accordion killed per 09-implementation-plan.md §A2) */}
      {hasAnyAbility && (
        <div
          className="bg-card border border-border rounded-xl px-4 py-3"
          role="group"
          aria-label={t("attributes_label")}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            {t("attributes_label")}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ABILITY_SCORES.map(({ key, label }) => {
              const score = abilityValues[key];
              return (
                <div
                  key={key}
                  className="bg-background/50 border border-border rounded-lg p-2 text-center"
                  data-testid={`ability-chip-${key}`}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {getModifier(score)}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {score ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
