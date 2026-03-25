"use client";

import { useState, useEffect } from "react";
import { getMonsterById } from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { HpAdjuster } from "./HpAdjuster";
import { ConditionSelector } from "./ConditionSelector";
import { StatsEditor } from "./StatsEditor";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

function getHpBarColor(current: number, max: number): string {
  if (max === 0) return "bg-gray-500";
  const pct = current / max;
  if (pct > 0.5) return "bg-green-500";
  if (pct > 0.25) return "bg-amber-400";
  return "bg-red-500";
}

/** Returns a text label for the HP threshold — satisfies NFR21 (color is not the sole indicator). */
function getHpThresholdLabel(current: number, max: number): string {
  if (max === 0) return "";
  const pct = current / max;
  if (pct >= 0.5) return "OK";
  if (pct > 0.25) return "LOW";
  return "CRIT";
}

export interface CombatantRowProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  /** When true, show action buttons (HP, conditions, defeat, edit, version). Only in active combat. */
  showActions?: boolean;
  onApplyDamage?: (id: string, amount: number) => void;
  onApplyHealing?: (id: string, amount: number) => void;
  onSetTempHp?: (id: string, value: number) => void;
  onToggleCondition?: (id: string, condition: string) => void;
  onSetDefeated?: (id: string, isDefeated: boolean) => void;
  onRemoveCombatant?: (id: string) => void;
  onUpdateStats?: (id: string, stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  onSwitchVersion?: (id: string, version: RulesetVersion) => void;
}

type OpenPanel = "hp" | "conditions" | "edit" | null;

