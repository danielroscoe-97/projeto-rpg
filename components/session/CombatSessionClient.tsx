"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
  persistDmNotes,
  persistPlayerNotes,
} from "@/lib/supabase/session";
import { EncounterSetup } from "@/components/combat/EncounterSetup";
import { CombatantRow } from "@/components/combat/CombatantRow";
import { AddCombatantForm } from "@/components/combat/AddCombatantForm";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import { assignInitiativeOrder, sortByInitiative } from "@/lib/utils/initiative";
import { ShareSessionButton } from "@/components/session/ShareSessionButton";
import { broadcastEvent, cleanupDmChannel } from "@/lib/realtime/broadcast";
import { expireSessionTokens } from "@/lib/supabase/session-token";
import { createEncounterWithCombatants } from "@/lib/supabase/encounter";
import { useRouter } from "next/navigation";

interface CombatSessionClientProps {
  /** Session ID — null for fresh encounters not yet persisted */
  sessionId: string | null;
  /** Encounter ID — null for fresh encounters not yet persisted */
  encounterId: string | null;
  initialCombatants: Combatant[];
  isActive: boolean;
  roundNumber: number;
  currentTurnIndex: number;
  /** Ruleset version for SRD search (used in fresh encounter setup) */
  rulesetVersion?: RulesetVersion;
}

