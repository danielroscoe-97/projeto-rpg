import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import type { Combatant, EncounterState, CombatActions, HpUndoEntry } from "@/lib/types/combat";
import {
  sortByInitiative,
  assignInitiativeOrder,
} from "@/lib/utils/initiative";
import { saveCombatBackup } from "@/lib/stores/combat-persist";

type CombatStore = EncounterState & CombatActions;

const MAX_UNDO = 10;

function pushUndo(stack: HpUndoEntry[], entry: HpUndoEntry): HpUndoEntry[] {
  const next = [...stack, entry];
  return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
}

const initialState: EncounterState = {
  encounter_id: null,
  session_id: null,
  encounter_name: "",
  combatants: [],
  round_number: 1,
  current_turn_index: 0,
  is_active: false,
  is_loading: false,
  error: null,
  hpUndoStack: [],
  lastAddedCombatantId: null,
  expandedGroups: {},
};

export const useCombatStore = create<CombatStore>()(subscribeWithSelector((set, get) => ({
  ...initialState,

  addCombatant: (combatant) =>
    set((state) => {
      const id = crypto.randomUUID();
      return {
        combatants: [
          ...state.combatants,
          { ...combatant, id },
        ],
        lastAddedCombatantId: state.is_active ? id : state.lastAddedCombatantId,
      };
    }),

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

  batchSetInitiatives: (entries) =>
    set((state) => {
      const initMap = new Map(entries.map((e) => [e.id, e.value]));
      const updated = state.combatants.map((c) =>
        initMap.has(c.id) ? { ...c, initiative: initMap.get(c.id)! } : c
      );
      return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
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
        if (next === 0 && combatants.length > 1) roundBumped = true;
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
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const undoEntry: HpUndoEntry | null = target
        ? { combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "damage" }
        : null;
      return {
        hpUndoStack: undoEntry ? pushUndo(state.hpUndoStack, undoEntry) : state.hpUndoStack,
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
      };
    }),

  applyHealing: (id, amount) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const undoEntry: HpUndoEntry | null = target
        ? { combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "heal" }
        : null;
      return {
        hpUndoStack: undoEntry ? pushUndo(state.hpUndoStack, undoEntry) : state.hpUndoStack,
        combatants: state.combatants.map((c) =>
          c.id === id
            ? { ...c, current_hp: Math.min(c.max_hp, c.current_hp + amount) }
            : c
        ),
      };
    }),

  setTempHp: (id, value) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const undoEntry: HpUndoEntry | null = target
        ? { combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "temp" }
        : null;
      return {
        hpUndoStack: undoEntry ? pushUndo(state.hpUndoStack, undoEntry) : state.hpUndoStack,
        combatants: state.combatants.map((c) =>
          c.id === id
            ? { ...c, temp_hp: Math.min(9999, Math.max(c.temp_hp, value)) }
            : c
        ),
      };
    }),

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

  toggleHidden: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, is_hidden: !c.is_hidden } : c
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

  undoLastHpChange: () =>
    set((state) => {
      if (state.hpUndoStack.length === 0) return state;
      const stack = [...state.hpUndoStack];
      const entry = stack.pop()!;
      return {
        hpUndoStack: stack,
        combatants: state.combatants.map((c) =>
          c.id === entry.combatantId
            ? { ...c, current_hp: entry.previousHp, temp_hp: entry.previousTempHp }
            : c
        ),
      };
    }),

  addMonsterGroup: (newCombatants) =>
    set((state) => ({
      combatants: [
        ...state.combatants,
        ...newCombatants.map((c) => ({ ...c, id: crypto.randomUUID() })),
      ],
    })),

  setGroupInitiative: (groupId, value) =>
    set((state) => {
      const updated = state.combatants.map((c) =>
        c.monster_group_id === groupId ? { ...c, initiative: value } : c
      );
      return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
    }),

  toggleGroupExpanded: (groupId) =>
    set((state) => ({
      expandedGroups: {
        ...state.expandedGroups,
        [groupId]: !state.expandedGroups[groupId],
      },
    })),

  linkCharacter: (combatantId, characterId, stats) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? {
              ...c,
              player_character_id: characterId,
              name: stats.name,
              max_hp: stats.max_hp,
              current_hp: stats.max_hp,
              ac: stats.ac,
              spell_save_dc: stats.spell_save_dc,
            }
          : c
      ),
    })),

  unlinkCharacter: (combatantId) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === combatantId
          ? { ...c, player_character_id: null }
          : c
      ),
    })),

  undoLastAdd: () => {
    const id = get().lastAddedCombatantId;
    if (!id) return null;
    set((s) => ({
      combatants: s.combatants.filter((c) => c.id !== id),
      lastAddedCombatantId: null,
    }));
    return id;
  },
})));

// Auto-persist combat state to localStorage on changes.
// shallow equality prevents firing when unrelated state slices update.
// Debounced (500ms) to avoid micro-jank from JSON.stringify + localStorage.setItem
// on rapid successive changes (e.g. HP adjustments, condition toggles).
let _backupDebounceTimer: ReturnType<typeof setTimeout> | null = null;
useCombatStore.subscribe(
  (state) => ({
    encounter_id: state.encounter_id,
    combatants: state.combatants,
    round_number: state.round_number,
    current_turn_index: state.current_turn_index,
    is_active: state.is_active,
  }),
  (slice) => {
    if (slice.encounter_id || slice.combatants.length > 0) {
      if (_backupDebounceTimer) clearTimeout(_backupDebounceTimer);
      _backupDebounceTimer = setTimeout(() => {
        saveCombatBackup(useCombatStore.getState());
        _backupDebounceTimer = null;
      }, 500);
    }
  },
  { equalityFn: shallow }
);

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
