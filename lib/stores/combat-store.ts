import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import type { Combatant, EncounterState, CombatActions, UndoEntry } from "@/lib/types/combat";
import {
  sortByInitiative,
  assignInitiativeOrder,
} from "@/lib/utils/initiative";
import { saveCombatBackup } from "@/lib/stores/combat-persist";
import { useCombatLogStore } from "@/lib/stores/combat-log-store";
import { cleanupOrphanedLairEntry, hasAnyLairMonster, hasLairActionEntry, createLairActionCombatant } from "@/lib/utils/lair-action";
import { getMonsterById } from "@/lib/srd/srd-search";

type CombatStore = EncounterState & CombatActions;

const MAX_UNDO = 10;

function pushUndo(stack: UndoEntry[], entry: UndoEntry): UndoEntry[] {
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
  undoStack: [],
  lastAddedCombatantId: null,
  expandedGroups: {},
  combatStartedAt: null,
  turnStartedAt: null,
  turnTimeAccumulated: {},
  turnTimeSnapshots: {},
  removedCombatantNames: {},
  isPaused: false,
  pausedAt: null,
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
    set((state) => {
      const removed = state.combatants.find((c) => c.id === id);
      const afterRemove = state.combatants.filter((c) => c.id !== id);
      // Auto-remove orphaned lair action entry if no lair-capable monsters remain
      const combatants = cleanupOrphanedLairEntry(afterRemove, getMonsterById);
      return {
        combatants,
        removedCombatantNames: removed
          ? { ...state.removedCombatantNames, [id]: removed.name }
          : state.removedCombatantNames,
      };
    }),

  clearEncounter: () => {
    try { localStorage.removeItem("combat-timers"); } catch { /* ignore */ }
    set(initialState);
  },

  setEncounterId: (encounter_id, session_id) =>
    set({ encounter_id, session_id }),

  setError: (error) => set({ error }),

  setLoading: (is_loading) => set({ is_loading }),

  setInitiative: (id, value, breakdown) =>
    set((state) => {
      const patch: Partial<Combatant> = { initiative: value };
      if (breakdown !== undefined) patch.initiative_breakdown = breakdown;
      // During active combat, only update the value — do NOT re-sort.
      // Reordering happens on advanceTurn so the current turn isn't disrupted.
      if (state.is_active) {
        const updated = state.combatants.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        );
        return { combatants: updated };
      }
      // Pre-combat: sort immediately so the setup list reflects order.
      const updated = state.combatants.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      );
      const sorted = assignInitiativeOrder(sortByInitiative(updated));
      return { combatants: sorted };
    }),

  batchSetInitiatives: (entries) =>
    set((state) => {
      const initMap = new Map(entries.map((e) => [e.id, { value: e.value, breakdown: e.breakdown }]));
      const updated = state.combatants.map((c) => {
        const entry = initMap.get(c.id);
        if (!entry) return c;
        const patch: Partial<Combatant> = { initiative: entry.value };
        if (entry.breakdown !== undefined) patch.initiative_breakdown = entry.breakdown;
        return { ...c, ...patch };
      });
      return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
    }),

  reorderCombatants: (newOrder) =>
    set({ combatants: assignInitiativeOrder(newOrder) }),

  startCombat: () => {
    const now = Date.now();
    try { localStorage.setItem("combat-timers", JSON.stringify({ combatStartedAt: now, turnStartedAt: now, turnTimeAccumulated: {}, isPaused: false, pausedAt: null })); } catch { /* storage unavailable */ }
    set({ is_active: true, current_turn_index: 0, combatStartedAt: now, turnStartedAt: now, turnTimeAccumulated: {}, isPaused: false, pausedAt: null });
  },

  hydrateCombatants: (combatants) => {
    // Re-create synthetic lair action entry if needed (it's not persisted to DB)
    if (!hasLairActionEntry(combatants) && hasAnyLairMonster(combatants, getMonsterById)) {
      const lairEntry = { ...createLairActionCombatant(), id: crypto.randomUUID() };
      combatants = [...combatants, lairEntry];
    }
    // Restore timer timestamps from localStorage only during active combat (survives page refresh)
    const { is_active } = get();
    let combatStartedAt: number | null = null;
    let turnStartedAt: number | null = null;
    let turnTimeAccumulated: Record<string, number> = {};
    if (is_active) {
      try {
        const saved = localStorage.getItem("combat-timers");
        if (saved) {
          const parsed = JSON.parse(saved);
          combatStartedAt = parsed.combatStartedAt ?? null;
          turnStartedAt = parsed.turnStartedAt ?? null;
          turnTimeAccumulated = parsed.turnTimeAccumulated ?? {};
          // CTA-12: restore pause state
          if (parsed.isPaused) {
            set({ isPaused: true, pausedAt: parsed.pausedAt ?? null });
          }
        }
      } catch { /* ignore */ }
    }
    set({ combatants, combatStartedAt, turnStartedAt, turnTimeAccumulated });
  },

  advanceTurn: () =>
    set((state) => {
      const { combatants, current_turn_index, round_number } = state;
      if (combatants.length === 0) return state;

      // Accumulate elapsed turn time for the current combatant
      // CTA-12 fix: if paused, use pausedAt instead of Date.now() to exclude break time
      const currentId = combatants[current_turn_index]?.id;
      const effectiveNow = (state.isPaused && state.pausedAt) ? state.pausedAt : Date.now();
      const elapsed = state.turnStartedAt ? effectiveNow - state.turnStartedAt : 0;
      const accumulated = { ...state.turnTimeAccumulated };
      if (currentId && elapsed > 0) {
        accumulated[currentId] = (accumulated[currentId] ?? 0) + elapsed;
      }

      // Re-sort by initiative before advancing — this applies any mid-combat
      // initiative changes without disrupting the current combatant's turn.
      const currentCombatantId = combatants[current_turn_index]?.id;
      const sorted = assignInitiativeOrder(sortByInitiative([...combatants]));

      // Find where the current combatant ended up after sorting
      const sortedIndex = sorted.findIndex((c) => c.id === currentCombatantId);
      const baseIndex = sortedIndex >= 0 ? sortedIndex : Math.min(current_turn_index, sorted.length - 1);

      let next = baseIndex;
      let roundBumped = false;
      for (let i = 0; i < sorted.length; i++) {
        next = (next + 1) % sorted.length;
        if (next === 0 && sorted.length > 1) roundBumped = true;
        if (!sorted[next].is_defeated) break;
      }
      if (sorted[next].is_defeated) return state;
      // Increment condition durations for the combatant whose turn is starting
      const nextCombatant = sorted[next];
      if (nextCombatant.conditions.length > 0 && nextCombatant.condition_durations) {
        const updatedDurations = { ...nextCombatant.condition_durations };
        for (const cond of nextCombatant.conditions) {
          if (cond in updatedDurations) updatedDurations[cond]++;
        }
        sorted[next] = { ...nextCombatant, condition_durations: updatedDurations };
      }
      // Reset reaction for the combatant whose turn is starting
      sorted[next] = { ...sorted[next], reaction_used: false };
      // Reset legendary actions when a new round starts
      const finalCombatants = roundBumped
        ? sorted.map((c) => c.legendary_actions_total != null ? { ...c, legendary_actions_used: 0 } : c)
        : sorted;
      // Snapshot turn times at round boundary for per-round analytics
      const snapshots = roundBumped
        ? { ...state.turnTimeSnapshots, [round_number]: { ...accumulated } }
        : state.turnTimeSnapshots;

      return {
        combatants: finalCombatants,
        undoStack: pushUndo(state.undoStack, { type: "turn", previousTurnIndex: current_turn_index, previousRound: round_number, previousCombatants: combatants, previousTurnTimeAccumulated: state.turnTimeAccumulated, previousTurnTimeSnapshots: state.turnTimeSnapshots, previousTurnStartedAt: state.turnStartedAt }),
        current_turn_index: next,
        round_number: roundBumped ? round_number + 1 : round_number,
        turnTimeAccumulated: accumulated,
        turnTimeSnapshots: snapshots,
        turnStartedAt: (() => { const now = Date.now(); try { const saved = JSON.parse(localStorage.getItem("combat-timers") ?? "{}"); localStorage.setItem("combat-timers", JSON.stringify({ ...saved, turnStartedAt: now, turnTimeAccumulated: accumulated, isPaused: false, pausedAt: null })); } catch { /* ignore */ } return now; })(),
        // CTA-12 fix: auto-unpause on turn advance
        isPaused: false,
        pausedAt: null,
      };
    }),

  hydrateActiveState: (currentTurnIndex, roundNumber) =>
    set({ is_active: true, current_turn_index: currentTurnIndex, round_number: roundNumber }),

  applyDamage: (id, amount) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const undoEntry: UndoEntry | null = target
        ? { type: "hp", combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "damage" }
        : null;
      return {
        undoStack: undoEntry ? pushUndo(state.undoStack, undoEntry) : state.undoStack,
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
      const undoEntry: UndoEntry | null = target
        ? { type: "hp", combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "heal" }
        : null;
      return {
        undoStack: undoEntry ? pushUndo(state.undoStack, undoEntry) : state.undoStack,
        combatants: state.combatants.map((c) => {
          if (c.id !== id) return c;
          const newHp = Math.min(c.max_hp, c.current_hp + amount);
          // Reset death saves when healed from 0 HP (D&D 5e rule)
          const resetSaves = c.current_hp === 0 && newHp > 0;
          return { ...c, current_hp: newHp, ...(resetSaves ? { death_saves: undefined, is_defeated: false } : {}) };
        }),
      };
    }),

  setTempHp: (id, value) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const undoEntry: UndoEntry | null = target
        ? { type: "hp", combatantId: id, previousHp: target.current_hp, previousTempHp: target.temp_hp, action: "temp" }
        : null;
      return {
        undoStack: undoEntry ? pushUndo(state.undoStack, undoEntry) : state.undoStack,
        combatants: state.combatants.map((c) =>
          c.id === id
            ? { ...c, temp_hp: Math.min(9999, Math.max(c.temp_hp, value)) }
            : c
        ),
      };
    }),

  toggleCondition: (id, condition) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      const has = target?.conditions.includes(condition) ?? false;
      return {
        undoStack: target ? pushUndo(state.undoStack, { type: "condition", combatantId: id, condition, wasAdded: !has, previousDurations: target.condition_durations ? { ...target.condition_durations } : undefined }) : state.undoStack,
        combatants: state.combatants.map((c) => {
          if (c.id !== id) return c;
          const durations = { ...(c.condition_durations ?? {}) };
          if (has) {
            delete durations[condition];
          } else {
            durations[condition] = 0;
          }
          return {
            ...c,
            conditions: has
              ? c.conditions.filter((cond) => cond !== condition)
              : [...c.conditions, condition],
            condition_durations: durations,
          };
        }),
      };
    }),

  setDefeated: (id, is_defeated) =>
    set((state) => {
      const target = state.combatants.find((c) => c.id === id);
      return {
        undoStack: target ? pushUndo(state.undoStack, { type: "defeated", combatantId: id, wasDefeated: target.is_defeated, previousHp: target.current_hp, previousDeathSaves: target.death_saves }) : state.undoStack,
        combatants: state.combatants.map((c) =>
          c.id === id
            ? {
                ...c,
                is_defeated,
                current_hp: is_defeated ? 0 : Math.max(1, c.current_hp),
                death_saves: undefined,
                // W5: Reset reaction when un-defeating (reviving) so revived combatant starts fresh
                ...(!is_defeated && { reaction_used: false }),
              }
            : c
        ),
      };
    }),

  addDeathSaveSuccess: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const saves = c.death_saves ?? { successes: 0, failures: 0 };
        return { ...c, death_saves: { ...saves, successes: Math.min(saves.successes + 1, 3) } };
      }),
    })),

  addDeathSaveFailure: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) => {
        if (c.id !== id) return c;
        const saves = c.death_saves ?? { successes: 0, failures: 0 };
        const newFailures = Math.min(saves.failures + 1, 3);
        if (newFailures >= 3) return { ...c, is_defeated: true, death_saves: { ...saves, failures: 3 } };
        return { ...c, death_saves: { ...saves, failures: newFailures } };
      }),
    })),

  resetDeathSaves: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, death_saves: undefined } : c
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

  setMonsterId: (id: string, monsterId: string) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, monster_id: monsterId } : c
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

  undoLastAction: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const stack = [...state.undoStack];
    const entry = stack.pop()!;

    switch (entry.type) {
      case "hp":
        set({
          undoStack: stack,
          combatants: state.combatants.map((c) =>
            c.id === entry.combatantId
              ? { ...c, current_hp: entry.previousHp, temp_hp: entry.previousTempHp }
              : c
          ),
        });
        break;
      case "condition":
        set({
          undoStack: stack,
          combatants: state.combatants.map((c) => {
            if (c.id !== entry.combatantId) return c;
            return {
              ...c,
              conditions: entry.wasAdded
                ? c.conditions.filter((cond) => cond !== entry.condition)
                : [...c.conditions, entry.condition],
              condition_durations: entry.previousDurations ? { ...entry.previousDurations } : c.condition_durations,
            };
          }),
        });
        break;
      case "defeated":
        set({
          undoStack: stack,
          combatants: state.combatants.map((c) =>
            c.id === entry.combatantId
              ? { ...c, is_defeated: entry.wasDefeated, current_hp: entry.previousHp, death_saves: entry.previousDeathSaves }
              : c
          ),
        });
        break;
      case "turn": {
        const restoredTime = entry.previousTurnTimeAccumulated;
        const freshTurnStart = Date.now(); // S2-A: fresh timer instead of stale old timestamp
        set({
          undoStack: stack,
          combatants: entry.previousCombatants,
          current_turn_index: Math.min(entry.previousTurnIndex, entry.previousCombatants.length - 1),
          round_number: entry.previousRound,
          turnTimeAccumulated: restoredTime,
          turnTimeSnapshots: entry.previousTurnTimeSnapshots ?? state.turnTimeSnapshots,
          turnStartedAt: freshTurnStart,
        });
        // P2-B: Remove the phantom "turn" log entry added by handleAdvanceTurn
        useCombatLogStore.getState().removeLastTurnEntry();
        // Sync localStorage so page refresh loads correct undo'd state
        try {
          const saved = JSON.parse(localStorage.getItem("combat-timers") ?? "{}");
          localStorage.setItem("combat-timers", JSON.stringify({ ...saved, turnStartedAt: freshTurnStart, turnTimeAccumulated: restoredTime }));
        } catch { /* ignore */ }
        break;
      }
      case "hidden":
        set({
          undoStack: stack,
          combatants: get().combatants.map((c) =>
            c.id === entry.combatantId ? { ...c, is_hidden: entry.wasHidden } : c
          ),
        });
        break;
    }

    return entry;
  },

  undoLastHpChange: () => {
    get().undoLastAction();
  },

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
              combatant_role: null,
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
          ? { ...c, player_character_id: null, combatant_role: null }
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

  incrementLegendaryAction: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id && c.legendary_actions_total != null && c.legendary_actions_used < c.legendary_actions_total
          ? { ...c, legendary_actions_used: c.legendary_actions_used + 1 }
          : c
      ),
    })),

  setLegendaryActionsUsed: (id, count) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id && c.legendary_actions_total != null
          ? { ...c, legendary_actions_used: Math.max(0, Math.min(count, c.legendary_actions_total)) }
          : c
      ),
    })),

  toggleReaction: (id) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, reaction_used: !c.reaction_used } : c
      ),
    })),

  setReactionUsed: (id, used) =>
    set((state) => ({
      combatants: state.combatants.map((c) =>
        c.id === id ? { ...c, reaction_used: used } : c
      ),
    })),

  // CTA-12: Toggle pause — freeze timers on pause, shift timestamps forward on resume
  toggleTimerPause: () =>
    set((state) => {
      if (state.isPaused && state.pausedAt) {
        // Resume: shift timestamps forward by paused duration so elapsed doesn't include break
        const pausedMs = Date.now() - state.pausedAt;
        const newCombatStartedAt = state.combatStartedAt ? state.combatStartedAt + pausedMs : null;
        const newTurnStartedAt = state.turnStartedAt ? state.turnStartedAt + pausedMs : null;
        try { localStorage.setItem("combat-timers", JSON.stringify({ combatStartedAt: newCombatStartedAt, turnStartedAt: newTurnStartedAt, turnTimeAccumulated: state.turnTimeAccumulated, isPaused: false, pausedAt: null })); } catch { /* */ }
        return { isPaused: false, pausedAt: null, combatStartedAt: newCombatStartedAt, turnStartedAt: newTurnStartedAt };
      }
      // Pause: freeze
      const now = Date.now();
      try { const raw = localStorage.getItem("combat-timers"); const parsed = raw ? JSON.parse(raw) : {}; localStorage.setItem("combat-timers", JSON.stringify({ ...parsed, isPaused: true, pausedAt: now })); } catch { /* */ }
      return { isPaused: true, pausedAt: now };
    }),
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
 *  Uses max-number approach to avoid duplicates after removals.
 */
export function getNumberedName(
  baseName: string,
  existingCombatants: Combatant[]
): string {
  const escaped = escapeRegex(baseName);
  const pattern = new RegExp(`^${escaped} (\\d+)$`);
  let maxNum = 0;
  for (const c of existingCombatants) {
    if (c.name === baseName) maxNum = Math.max(maxNum, 1);
    const match = c.name.match(pattern);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  return `${baseName} ${maxNum + 1}`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