export function CombatantRow({
  combatant,
  isCurrentTurn,
  showActions = false,
  onApplyDamage,
  onApplyHealing,
  onSetTempHp,
  onToggleCondition,
  onSetDefeated,
  onRemoveCombatant,
  onUpdateStats,
  onSwitchVersion,
}: CombatantRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const hpPct = combatant.max_hp > 0
    ? Math.max(0, Math.min(1, combatant.current_hp / combatant.max_hp))
    : 0;
  const hpBarColor = getHpBarColor(combatant.current_hp, combatant.max_hp);
  const hpThresholdLabel = getHpThresholdLabel(combatant.current_hp, combatant.max_hp);
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

  const togglePanel = (panel: OpenPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  const isMonster = !!combatant.monster_id;
  const canSwitchVersion = isMonster && combatant.ruleset_version !== null;
  const otherVersion: RulesetVersion = combatant.ruleset_version === "2024" ? "2014" : "2024";

  return (
    <li
      className={`bg-card border rounded-md overflow-hidden transition-colors ${
        isCurrentTurn ? "border-gold" : "border-border"
      } ${combatant.is_defeated ? "opacity-50" : ""}`}
      role="listitem"
      aria-current={isCurrentTurn ? true : undefined}
      data-testid={`combatant-row-${combatant.id}`}
    >
      {/* === ZERO-TAP TIER: always visible === */}
      <div className="px-4 py-3">
        {/* Name row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Turn indicator — shape glyph (▶) satisfies NFR21: color is not the sole indicator */}
          {isCurrentTurn && (
            <span
              className="text-gold shrink-0 text-xs leading-none select-none"
              aria-label="Current turn"
              data-testid="current-turn-indicator"
            >
              ▶
            </span>
          )}

          {/* Name — clickable to expand if monster; min-h-[44px] satisfies NFR24 */}
          <button
            type="button"
            onClick={handleToggle}
            className={`flex-1 flex items-center text-left text-sm font-medium transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] ${
              canExpand
                ? "text-foreground hover:text-gold cursor-pointer"
                : "text-foreground cursor-default"
            }`}
            aria-expanded={canExpand ? isExpanded : undefined}
            aria-controls={canExpand ? `stat-block-combatant-${combatant.id}` : undefined}
            disabled={!canExpand}
            data-testid={`combatant-name-${combatant.id}`}
          >
            {combatant.name}
            {canExpand && (
              <span className="text-muted-foreground/60 text-xs ml-1" aria-hidden="true">
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
            <span className="text-muted-foreground text-xs">HP</span>
            <span className="text-muted-foreground text-xs font-mono" data-testid={`hp-display-${combatant.id}`}>
              {combatant.current_hp} / {combatant.max_hp}
              {/* HP threshold text label — satisfies NFR21 for sighted color-blind users */}
              {hpThresholdLabel && (
                <span
                  className="text-xs font-mono ml-1 text-muted-foreground"
                  data-testid={`hp-threshold-${combatant.id}`}
                >
                  {hpThresholdLabel}
                </span>
              )}
              {hasTempHp && (
                <span className="text-[#9f7aea] ml-1" data-testid={`temp-hp-${combatant.id}`}>
                  +{combatant.temp_hp} temp
                </span>
              )}
            </span>
          </div>
          <div
            className="h-2 bg-white/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={combatant.current_hp}
            aria-valuemin={0}
            aria-valuemax={combatant.max_hp}
            aria-label={`${combatant.name} hit points${hpThresholdLabel ? ` — ${hpThresholdLabel}` : ""}`}
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
            {combatant.conditions.map((condition) => (
              <ConditionBadge key={condition} condition={condition} />
            ))}
          </div>
        )}

        {/* === ACTION BUTTONS (only during active combat) === */}
        {showActions && (
          <div className="flex flex-wrap gap-1 mt-2" data-testid={`action-buttons-${combatant.id}`}>
            <button
              type="button"
              onClick={() => togglePanel("hp")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "hp" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label="Adjust HP"
              data-testid={`hp-btn-${combatant.id}`}
            >
              HP
            </button>
            <button
              type="button"
              onClick={() => togglePanel("conditions")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "conditions" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label="Manage conditions"
              data-testid={`conditions-btn-${combatant.id}`}
            >
              Cond
            </button>
            <button
              type="button"
              onClick={() => onSetDefeated?.(combatant.id, !combatant.is_defeated)}
              className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              aria-label={combatant.is_defeated ? "Revive combatant" : "Mark as defeated"}
              data-testid={`defeat-btn-${combatant.id}`}
            >
              {combatant.is_defeated ? "Revive" : "Defeat"}
            </button>
            <button
              type="button"
              onClick={() => togglePanel("edit")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "edit" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label="Edit stats"
              data-testid={`edit-btn-${combatant.id}`}
            >
              Edit
            </button>
            {canSwitchVersion && (
              <button
                type="button"
                onClick={() => onSwitchVersion?.(combatant.id, otherVersion)}
                className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={`Switch to ${otherVersion} ruleset`}
                data-testid={`version-btn-${combatant.id}`}
              >
                → {otherVersion}
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemoveCombatant?.(combatant.id)}
              className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-white/[0.06] text-red-400 hover:bg-red-900/30 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              aria-label="Remove combatant"
              data-testid={`remove-btn-${combatant.id}`}
            >
              Remove
            </button>
          </div>
        )}

        {/* === INLINE PANELS === */}
        {openPanel === "hp" && (
          <HpAdjuster
            onApplyDamage={(amount) => onApplyDamage?.(combatant.id, amount)}
            onApplyHealing={(amount) => onApplyHealing?.(combatant.id, amount)}
            onSetTempHp={(value) => onSetTempHp?.(combatant.id, value)}
            onClose={() => setOpenPanel(null)}
          />
        )}

        {openPanel === "conditions" && (
          <ConditionSelector
            activeConditions={combatant.conditions}
            onToggle={(condition) => onToggleCondition?.(combatant.id, condition)}
            onClose={() => setOpenPanel(null)}
          />
        )}

        {openPanel === "edit" && (
          <StatsEditor
            combatant={combatant}
            onSave={(stats) => onUpdateStats?.(combatant.id, stats)}
            onClose={() => setOpenPanel(null)}
          />
        )}
      </div>

      {/* === ONE-TAP TIER: AC, DC, stat block === */}
      {isExpanded && fullMonster && (
        <div
          id={`stat-block-combatant-${combatant.id}`}
          className="border-t border-border px-4 pb-4"
          data-testid={`expanded-stat-block-${combatant.id}`}
        >
          {/* Quick stats row */}
          <div className="flex gap-4 py-2 text-sm">
            <span className="text-muted-foreground">
              AC <span className="text-foreground font-mono">{combatant.ac}</span>
            </span>
            {combatant.spell_save_dc !== null && (
              <span className="text-muted-foreground">
                DC <span className="text-foreground font-mono">{combatant.spell_save_dc}</span>
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
