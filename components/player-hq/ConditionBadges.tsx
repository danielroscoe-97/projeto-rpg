"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  EyeOff,
  HeartHandshake,
  EarOff,
  Ghost,
  Grip,
  Ban,
  Eye,
  Zap,
  Gem,
  Skull,
  ArrowDown,
  Lock,
  BrainCog,
  HeartOff,
  type LucideIcon,
} from "lucide-react";

const CONDITION_ICONS: Record<string, LucideIcon> = {
  blinded: EyeOff,
  charmed: HeartHandshake,
  deafened: EarOff,
  frightened: Ghost,
  grappled: Grip,
  incapacitated: Ban,
  invisible: Eye,
  paralyzed: Zap,
  petrified: Gem,
  poisoned: Skull,
  prone: ArrowDown,
  restrained: Lock,
  stunned: BrainCog,
  unconscious: HeartOff,
};

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
      <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
        {t("conditions_label")}
      </span>

      {/* All clear message when no conditions active */}
      {conditions.length === 0 && exhaustionLevel === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400/70 py-1">
          <span>✨</span>
          <span>{t("conditions_all_clear")}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {SRD_CONDITIONS.filter((c) => c !== "exhaustion").map((condition) => {
          const isActive = conditions.includes(condition);
          const Icon = CONDITION_ICONS[condition];
          return (
            <button
              key={condition}
              type="button"
              onClick={() => handleToggle(condition)}
              disabled={readOnly}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${
                isActive
                  ? "bg-red-500/25 border-red-500/60 text-red-200 font-semibold shadow-[0_0_6px_rgba(239,68,68,0.15)]"
                  : "bg-transparent border-border text-muted-foreground hover:border-white/20"
              } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
              aria-pressed={isActive}
            >
              {isActive && Icon && <Icon className="w-3 h-3" />}
              {t(`condition_${condition}`)}
            </button>
          );
        })}
      </div>

      {/* Exhaustion dropdown (6 levels) */}
      <div className={`flex items-center gap-2 mt-1 px-2 py-1.5 rounded-md transition-colors ${
        exhaustionLevel >= 4
          ? "bg-red-900/20 border border-red-500/30"
          : exhaustionLevel >= 2
            ? "bg-orange-900/15 border border-orange-500/20"
            : ""
      }`}>
        <span className={`text-[11px] font-medium ${
          exhaustionLevel >= 4
            ? "text-red-400"
            : exhaustionLevel >= 2
              ? "text-orange-400"
              : "text-muted-foreground"
        }`}>
          {t("condition_exhaustion")}
        </span>
        <select
          value={exhaustionLevel}
          onChange={(e) => {
            navigator.vibrate?.([30]);
            onExhaustionChange?.(Number(e.target.value));
          }}
          disabled={readOnly}
          className={`bg-background border rounded px-2 py-0.5 text-xs disabled:opacity-50 ${
            exhaustionLevel >= 4
              ? "border-red-500/40 text-red-300"
              : exhaustionLevel >= 2
                ? "border-orange-500/30 text-orange-300"
                : "border-border text-foreground"
          }`}
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
