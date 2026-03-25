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

  applyDamage: (id, amount) =>
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        let remaining = amount;
        let newTempHp = c.temp_hp;
        if (newTempHp > 0) {
          const absorbed = Math.min(newTempHp, remaining);
          newTempHp -= absorbed;
          remaining -= absorbed;
        }
        const newCurrentHp = Math.max(0, c.current_hp - remaining);
        return { ...c, current_hp: newCurrentHp, temp_hp: newTempHp };
      }),
    })),

  applyHealing: (id, amount) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id
          ? { ...c, current_hp: Math.min(c.max_hp, c.current_hp + amount) }
          : c
      ),
    })),

  setTempHp: (id, value) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id
          ? { ...c, temp_hp: Math.max(c.temp_hp, value) }
          : c
      ),
    })),

  toggleCondition: (id, condition) =>
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const has = c.conditions.includes(condition);
        return {
          ...c,
          conditions: has
            ? c.conditions.filter((cond) => cond !== condition)
            : [...c.conditions, condition],
        };
      }),
    })),

  setDefeated: (id, is_defeated) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, is_defeated } : c
      ),
    })),

  updateCombatantStats: (id, stats) =>
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, ...stats };
        // Cap current HP to new max HP if max_hp was reduced
        if (stats.max_hp !== undefined && updated.current_hp > updated.max_hp) {
          updated.current_hp = updated.max_hp;
        }
        return updated;
      }),
    })),

  setRulesetVersion: (id, version) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, ruleset_version: version } : c
      ),
    })),

  updateDmNotes: (id, notes) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, dm_notes: notes } : c
      ),
    })),

  updatePlayerNotes: (id, notes) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, player_notes: notes } : c
      ),
    })),
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
