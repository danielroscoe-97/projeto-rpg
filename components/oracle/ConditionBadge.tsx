"use client";

import { useState } from "react";
import { findCondition } from "@/lib/srd/srd-search";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";

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
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorClass = CONDITION_COLORS[condition.toLowerCase()] ?? "bg-white/[0.1]";
  const conditionData = findCondition(condition);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${colorClass} hover:opacity-80 transition-opacity cursor-pointer`}
        aria-label={`View ${condition} rules`}
        data-testid={`condition-badge-${condition.toLowerCase()}`}
      >
        {condition}
      </button>
      {conditionData && (
        <ConditionRulesModal
          condition={conditionData}
          open={isOpen}
          onOpenChange={setIsOpen}
        />
      )}
    </>
  );
}

export { CONDITION_COLORS };