export function CombatSessionClient({
  sessionId,
  encounterId,
  initialCombatants,
  isActive,
  roundNumber,
  currentTurnIndex,
  rulesetVersion = "2014",
}: CombatSessionClientProps) {
  const router = useRouter();
  const t = useTranslations("combat");
  const [turnPending, setTurnPending] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  /** Get sessionId for broadcasts — always available during active combat */
  const getSessionId = (): string => {
    return useCombatStore.getState().session_id ?? sessionId ?? "";
  };
  const { combatants, startCombat, setEncounterId, is_active, setError, advanceTurn } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);

  // Hydrate the store from server-fetched data (skip for fresh encounters).
  useEffect(() => {
    const store = useCombatStore.getState();
    if (encounterId && sessionId) {
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
    } else {
      // Fresh encounter — just clear for a blank slate
      store.clearEncounter();
    }
  }, [encounterId, sessionId, isActive, initialCombatants, currentTurnIndex, roundNumber]);

  const handleStartCombat = async () => {
    const store = useCombatStore.getState();
    const current = store.combatants;

    // Sort by initiative and assign order
    const sorted = assignInitiativeOrder(sortByInitiative(current));
    store.hydrateCombatants(sorted);

    // If we already have an encounter (resumed session), use the existing persist flow
    if (store.encounter_id) {
      try {
        await persistInitiativeAndStartCombat(store.encounter_id, sorted);
        store.startCombat();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error_start_combat"));
      }
      return;
    }

    // Fresh encounter — create session + encounter + combatants in one shot
    try {
      const { session_id, encounter_id } = await createEncounterWithCombatants(
        sorted,
        rulesetVersion
      );
      store.setEncounterId(encounter_id, session_id);

      // Mark encounter as active in DB
      await persistInitiativeAndStartCombat(encounter_id, sorted);
      store.startCombat();

      // Update URL for reload resilience (no visible navigation)
      router.replace(`/app/session/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_start_combat"));
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

    broadcastEvent(getSessionId(), { type: "combat:turn_advance", current_turn_index: nextIdx, round_number: nextRound });

    setTurnPending(true);
    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      useCombatStore.getState().hydrateActiveState(prevIdx, prevRound);
      setError(err instanceof Error ? err.message : t("error_save_turn"));
    } finally {
      setTurnPending(false);
    }
  };

  // --- HP Management (Story 3-5) ---
  const handleApplyDamage = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyDamage(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [getSessionId]);

  const handleApplyHealing = useCallback((id: string, amount: number) => {
    useCombatStore.getState().applyHealing(id, amount);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [getSessionId]);

  const handleSetTempHp = useCallback((id: string, value: number) => {
    useCombatStore.getState().setTempHp(id, value);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:hp_update", combatant_id: id, current_hp: c.current_hp, temp_hp: c.temp_hp });
      persistHpChange(id, c.current_hp, c.temp_hp).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [getSessionId]);

  // --- Conditions (Story 3-6) ---
  const handleToggleCondition = useCallback((id: string, condition: string) => {
    useCombatStore.getState().toggleCondition(id, condition);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    if (c) {
      broadcastEvent(getSessionId(), { type: "combat:condition_change", combatant_id: id, conditions: c.conditions });
      persistConditions(id, c.conditions).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [getSessionId]);

  // --- Defeat (Story 3-7) ---
  const handleSetDefeated = useCallback((id: string, isDefeated: boolean) => {
    useCombatStore.getState().setDefeated(id, isDefeated);
    broadcastEvent(getSessionId(), { type: "combat:defeated_change", combatant_id: id, is_defeated: isDefeated });
    persistDefeated(id, isDefeated).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [getSessionId]);

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

    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: id });
    persistRemoveCombatant(id).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    if (updated.length > 0) {
      persistInitiativeOrder(reordered.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
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
      broadcastEvent(getSessionId(), { type: "combat:combatant_add", combatant: added });
      persistNewCombatant(store.encounter_id, added).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
      persistInitiativeOrder(
        useCombatStore.getState().combatants.map((c) => ({ id: c.id, initiative_order: c.initiative_order }))
      ).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }

    setShowAddForm(false);
  }, [getSessionId]);

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
      broadcastEvent(getSessionId(), { type: "combat:stats_update", combatant_id: id, ...stats });
      persistCombatantStats(id, dbStats as Parameters<typeof persistCombatantStats>[1]).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
    }
  }, [getSessionId]);

  // --- Version Switch (Story 3-9) ---
  const handleSwitchVersion = useCallback((id: string, version: RulesetVersion) => {
    useCombatStore.getState().setRulesetVersion(id, version);
    broadcastEvent(getSessionId(), { type: "combat:version_switch", combatant_id: id, ruleset_version: version });
    persistRulesetVersion(id, version).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [getSessionId]);

  // --- Notes (Story 8-6) ---
  const handleUpdateDmNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updateDmNotes(id, notes);
    // DM notes are NEVER broadcast — persist directly
    persistDmNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, []);

  const handleUpdatePlayerNotes = useCallback((id: string, notes: string) => {
    useCombatStore.getState().updatePlayerNotes(id, notes);
    broadcastEvent(getSessionId(), { type: "combat:player_notes_update", combatant_id: id, player_notes: notes });
    persistPlayerNotes(id, notes).catch((err) => setError(err instanceof Error ? err.message : "Failed to save."));
  }, [getSessionId]);

  // --- End Encounter (Story 3-10) ---
  const handleEndEncounter = useCallback(async () => {
    const { encounter_id } = useCombatStore.getState();
    if (!encounter_id) return;
    const sessionId = getSessionId();
    try {
      await persistEndEncounter(encounter_id);
      // Notify players that the session has ended before cleaning up the channel
      broadcastEvent(sessionId, {
        type: "session:state_sync",
        combatants: [],
        current_turn_index: -1,
        round_number: 0,
      });
      // Expire all player tokens so stale join links become invalid
      await expireSessionTokens(sessionId);
      cleanupDmChannel();
      router.push("/app/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end encounter.");
    }
  }, [router, setError, getSessionId]);

  // Show unified setup if not yet active
  if (!is_active) {
    return <EncounterSetup onStartCombat={handleStartCombat} />;
  }

  // Active combat view
  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2" data-testid="active-combat">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">
          {t("round")} <span className="font-mono text-gold">{round_number}</span>
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ShareSessionButton sessionId={getSessionId()} />
          <span className="text-muted-foreground text-xs">{combatants.length} {combatants.length === 1 ? t("combatant") : t("combatants")}</span>
          <button
            type="button"
            onClick={handleEndEncounter}
            className="px-3 py-2 bg-white/[0.06] text-red-400 font-medium rounded-md hover:bg-red-900/30 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="End encounter"
            data-testid="end-encounter-btn"
          >
            {t("end_session")}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-3 py-2 bg-white/[0.06] text-muted-foreground font-medium rounded-md hover:bg-white/[0.1] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px]"
            aria-label="Add combatant"
            data-testid="add-combatant-btn"
          >
            {t("add_mid_combat")}
          </button>
          <button
            type="button"
            onClick={handleAdvanceTurn}
            disabled={turnPending}
            className="px-4 py-2 bg-gold text-foreground font-medium rounded-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Advance to next turn"
            data-testid="next-turn-btn"
          >
            {turnPending ? t("next_turn_saving") : t("next_turn")}
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
        aria-label={t("initiative_order")}
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
            onUpdateDmNotes={handleUpdateDmNotes}
            onUpdatePlayerNotes={handleUpdatePlayerNotes}
          />
        ))}
      </ul>
    </div>
  );
}
