"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import {
  persistTurnAdvance,
  persistHpChange,
  persistConditions,
  persistDefeated,
  persistCombatantStats,
  persistRulesetVersion,
  persistNewCombatant,
  persistRemoveCombatant,
  persistInitiativeOrder,
  persistEndEncounter,
  persistDmNotes,
  persistPlayerNotes,
} from "@/lib/supabase/session";
import { broadcastEvent, cleanupDmChannel } from "@/lib/realtime/broadcast";
import { useAudioStore } from "@/lib/stores/audio-store";
import { expireSessionTokens } from "@/lib/supabase/session-token";
import { isConcentrating, showConcentrationCheck } from "@/lib/combat/concentration";
import { showDeathSavePrompt, showTurnConditionReminder } from "@/lib/combat/save-prompts";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";
import { parseDamageModifiers, applyDamageModifier } from "@/lib/combat/parse-resistances";
import { getMonsterById } from "@/lib/srd/srd-search";
import { toast } from "sonner";
import { assignInitiativeOrder, sortByInitiative, adjustInitiativeAfterReorder } from "@/lib/utils/initiative";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

/** Get the name of the combatant whose turn is currently active. */
function getCurrentActorName(): string {
  const { combatants, current_turn_index } = useCombatStore.getState();
  return combatants[current_turn_index]?.name ?? "Unknown";
}

interface UseCombatActionsOptions {
  sessionId: string | null;
  onNavigate: (path: string) => void;
}

