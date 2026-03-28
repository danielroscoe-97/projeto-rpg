"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getHpBarColor } from "@/lib/utils/hp-status";
import type { Combatant } from "@/lib/types/combat";

interface MonsterGroupHeaderProps {
  /** The base monster name (e.g. "Goblin") */
  groupName: string;
  /** All members of this group */
  members: Combatant[];
  /** Whether the group is expanded */
  isExpanded: boolean;
  /** Toggle expand/collapse */
  onToggle: () => void;
  /** The group's shared initiative value (most common among members) */
  groupInitiative: number | null;
  /** Called when DM edits the group initiative */
  onSetGroupInitiative?: (value: number) => void;
  /** Whether it's the turn of any member in this group */
  isCurrentTurn?: boolean;
  /** Children — the expanded member rows */
  children: React.ReactNode;
}

export function MonsterGroupHeader({
  groupName,
  members,
  isExpanded,
  onToggle,
  groupInitiative,
  onSetGroupInitiative,
  isCurrentTurn = false,
  children,
}: MonsterGroupHeaderProps) {
  const t = useTranslations("combat");
  const [editingInit, setEditingInit] = useState(false);
  const [initValue, setInitValue] = useState("");

  const activeMembers = members.filter((m) => !m.is_defeated);
  const totalMembers = members.length;
  const allDefeated = activeMembers.length === 0;

  // Aggregated HP for collapsed view
  const totalCurrentHp = activeMembers.reduce((sum, m) => sum + m.current_hp, 0);
  const totalMaxHp = activeMembers.reduce((sum, m) => sum + m.max_hp, 0);
  const hpPct = totalMaxHp > 0 ? Math.max(0, Math.min(1, totalCurrentHp / totalMaxHp)) : 0;
  const hpBarColor = totalMaxHp > 0 ? getHpBarColor(totalCurrentHp, totalMaxHp) : "bg-zinc-600";

  // Condition summary for collapsed view
  const conditionCounts = new Map<string, number>();
  activeMembers.forEach((m) => {
    m.conditions.forEach((c) => {
      conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
    });
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    } else if (e.key === "ArrowRight" && !isExpanded) {
      e.preventDefault();
      onToggle();
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      onToggle();
    }
  };

  const handleInitBlur = () => {
    const val = parseInt(initValue, 10);
    if (!isNaN(val) && onSetGroupInitiative) {
      onSetGroupInitiative(Math.min(50, Math.max(-5, val)));
    }
    setEditingInit(false);
  };

  return (
    <div
      className={`border rounded-md overflow-hidden transition-colors border-l-4 border-l-orange-500/60 ${
        isCurrentTurn && !allDefeated ? "border-gold bg-gold/[0.07] ring-1 ring-gold/30" : ""
      } ${allDefeated ? "opacity-50 border-border" : "border-border"}`}
      data-testid={`monster-group-${groupName}`}
    >
      {/* Header bar */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 px-3 py-1.5 bg-card cursor-pointer hover:bg-white/[0.04] transition-colors"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        data-testid={`group-header-${groupName}`}
      >
        {/* Chevron */}
        <span className="text-muted-foreground/60 flex-shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* Initiative badge */}
        {editingInit ? (
          <input
            type="number"
            value={initValue}
            onChange={(e) => setInitValue(e.target.value)}
            onBlur={handleInitBlur}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingInit(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-14 bg-transparent border border-gold/60 rounded px-1 py-0.5 text-gold text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoFocus
            aria-label={t("group_edit_initiative_aria", { name: groupName })}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInitValue(groupInitiative !== null ? String(groupInitiative) : "");
              setEditingInit(true);
            }}
            className="flex-shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground text-[10px] font-mono hover:text-gold hover:bg-gold/10 transition-colors"
            title={t("group_edit_initiative_title")}
          >
            Init. {groupInitiative ?? "—"}
          </button>
        )}

        {/* Group name + count */}
        <span className="text-sm font-medium text-foreground flex-1 min-w-0">
          {groupName}
          <span className="text-muted-foreground/60 ml-1 text-xs font-normal">
            ({activeMembers.length}/{totalMembers} {t("group_active")})
          </span>
        </span>

        {/* Aggregated HP bar (collapsed only) */}
        {!isExpanded && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-mono text-muted-foreground">
              {totalCurrentHp}/{totalMaxHp}
            </span>
            <div className="w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hpBarColor}`}
                style={{ width: `${hpPct * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Condition summary (collapsed only) */}
        {!isExpanded && conditionCounts.size > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {Array.from(conditionCounts).slice(0, 3).map(([cond, count]) => (
              <span key={cond} className="text-[10px] px-1 py-0.5 bg-amber-900/30 text-amber-400 rounded">
                {cond}{count > 1 ? ` x${count}` : ""}
              </span>
            ))}
            {conditionCounts.size > 3 && (
              <span className="text-[10px] text-muted-foreground/50">
                +{conditionCounts.size - 3}
              </span>
            )}
          </div>
        )}

        {/* Defeated badge */}
        {allDefeated && (
          <span className="text-xs text-red-400 font-medium flex-shrink-0">
            {t("defeated")}
          </span>
        )}
      </div>

      {/* Expanded members */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-border"
          >
            <div className="space-y-1 p-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Get the most common initiative value among group members. */
export function getGroupInitiative(members: Combatant[]): number | null {
  const counts = new Map<number, number>();
  for (const m of members) {
    if (m.initiative !== null) {
      counts.set(m.initiative, (counts.get(m.initiative) || 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  let bestVal = 0;
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      bestVal = val;
      bestCount = count;
    }
  }
  return bestVal;
}

/** Extract the base monster name from a numbered name (e.g. "Goblin 3" → "Goblin"). */
export function getGroupBaseName(members: Combatant[]): string {
  if (members.length === 0) return "";
  // Use the first member's name, strip trailing " N"
  const first = members[0].name;
  const match = first.match(/^(.+?)\s+\d+$/);
  return match ? match[1] : first;
}
