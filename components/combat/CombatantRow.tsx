"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getMonsterById } from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { HpAdjuster } from "./HpAdjuster";
import { ConditionSelector } from "./ConditionSelector";
import { StatsEditor } from "./StatsEditor";
import { VersionSwitchConfirm } from "./VersionSwitchConfirm";
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
  onUpdateDmNotes?: (id: string, notes: string) => void;
  onUpdatePlayerNotes?: (id: string, notes: string) => void;
  /** Props from @dnd-kit useSortable — spread on drag handle */
  dragHandleProps?: Record<string, unknown>;
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
  onUpdateDmNotes,
  onUpdatePlayerNotes,
  dragHandleProps,
}: CombatantRowProps) {
  const t = useTranslations("combat");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [editingPlayerNotes, setEditingPlayerNotes] = useState(false);
  const [editingDmNotes, setEditingDmNotes] = useState(false);
  const [playerNotesValue, setPlayerNotesValue] = useState(combatant.player_notes);
  const [dmNotesValue, setDmNotesValue] = useState(combatant.dm_notes);
  const [flash, setFlash] = useState(false);
  const [versionConfirmOpen, setVersionConfirmOpen] = useState(false);
  const prevHp = useRef(combatant.current_hp);

  // Trigger red flash when current HP decreases
  useEffect(() => {
    if (combatant.current_hp < prevHp.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(timer);
    }
    prevHp.current = combatant.current_hp;
  }, [combatant.current_hp]);

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

  // Close any open panel when combatant is defeated
  useEffect(() => {
    if (combatant.is_defeated) setOpenPanel(null);
  }, [combatant.is_defeated]);

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
      } ${combatant.is_defeated ? "opacity-50" : ""} ${flash ? "animate-flash-red" : ""}`}
      role="listitem"
      aria-current={isCurrentTurn ? true : undefined}
      data-testid={`combatant-row-${combatant.id}`}
    >
      {/* === ZERO-TAP TIER: always visible === */}
      <div className="px-4 py-3">
        {/* Name row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Drag handle */}
          {dragHandleProps && (
            <span
              className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing select-none text-sm flex-shrink-0"
              aria-label={t("drag_to_reorder")}
              {...dragHandleProps}
            >
              ⠿
            </span>
          )}

          {/* Turn indicator — shape glyph (▶) satisfies NFR21: color is not the sole indicator */}
          {isCurrentTurn && (
            <span
              className="text-gold shrink-0 text-xs leading-none select-none"
              aria-label={t("current_turn")}
              data-testid="current-turn-indicator"
            >
              ▶
            </span>
          )}

          {/* Name — clickable to open pinned card if monster; min-h-[44px] satisfies NFR24 */}
          <button
            type="button"
            onClick={() => {
              if (canExpand && fullMonster) {
                pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014");
              }
            }}
            className={`flex-1 text-left text-sm font-medium transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] flex items-center ${
              canExpand
                ? "text-foreground hover:text-gold cursor-pointer"
                : "text-foreground cursor-default"
            }`}
            disabled={!canExpand}
            data-testid={`combatant-name-${combatant.id}`}
          >
            {combatant.name}
          </button>

          {/* Inline expand toggle (separate from name) */}
          {canExpand && (
            <button
              type="button"
              onClick={handleToggle}
              className="text-muted-foreground/60 text-xs hover:text-muted-foreground transition-colors px-1 min-h-[44px] flex items-center"
              aria-expanded={isExpanded}
              aria-controls={`stat-block-combatant-${combatant.id}`}
              aria-label={isExpanded ? "Collapse stat block" : "Expand stat block"}
              data-testid={`expand-toggle-${combatant.id}`}
            >
              {isExpanded ? "▲" : "▼"}
            </button>
          )}

          {/* Version badge for monsters */}
          {combatant.ruleset_version && combatant.monster_id && (
            <VersionBadge version={combatant.ruleset_version} />
          )}

          {/* Defeated badge */}
          {combatant.is_defeated && (
            <span className="text-xs text-red-400 font-medium" data-testid="defeated-badge">
              {t("defeated")}
            </span>
          )}
        </div>

        {/* HP bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground text-xs">{t("hp_label")}</span>
            <span className="text-muted-foreground text-xs font-mono" data-testid={`hp-display-${combatant.id}`}>
              {combatant.current_hp} / {combatant.max_hp}
              {/* HP threshold text label — satisfies NFR21 for sighted color-blind users */}
              {hpThresholdLabel && (
                <span
                  className="text-xs font-mono ml-1 text-muted-foreground"
                  data-testid={`hp-threshold-${combatant.id}`}
                >
                  {hpThresholdLabel === "CRIT" ? t("hp_crit") : hpThresholdLabel === "LOW" ? t("hp_low") : t("hp_ok")}
                </span>
              )}
              {hasTempHp && (
                <span className="text-[#9f7aea] ml-1" data-testid={`temp-hp-${combatant.id}`}>
                  {t("temp_hp", { value: combatant.temp_hp })}
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
            aria-label={t("hp_aria", { name: combatant.name })}
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
              <ConditionBadge key={condition} condition={condition} rulesetVersion={combatant.ruleset_version ?? "2014"} />
            ))}
          </div>
        )}

        {/* === NOTES (player-visible + DM-only) === */}
        {showActions && (
          <div className="flex flex-wrap gap-3 mt-1 text-xs" data-testid={`notes-${combatant.id}`}>
            {/* Player notes */}
            {editingPlayerNotes ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-muted-foreground/60 flex-shrink-0" title={t("player_notes_title")}>📝</span>
                <input
                  type="text"
                  value={playerNotesValue}
                  onChange={(e) => setPlayerNotesValue(e.target.value)}
                  onBlur={() => {
                    setEditingPlayerNotes(false);
                    onUpdatePlayerNotes?.(combatant.id, playerNotesValue);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingPlayerNotes(false);
                      onUpdatePlayerNotes?.(combatant.id, playerNotesValue);
                    }
                    if (e.key === "Escape") {
                      setEditingPlayerNotes(false);
                      setPlayerNotesValue(combatant.player_notes);
                    }
                  }}
                  className="bg-transparent border border-border rounded px-1 py-0.5 text-foreground text-xs flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  data-testid={`player-notes-input-${combatant.id}`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setPlayerNotesValue(combatant.player_notes); setEditingPlayerNotes(true); }}
                className="flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                title={t("player_notes_hint")}
                data-testid={`player-notes-${combatant.id}`}
              >
                <span>📝</span>
                <span>{combatant.player_notes || "—"}</span>
              </button>
            )}

            {/* DM notes */}
            {editingDmNotes ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-muted-foreground/60 flex-shrink-0" title={t("dm_notes_title")}>🔒</span>
                <input
                  type="text"
                  value={dmNotesValue}
                  onChange={(e) => setDmNotesValue(e.target.value)}
                  onBlur={() => {
                    setEditingDmNotes(false);
                    onUpdateDmNotes?.(combatant.id, dmNotesValue);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingDmNotes(false);
                      onUpdateDmNotes?.(combatant.id, dmNotesValue);
                    }
                    if (e.key === "Escape") {
                      setEditingDmNotes(false);
                      setDmNotesValue(combatant.dm_notes);
                    }
                  }}
                  className="bg-transparent border border-border rounded px-1 py-0.5 text-foreground text-xs flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                  data-testid={`dm-notes-input-${combatant.id}`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setDmNotesValue(combatant.dm_notes); setEditingDmNotes(true); }}
                className="flex items-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                title={t("dm_notes_hint")}
                data-testid={`dm-notes-${combatant.id}`}
              >
                <span>🔒</span>
                <span>{combatant.dm_notes || "—"}</span>
              </button>
            )}
          </div>
        )}

        {/* === ACTION BUTTONS (only during active combat) === */}
        {showActions && (
          <div className="flex flex-wrap gap-1 mt-2" data-testid={`action-buttons-${combatant.id}`}>
            {/* Pin stat block (monsters only) */}
            {canExpand && fullMonster && (
              <button
                type="button"
                onClick={() => pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014")}
                className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={`Pin ${combatant.name} stat block`}
                data-testid={`pin-btn-${combatant.id}`}
              >
                📌
              </button>
            )}
            <button
              type="button"
              onClick={() => togglePanel("hp")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "hp" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label={t("adjust_hp")}
              data-testid={`hp-btn-${combatant.id}`}
            >
              {t("hp_button")}
            </button>
            <button
              type="button"
              onClick={() => togglePanel("conditions")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "conditions" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label={t("manage_conditions")}
              data-testid={`conditions-btn-${combatant.id}`}
            >
              {t("cond_button")}
            </button>
            <button
              type="button"
              onClick={() => onSetDefeated?.(combatant.id, !combatant.is_defeated)}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                combatant.is_defeated
                  ? "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                  : "bg-red-900/20 text-red-400 hover:bg-red-900/40"
              }`}
              aria-label={combatant.is_defeated ? t("revive_aria") : t("defeat_aria")}
              data-testid={`defeat-btn-${combatant.id}`}
            >
              {combatant.is_defeated ? t("revive") : t("defeat")}
            </button>
            <button
              type="button"
              onClick={() => togglePanel("edit")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "edit" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label={t("edit_stats")}
              data-testid={`edit-btn-${combatant.id}`}
            >
              {t("edit_button")}
            </button>
            {canSwitchVersion && (
              <>
                <button
                  type="button"
                  onClick={() => setVersionConfirmOpen(true)}
                  className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                  aria-label={t("switch_version", { version: otherVersion })}
                  data-testid={`version-btn-${combatant.id}`}
                >
                  {otherVersion === "2014" ? t("switch_2014") : t("switch_2024")}
                </button>
                <VersionSwitchConfirm
                  open={versionConfirmOpen}
                  onOpenChange={setVersionConfirmOpen}
                  combatantName={combatant.name}
                  fromVersion={combatant.ruleset_version ?? "2014"}
                  toVersion={otherVersion}
                  currentHp={combatant.current_hp}
                  newMaxHp={
                    combatant.monster_id
                      ? getMonsterById(combatant.monster_id, otherVersion)?.hit_points
                      : undefined
                  }
                  onConfirm={() => onSwitchVersion?.(combatant.id, otherVersion)}
                />
              </>
            )}
            <button
              type="button"
              onClick={() => onRemoveCombatant?.(combatant.id)}
              className="px-2 py-1 text-xs rounded font-medium min-h-[32px] bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              aria-label={t("remove_aria")}
              data-testid={`remove-btn-${combatant.id}`}
            >
              {t("remove_button")}
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
              {t("ac_label")} <span className="text-foreground font-mono">{combatant.ac}</span>
            </span>
            {combatant.spell_save_dc !== null && (
              <span className="text-muted-foreground">
                {t("dc_label")} <span className="text-foreground font-mono">{combatant.spell_save_dc}</span>
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
