import { create } from "zustand";
import type { Combatant, EncounterState, CombatActions } from "@/lib/types/combat";
import {
  sortByInitiative,
  assignInitiativeOrder,
} from "@/lib/utils/initiative";

type CombatStore = EncounterState & CombatActions;

const initialState: EncounterState = {
  encounter_id: null,
  session_id: null,
  combatants: [],
  round_number: 1,
  current_turn_index: 0,
  is_active: false,
  is_loading: false,
  error: null,
};

export const useCombatStore = create<CombatStore>((set) => ({
  ...initialState,

  addCombatant: (combatant) =>
    set((state) => ({
      combatants: [
        ...state.combatants,
        { ...combatant, id: crypto.randomUUID() },
      ],
    })),

  removeCombatant: (id) =>
    set((state) => ({
      combatants: state.combatants.filter((c) => c.id !== id),
    })),

  clearEncounter: () => set(initialState),

  setEncounterId: (encounter_id, session_id) =>
    set({ encounter_id, session_id }),

  setError: (error) => set({ error }),

  setLoading: (is_loading) => set({ is_loading }),

  setInitiative: (id, value) =>
    set((state) => {
      const updated = state.combatants.map((c) =>
        c.id === id ? { ...c, initiative: value } : c
      );
      const sorted = assignInitiativeOrder(sortByInitiative(updated));
      return { combatants: sorted };
    }),

  reorderCombatants: (newOrder) =>
    set({ combatants: assignInitiativeOrder(newOrder) }),

  startCombat: () =>
    set({ is_active: true, current_turn_index: 0 }),

  hydrateCombatants: (combatants) => set({ combatants }),

  advanceTurn: () =>
    set((state) => {
      const { combatants, current_turn_index, round_number } = state;
      if (combatants.length === 0) return state;
      let next = current_turn_index;
      let roundBumped = false;
      for (let i = 0; i < combatants.length; i++) {
        next = (next + 1) % combatants.length;
        if (next === 0) roundBumped = true;
        if (!combatants[next].is_defeated) break;
      }
      if (combatants[next].is_defeated) return state;
      return {
        current_turn_index: next,
        round_number: roundBumped ? round_number + 1 : round_number,
      };
    }),

  hydrateActiveState: (currentTurnIndex, roundNumber) =>
    set({ is_active: true, current_turn_index: currentTurnIndex, round_number: roundNumber }),
}));

/** Auto-number combatants with the same base name.
 *  e.g. adding two "Goblin" monsters produces ["Goblin 1", "Goblin 2"].
 *  Returns the numbered name to use for the next addition.
 */
export function getNumberedName(
  baseName: string,
  existingCombatants: Combatant[]
): string {
  const sameBase = existingCombatants.filter(
    (c) => c.name.match(new RegExp(`^${escapeRegex(baseName)} \\d+$`))
  );
  return `${baseName} ${sameBase.length + 1}`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
