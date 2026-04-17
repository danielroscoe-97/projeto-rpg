"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, ChevronDown, Shield } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Combatant } from "@/lib/types/combat";

/**
 * Per-member health snapshot used by the group header to drive display
 * (pips, badges, colors — owned by Track D/E visual layer).
 *
 * Kept deliberately simple: raw HP values + derived pct/tier so downstream
 * components don't have to re-reason about math.
 */
export interface GroupHealthMember {
  id: string;
  current_hp: number;
  max_hp: number;
  is_defeated: boolean;
  /** current_hp / max_hp clamped to [0, 1]; 0 when max_hp === 0 */
  pct: number;
  /** healthy (>50%), warning (≤50%), critical (≤25%), unknown (max_hp <= 0) */
  tier: "healthy" | "warning" | "critical" | "unknown";
}

export interface GroupHealth {
  /** Per-member breakdown (alive only). */
  members: GroupHealthMember[];
  /** Minimum current_hp among alive members (0 if none alive). */
  min: number;
  /** Maximum current_hp among alive members (0 if none alive). */
  max: number;
  /** Median current_hp among alive members (0 if none alive). */
  median: number;
  /** Members with tier === "critical". */
  criticalCount: number;
  /** Alive member count (is_defeated === false). */
  membersAlive: number;
  /** Total member count (alive + defeated). */
  membersTotal: number;
}

function computeTier(hp: number, maxHp: number): GroupHealthMember["tier"] {
  if (maxHp <= 0) return "unknown";
  const pct = hp / maxHp;
  if (pct <= 0.25) return "critical";
  if (pct <= 0.5) return "warning";
  return "healthy";
}

/** Pure helper — exported for unit tests. */
export function buildGroupHealth(members: Combatant[]): GroupHealth {
  const alive = members.filter((m) => !m.is_defeated);
  const breakdown: GroupHealthMember[] = alive.map((m) => ({
    id: m.id,
    current_hp: m.current_hp,
    max_hp: m.max_hp,
    is_defeated: m.is_defeated,
    pct: m.max_hp > 0 ? Math.max(0, Math.min(1, m.current_hp / m.max_hp)) : 0,
    tier: computeTier(m.current_hp, m.max_hp),
  }));

  const hps = breakdown.map((m) => m.current_hp);
  let min = 0;
  let max = 0;
  let median = 0;
  if (hps.length > 0) {
    min = Math.min(...hps);
    max = Math.max(...hps);
    const sorted = [...hps].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  return {
    members: breakdown,
    min,
    max,
    median,
    criticalCount: breakdown.filter((m) => m.tier === "critical").length,
    membersAlive: alive.length,
    membersTotal: members.length,
  };
}

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

  // Finding 3 (spike 2026-04-17): no longer sum current_hp across members —
  // summed HP masks which individual monster is critical. Instead expose a
  // granular `groupHealth` shape (min/max/median/criticalCount) that the
  // visual layer (UX spec H9, Track D/E) consumes for pip/dot/badge rendering.
  const groupHealth = buildGroupHealth(members);
  const activeMembers = members.filter((m) => !m.is_defeated);
  const totalMembers = groupHealth.membersTotal;
  const allDefeated = groupHealth.membersAlive === 0;

  // Condition summary for collapsed view
  const conditionCounts = new Map<string, number>();
  activeMembers.forEach((m) => {
    m.conditions.forEach((c) => {
      conditionCounts.set(c, (conditionCounts.get(c) || 0) + 1);
    });
  });

  // A.8: Debounce toggle to prevent rapid expand/collapse from double-click or event bubbling
  const lastToggleRef = useRef(0);
  const debouncedToggle = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 200) return;
    lastToggleRef.current = now;
    onToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation(); // A.8
      debouncedToggle();
    } else if (e.key === "ArrowRight" && !isExpanded) {
      e.preventDefault();
      debouncedToggle();
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      debouncedToggle();
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
        onClick={(e) => { e.stopPropagation(); debouncedToggle(); }}
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

        {/* AC badge — shared AC from first member (BT2-09) */}
        {members[0]?.ac > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground shrink-0 bg-white/[0.06] rounded px-1.5 py-0.5"
            title={t("ac_label")}
          >
            <Shield className="w-3 h-3" aria-hidden="true" />
            {members[0].ac}
          </span>
        )}

        {/* Group HP summary (collapsed only).
            Finding 3: replaced summed HP bar with min–max range + critical count so
            DM can spot which member is in trouble without expanding the group.
            Visual pips/dots final pass is owned by Track D (UX spec H9) — these
            data-* attributes let that layer render without re-computing. */}
        {!isExpanded && groupHealth.membersAlive > 0 && (
          <div
            className="flex items-center gap-2 flex-shrink-0"
            data-group-health-min={groupHealth.min}
            data-group-health-max={groupHealth.max}
            data-group-health-median={groupHealth.median}
            data-group-health-critical={groupHealth.criticalCount}
            data-group-health-alive={groupHealth.membersAlive}
            data-group-health-total={groupHealth.membersTotal}
          >
            <span className="text-xs font-mono text-muted-foreground">
              {groupHealth.min === groupHealth.max
                ? `${groupHealth.min} HP`
                : `${groupHealth.min}–${groupHealth.max} HP`}
            </span>
            {groupHealth.criticalCount > 0 && (
              <span
                className="text-[10px] px-1 py-0.5 rounded bg-red-900/30 text-red-400 font-medium"
                title={`${groupHealth.criticalCount} crítico(s)`}
                aria-label={`${groupHealth.criticalCount} critical`}
              >
                {groupHealth.criticalCount} !
              </span>
            )}
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
