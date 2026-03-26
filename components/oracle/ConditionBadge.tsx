"use client";

import { useTranslations } from "next-intl";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { RulesetVersion } from "@/lib/types/database";
import type { LucideIcon } from "lucide-react";
import {
  EyeOff, Heart, AlertTriangle, Grip, CircleX, Eye,
  Zap, Mountain, Droplet, ArrowDown, Link, Star, Moon,
} from "lucide-react";

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

interface ConditionBadgeProps {
  condition: string;
  rulesetVersion?: RulesetVersion;
  /** When provided, a ✕ button is shown to remove the condition directly. */
  onRemove?: (condition: string) => void;
}

export function ConditionBadge({ condition, rulesetVersion = "2014", onRemove }: ConditionBadgeProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("conditions");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const colorClass = CONDITION_COLORS[condition.toLowerCase()] ?? "bg-white/[0.1]";
  const localizedName = tc(condition.toLowerCase());
  const IconComponent = CONDITION_ICONS[condition.toLowerCase()];

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs text-white font-medium ${colorClass}`}
      data-testid={`condition-badge-${condition.toLowerCase()}`}
    >
      <button
        type="button"
        onClick={() => pinCard("condition", condition.toLowerCase(), rulesetVersion)}
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
        aria-label={t("condition_view_aria", { name: localizedName })}
      >
        {IconComponent && <IconComponent className="w-3 h-3 shrink-0" aria-hidden="true" />}
        {condition}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(condition); }}
          className="ml-0.5 hover:text-red-300 transition-colors text-white/70 text-[10px] leading-none min-w-[16px] min-h-[16px] flex items-center justify-center"
          aria-label={t("condition_remove_aria", { name: localizedName })}
          data-testid={`condition-remove-${condition.toLowerCase()}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}

export { CONDITION_COLORS };
