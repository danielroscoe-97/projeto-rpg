"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  calculateDifficulty,
  crToXP,
  type FormulaVersion,
  type DifficultyLevel,
} from "@/lib/utils/cr-calculator";

interface Props {
  partyLevel: number;
  partySize: number;
  monsters: Array<{ cr: string; count: number }>;
  formulaVersion: FormulaVersion;
  playerLevels?: number[];
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: "text-green-400 bg-green-500/10 border-green-600",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-600",
  hard: "text-orange-400 bg-orange-500/10 border-orange-600",
  deadly: "text-red-400 bg-red-500/10 border-red-600",
};

const BAR_COLORS: Record<DifficultyLevel, string> = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-orange-500",
  deadly: "bg-red-500",
};

export function EncounterDifficultyBar({ partyLevel, partySize, monsters, formulaVersion, playerLevels }: Props) {
  const t = useTranslations("encounter_builder");

  // Expand monsters: [{cr: "1/4", count: 3}] → [{cr: "1/4"}, {cr: "1/4"}, {cr: "1/4"}]
  const expandedMonsters = useMemo(() => {
    const result: Array<{ cr: string }> = [];
    for (const m of monsters) {
      for (let i = 0; i < m.count; i++) {
        result.push({ cr: m.cr });
      }
    }
    return result;
  }, [monsters]);

  const totalCount = useMemo(() => monsters.reduce((s, m) => s + m.count, 0), [monsters]);

  const { difficulty, totalValue, thresholds } = useMemo(
    () => calculateDifficulty(formulaVersion, partyLevel, partySize, expandedMonsters),
    [formulaVersion, partyLevel, partySize, expandedMonsters]
  );

  // Raw XP for display (2014 only — 2024 uses CR budget)
  const rawXP = useMemo(() => {
    if (formulaVersion === "2024") return null;
    return monsters.reduce((sum, m) => sum + crToXP(m.cr) * m.count, 0);
  }, [monsters, formulaVersion]);

  const multiplier = useMemo(() => {
    if (formulaVersion === "2024" || !rawXP || rawXP === 0) return null;
    return Math.round((totalValue / rawXP) * 100) / 100;
  }, [formulaVersion, rawXP, totalValue]);

  const isEmpty = totalCount === 0;
  const difficultyLabel = isEmpty ? "trivial" : difficulty;
  const colorClass = isEmpty
    ? "text-gray-400 bg-gray-500/10 border-gray-600"
    : DIFFICULTY_COLORS[difficulty];

  return (
    <div className="rounded-xl border border-white/[0.04] bg-card p-4 sticky top-20 space-y-4">
      {/* Difficulty badge */}
      <div className={`rounded-xl border-2 p-4 text-center ${colorClass}`}>
        <p className="text-xs opacity-70 mb-1">{t("difficulty")}</p>
        <p className="text-2xl font-bold font-[family-name:var(--font-cinzel)] uppercase">
          {t(`diff_${difficultyLabel}`)}
        </p>
      </div>

      {/* XP breakdown */}
      <div className="space-y-2 text-sm">
        {formulaVersion === "2014" && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">{t("total_xp")}</span>
              <span className="text-foreground font-mono">{(rawXP ?? 0).toLocaleString()}</span>
            </div>
            {multiplier != null && (
              <div className="flex justify-between">
                <span className="text-gray-400">{t("multiplier")}</span>
                <span className="text-foreground font-mono">&times;{multiplier}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between border-t border-gray-800 pt-2">
          <span className="text-amber-400 font-semibold">
            {formulaVersion === "2024" ? t("total_cr") : t("adjusted_xp")}
          </span>
          <span className="text-amber-400 font-bold font-mono">{totalValue.toLocaleString()}</span>
        </div>
        {rawXP != null && partySize > 0 && totalCount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t("per_player")}</span>
            <span className="text-gray-400 font-mono">
              {Math.round(rawXP / partySize).toLocaleString()} XP
            </span>
          </div>
        )}
      </div>

      {/* Thresholds */}
      <div>
        <p className="text-xs text-gray-500 mb-2">{t("thresholds")}</p>
        <div className="space-y-1.5">
          {(["easy", "medium", "hard", "deadly"] as const).map((level, i) => {
            const threshold = thresholds[i];
            const pct = threshold > 0 ? Math.min(100, (totalValue / threshold) * 100) : 0;
            return (
              <div key={level} className="flex items-center gap-2">
                <span className={`text-xs w-14 ${DIFFICULTY_COLORS[level].split(" ")[0]}`}>
                  {t(`diff_${level}`)}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${BAR_COLORS[level]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 font-mono w-12 text-right">
                  {threshold.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Party info */}
      <div className="space-y-1.5 border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {partySize} {t("players")} &middot; {t("level_abbr")} {partyLevel}
          </span>
          <span>
            {totalCount} {t("monsters_count")}
          </span>
        </div>
        {playerLevels && playerLevels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {playerLevels.map((lv, i) => (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
              >
                {t("level_abbr")} {lv}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pocket DM label */}
      <div className="flex items-center justify-center pt-2">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 text-amber-400/60 bg-amber-500/5"
          title={t("pocket_dm_tooltip")}
        >
          Pocket DM (Beta)
        </span>
      </div>
    </div>
  );
}
