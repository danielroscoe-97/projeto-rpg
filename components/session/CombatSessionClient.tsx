"use client";

import { useEffect, useState, useCallback } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import {
  persistInitiativeAndStartCombat,
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
} from "@/lib/supabase/session";
import { InitiativeTracker } from "@/components/combat/InitiativeTracker";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import { assignInitiativeOrder, sortByInitiative } from "@/lib/utils/initiative";
import { ShareSessionButton } from "@/components/session/ShareSessionButton";
import { broadcastEvent, cleanupDmChannel } from "@/lib/realtime/broadcast";
import { useRouter } from "next/navigation";

interface CombatSessionClientProps {
  sessionId: string;
  encounterId: string;
  initialCombatants: Combatant[];
  isActive: boolean;
  roundNumber: number;
  currentTurnIndex: number;
}

export function CombatSessionClient({
  sessionId,
  encounterId,
  initialCombatants,
  isActive,
  roundNumber,
  currentTurnIndex,
}: CombatSessionClientProps) {
  const router = useRouter();
  const [turnPending, setTurnPending] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { combatants, startCombat, setEncounterId, is_active, setError, advanceTurn } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);

  // Hydrate the store from server-fetched data.
  useEffect(() => {
    const store = useCombatStore.getState();
    store.clearEncounter();
    store.setEncounterId(encounterId, sessionId);
    store.hydrateCombatants(initialCombatants);
    if (isActive) {
      const clampedIndex =
        initialCombatants.length > 0
          ? Math.max(0, Math.min(currentTurnIndex, initialCombatants.length - 1))
          : 0;
      store.hydrateActiveState(clampedIndex, Math.max(1, roundNumber));
    }
  }, [encounterId, sessionId, isActive, initialCombatants, currentTurnIndex, roundNumber]);

  const handleStartCombat = async () => {
    const { combatants: current, encounter_id } = useCombatStore.getState();
    if (!encounter_id) {
      setError("Encounter ID missing.");
      return;
    }
    try {
      await persistInitiativeAndStartCombat(encounter_id, current);
      startCombat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start combat.");
    }
  };

  const handleAdvanceTurn = async () => {
    if (turnPending) return;
    const { encounter_id, current_turn_index: prevIdx, round_number: prevRound } =
      useCombatStore.getState();
    if (!encounter_id) return;

    advanceTurn();
    const { current_turn_index: nextIdx, round_number: nextRound } =
      useCombatStore.getState();
    if (nextIdx === prevIdx && nextRound === prevRound) return;

    broadcastEvent(sessionId, { type: "combat:turn_advance", current_turn_index: nextIdx, round_number: nextRound });

    setTurnPending(true);
    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      useCombatStore.getState().hydrateActiveState(prevIdx, prevRound);
      setError(err instanceof Error ? err.message : "Failed to save turn.");
    } finally {
      setTurnPending(false);
    }
  };

  // --- HP Management (Story 3-5) ---
  const handleApplyDamage = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyDamage(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(sessionId, { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch(() => {});
    }
  }, [sessionId]);

  const handleApplyHealing = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyHealing(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(sessionId, { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch(() => {});
    }
  }, [sessionId]);

  const handleSetTempHp = useCallback((id: string, value: number) => {
    useCombatStore.getState().setTempHp(id, value);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(sessionId, { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch(() => {});
    }
  }, [sessionId]);

  // --- Conditions (Story 3-6) ---
  const handleToggleCondition = useCallback((id: string, condition: string) => {
    useCombatStore.getState().toggleCondition(id, condition);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(sessionId, { type: "combat:condition_change", combatant_id: id, conditions: c.conditions });
      persistConditions(id, c.conditions).catch(() => {});
    }
  }, [sessionId]);

  // --- Defeat (Story 3-7) ---
  const handleSetDefeated = useCallback((id: string, isDefeated: boolean) => {
    useCombatStore.getState().setDefeated(id, isDefeated);
    broadcastEvent(sessionId, { type: "combat:defeated_change", combatant_id: id, is_defeated: isDefeated });
    persistDefeated(id, isDefeated).catch(() => {});
  }, [sessionId]);

  // --- Remove Combatant (Story 3-7) ---
  const handleRemoveCombatant = useCallback((id: string) => {
    const store = useCombatStore.getState();
    const idx = store.combatants.findIndex((c) => c.id === id);
    const wasCurrentTurn = idx === store.current_turn_index;

    store.removeCombatant(id);

    // If removed combatant was current turn, advance to adjust
    if (wasCurrentTurn && store.combatants.length > 0) {
      // current_turn_index might now point beyond the list; clamp it
      const newState = useCombatStore.getState();
      const clampedIdx = Math.min(newState.current_turn_index, newState.combatants.length - 1);
      if (clampedIdx !== newState.current_turn_index) {
        newState.hydrateActiveState(clampedIdx, newState.round_number);
      }
    }

    // Re-assign initiative order
    const updated = useCombatStore.getState().combatants;
    const reordered = assignInitiativeOrder(updated);
    useCombatStore.getState().hydrateCombatants(reordered);

    broadcastEvent(sessionId, { type: "combat:combatant_remove", combatant_id: id });
    persistRemoveCombatant(id).catch(() => {});
    if (updated.length > 0) {
      persistInitiativeOrder(reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))).catch(() => {});
    }
  }, []);

  // --- Add Combatant Mid-Combat (Story 3-7) ---
  const handleAddCombatant = useCallback((newCombatant: Omit<Combatant, "id">) => {
    const store = useCombatStore.getState();
    store.addCombatant(newCombatant);

    // Re-sort and re-assign initiative order
    const allCombatants = useCombatStore.getState().combatants;
    const sorted = assignInitiativeOrder(sortByInitiative(allCombatants));
    useCombatStore.getState().hydrateCombatants(sorted);

    // Persist the new combatant
    const added = useCombatStore.getState().combatants.find(
      (c) => c.name === (newCombatant.name) && !store.combatants.some((old) => old.id === c.id)
    );
    if (added && store.encounter_id) {
      broadcastEvent(sessionId, { type: "combat:combatant_add", combatant: added });
      persistNewCombatant(store.encounter_id, added).catch(() => {});
      persistInitiativeOrder(
        useCombatStore.getState().combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch(() => {});
    }

    setShowAddForm(false);
  }, [sessionId]);

  // --- Edit Stats (Story 3-8) ---
  const handleUpdateStats = useCallback((id: string, stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => {
    useCombatStore.getState().updateCombatantStats(id, stats);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      const dbStats: Record<string, unknown> = {};
      if (stats.name !== undefined) dbStats.name = stats.name;
      if (stats.max_hp !== undefined) {
        dbStats.max_hp = stats.max_hp;
        dbStats.current_hp = c.current_hp; // might have been capped
      }
      if (stats.ac !== undefined) dbStats.ac = stats.ac;
      if (stats.spell_save_dc !== undefined) dbStats.spell_save_dc = stats.spell_save_dc;
      broadcastEvent(sessionId, { type: "combat:stats_update", combatant_id: id, ...stats });
      persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch(() => {});
    }
  }, [sessionId]);

  // --- Version Switch (Story 3-9) ---
  const handleSwitchVersion = useCallback((id: string, version: RulesetVersion) => {
    useCombatStore.getState().setRulesetVersion(id, version);
    broadcastEvent(sessionId, { type: "combat:version_switch", combatant_id: id, ruleset_version: version });
    persistRulesetVersion(id, version).catch(() => {});
  }, [sessionId]);

  // --- End Encounter (Story 3-10) ---
  const handleEndEncounter = useCallback(async () => {
    const { encounter_id } = useCombatStore.getState();
    if (!encounter_id) return;
    try {
      await persistEndEncounter(encounter_id);
      cleanupDmChannel();
      router.push("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end encounter.");
    }
  }, [router, setError]);

  // Show initiative setup if not yet active
  if (!is_active) {
    return (
      <div className="max-w-2xl mx-auto">
        <InitiativeTracker onStartCombat={handleStartCombat} />
      </div>
    );
  }

  // Active combat view
  return (
    <div className="max-w-2xl mx-auto space-y-4" data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">
          Round <span className="font-mono text-gold">{round_number}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ShareSessionButton sessionId={sessionId} />
          <span className="text-muted-foreground text-xs">{combatants.length} combatants</span>
          <button
            type="button"
            onClick={handleEndEncounter}
            className="px-3 py-2 bg-white/[0.06] text-red-400 font-medium rounded-md hover:bg-red-900/30 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="End encounter"
            data-testid="end-encounter-btn"
          >
            End
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-3 py-2 bg-white/[0.06] text-muted-foreground font-medium rounded-md hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="Add combatant"
            data-testid="add-combatant-btn"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={handleAdvanceTurn}
            disabled={turnPending}
            className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Advance to next turn"
            data-testid="next-turn-btn"
          >
            {turnPending ? "Saving\u2026" : "Next Turn \u2192"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddCombatantForm
          onAdd={handleAddCombatant}
          onClose={() => setShowAddForm(false)}
        />
      )}

      <ul
        className="space-y-2"
        role="list"
        aria-label="Initiative order"
        data-testid="initiative-list"
      >
        {combatants.map((c, index) => (
          <CombatantRow
            key={c.id}
            combatant={c}
            isCurrentTurn={index === current_turn_index}
            showActions
            onApplyDamage={handleApplyDamage}
            onApplyHealing={handleApplyHealing}
            onSetTempHp={handleSetTempHp}
            onToggleCondition={handleToggleCondition}
            onSetDefeated={handleSetDefeated}
            onRemoveCombatant={handleRemoveCombatant}
            onUpdateStats={handleUpdateStats}
            onSwitchVersion={handleSwitchVersion}
          />
        ))}
      </ul>
    </div>
  );
}
