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
import { expireSessionTokens } from "@/lib/supabase/session-token";
import { assignInitiativeOrder, sortByInitiative, adjustInitiativeAfterReorder } from "@/lib/utils/initiative";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";

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

    const { encounter_id, current_turn_index: prevIdx, round_number: prevRound } =
      useCombatStore.getState();
    if (!encounter_id) {
      turnPendingRef.current = false;
      setTurnPending(false);
      return;
    }

    advanceTurn();
    const { current_turn_index: nextIdx, round_number: nextRound } =
      useCombatStore.getState();
    if (nextIdx === prevIdx && nextRound === prevRound) {
      turnPendingRef.current = false;
      setTurnPending(false);
      return;
    }

    broadcastEvent(getSessionId(), { type: "combat:turn_advance", current_turn_index: nextIdx, round_number: nextRound });

    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      useCombatStore.getState().hydrateActiveState(prevIdx, prevRound);
      setError(err instanceof Error ? err.message : t("error_save_turn"));
    } finally {
      turnPendingRef.current = false;
      setTurnPending(false);
    }
  }, [advanceTurn, setError, t]);

  const handleApplyDamage = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyDamage(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleApplyHealing = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyHealing(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleSetTempHp = useCallback((id: string, value: number) => {
    useCombatStore.getState().setTempHp(id, value);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleToggleCondition = useCallback((id: string, condition: string) => {
    useCombatStore.getState().toggleCondition(id, condition);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:condition_change", combatant_id: id, conditions: c.conditions });
      persistConditions(id, c.conditions).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleSetDefeated = useCallback((id: string, isDefeated: boolean) => {
    useCombatStore.getState().setDefeated(id, isDefeated);
    broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: isDefeated });
    persistDefeated(id, isDefeated).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleRemoveCombatant = useCallback((id: string) => {
    const store = useCombatStore.getState();
    const idx = store.combatants.findIndex((c) => c.id === id);
    const wasCurrentTurn = idx === store.current_turn_index;

    store.removeCombatant(id);

    if (wasCurrentTurn && store.combatants.length > 0) {
      const newState = useCombatStore.getState();
      const clampedIdx = Math.min(newState.current_turn_index, newState.combatants.length - 1);
      if (clampedIdx !== newState.current_turn_index) {
        newState.hydrateActiveState(clampedIdx, newState.round_number);
      }
    }

    const updated = useCombatStore.getState().combatants;
    const reordered = assignInitiativeOrder(updated);
    useCombatStore.getState().hydrateCombatants(reordered);

    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: id });
    persistRemoveCombatant(id).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    if (updated.length > 0) {
      persistInitiativeOrder(reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleAddCombatant = useCallback((newCombatant: Omit<Combatant, "id">) => {
    const store = useCombatStore.getState();
    const existingIds = new Set(store.combatants.map((c) => c.id));
    store.addCombatant(newCombatant);

    const allCombatants = useCombatStore.getState().combatants;
    const sorted = assignInitiativeOrder(sortByInitiative(allCombatants));
    useCombatStore.getState().hydrateCombatants(sorted);

    const added = useCombatStore.getState().combatants.find(
      (c) => !existingIds.has(c.id)
    );
    if (added && store.encounter_id) {
      broadcastEvent(getSessionId(), { type: "combat:combatant_add", combatant: added });
      persistNewCombatant(store.encounter_id, added).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
      persistInitiativeOrder(
        useCombatStore.getState().combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleUpdateStats = useCallback((id: string, stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => {
    useCombatStore.getState().updateCombatantStats(id, stats);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      const dbStats: Record<string, unknown> = {};
      if (stats.name !== undefined) dbStats.name = stats.name;
      if (stats.max_hp !== undefined) {
        dbStats.max_hp = stats.max_hp;
        dbStats.current_hp = c.current_hp;
      }
      if (stats.ac !== undefined) dbStats.ac = stats.ac;
      if (stats.spell_save_dc !== undefined) dbStats.spell_save_dc = stats.spell_save_dc;
      broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: id, ...stats });
      persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [setError]);

  const handleSwitchVersion = useCallback((id: string, version: RulesetVersion) => {
    useCombatStore.getState().setRulesetVersion(id, version);
    broadcastEvent(getSessionId(), { type: "combat:version_switch", combatant_id: id, ruleset_version: version });
    persistRulesetVersion(id, version).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleUpdateDmNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updateDmNotes(id, notes);
    persistDmNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleUpdatePlayerNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updatePlayerNotes(id, notes);
    broadcastEvent(getSessionId(), { type: "combat:player_notes_update", combatant_id: id, player_notes: notes });
    persistPlayerNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleReorderCombatants = useCallback((newOrder: Combatant[], movedId?: string) => {
    const store = useCombatStore.getState();
    const currentCombatant = store.combatants[store.current_turn_index];
    const adjusted = movedId ? adjustInitiativeAfterReorder(newOrder, movedId) : newOrder;
    store.reorderCombatants(adjusted);
    if (currentCombatant) {
      const newIdx = useCombatStore.getState().combatants.findIndex((c) => c.id === currentCombatant.id);
      if (newIdx !== -1 && newIdx !== store.current_turn_index) {
        useCombatStore.getState().hydrateActiveState(newIdx, store.round_number);
      }
    }
    const reordered = useCombatStore.getState().combatants;
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: reordered });
    persistInitiativeOrder(
      reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order, initiative: c.initiative }))
    ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

  const handleSetInitiative = useCallback((id: string, value: number | null) => {
    useCombatStore.getState().setInitiative(id, value);
    const store = useCombatStore.getState();
    broadcastEvent(getSessionId(), { type: "combat:initiative_reorder", combatants: store.combatants });
    persistInitiativeOrder(
      store.combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
    ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [setError]);

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
  }, [onNavigate, setError]);

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
    handleEndEncounter,
    getSessionId,
  };
}
