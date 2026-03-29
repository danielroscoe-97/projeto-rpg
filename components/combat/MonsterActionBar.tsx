"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Swords, Shield } from "lucide-react";
import { getMonsterById } from "@/lib/srd/srd-search";
import { parseAllActions } from "@/lib/combat/parse-action";
import { parseDamageModifiers, applyDamageModifier } from "@/lib/combat/parse-resistances";
import { roll, type RollMode, type RollResult } from "@/lib/dice/roll";
import type { Combatant, ParsedAction, DamageModifiers } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Module-level caches with size limit
// ---------------------------------------------------------------------------

const actionsCache = new Map<string, ParsedAction[]>();
const modifiersCache = new Map<string, DamageModifiers>();
const CACHE_LIMIT = 100;

function getCacheKey(monsterId: string, ruleset: string): string {
  return `${monsterId}:${ruleset}`;
}

function clearCacheIfNeeded(cache: Map<string, unknown>): void {
  if (cache.size >= CACHE_LIMIT) cache.clear();
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MonsterActionBarProps {
  combatant: Combatant;
  combatants: Combatant[];
  onApplyDamage: (id: string, amount: number, options?: { damageType?: string; isHalfDamage?: boolean; source?: string }) => void;
  onClose: () => void;
  rollMode?: RollMode;
}

type FlowStep = "idle" | "attack-rolled" | "damage-ready" | "save-pending" | "damage-ready-save";

interface ActionState {
  selectedAction: ParsedAction | null;
  targetId: string;
  step: FlowStep;
  attackResult: RollResult | null;
  isHit: boolean;
  isCritical: boolean;
  damageResults: Array<{ result: RollResult; type: string }>;
  isHalfDamage: boolean;
}

const INITIAL_STATE: ActionState = {
  selectedAction: null,
  targetId: "",
  step: "idle",
  attackResult: null,
  isHit: false,
  isCritical: false,
  damageResults: [],
  isHalfDamage: false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonsterActionBar({
  combatant,
  combatants,
  onApplyDamage,
  onClose: _onClose,
  rollMode = "normal",
}: MonsterActionBarProps) {
  const t = useTranslations("combat");
  const storageKey = `action-bar-open:${combatant.id}`;

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(storageKey) === "1";
  });

  const [state, setState] = useState<ActionState>(INITIAL_STATE);

  // Persist open/close in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(storageKey, isOpen ? "1" : "0");
  }, [isOpen, storageKey]);

  // Load monster data and parse actions
  const { actions, modifiers } = useMemo(() => {
    if (!combatant.monster_id || !combatant.ruleset_version) {
      return { actions: [] as ParsedAction[], modifiers: undefined };
    }

    const key = getCacheKey(combatant.monster_id, combatant.ruleset_version);

    // Check cache
    let cachedActions = actionsCache.get(key);
    let cachedMods = modifiersCache.get(key);

    if (!cachedActions || !cachedMods) {
      const monster = getMonsterById(combatant.monster_id, combatant.ruleset_version);
      if (!monster) return { actions: [] as ParsedAction[], modifiers: undefined };

      cachedActions = parseAllActions(monster).filter((a) => a.type !== "utility");
      cachedMods = parseDamageModifiers(monster);

      clearCacheIfNeeded(actionsCache);
      clearCacheIfNeeded(modifiersCache);
      actionsCache.set(key, cachedActions);
      modifiersCache.set(key, cachedMods);
    }

    return { actions: cachedActions, modifiers: cachedMods };
  }, [combatant.monster_id, combatant.ruleset_version]);

  // Valid targets: non-defeated combatants other than self
  const targets = useMemo(
    () => combatants.filter((c) => !c.is_defeated && c.id !== combatant.id),
    [combatants, combatant.id],
  );

  // Auto-select first target if none selected
  useEffect(() => {
    if (!state.targetId && targets.length > 0) {
      setState((prev) => ({ ...prev, targetId: targets[0].id }));
    }
  }, [targets, state.targetId]);

  const targetCombatant = useMemo(
    () => combatants.find((c) => c.id === state.targetId),
    [combatants, state.targetId],
  );

  const dispatchRollEvent = useCallback((result: RollResult) => {
    result.source = combatant.name;
    window.dispatchEvent(new CustomEvent("dice-roll-result", { detail: result }));
  }, [combatant.name]);

  // --- Action Selection ---
  const selectAction = useCallback((action: ParsedAction) => {
    setState({ ...INITIAL_STATE, selectedAction: action, targetId: state.targetId || "" });
  }, [state.targetId]);

  // --- Attack Flow ---
  const rollAttack = useCallback(() => {
    const action = state.selectedAction;
    if (!action || action.type !== "attack" || !action.attackBonus) return;

    const notation = `1d20+${action.attackBonus}`;
    const result = roll(notation, `${action.name} (${t("action_attack")})`, rollMode);
    dispatchRollEvent(result);

    const targetAC = targetCombatant?.ac ?? 10;
    const isCritical = result.isNat20;
    const isMiss = result.isNat1;
    const isHit = isCritical || (!isMiss && result.total >= targetAC);

    setState((prev) => ({
      ...prev,
      step: isHit ? "damage-ready" : "attack-rolled",
      attackResult: result,
      isHit,
      isCritical,
    }));
  }, [state.selectedAction, rollMode, targetCombatant, t, dispatchRollEvent]);

  // --- Damage Flow ---
  const rollDamage = useCallback(() => {
    const action = state.selectedAction;
    if (!action || action.damages.length === 0) return;

    const results = action.damages.map((d) => {
      const mode = state.isCritical ? "critical" : "normal";
      const result = roll(d.dice, `${action.name} (${d.type})`, mode);
      dispatchRollEvent(result);
      return { result, type: d.type };
    });

    setState((prev) => ({
      ...prev,
      damageResults: results,
      step: prev.step === "save-pending" ? "damage-ready-save" : "damage-ready",
    }));
  }, [state.selectedAction, state.isCritical, dispatchRollEvent]);

  // --- Apply Damage ---
  const applyDamage = useCallback(() => {
    if (!state.targetId || state.damageResults.length === 0 || !targetCombatant) return;

    // Get target's damage modifiers if it's a monster
    let targetMods: DamageModifiers | undefined;
    if (targetCombatant.monster_id && targetCombatant.ruleset_version) {
      const key = getCacheKey(targetCombatant.monster_id, targetCombatant.ruleset_version);
      targetMods = modifiersCache.get(key);
      if (!targetMods) {
        const targetMonster = getMonsterById(targetCombatant.monster_id, targetCombatant.ruleset_version);
        if (targetMonster) {
          targetMods = parseDamageModifiers(targetMonster);
          clearCacheIfNeeded(modifiersCache);
          modifiersCache.set(key, targetMods);
        }
      }
    }

    for (const { result, type } of state.damageResults) {
      let finalDamage = result.total;

      // Apply damage modifiers from target
      if (targetMods) {
        const { finalDamage: modifiedDmg } = applyDamageModifier(finalDamage, type, targetMods);
        finalDamage = modifiedDmg;
      }

      // Apply half damage (save passed + halfOnSave)
      if (state.isHalfDamage) {
        finalDamage = Math.floor(finalDamage / 2);
      }

      if (finalDamage > 0) {
        onApplyDamage(state.targetId, finalDamage, {
          damageType: type,
          isHalfDamage: state.isHalfDamage,
          source: state.selectedAction?.name,
        });
      }
    }

    // Reset to idle
    setState((prev) => ({ ...INITIAL_STATE, targetId: prev.targetId }));
  }, [state, targetCombatant, onApplyDamage]);

  // --- Save Flow ---
  const handleSavePassed = useCallback(() => {
    const action = state.selectedAction;
    if (!action) return;

    if (action.halfOnSave && action.damages.length > 0) {
      setState((prev) => ({ ...prev, isHalfDamage: true, step: "save-pending" }));
      // Auto-roll damage for half
      rollDamage();
    } else {
      // Save passed, no damage
      setState((prev) => ({ ...INITIAL_STATE, targetId: prev.targetId }));
    }
  }, [state.selectedAction, rollDamage]);

  const handleSaveFailed = useCallback(() => {
    setState((prev) => ({ ...prev, isHalfDamage: false, step: "save-pending" }));
    rollDamage();
  }, [rollDamage]);

  if (actions.length === 0) return null;

  const selectedAction = state.selectedAction;
  const targetName = targetCombatant?.name ?? "—";

  // Damage modifier badge for current action + target
  const getDamageModifierBadge = (damageType: string): React.ReactNode => {
    if (!targetCombatant?.monster_id || !targetCombatant.ruleset_version) return null;
    const key = getCacheKey(targetCombatant.monster_id, targetCombatant.ruleset_version);
    const targetMods = modifiersCache.get(key);
    if (!targetMods) return null;

    const { applied } = applyDamageModifier(1, damageType, targetMods);
    if (applied === "immune") return <span className="text-[10px] font-bold text-red-400 ml-1">{t("damage_immune")}</span>;
    if (applied === "resistant") return <span className="text-[10px] font-bold text-yellow-400 ml-1">{t("damage_resistant")}</span>;
    if (applied === "vulnerable") return <span className="text-[10px] font-bold text-green-400 ml-1">{t("damage_vulnerable")}</span>;
    return null;
  };

  return (
    <div className="border-t border-border/50">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Swords className="w-3 h-3" />
        <span>{t("action_bar_title")}</span>
        <span className="text-muted-foreground/50 ml-1">({actions.length})</span>
      </button>

      {isOpen && (
        <div className="px-2 pb-2 space-y-2">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1">
            {actions.map((action) => (
              <button
                key={action.name}
                type="button"
                onClick={() => selectAction(action)}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  selectedAction?.name === action.name
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-border/50 text-muted-foreground hover:border-gold/50 hover:text-foreground"
                }`}
              >
                {action.type === "attack" && <Swords className="w-3 h-3 inline mr-0.5" />}
                {action.type === "save" && <Shield className="w-3 h-3 inline mr-0.5" />}
                {action.name}
                {action.type === "attack" && action.attackBonus != null && (
                  <span className="text-muted-foreground/60 ml-0.5">+{action.attackBonus}</span>
                )}
              </button>
            ))}
          </div>

          {/* Selected Action Flow */}
          {selectedAction && (
            <div className="bg-black/20 rounded p-2 space-y-2">
              {/* Target Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={state.targetId}
                  onChange={(e) => setState((prev) => ({ ...INITIAL_STATE, selectedAction: prev.selectedAction, targetId: e.target.value }))}
                  className="flex-1 bg-card border border-border rounded px-2 py-0.5 text-xs text-foreground"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} (AC {t.ac})</option>
                  ))}
                </select>
              </div>

              {/* --- Attack Action Flow --- */}
              {selectedAction.type === "attack" && (
                <div className="space-y-1">
                  {state.step === "idle" && (
                    <button
                      type="button"
                      onClick={rollAttack}
                      className="w-full text-xs px-2 py-1 rounded bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 transition-colors"
                    >
                      {t("action_attack")} +{selectedAction.attackBonus} vs AC {targetCombatant?.ac ?? "?"}
                    </button>
                  )}

                  {state.attackResult && (
                    <div className={`text-xs font-mono text-center py-0.5 rounded ${
                      state.attackResult.isNat20 ? "bg-green-500/20 text-green-400" :
                      state.attackResult.isNat1 ? "bg-red-500/20 text-red-400" :
                      state.isHit ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {state.attackResult.isNat20
                        ? t("action_critical")
                        : state.attackResult.isNat1
                          ? t("action_nat1")
                          : state.isHit
                            ? `${t("action_hit")} (${state.attackResult.total})`
                            : `${t("action_miss")} (${state.attackResult.total})`}
                    </div>
                  )}

                  {state.step === "damage-ready" && state.damageResults.length === 0 && (
                    <button
                      type="button"
                      onClick={rollDamage}
                      className="w-full text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      {t("action_roll_damage")}
                      {state.isCritical && " (x2)"}
                    </button>
                  )}

                  {state.damageResults.length > 0 && (
                    <div className="space-y-1">
                      {state.damageResults.map(({ result, type }, i) => (
                        <div key={i} className="text-xs font-mono text-center text-foreground/80">
                          {result.total} {type}
                          {getDamageModifierBadge(type)}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={applyDamage}
                        className="w-full text-xs px-2 py-1 rounded bg-red-600/30 border border-red-600/50 text-red-300 hover:bg-red-600/40 transition-colors"
                      >
                        {t("action_apply_damage", { target: targetName })}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- Save Action Flow --- */}
              {selectedAction.type === "save" && (
                <div className="space-y-1">
                  <div className="text-xs text-center text-muted-foreground">
                    {t("action_save_dc", { dc: selectedAction.saveDC ?? "?", ability: selectedAction.saveAbility ?? "?" })}
                    {selectedAction.halfOnSave && (
                      <span className="text-yellow-400 ml-1">({t("action_half_damage")})</span>
                    )}
                  </div>

                  {state.step === "idle" && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handleSavePassed}
                        className="flex-1 text-xs px-2 py-1 rounded bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors"
                      >
                        {t("action_save_passed")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveFailed}
                        className="flex-1 text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        {t("action_save_failed")}
                      </button>
                    </div>
                  )}

                  {state.damageResults.length > 0 && (
                    <div className="space-y-1">
                      {state.damageResults.map(({ result, type }, i) => (
                        <div key={i} className="text-xs font-mono text-center text-foreground/80">
                          {result.total} {type}
                          {state.isHalfDamage && <span className="text-yellow-400 ml-1">({t("action_half_damage")})</span>}
                          {getDamageModifierBadge(type)}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={applyDamage}
                        className="w-full text-xs px-2 py-1 rounded bg-red-600/30 border border-red-600/50 text-red-300 hover:bg-red-600/40 transition-colors"
                      >
                        {t("action_apply_damage", { target: targetName })}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- Unknown type with damages --- */}
              {selectedAction.type === "unknown" && selectedAction.damages.length > 0 && (
                <div className="space-y-1">
                  {state.damageResults.length === 0 ? (
                    <button
                      type="button"
                      onClick={rollDamage}
                      className="w-full text-xs px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      {t("action_roll_damage")}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {state.damageResults.map(({ result, type }, i) => (
                        <div key={i} className="text-xs font-mono text-center text-foreground/80">
                          {result.total} {type}
                          {getDamageModifierBadge(type)}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={applyDamage}
                        className="w-full text-xs px-2 py-1 rounded bg-red-600/30 border border-red-600/50 text-red-300 hover:bg-red-600/40 transition-colors"
                      >
                        {t("action_apply_damage", { target: targetName })}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
