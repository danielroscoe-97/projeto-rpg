"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

const SRD_CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
] as const;

const EXHAUSTION_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

interface ConditionBadgesProps {
  conditions: string[];
  exhaustionLevel?: number;
  readOnly?: boolean;
  onToggleCondition: (condition: string) => void;
  onExhaustionChange?: (level: number) => void;
}

export function ConditionBadges({
  conditions,
  exhaustionLevel = 0,
  readOnly = false,
  onToggleCondition,
  onExhaustionChange,
}: ConditionBadgesProps) {
  const t = useTranslations("player_hq.sheet");

  const handleToggle = useCallback(
    (condition: string) => {
      if (readOnly) return;
      navigator.vibrate?.([30]);
      onToggleCondition(condition);
    },
    [readOnly, onToggleCondition]
  );

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t("conditions_label")}
      </span>

      <div className="flex flex-wrap gap-1.5">
        {SRD_CONDITIONS.filter((c) => c !== "exhaustion").map((condition) => {
          const isActive = conditions.includes(condition);
          return (
            <button
              key={condition}
              type="button"
              onClick={() => handleToggle(condition)}
              disabled={readOnly}
              className={`px-2 py-1 text-[11px] rounded-full border transition-all duration-200 ${
                isActive
                  ? "bg-red-500/20 border-red-500/40 text-red-300 font-medium"
                  : "bg-transparent border-border text-muted-foreground hover:border-white/20"
              } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
              aria-pressed={isActive}
            >
              {t(`condition_${condition}`)}
            </button>
          );
        })}
      </div>

      {/* Exhaustion dropdown (6 levels) */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[11px] text-muted-foreground">
          {t("condition_exhaustion")}
        </span>
        <select
          value={exhaustionLevel}
          onChange={(e) => {
            navigator.vibrate?.([30]);
            onExhaustionChange?.(Number(e.target.value));
          }}
          disabled={readOnly}
          className="bg-background border border-border rounded px-2 py-0.5 text-xs text-foreground disabled:opacity-50"
          aria-label={t("condition_exhaustion")}
        >
          {EXHAUSTION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level === 0 ? "—" : `${level}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
