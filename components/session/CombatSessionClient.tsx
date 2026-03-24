"use client";

import { useEffect } from "react";
import { useCombatStore } from "@/lib/stores/combat-store";
import { persistInitiativeAndStartCombat, persistTurnAdvance } from "@/lib/supabase/session";
import { InitiativeTracker } from "@/components/combat/InitiativeTracker";
import { CombatantRow } from "@/components/combat/CombatantRow";
import type { Combatant } from "@/lib/types/combat";

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
  const { combatants, startCombat, setEncounterId, is_active, setError, advanceTurn } =
    useCombatStore();
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  const round_number = useCombatStore((s) => s.round_number);

  // Hydrate the store from server-fetched data.
  // When combat is already active, use hydrateActiveState to preserve the real
  // turn/round from the server — startCombat() would incorrectly reset to index 0.
  useEffect(() => {
    const store = useCombatStore.getState();
    store.clearEncounter();
    store.setEncounterId(encounterId, sessionId);
    store.hydrateCombatants(initialCombatants);
    if (isActive) {
      store.hydrateActiveState(currentTurnIndex, roundNumber);
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
    advanceTurn(); // optimistic — instant UI update
    const { encounter_id, current_turn_index: nextIdx, round_number: nextRound } =
      useCombatStore.getState();
    if (!encounter_id) return;
    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save turn.");
    }
  };

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
        <h2 className="text-white font-semibold">
          Round <span className="font-mono text-[#e94560]">{round_number}</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{combatants.length} combatants</span>
          <button
            type="button"
            onClick={handleAdvanceTurn}
            className="px-4 py-2 bg-[#e94560] text-white font-medium rounded-md hover:bg-[#c73652] transition-colors text-sm min-h-[44px]"
            aria-label="Advance to next turn"
            data-testid="next-turn-btn"
          >
            Next Turn →
          </button>
        </div>
      </div>

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
          />
        ))}
      </ul>
    </div>
  );
}
