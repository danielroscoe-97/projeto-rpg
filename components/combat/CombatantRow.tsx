"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { getMonsterById } from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { ConditionBadge } from "@/components/oracle/ConditionBadge";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { HpAdjuster } from "./HpAdjuster";
import { ConditionSelector } from "./ConditionSelector";
import { DeathSaveTracker } from "./DeathSaveTracker";
// MonsterActionBar — not yet implemented (CP.1.3), import removed to unblock build
import { StatsEditor } from "./StatsEditor";
import { VersionSwitchConfirm } from "./VersionSwitchConfirm";
import { getHpBarColor, getHpThresholdKey } from "@/lib/utils/hp-status";
import { Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Combatant } from "@/lib/types/combat";
import type { RollMode } from "@/lib/dice/roll";
import type { RulesetVersion } from "@/lib/types/database";

export interface CombatantRowProps {
  combatant: Combatant;
  isCurrentTurn: boolean;
  /** When true, show action buttons (HP, conditions, defeat, edit, version). Only in active combat. */
  showActions?: boolean;
  onApplyDamage?: (id: string, amount: number, options?: { damageType?: string; isHalfDamage?: boolean; source?: string }) => void;
  onApplyHealing?: (id: string, amount: number) => void;
  onSetTempHp?: (id: string, value: number) => void;
  onToggleCondition?: (id: string, condition: string) => void;
  onSetDefeated?: (id: string, isDefeated: boolean) => void;
  onRemoveCombatant?: (id: string) => void;
  onUpdateStats?: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  onSetInitiative?: (id: string, value: number | null) => void;
  onSwitchVersion?: (id: string, version: RulesetVersion) => void;
  onUpdateDmNotes?: (id: string, notes: string) => void;
  onUpdatePlayerNotes?: (id: string, notes: string) => void;
  /** All combatants for target selection in MonsterActionBar and multi-target AoE */
  allCombatants?: Combatant[];
  /** Current roll mode (Normal/Advantage/Disadvantage) passed to MonsterActionBar */
  rollMode?: RollMode;
  /** Callback for applying HP changes to multiple targets (AoE). */
  onApplyToMultiple?: (targetIds: string[], amount: number, mode: import("./HpAdjuster").HpMode) => void;
  onToggleHidden?: (id: string) => void;
  onAddDeathSaveSuccess?: (id: string) => void;
  onAddDeathSaveFailure?: (id: string) => void;
  /** Callback to advance to next turn — attached to the ▶ indicator */
  onAdvanceTurn?: () => void;
  /** Props from @dnd-kit useSortable — spread on drag handle */
  dragHandleProps?: Record<string, unknown>;
}

type OpenPanel = "hp" | "conditions" | "edit" | "actions" | null;

