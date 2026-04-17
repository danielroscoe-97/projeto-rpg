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
  persistHidden,
} from "@/lib/supabase/session";
import { broadcastEvent, cleanupDmChannel } from "@/lib/realtime/broadcast";
import { useAudioStore } from "@/lib/stores/audio-store";
import { expireSessionTokens } from "@/lib/supabase/session-token";
import { isConcentrating, showConcentrationCheck } from "@/lib/combat/concentration";
import { showDeathSavePrompt, showTurnConditionReminder } from "@/lib/combat/save-prompts";
import { hasZeroHpSurvivalTrait } from "@/lib/combat/zero-hp-traits";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";
import { parseDamageModifiers, applyDamageModifier } from "@/lib/combat/parse-resistances";
import { getMonsterById } from "@/lib/srd/srd-search";
import { toast } from "sonner";
import { assignInitiativeOrder, sortByInitiative, adjustInitiativeAfterReorder } from "@/lib/utils/initiative";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import { applyGroupRename } from "@/lib/utils/group-rename";
import { playTurnSfx } from "@/lib/utils/turn-sfx";
import { trackEvent } from "@/lib/analytics/track";
import { persistCombatLog } from "@/lib/supabase/combat-log-persist";

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

    try {
      // Cut any playing audio immediately on turn advance
      useAudioStore.getState().stopAllAudio();

      const snap = useCombatStore.getState();
      const { encounter_id, current_turn_index: prevIdx, round_number: prevRound } = snap;
      if (!encounter_id) return;

      // Finding 5 (spike 2026-04-17): notify CombatantRow panels that the turn
      // is advancing so they can close any panel that's not on the upcoming
      // actor's row. Prevents the auto-scroll guard in CombatList from
      // aborting because a stale panel remained open after an HP edit.
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("combat:turn-advancing", {
              detail: { prev_turn_index: prevIdx },
            }),
          );
        } catch {
          /* non-fatal — environments without CustomEvent fall back to guard */
        }
      }

      advanceTurn();
      playTurnSfx();
      const postAdvance = useCombatStore.getState();
      const { current_turn_index: nextIdx, round_number: nextRound, combatants } = postAdvance;
      if (nextIdx === prevIdx && nextRound === prevRound) return;

      // Fire a companion event with the resolved next index so panels that
      // want row-aware close logic (e.g. keep the incoming actor's panel) can
      // react without re-reading the store themselves.
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(
            new CustomEvent("combat:turn-advanced", {
              detail: { prev_turn_index: prevIdx, next_turn_index: nextIdx },
            }),
          );
        } catch {
          /* non-fatal */
        }
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
      trackEvent("combat:turn_advanced", { round: nextRound, turn_index: nextIdx });

      // CP.2.1: Log turn advance
      const currentCombatant = combatants[nextIdx];

      // Story 1.5: Fire-and-forget push notification to the current combatant (if player)
      // Runs async — never blocks the UI or DB persist
      if (currentCombatant?.is_player && !currentCombatant.is_defeated) {
        const sid = getSessionId();
        if (sid) {
          fetch("/api/push/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sid,
              playerName: currentCombatant.name,
            }),
          }).catch(() => {
            // Push notify is best-effort — silently ignore failures
          });
        }
      }
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
        // Flush combat log to DB at each new round (fire-and-forget)
        if (nextRound > prevRound) {
          const logEntries = useCombatLogStore.getState().entries;
          persistCombatLog(encounter_id, logEntries).catch(() => { /* non-fatal */ });
        }
      } catch (err) {
        useCombatStore.getState().hydrateActiveState(prevIdx, prevRound);
        setError(err instanceof Error ? err.message : t("error_save_turn"));
      }
    } finally {
      turnPendingRef.current = false;
      setTurnPending(false);
    }
  }, [advanceTurn, setError, t, getSessionId]);

  const handleApplyDamage = useCallback((id: string, amount: number, options?: { damageType?: string; isHalfDamage?: boolean; source?: string; attackType?: "melee" | "ranged" | "spell" }) => {
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
      details: { damageAmount: finalAmount, damageType: options?.damageType, damageModifier: damageModifierResult, attackType: options?.attackType },
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

    // CF-04: Auto-defeat non-player combatants at 0 HP
    if (newCurrentHp === 0 && !before.is_player && !before.is_defeated) {
      const { hasTrait, traitName } = hasZeroHpSurvivalTrait(before);
      if (hasTrait) {
        toast(t("auto_defeat_trait_confirm", { name: before.name, trait: traitName ?? "?" }), {
          duration: 10000,
          action: {
            label: t("auto_defeat_yes"),
            onClick: () => {
              useCombatStore.getState().setDefeated(id, true);
              broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: true });
              persistDefeated(id, true).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
              useCombatLogStore.getState().addEntry({
                round: useCombatStore.getState().round_number,
                type: "defeat",
                actorName: getCurrentActorName(),
                targetName: before.name,
                description: `${before.name} defeated`,
              });
            },
          },
          cancel: {
            label: t("auto_defeat_no"),
            onClick: () => {},
          },
        });
      } else {
        useCombatStore.getState().setDefeated(id, true);
        broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: true });
        persistDefeated(id, true).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
        toast(t("auto_defeat_confirmed", { name: before.name }), { duration: 3000 });
        useCombatLogStore.getState().addEntry({
          round: roundNumber,
          type: "defeat",
          actorName: getCurrentActorName(),
          targetName: before.name,
          description: `${before.name} defeated`,
        });
      }
    }
  }, [setError, getSessionId]);

  const handleApplyHealing = useCallback((id: string, amount: number, source?: string) => {
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
      actorName: source ?? getCurrentActorName(),
      targetName: before.name,
      description: `${before.name} healed for ${amount} HP`,
    });
  }, [setError, getSessionId]);

  const handleSetTempHp = useCallback((id: string, value: number) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    snap.setTempHp(id, value);

    // Compute expected post-set values from snapshot (mirrors store logic: max of current temp_hp and value, capped at 9999)
    const newTempHp = Math.min(9999, Math.max(before.temp_hp, value));

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
    // C3: Also detect if removed combatant was BEFORE current turn
    const wasBeforeCurrent = idx !== -1 && idx < snap.current_turn_index;

    snap.removeCombatant(id);

    if (wasCurrentTurn && snap.combatants.length > 1) {
      const postRemove = useCombatStore.getState();
      const clampedIdx = Math.min(postRemove.current_turn_index, postRemove.combatants.length - 1);
      if (clampedIdx !== postRemove.current_turn_index) {
        postRemove.hydrateActiveState(clampedIdx, postRemove.round_number);
      }
    } else if (wasBeforeCurrent) {
      // C3: Decrement turn index to keep pointing at the same combatant
      const postRemove = useCombatStore.getState();
      const newIdx = Math.max(0, postRemove.current_turn_index - 1);
      if (newIdx !== postRemove.current_turn_index) {
        postRemove.hydrateActiveState(newIdx, postRemove.round_number);
      }
    }

    const postState = useCombatStore.getState();
    const reordered = assignInitiativeOrder(postState.combatants);
    postState.hydrateCombatants(reordered);

    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: id });
    trackEvent("combat:combatant_removed", { combatant_id: id });

    // BT2-02: Broadcast full state sync after removal so players get correct
    // initiative order and adjusted turn index (player-side can't adjust these locally)
    const syncState = useCombatStore.getState();
    if (syncState.encounter_id) {
      broadcastEvent(getSessionId(), {
        type: "session:state_sync",
        combatants: syncState.combatants,
        current_turn_index: syncState.current_turn_index,
        round_number: syncState.round_number,
        encounter_id: syncState.encounter_id,
      });
    }

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
      trackEvent("combat:combatant_added", { name: added.name, is_player: added.is_player });

      // BT2-03: Broadcast full state sync after add so players get correct
      // initiative order (player-side just appends to end without sorting)
      const syncState = useCombatStore.getState();
      broadcastEvent(getSessionId(), {
        type: "session:state_sync",
        combatants: syncState.combatants,
        current_turn_index: syncState.current_turn_index,
        round_number: syncState.round_number,
        encounter_id: syncState.encounter_id!,
      });

      persistNewCombatant(snap.encounter_id, added).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
      persistInitiativeOrder(
        sorted.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError, getSessionId]);

  const handleUpdateStats = useCallback((id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null; legendary_actions_total?: number | null }) => {
    const snap = useCombatStore.getState();
    const before = snap.combatants.find((x) => x.id === id);
    if (!before) return;

    // A.7: Handle display_name with group rename propagation
    if (stats.display_name !== undefined && stats.display_name !== null) {
      const result = applyGroupRename(snap.combatants, id, stats.display_name);
      if (result.type === "group_rename") {
        // Apply group rename to all members
        for (const [memberId, update] of result.updates) {
          snap.updateCombatantStats(memberId, update);
          broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: memberId, is_player: before.is_player, ...update });
          persistCombatantStats(memberId, update).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
        }
        // Process remaining stats (non display_name) for the target only
        const { display_name: _, ...restStats } = stats;
        if (Object.keys(restStats).length > 0) {
          snap.updateCombatantStats(id, restStats);
          const dbStats: Record<string, unknown> = {};
          if (restStats.name !== undefined) dbStats.name = restStats.name;
          const updatedMaxHp = restStats.max_hp !== undefined ? restStats.max_hp : before.max_hp;
          const postCurrentHp = restStats.max_hp !== undefined && before.current_hp > updatedMaxHp ? updatedMaxHp : before.current_hp;
          if (restStats.max_hp !== undefined) { dbStats.max_hp = restStats.max_hp; dbStats.current_hp = postCurrentHp; }
          if (restStats.ac !== undefined) dbStats.ac = restStats.ac;
          if (restStats.spell_save_dc !== undefined) dbStats.spell_save_dc = restStats.spell_save_dc;
          if (restStats.legendary_actions_total !== undefined) {
            dbStats.legendary_actions_total = restStats.legendary_actions_total;
            if (restStats.legendary_actions_total === null || (before.legendary_actions_total !== null && restStats.legendary_actions_total < before.legendary_actions_total)) {
              dbStats.legendary_actions_used = 0;
              snap.updateCombatantStats(id, { legendary_actions_used: 0 } as Parameters<typeof snap.updateCombatantStats>[1]);
            }
          }
          broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: id, is_player: before.is_player, ...restStats });
          persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
        }
        return;
      }
    }

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
    if (stats.legendary_actions_total !== undefined) {
      dbStats.legendary_actions_total = stats.legendary_actions_total;
      if (stats.legendary_actions_total === null || (before.legendary_actions_total !== null && stats.legendary_actions_total < before.legendary_actions_total)) {
        dbStats.legendary_actions_used = 0;
        snap.updateCombatantStats(id, { legendary_actions_used: 0 } as Parameters<typeof snap.updateCombatantStats>[1]);
      }
    }
    broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: id, is_player: before.is_player, ...stats });
    persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleSwitchVersion = useCallback((id: string, version: RulesetVersion, newMonsterId?: string) => {
    const store = useCombatStore.getState();
    store.setRulesetVersion(id, version);
    if (newMonsterId) {
      store.setMonsterId(id, newMonsterId);
    }
    // Update stats from the new version's monster data
    if (newMonsterId) {
      const newMonster = getMonsterById(newMonsterId, version);
      if (newMonster) {
        const combatant = store.combatants.find((c) => c.id === id);
        if (combatant) {
          const newMaxHp = newMonster.hit_points;
          const cappedHp = Math.min(combatant.current_hp, newMaxHp);
          store.hydrateCombatants(
            store.combatants.map((c) =>
              c.id === id
                ? { ...c, max_hp: newMaxHp, current_hp: cappedHp, ac: newMonster.armor_class, token_url: newMonster.token_url ?? c.token_url }
                : c
            )
          );
        }
      }
    }
    broadcastEvent(getSessionId(), { type: "combat:version_switch", combatant_id: id, ruleset_version: version });
    persistRulesetVersion(id, version, newMonsterId).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
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
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: reordered, current_turn_index: postReorder.current_turn_index });
    persistInitiativeOrder(
      reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
    ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError, getSessionId]);

  const handleSetInitiative = useCallback((id: string, value: number | null) => {
    const snap = useCombatStore.getState();
    const currentCombatant = snap.combatants[snap.current_turn_index];
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
    // Stabilize turn index: re-sort may have moved the current combatant
    if (currentCombatant) {
      const newIdx = postSet.combatants.findIndex((c) => c.id === currentCombatant.id);
      if (newIdx !== -1 && newIdx !== snap.current_turn_index) {
        postSet.hydrateActiveState(newIdx, snap.round_number);
      }
    }
    const finalState = useCombatStore.getState();
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: finalState.combatants, current_turn_index: finalState.current_turn_index });
    persistInitiativeOrder(
      finalState.combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
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
      // A.3: Notify players that session ended — BEFORE expiring tokens/cleanup
      broadcastEvent(sid, {
        type: "session:ended",
        reason: "dm_ended",
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

    // Persist to DB so polling fallback picks up the change
    persistHidden(id, !wasHidden).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [getSessionId, setError]);

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
