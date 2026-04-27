"use client";

import { useTranslations } from "next-intl";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { RulesetVersion } from "@/lib/types/database";
import type { LucideIcon } from "lucide-react";
import { BENEFICIAL_CONDITIONS } from "@/components/combat/ConditionSelector";
import { isCustomCondition, parseCustomCondition } from "@/lib/combat/custom-conditions";
import { isQuickAction, getQuickActionKind, type QuickAction } from "@/lib/combat/quick-actions";
import {
  EyeOff, Heart, AlertTriangle, Grip, CircleX, Eye,
  Zap, Mountain, Droplet, ArrowDown, Link, Star, Moon,
  Focus, Sparkles,
  Shield, Timer,
} from "lucide-react";

/** Quick-action icon map (matches ConditionSelector). */
const QUICK_ACTION_BADGE_ICON: Record<QuickAction, LucideIcon> = {
  dodge: Shield,
  ready: Timer,
};

/** Condition icon mapping for WCAG 2.1 AA 1.4.1 — not color-only */
export const CONDITION_ICONS: Record<string, LucideIcon> = {
  blinded: EyeOff,
  charmed: Heart,
  frightened: AlertTriangle,
  grappled: Grip,
  incapacitated: CircleX,
  invisible: Eye,
  paralyzed: Zap,
  petrified: Mountain,
  poisoned: Droplet,
  prone: ArrowDown,
  restrained: Link,
  stunned: Star,
  unconscious: Moon,
};

/** Condition badge color mapping (UX-DR5) */
const CONDITION_COLORS: Record<string, string> = {
  blinded: "bg-gray-600",
  charmed: "bg-pink-700",
  frightened: "bg-orange-700",
  grappled: "bg-yellow-700",
  incapacitated: "bg-red-800",
  invisible: "bg-blue-800",
  paralyzed: "bg-purple-700",
  petrified: "bg-stone-600",
  poisoned: "bg-green-800",
  prone: "bg-amber-800",
  restrained: "bg-cyan-800",
  stunned: "bg-violet-700",
  unconscious: "bg-slate-700",
};

const CIRCLED_DIGITS = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
function circledNumber(n: number): string {
  return n >= 0 && n < CIRCLED_DIGITS.length ? CIRCLED_DIGITS[n] : `(${n})`;
}

interface ConditionBadgeProps {
  condition: string;
  rulesetVersion?: RulesetVersion;
  onRemove?: (condition: string) => void;
  turnCount?: number;
}

export function ConditionBadge({ condition, rulesetVersion = "2014", onRemove, turnCount }: ConditionBadgeProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("conditions");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

  // S4.2: detect DM-authored custom condition BEFORE concentrating/exhaustion
  // parsers. Custom format is `custom:Name|Description`.
  if (isCustomCondition(condition)) {
    const { name, description } = parseCustomCondition(condition);
    const ariaLabel = description
      ? `${t("custom_condition_aria", { name })}. ${description}`
      : t("custom_condition_aria", { name });
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gold/15 text-gold border border-gold/30"
        title={description ?? name}
        aria-label={ariaLabel}
        data-testid={`condition-badge-custom-${name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[140px]">{name}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(condition); }}
            className="ml-0.5 hover:text-red-400 transition-colors text-gold/70 text-[10px] leading-none min-w-[16px] min-h-[16px] flex items-center justify-center"
            aria-label={t("condition_remove_aria", { name })}
            data-testid={`condition-remove-custom-${name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            ✕
          </button>
        )}
      </span>
    );
  }

  // S4.3: detect quick action (action:dodge, action:dash, …) BEFORE the generic
  // badge render so it gets its own blue tone + lucide icon (no raw prefix).
  if (isQuickAction(condition)) {
    const kind = getQuickActionKind(condition);
    if (kind) {
      const QAIcon = QUICK_ACTION_BADGE_ICON[kind];
      const label = t(`action_${kind}`);
      const desc = t(`action_${kind}_desc`);
      return (
        <span
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-900/40 text-sky-200 border border-sky-500/40"
          title={desc}
          aria-label={`${label}. ${desc}`}
          role="status"
          data-testid={`condition-badge-action-${kind}`}
        >
          <QAIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{label}</span>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(condition); }}
              className="ml-0.5 hover:text-red-400 transition-colors text-sky-200/70 text-[10px] leading-none min-w-[16px] min-h-[16px] flex items-center justify-center"
              aria-label={t("condition_remove_aria", { name: label })}
              data-testid={`condition-remove-action-${kind}`}
            >
              ✕
            </button>
          )}
        </span>
      );
    }
  }

  // Handle "concentrating" and "concentrating:SpellName" as a special condition
  const isConcentration = condition === "concentrating" || condition.startsWith("concentrating:");
  const concentrationSpell = isConcentration && condition.includes(":")
    ? condition.split(":")[1]
    : null;

  const isBeneficial = (BENEFICIAL_CONDITIONS as readonly string[]).includes(condition);
  const colorClass = isConcentration
    ? "bg-purple-600"
    : isBeneficial
    ? "bg-emerald-600"
    : (CONDITION_COLORS[condition.toLowerCase()] ?? "bg-white/[0.1]");
  const displayName = isConcentration
    ? (concentrationSpell ? t("concentration_with_spell", { spell: concentrationSpell }) : t("concentration_label"))
    : tc(condition.toLowerCase());
  const IconComponent = isConcentration ? Focus : CONDITION_ICONS[condition.toLowerCase()];

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs text-white font-medium ${colorClass}`}
      data-testid={`condition-badge-${isConcentration ? "concentrating" : condition.toLowerCase()}`}
    >
      <button
        type="button"
        onClick={() => {
          if (!isConcentration) pinCard("condition", condition.toLowerCase(), rulesetVersion);
        }}
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
        aria-label={isConcentration ? displayName : t("condition_view_aria", { name: displayName })}
      >
        {IconComponent && <IconComponent className="w-3 h-3 shrink-0" aria-hidden="true" />}
        {displayName}
        {turnCount != null && turnCount > 0 && (
          <span className="ml-0.5 text-white/80 text-[10px]" title={t("condition_turn_count", { count: turnCount })}>
            {circledNumber(turnCount)}
          </span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(condition); }}
          className="ml-0.5 hover:text-red-300 transition-colors text-white/70 text-[10px] leading-none min-w-[16px] min-h-[16px] flex items-center justify-center"
          aria-label={t("condition_remove_aria", { name: displayName })}
          data-testid={`condition-remove-${isConcentration ? "concentrating" : condition.toLowerCase()}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}

export { CONDITION_COLORS };
