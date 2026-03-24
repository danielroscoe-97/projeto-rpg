"use client";

import { useState, useEffect } from "react";
import { getMonsterById } from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { VersionBadge } from "@/components/session/RulesetSelector";
import type { Combatant } from "@/lib/types/combat";

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

function getHpBarColor(current: number, max: number): string {
  if (max === 0) return "bg-gray-500";
  const pct = current / max;
  if (pct > 0.5) return "bg-green-500";
  if (pct > 0.25) return "bg-amber-400";
  return "bg-red-500";
}

interface CombatantRowProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
}

export function CombatantRow({ combatant, isCurrentTurn }: CombatantRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hpPct = combatant.max_hp > 0
    ? Math.max(0, Math.min(1, combatant.current_hp / combatant.max_hp))
    : 0;
  const hpBarColor = getHpBarColor(combatant.current_hp, combatant.max_hp);
  const hasTempHp = combatant.temp_hp > 0;

  // Look up full monster data for stat block expansion
  const fullMonster =
    combatant.monster_id && combatant.ruleset_version
      ? getMonsterById(combatant.monster_id, combatant.ruleset_version)
      : undefined;
  const canExpand = fullMonster !== undefined;

  // Reset expansion if the monster data is no longer available (e.g. SRD reload)
  useEffect(() => {
    if (!canExpand) setIsExpanded(false);
  }, [canExpand]);

  const handleToggle = () => {
    if (canExpand) setIsExpanded((prev) => !prev);
  };

  return (
    <li
      className={`bg-[#16213e] border rounded-md overflow-hidden transition-colors ${
        isCurrentTurn ? "border-[#e94560]" : "border-white/10"
      } ${combatant.is_defeated ? "opacity-50" : ""}`}
      role="listitem"
      aria-current={isCurrentTurn ? "true" : undefined}
      data-testid={`combatant-row-${combatant.id}`}
    >
      {/* === ZERO-TAP TIER: always visible === */}
      <div className="px-4 py-3">
        {/* Name row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Turn indicator */}
          {isCurrentTurn && (
            <span
              className="w-2 h-2 rounded-full bg-[#e94560] shrink-0"
              aria-label="Current turn"
              data-testid="current-turn-indicator"
            />
          )}

          {/* Name — clickable to expand if monster */}
          <button
            type="button"
            onClick={handleToggle}
            className={`flex-1 text-left text-sm font-medium transition-colors ${
              canExpand
                ? "text-white hover:text-[#e94560] cursor-pointer"
                : "text-white cursor-default"
            }`}
            aria-expanded={canExpand ? isExpanded : undefined}
            aria-controls={canExpand ? `stat-block-combatant-${combatant.id}` : undefined}
            disabled={!canExpand}
            data-testid={`combatant-name-${combatant.id}`}
          >
            {combatant.name}
            {canExpand && (
              <span className="text-white/30 text-xs ml-1" aria-hidden="true">
                {isExpanded ? " ▲" : " ▼"}
              </span>
            )}
          </button>

          {/* Version badge for monsters */}
          {combatant.ruleset_version && combatant.monster_id && (
            <VersionBadge version={combatant.ruleset_version} />
          )}

          {/* Defeated badge */}
          {combatant.is_defeated && (
            <span className="text-xs text-red-400 font-medium" data-testid="defeated-badge">
              Defeated
            </span>
          )}
        </div>

        {/* HP bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 text-xs">HP</span>
            <span className="text-white/70 text-xs font-mono" data-testid={`hp-display-${combatant.id}`}>
              {combatant.current_hp} / {combatant.max_hp}
              {hasTempHp && (
                <span className="text-[#9f7aea] ml-1" data-testid={`temp-hp-${combatant.id}`}>
                  +{combatant.temp_hp} temp
                </span>
              )}
            </span>
          </div>
          <div
            className="h-2 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={combatant.current_hp}
            aria-valuemin={0}
            aria-valuemax={combatant.max_hp}
            aria-label={`${combatant.name} hit points`}
          >
            <div
              className={`h-full rounded-full transition-all ${hpBarColor}`}
              style={{ width: `${hpPct * 100}%` }}
              data-testid={`hp-bar-${combatant.id}`}
            />
          </div>
        </div>

        {/* Condition badges */}
        {combatant.conditions.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label={`${combatant.name} conditions`}
            data-testid={`conditions-${combatant.id}`}
          >
            {combatant.conditions.map((condition) => {
              const colorClass =
                CONDITION_COLORS[condition.toLowerCase()] ?? "bg-white/20";
              return (
                <span
                  key={condition}
                  role="listitem"
                  className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${colorClass}`}
                >
                  {condition}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* === ONE-TAP TIER: AC, DC, stat block === */}
      {isExpanded && fullMonster && (
        <div
          id={`stat-block-combatant-${combatant.id}`}
          className="border-t border-white/10 px-4 pb-4"
          data-testid={`expanded-stat-block-${combatant.id}`}
        >
          {/* Quick stats row */}
          <div className="flex gap-4 py-2 text-sm">
            <span className="text-white/60">
              AC <span className="text-white font-mono">{combatant.ac}</span>
            </span>
            {combatant.spell_save_dc !== null && (
              <span className="text-white/60">
                DC <span className="text-white font-mono">{combatant.spell_save_dc}</span>
              </span>
            )}
          </div>

          {/* Full stat block */}
          <MonsterStatBlock monster={fullMonster} />
        </div>
      )}
    </li>
  );
}