export const CombatantRow = memo(function CombatantRow({
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
  onSetInitiative,
  onSwitchVersion,
  onUpdateDmNotes,
  onUpdatePlayerNotes,
  allCombatants = [],
  rollMode,
  onApplyToMultiple,
  onToggleHidden,
  onAddDeathSaveSuccess,
  onAddDeathSaveFailure,
  onAdvanceTurn,
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
  const [flash, setFlash] = useState<"damage" | "heal" | false>(false);
  const [versionConfirmOpen, setVersionConfirmOpen] = useState(false);
  const [inlineEditTarget, setInlineEditTarget] = useState<"current" | "max" | "initiative" | null>(null);
  const [inlineHpValue, setInlineHpValue] = useState("");
  const inlineEditRef = useRef<"current" | "max" | "initiative" | null>(null);
  const prevHp = useRef(combatant.current_hp);

  /** Safely open an inline editor — clears stale value and tracks target via ref for blur guards. */
  const openInlineEdit = (target: "current" | "max" | "initiative", initialValue: string) => {
    inlineEditRef.current = target;
    setInlineEditTarget(target);
    setInlineHpValue(initialValue);
  };
  const closeInlineEdit = () => {
    inlineEditRef.current = null;
    setInlineEditTarget(null);
    setInlineHpValue("");
  };

  // Trigger red/green flash when current HP changes
  useEffect(() => {
    if (combatant.current_hp < prevHp.current) {
      setFlash("damage");
      const timer = setTimeout(() => setFlash(false), 800);
      prevHp.current = combatant.current_hp;
      return () => clearTimeout(timer);
    }
    if (combatant.current_hp > prevHp.current) {
      setFlash("heal");
      const timer = setTimeout(() => setFlash(false), 500);
      prevHp.current = combatant.current_hp;
      return () => clearTimeout(timer);
    }
    prevHp.current = combatant.current_hp;
  }, [combatant.current_hp]);

  // HP bar: tiers calculated on normal HP only (immutable rule)
  const hpBarColor = getHpBarColor(combatant.current_hp, combatant.max_hp);
  const hpThresholdKey = getHpThresholdKey(combatant.current_hp, combatant.max_hp);
  const hasTempHp = combatant.temp_hp > 0;
  // Visual bar widths: temp HP extends the bar beyond normal max
  const totalPool = combatant.max_hp + combatant.temp_hp;
  const hpPctOfTotal = totalPool > 0 ? Math.max(0, Math.min(1, combatant.current_hp / totalPool)) : 0;
  const tempPctOfTotal = totalPool > 0 ? Math.max(0, Math.min(1, combatant.temp_hp / totalPool)) : 0;
  // Legacy pct for aria (based on max_hp only)
  const hpPct = combatant.max_hp > 0
    ? Math.max(0, Math.min(1, combatant.current_hp / combatant.max_hp))
    : 0;

  // HP bar tooltip: DM sees exact numbers, players see only tier name
  const hpTierTooltipKey = hpThresholdKey ? `hp_tooltip_${hpThresholdKey.replace("hp_", "")}` as const : null;
  const hpTooltip = hpTierTooltipKey
    ? t(`hp_tooltip_dm`, { tier: t(hpTierTooltipKey), current: combatant.current_hp, max: combatant.max_hp })
    : undefined;

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
  // Only show the ruleset switch button if a handler is provided — callers omit it during combat
  const canSwitchVersion = isMonster && combatant.ruleset_version !== null && !!onSwitchVersion;
  const otherVersion: RulesetVersion = combatant.ruleset_version === "2024" ? "2014" : "2024";

  return (
    <li
      className={`bg-card border rounded-md overflow-hidden transition-colors ${
        isCurrentTurn ? "border-gold bg-gold/[0.07] ring-1 ring-gold/30" : "border-border"
      } ${combatant.is_defeated ? "opacity-50" : ""} ${flash === "damage" ? "animate-flash-red" : flash === "heal" ? "animate-flash-green" : ""} ${
        combatant.is_player ? "border-l-4 border-l-[#5B8DEF]" : isMonster ? "border-l-4 border-l-red-500/60" : ""
      } ${combatant.is_hidden ? "border-dashed opacity-70" : ""}`}
      role="listitem"
      aria-current={isCurrentTurn ? true : undefined}
      data-testid={`combatant-row-${combatant.id}`}
    >
      {/* === ZERO-TAP TIER: always visible === */}
      <div className="px-3 py-1.5">
        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-1">
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
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdvanceTurn?.(); }}
              className="text-gold shrink-0 text-sm leading-none select-none cursor-pointer hover:scale-125 transition-transform"
              aria-label={t("advance_turn")}
              title={t("advance_turn")}
              data-testid="current-turn-indicator"
            >
              ▶
            </button>
          )}

          {/* Initiative badge — clickable to edit inline */}
          {showActions && (
            inlineEditTarget === "initiative" ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*"
                value={inlineHpValue}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || raw === "-" || /^-?\d+$/.test(raw)) setInlineHpValue(raw);
                }}
                onBlur={() => {
                  if (inlineEditRef.current !== "initiative") return;
                  const trimmed = inlineHpValue.trim();
                  if (trimmed === "" || trimmed === "-") {
                    onSetInitiative?.(combatant.id, null);
                  } else {
                    const val = parseInt(trimmed, 10);
                    if (!isNaN(val)) onSetInitiative?.(combatant.id, Math.min(50, Math.max(-5, val)));
                  }
                  closeInlineEdit();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") closeInlineEdit();
                }}
                className="w-14 bg-transparent border border-gold/60 rounded px-1 py-0.5 text-gold text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-gold"
                autoFocus
                aria-label={t("edit_initiative_aria", { name: combatant.name })}
                data-testid={`inline-init-input-${combatant.id}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => openInlineEdit("initiative", combatant.initiative !== null ? String(combatant.initiative) : "")}
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground text-[10px] font-mono hover:text-gold hover:bg-gold/10 transition-colors"
                title={t("edit_initiative_title")}
                data-testid={`initiative-badge-${combatant.id}`}
              >
                Init. {combatant.initiative ?? "—"}
              </button>
            )
          )}

          {/* Monster token — clickable to open stat block */}
          {combatant.monster_id && (
            <button
              type="button"
              onClick={() => {
                if (canExpand && fullMonster) {
                  pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014");
                }
              }}
              className={`flex-shrink-0 rounded-full ${canExpand ? "cursor-pointer hover:ring-2 hover:ring-gold/60 transition-shadow" : "cursor-default"}`}
              disabled={!canExpand}
              aria-label={canExpand ? t("setup_view_card_aria", { name: combatant.name }) : undefined}
              data-testid={`token-btn-${combatant.id}`}
            >
              <MonsterToken
                tokenUrl={combatant.token_url ?? fullMonster?.token_url}
                fallbackTokenUrl={fullMonster?.fallback_token_url}
                creatureType={combatant.creature_type ?? fullMonster?.type}
                name={combatant.name}
                size={32}
              />
            </button>
          )}

          {/* Name — clickable to open pinned card if monster */}
          <button
            type="button"
            onClick={() => {
              if (canExpand && fullMonster) {
                pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014");
              }
            }}
            className={`flex-1 text-left text-sm font-medium transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[32px] flex items-center gap-1.5 ${
              canExpand
                ? "text-foreground hover:text-gold cursor-pointer"
                : "text-foreground cursor-default"
            }`}
            disabled={!canExpand}
            data-testid={`combatant-name-${combatant.id}`}
          >
            <span>{combatant.name}</span>
            {combatant.display_name && !combatant.is_player && (
              <span className="text-xs text-muted-foreground/40 font-normal ml-1">
                — {combatant.display_name}
              </span>
            )}
          </button>

          {/* HP display — inline with name */}
          <div className="flex items-center gap-0.5 text-xs font-mono flex-shrink-0" data-testid={`hp-display-${combatant.id}`}>
            {/* Current HP — click to set directly */}
            {showActions && inlineEditTarget === "current" ? (
              <input
                type="number"
                value={inlineHpValue}
                onChange={(e) => setInlineHpValue(e.target.value)}
                onBlur={() => {
                  if (inlineEditRef.current !== "current") return;
                  const desired = parseInt(inlineHpValue, 10);
                  if (!isNaN(desired) && desired >= 0) {
                    const delta = desired - combatant.current_hp;
                    if (delta < 0) onApplyDamage?.(combatant.id, Math.abs(delta));
                    else if (delta > 0) onApplyHealing?.(combatant.id, delta);
                    // If HP set to 0, mark as defeated
                    if (desired === 0 && !combatant.is_defeated) {
                      onSetDefeated?.(combatant.id, true);
                    }
                  }
                  closeInlineEdit();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") closeInlineEdit();
                }}
                className="w-14 bg-transparent border border-gold/60 rounded px-1 py-0.5 text-foreground text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
                aria-label={t("edit_current_hp_aria", { name: combatant.name })}
                data-testid={`inline-current-hp-input-${combatant.id}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => { if (showActions) openInlineEdit("current", String(combatant.current_hp)); }}
                className={`text-muted-foreground ${showActions ? "hover:text-gold cursor-pointer" : "cursor-default"}`}
                title={showActions ? t("edit_current_hp_title") : undefined}
                data-testid={`current-hp-btn-${combatant.id}`}
              >
                {combatant.current_hp}
              </button>
            )}
            <span className="text-muted-foreground/40">/</span>
            {/* Max HP — click to set directly */}
            {showActions && inlineEditTarget === "max" ? (
              <input
                type="number"
                value={inlineHpValue}
                onChange={(e) => setInlineHpValue(e.target.value)}
                onBlur={() => {
                  if (inlineEditRef.current !== "max") return;
                  const val = parseInt(inlineHpValue, 10);
                  if (!isNaN(val) && val >= 1) onUpdateStats?.(combatant.id, { max_hp: val });
                  closeInlineEdit();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") closeInlineEdit();
                }}
                className="w-14 bg-transparent border border-border rounded px-1 py-0.5 text-foreground text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
                aria-label={t("edit_max_hp_aria", { name: combatant.name })}
                data-testid={`inline-max-hp-input-${combatant.id}`}
              />
            ) : (
              <button
                type="button"
                onClick={() => { if (showActions) openInlineEdit("max", String(combatant.max_hp)); }}
                className={`text-muted-foreground/60 ${showActions ? "hover:text-gold cursor-pointer" : "cursor-default"}`}
                title={showActions ? t("edit_max_hp_title") : undefined}
                data-testid={`max-hp-btn-${combatant.id}`}
              >
                {combatant.max_hp}
              </button>
            )}
            {hpThresholdKey && (
              <span className="text-[10px] font-mono ml-0.5 text-muted-foreground" data-testid={`hp-threshold-${combatant.id}`}>
                {t(hpThresholdKey as Parameters<typeof t>[0])}
              </span>
            )}
            {hasTempHp && (
              <span className="text-[#9f7aea] ml-0.5 text-[10px]" data-testid={`temp-hp-${combatant.id}`}>
                {t("temp_hp", { value: combatant.temp_hp })}
              </span>
            )}
          </div>

          {/* Inline expand toggle (separate from name) */}
          {canExpand && (
            <button
              type="button"
              onClick={handleToggle}
              className="text-muted-foreground/60 text-xs hover:text-muted-foreground transition-colors px-1 min-h-[32px] flex items-center"
              aria-expanded={isExpanded}
              aria-controls={`stat-block-combatant-${combatant.id}`}
              aria-label={isExpanded ? t("collapse_stat_block") : t("expand_stat_block")}
              data-testid={`expand-toggle-${combatant.id}`}
            >
              {isExpanded ? "▲" : "▼"}
            </button>
          )}

          {/* Version badge for monsters */}
          {combatant.ruleset_version && combatant.monster_id && (
            <VersionBadge version={combatant.ruleset_version} />
          )}

          {/* Hidden indicator badge */}
          {combatant.is_hidden && (
            <span className="text-xs text-purple-400 font-medium inline-flex items-center gap-0.5" data-testid="hidden-badge">
              <EyeOff className="w-3 h-3" />
              {t("hidden_indicator")}
            </span>
          )}

          {/* Defeated badge */}
          {combatant.is_defeated && (
            <span className="text-xs text-red-400 font-medium" data-testid="defeated-badge">
              {t("defeated")}
            </span>
          )}

          {/* Dying badge — PC at 0 HP but not defeated (death saves needed) */}
          {/* Only show when max_hp > 0 (HP was actually configured) */}
          {combatant.is_player && combatant.current_hp === 0 && combatant.max_hp > 0 && !combatant.is_defeated && (
            <span
              className="text-xs text-red-300 font-medium animate-pulse"
              data-testid="dying-badge"
            >
              {t("dying_label")}
            </span>
          )}
        </div>

        {/* HP bar with tooltip — purple segment for temp HP */}
        <div className="mb-1">
          <div
            className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden cursor-help flex"
            role="progressbar"
            aria-valuenow={combatant.current_hp}
            aria-valuemin={0}
            aria-valuemax={combatant.max_hp}
            aria-label={t("hp_aria", { name: combatant.name })}
            title={hasTempHp ? `${hpTooltip ?? ""} (+${combatant.temp_hp} temp)` : hpTooltip}
          >
            <div
              className={`h-full transition-all ${hpBarColor} ${hasTempHp ? "" : "rounded-full"} ${hasTempHp ? "rounded-l-full" : ""}`}
              style={{ width: `${hpPctOfTotal * 100}%` }}
              data-testid={`hp-bar-${combatant.id}`}
            />
            {hasTempHp && (
              <div
                className="h-full bg-purple-500 rounded-r-full transition-all"
                style={{ width: `${tempPctOfTotal * 100}%` }}
                data-testid={`temp-hp-bar-${combatant.id}`}
              />
            )}
          </div>
        </div>

        {/* Condition badges — tappable ✕ to remove directly in active combat */}
        {combatant.conditions.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label={t("conditions_aria", { name: combatant.name })}
            data-testid={`conditions-${combatant.id}`}
          >
            {combatant.conditions.map((condition) => (
              <ConditionBadge
                key={condition}
                condition={condition}
                rulesetVersion={combatant.ruleset_version ?? "2014"}
                turnCount={combatant.condition_durations?.[condition]}
                onRemove={showActions ? (cond) => onToggleCondition?.(combatant.id, cond) : undefined}
              />
            ))}
          </div>
        )}

        {/* === NOTES (player-visible + DM-only) — hidden when both empty === */}
        {showActions && (combatant.player_notes || combatant.dm_notes || editingPlayerNotes || editingDmNotes) && (
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
          <div className="flex flex-wrap gap-1 mt-1" data-testid={`action-buttons-${combatant.id}`}>
            {/* Pin stat block (monsters only) */}
            {canExpand && fullMonster && (
              <button
                type="button"
                onClick={() => pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014")}
                className="px-2 py-1 text-xs rounded font-medium min-h-[28px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                aria-label={t("pin_stat_block", { name: combatant.name })}
                data-testid={`pin-btn-${combatant.id}`}
              >
                📌
              </button>
            )}
            <button
              type="button"
              onClick={() => togglePanel("hp")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
              className={`px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                openPanel === "conditions" ? "bg-gold text-surface-primary" : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              aria-label={t("manage_conditions")}
              data-testid={`conditions-btn-${combatant.id}`}
            >
              {t("cond_button")}
            </button>
            {!combatant.is_defeated ? (
              <button
                type="button"
                onClick={() => onSetDefeated?.(combatant.id, true)}
                className="px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] bg-red-900/20 text-red-400 hover:bg-red-900/40"
                aria-label={t("defeat_aria")}
                data-testid={`defeat-btn-${combatant.id}`}
              >
                {t("defeat")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSetDefeated?.(combatant.id, false)}
                className="px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30"
                aria-label={t("revive_aria")}
                data-testid={`revive-btn-${combatant.id}`}
              >
                {t("revive")}
              </button>
            )}
            <button
              type="button"
              onClick={() => togglePanel("edit")}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
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
                  className="px-2 py-1 text-xs rounded font-medium min-h-[28px] bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
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
            {/* Hide/Reveal toggle — non-player combatants only */}
            {!combatant.is_player && onToggleHidden && (
              <button
                type="button"
                onClick={() => onToggleHidden(combatant.id)}
                className={`px-2 py-1 text-xs rounded font-medium min-h-[28px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] inline-flex items-center gap-1 ${
                  combatant.is_hidden
                    ? "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
                    : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
                }`}
                aria-label={combatant.is_hidden ? t("reveal_to_players") : t("hide_from_players")}
                title={combatant.is_hidden ? t("reveal_to_players") : t("hide_from_players")}
                data-testid={`hidden-btn-${combatant.id}`}
              >
                {combatant.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {combatant.is_hidden ? t("hidden_indicator") : null}
              </button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded font-medium min-h-[28px] bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                  aria-label={t("remove_aria")}
                  data-testid={`remove-btn-${combatant.id}`}
                >
                  {t("remove_button")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("remove_confirm_title", { name: combatant.name })}</AlertDialogTitle>
                  <AlertDialogDescription>{t("remove_confirm_desc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("remove_confirm_cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemoveCombatant?.(combatant.id)} className="bg-red-900/60 text-red-300 hover:bg-red-900/80">
                    {t("remove_confirm_action")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* === INLINE PANELS === */}
        {openPanel === "hp" && (
          <HpAdjuster
            onApplyDamage={(amount) => onApplyDamage?.(combatant.id, amount)}
            onApplyHealing={(amount) => onApplyHealing?.(combatant.id, amount)}
            onSetTempHp={(value) => onSetTempHp?.(combatant.id, value)}
            onClose={() => setOpenPanel(null)}
            allCombatants={allCombatants}
            primaryTargetId={combatant.id}
            onApplyToMultiple={onApplyToMultiple}
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

      {/* Death Save Tracker — player-type creatures at 0 HP, not yet defeated */}
      {showActions && combatant.is_player && combatant.current_hp === 0 && combatant.max_hp > 0 && !combatant.is_defeated && onAddDeathSaveSuccess && onAddDeathSaveFailure && (
        <DeathSaveTracker
          successes={combatant.death_saves?.successes ?? 0}
          failures={combatant.death_saves?.failures ?? 0}
          onAddSuccess={() => onAddDeathSaveSuccess(combatant.id)}
          onAddFailure={() => onAddDeathSaveFailure(combatant.id)}
        />
      )}

      {/* TODO: Monster Action Bar — CP.1.3 (MonsterActionBar component not yet implemented) */}

      {/* === ONE-TAP TIER: AC, DC, stat block === */}
      <AnimatePresence>
        {isExpanded && fullMonster && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
});