export function useCombatActions({ sessionId, onNavigate }: UseCombatActionsOptions) {
  const t = useTranslations("combat");
  const [turnPending, setTurnPending] = useState(false);
  const turnPendingRef = useRef(false);
  const { advanceTurn, setError } = useCombatStore();

  // Keep sessionId in a ref so callbacks never close over a stale prop value
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  const getSessionId = useCallback((): string => {
    return useCombatStore.getState().session_id ?? sessionIdRef.current ?? "";
  }, []);

  const handleAdvanceTurn = useCallback(async () => {
    if (turnPendingRef.current) return;
    turnPendingRef.current = true;
    setTurnPending(true);

    // Cut any playing audio immediately on turn advance
    useAudioStore.getState().stopAllAudio();

    const snap = useCombatStore.getState();
    const { encounter_id, current_turn_index: prevIdx, round_number: prevRound } = snap;
    if (!encounter_id) {
      turnPendingRef.current = false;
      setTurnPending(false);
      return;
    }

    advanceTurn();
    const postAdvance = useCombatStore.getState();
    const { current_turn_index: nextIdx, round_number: nextRound, combatants } = postAdvance;
    if (nextIdx === prevIdx && nextRound === prevRound) {
      turnPendingRef.current = false;
      setTurnPending(false);
      return;
    }

    // Auto-expand group when turn advances to a grouped combatant
    const nextCombatant = combatants[nextIdx];
    if (nextCombatant?.monster_group_id) {
      const { expandedGroups, toggleGroupExpanded } = useCombatStore.getState();
      if (!expandedGroups[nextCombatant.monster_group_id]) {
        toggleGroupExpanded(nextCombatant.monster_group_id);
      }
    }

    // Compute next_combatant_id: the non-defeated combatant after the current one (Story 3.1)
    let nextCombatantId: string | undefined;
    if (combatants.length > 1) {
      for (let i = 1; i < combatants.length; i++) {
        const candidate = combatants[(nextIdx + i) % combatants.length];
        if (!candidate.is_defeated) {
          nextCombatantId = candidate.id;
          break;
        }
      }
    }

    broadcastEvent(getSessionId(), { type: "combat:turn_advance", current_turn_index: nextIdx, round_number: nextRound, next_combatant_id: nextCombatantId });

    // CP.2.1: Log turn advance
    const currentCombatant = combatants[nextIdx];
    if (currentCombatant) {
      useCombatLogStore.getState().addEntry({
        round: nextRound,
        type: "turn",
        actorName: currentCombatant.name,
        description: `Turn: ${currentCombatant.name}`,
      });

      // CP.2.3: Condition save reminders at start of turn
      showTurnConditionReminder(currentCombatant.name, currentCombatant.conditions);
    }

    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      useCombatStore.getState().hydrateActiveState(prevIdx, prevRound);
      setError(err instanceof Error ? err.message : t("error_save_turn"));
    } finally {
      turnPendingRef.current = false;
      setTurnPending(false);
    }
  }, [advanceTurn, setError, t, getSessionId]);

  const handleApplyDamage = useCallback((id: string, amount: number, options?: { damageType?: string; isHalfDamage?: boolean; source?: string }) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    // CP.1.4: Auto-apply resistance/immunity/vulnerability if damageType provided and target is a monster
    let finalAmount = amount;
    let damageModifierResult: string | undefined;
    if (options?.damageType && before.monster_id && before.ruleset_version) {
      const targetMonster = getMonsterById(before.monster_id, before.ruleset_version as RulesetVersion);
      if (targetMonster) {
        const modifiers = parseDamageModifiers(targetMonster);
        const { finalDamage, applied } = applyDamageModifier(finalAmount, options.damageType, modifiers);
        if (applied !== "normal") {
          damageModifierResult = applied;
          finalAmount = finalDamage;
          toast(applied === "immune"
            ? `${options.damageType} → ${before.name}: IMMUNE (0)`
            : applied === "resistant"
            ? `${options.damageType} → ${before.name}: RESISTANT (${amount} → ${finalDamage})`
            : `${options.damageType} → ${before.name}: VULNERABLE (${amount} → ${finalDamage})`,
          { duration: 3000 });
        }
      }
    }

    snap.applyDamage(id, finalAmount);

    // Compute expected post-damage values from snapshot (mirrors store logic)
    let remaining = finalAmount;
    let newTempHp = before.temp_hp;
    if (newTempHp > 0) {
      const absorbed = Math.min(newTempHp, remaining);
      newTempHp -= absorbed;
      remaining -= absorbed;
    }
    const newCurrentHp = Math.max(0, before.current_hp - remaining);

    broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: newCurrentHp, temp_hp: newTempHp, max_hp: before.max_hp, is_player: before.is_player });
    persistHpChange(id, newCurrentHp, newTempHp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));

    // CP.1.4: Log damage to combat log
    const roundNumber = useCombatStore.getState().round_number;
    useCombatLogStore.getState().addEntry({
      round: roundNumber,
      type: "damage",
      actorName: options?.source || getCurrentActorName(),
      targetName: before.name,
      description: `${before.name} takes ${finalAmount}${damageModifierResult ? ` (${damageModifierResult})` : ""} ${options?.damageType ?? ""} damage`,
      details: { damageAmount: finalAmount, damageType: options?.damageType, damageModifier: damageModifierResult },
    });

    // CP.2.2: Concentration check on damage
    if (isConcentrating(before.conditions) && finalAmount > 0) {
      showConcentrationCheck(before.name, finalAmount);
    }

    // CP.2.3: Death save prompt for PCs at 0 HP
    if (before.is_player && newCurrentHp === 0 && before.current_hp > 0) {
      showDeathSavePrompt(before.name);
      useCombatLogStore.getState().addEntry({
        round: roundNumber,
        type: "system",
        actorName: "",
        targetName: before.name,
        description: `${before.name} at 0 HP — death saves required`,
      });
    }
  }, [setError, getSessionId]);

  const handleApplyHealing = useCallback((id: string, amount: number) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    snap.applyHealing(id, amount);

    // Compute expected post-healing values from snapshot (mirrors store logic)
    const newCurrentHp = Math.min(before.max_hp, before.current_hp + amount);

    broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: newCurrentHp, temp_hp: before.temp_hp, max_hp: before.max_hp, is_player: before.is_player });
    persistHpChange(id, newCurrentHp, before.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));

    // CP.2.1: Log heal
    useCombatLogStore.getState().addEntry({
      round: useCombatStore.getState().round_number,
      type: "heal",
      actorName: getCurrentActorName(),
      targetName: before.name,
      description: `${before.name} healed for ${amount} HP`,
    });
  }, [setError, getSessionId]);

  const handleSetTempHp = useCallback((id: string, value: number) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    snap.setTempHp(id, value);

    // Compute expected post-set values from snapshot (mirrors store logic: max of current temp_hp and value)
    const newTempHp = Math.max(before.temp_hp, value);

    broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: before.current_hp, temp_hp: newTempHp, max_hp: before.max_hp, is_player: before.is_player });
    persistHpChange(id, before.current_hp, newTempHp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleToggleCondition = useCallback((id: string, condition: string) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    snap.toggleCondition(id, condition);

    // Compute expected post-toggle conditions from snapshot (mirrors store logic)
    const has = before.conditions.includes(condition);
    const newConditions = has
      ? before.conditions.filter((cond) => cond !== condition)
      : [...before.conditions, condition];

    broadcastEvent(getSessionId(), { type: "combat:condition_change", combatant_id: id, conditions: newConditions });
    persistConditions(id, newConditions).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));

    // CP.2.1: Log condition change
    useCombatLogStore.getState().addEntry({
      round: useCombatStore.getState().round_number,
      type: "condition",
      actorName: getCurrentActorName(),
      targetName: before.name,
      description: `${before.name} ${has ? "lost" : "gained"} ${condition}`,
      details: { conditionName: condition, conditionAction: has ? "removed" : "applied" },
    });
  }, [setError, getSessionId]);

  const handleSetDefeated = useCallback((id: string, isDefeated: boolean) => {
    const name = useCombatStore.getState().combatants.find((c) => c.id === id)?.name ?? "";
    useCombatStore.getState().setDefeated(id, isDefeated);
    broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: isDefeated });
    if (isDefeated) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: 0, temp_hp: 0 });
    }
    persistDefeated(id, isDefeated).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));

    // CP.2.1: Log defeat
    if (isDefeated) {
      useCombatLogStore.getState().addEntry({
        round: useCombatStore.getState().round_number,
        type: "defeat",
        actorName: getCurrentActorName(),
        targetName: name,
        description: `${name} defeated`,
      });
    }
  }, [setError, getSessionId]);

  const handleRemoveCombatant = useCallback((id: string) => {
    const snap = useCombatStore.getState();
    const idx = snap.combatants.findIndex((c) => c.id === id);
    const wasCurrentTurn = idx === snap.current_turn_index;

    snap.removeCombatant(id);

    if (wasCurrentTurn && snap.combatants.length > 1) {
      const postRemove = useCombatStore.getState();
      const clampedIdx = Math.min(postRemove.current_turn_index, postRemove.combatants.length - 1);
      if (clampedIdx !== postRemove.current_turn_index) {
        postRemove.hydrateActiveState(clampedIdx, postRemove.round_number);
      }
    }

    const postState = useCombatStore.getState();
    const reordered = assignInitiativeOrder(postState.combatants);
    postState.hydrateCombatants(reordered);

    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: id });
    persistRemoveCombatant(id).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    if (reordered.length > 0) {
      persistInitiativeOrder(reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError, getSessionId]);

  const handleAddCombatant = useCallback((newCombatant: Omit<Combatant, "id">) => {
    const snap = useCombatStore.getState();
    const prevTurnIndex = snap.current_turn_index;
    const currentTurnCombatant = snap.combatants[prevTurnIndex];
    const existingIds = new Set(snap.combatants.map((c) => c.id));

    snap.addCombatant(newCombatant);
    const postAdd = useCombatStore.getState();
    const sorted = assignInitiativeOrder(sortByInitiative(postAdd.combatants));
    postAdd.hydrateCombatants(sorted);

    // Adjust current_turn_index: find where the current-turn combatant ended up after re-sort
    if (snap.is_active && currentTurnCombatant) {
      const newIdx = sorted.findIndex((c) => c.id === currentTurnCombatant.id);
      if (newIdx !== -1 && newIdx !== prevTurnIndex) {
        useCombatStore.getState().hydrateActiveState(newIdx, snap.round_number);
      }
    }

    const added = sorted.find((c) => !existingIds.has(c.id));
    if (added && snap.encounter_id) {
      broadcastEvent(getSessionId(), { type: "combat:combatant_add", combatant: added });
      persistNewCombatant(snap.encounter_id, added).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
      persistInitiativeOrder(
        sorted.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError, getSessionId]);

  const handleUpdateStats = useCallback((id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    snap.updateCombatantStats(id, stats);

    // Compute expected post-update current_hp from snapshot (mirrors store logic)
    const updatedMaxHp = stats.max_hp !== undefined ? stats.max_hp : before.max_hp;
    const postCurrentHp = stats.max_hp !== undefined && before.current_hp > updatedMaxHp
      ? updatedMaxHp
      : before.current_hp;

    const dbStats: Record<string, unknown> = {};
    if (stats.name !== undefined) dbStats.name = stats.name;
    if (stats.display_name !== undefined) dbStats.display_name = stats.display_name;
    if (stats.max_hp !== undefined) {
      dbStats.max_hp = stats.max_hp;
      dbStats.current_hp = postCurrentHp;
    }
    if (stats.ac !== undefined) dbStats.ac = stats.ac;
    if (stats.spell_save_dc !== undefined) dbStats.spell_save_dc = stats.spell_save_dc;
    broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: id, ...stats });
    persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleSwitchVersion = useCallback((id: string, version: RulesetVersion) => {
    useCombatStore.getState().setRulesetVersion(id, version);
    broadcastEvent(getSessionId(), { type: "combat:version_switch", combatant_id: id, ruleset_version: version });
    persistRulesetVersion(id, version).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleUpdateDmNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updateDmNotes(id, notes);
    persistDmNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleUpdatePlayerNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updatePlayerNotes(id, notes);
    broadcastEvent(getSessionId(), { type: "combat:player_notes_update", combatant_id: id, player_notes: notes });
    persistPlayerNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleReorderCombatants = useCallback((newOrder: Combatant[], movedId?: string) => {
    const snap = useCombatStore.getState();
    const currentCombatant = snap.combatants[snap.current_turn_index];
    const adjusted = movedId ? adjustInitiativeAfterReorder(newOrder, movedId) : newOrder;
    snap.reorderCombatants(adjusted);

    const postReorder = useCombatStore.getState();
    if (currentCombatant) {
      const newIdx = postReorder.combatants.findIndex((c) => c.id === currentCombatant.id);
      if (newIdx !== -1 && newIdx !== snap.current_turn_index) {
        postReorder.hydrateActiveState(newIdx, snap.round_number);
      }
    }
    const reordered = postReorder.combatants;
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: reordered });
    persistInitiativeOrder(
      reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
    ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleSetInitiative = useCallback((id: string, value: number | null) => {
    const snap = useCombatStore.getState();
    const combatant = snap.combatants.find((c) => c.id === id);

    // If this combatant belongs to a group, set/clear initiative for the whole group
    if (combatant?.monster_group_id) {
      if (value !== null) {
        snap.setGroupInitiative(combatant.monster_group_id, value);
      } else {
        // Clear initiative for all group members via individual setInitiative calls
        const groupMembers = snap.combatants.filter((c) => c.monster_group_id === combatant.monster_group_id);
        for (const m of groupMembers) {
          useCombatStore.getState().setInitiative(m.id, null);
        }
      }
    } else {
      snap.setInitiative(id, value);
    }

    const postSet = useCombatStore.getState();
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: postSet.combatants });
    persistInitiativeOrder(
      postSet.combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
    ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleEndEncounter = useCallback(async () => {
    const { encounter_id } = useCombatStore.getState();
    if (!encounter_id) return;
    const sid = getSessionId();
    try {
      await persistEndEncounter(encounter_id);
      broadcastEvent(sid, {
        type: "session:state_sync",
        combatants: [],
        current_turn_index: -1,
        round_number: 0,
      });
      await expireSessionTokens(sid);
      cleanupDmChannel();
      onNavigate("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end encounter.");
    }
  }, [onNavigate, setError, getSessionId]);

  const handleToggleHidden = useCallback((id: string) => {
    const snap = useCombatStore.getState();
    const combatant = snap.combatants.find((c) => c.id === id);
    if (!combatant) return;

    const wasHidden = combatant.is_hidden;
    snap.toggleHidden(id);

    if (wasHidden) {
      // Revealing: broadcast the combatant as a new add so players see it appear
      const revealed = useCombatStore.getState().combatants.find((c) => c.id === id);
      if (revealed) {
        broadcastEvent(getSessionId(), { type: "combat:combatant_add", combatant: revealed });
      }
    } else {
      // Hiding: broadcast a remove so players see it disappear
      broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: id });
    }
  }, [getSessionId]);

  const handleUndoLastAdd = useCallback(() => {
    const removedId = useCombatStore.getState().undoLastAdd();
    if (!removedId) return;

    const postState = useCombatStore.getState();
    const reordered = assignInitiativeOrder(postState.combatants);
    postState.hydrateCombatants(reordered);

    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: removedId });
    persistRemoveCombatant(removedId).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    if (reordered.length > 0) {
      persistInitiativeOrder(
        reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError, getSessionId]);

  return {
    turnPending,
    handleAdvanceTurn,
    handleReorderCombatants,
    handleApplyDamage,
    handleApplyHealing,
    handleSetTempHp,
    handleToggleCondition,
    handleSetDefeated,
    handleRemoveCombatant,
    handleAddCombatant,
    handleUpdateStats,
    handleSetInitiative,
    handleSwitchVersion,
    handleUpdateDmNotes,
    handleUpdatePlayerNotes,
    handleToggleHidden,
    handleUndoLastAdd,
    handleEndEncounter,
    getSessionId,
  };
}
