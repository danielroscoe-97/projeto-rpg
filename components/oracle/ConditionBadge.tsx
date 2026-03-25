"use client";

import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { RulesetVersion } from "@/lib/types/database";

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
}

export function ConditionBadge({ condition, rulesetVersion = "2014" }: ConditionBadgeProps) {
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const colorClass = CONDITION_COLORS[condition.toLowerCase()] ?? "bg-white/[0.1]";

  return (
    <button
      type="button"
      onClick={() => pinCard("condition", condition.toLowerCase(), rulesetVersion)}
      className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
      aria-label={`View ${condition} rules`}
      data-testid={`condition-badge-${condition.toLowerCase()}`}
    >
      {condition}
    </button>
  );
}

export { CONDITION_COLORS };
