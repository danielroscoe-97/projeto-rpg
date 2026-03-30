import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import { sortByInitiative, assignInitiativeOrder } from "@/lib/utils/initiative";

export type GuestCombatPhase = "setup" | "combat" | "ended";

interface GuestCombatState {
  phase: GuestCombatPhase;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  combatStartTime: number | null;
}

interface GuestCombatActions {
  addCombatant: (combatant: Omit<Combatant, "id">) => void;
  addMonsterGroup: (newCombatants: Omit<Combatant, "id">[]) => void;
  removeCombatant: (id: string) => void;
  setInitiative: (id: string, value: number | null) => void;
  batchSetInitiatives: (entries: Array<{ id: string; value: number }>) => void;
  setGroupInitiative: (groupId: string, value: number) => void;
  reorderCombatants: (newOrder: Combatant[]) => void;
  updateCombatantStats: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  updatePlayerNotes: (id: string, notes: string) => void;
  updateDmNotes: (id: string, notes: string) => void;
  startCombat: () => void;
  advanceTurn: () => void;
  applyDamage: (id: string, amount: number) => void;
  applyHealing: (id: string, amount: number) => void;
  setTempHp: (id: string, value: number) => void;
  toggleCondition: (id: string, condition: string) => void;
  setDefeated: (id: string, isDefeated: boolean) => void;
  addDeathSaveSuccess: (id: string) => void;
  addDeathSaveFailure: (id: string) => void;
  resetDeathSaves: (id: string) => void;
  setRulesetVersion: (id: string, version: RulesetVersion) => void;
  resetCombat: () => void;
  hydrateCombatants: (combatants: Combatant[]) => void;
}

type GuestCombatStore = GuestCombatState & GuestCombatActions;

const initialState: GuestCombatState = {
  phase: "setup",
  combatants: [],
  currentTurnIndex: 0,
  roundNumber: 1,
  combatStartTime: null,
};

export const useGuestCombatStore = create<GuestCombatStore>()(
  persist(
    (set) => ({
      ...initialState,

      addCombatant: (combatant) =>
        set((state) => ({
          combatants: [...state.combatants, { ...combatant, id: crypto.randomUUID() }],
        })),

      addMonsterGroup: (newCombatants) =>
        set((state) => ({
          combatants: [
            ...state.combatants,
            ...newCombatants.map((c) => ({ ...c, id: crypto.randomUUID() })),
          ],
        })),

      removeCombatant: (id) =>
        set((state) => ({
          combatants: state.combatants.filter((c) => c.id !== id),
        })),

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

      setGroupInitiative: (groupId, value) =>
        set((state) => {
          const updated = state.combatants.map((c) =>
            c.monster_group_id === groupId ? { ...c, initiative: value } : c
          );
          return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
        }),

      reorderCombatants: (newOrder) =>
        set({ combatants: assignInitiativeOrder(newOrder) }),

      updateCombatantStats: (id, stats) =>
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...stats };
            if (stats.max_hp !== undefined && updated.current_hp > updated.max_hp) {
              updated.current_hp = updated.max_hp;
            }
            return updated;
          }),
        })),

      updatePlayerNotes: (id, notes) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, player_notes: notes } : c
          ),
        })),

      updateDmNotes: (id, notes) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, dm_notes: notes } : c
          ),
        })),

      startCombat: () =>
        set((state) => {
          const sorted = assignInitiativeOrder(sortByInitiative(state.combatants));
          return { phase: "combat", combatants: sorted, currentTurnIndex: 0, roundNumber: 1, combatStartTime: Date.now() };
        }),

      advanceTurn: () =>
        set((state) => {
          const { combatants, currentTurnIndex, roundNumber } = state;
          if (combatants.length === 0) return state;
          let next = currentTurnIndex;
          let roundBumped = false;
          for (let i = 0; i < combatants.length; i++) {
            next = (next + 1) % combatants.length;
            if (next === 0) roundBumped = true;
            if (!combatants[next].is_defeated) break;
          }
          if (combatants[next].is_defeated) return state;
          // Increment condition durations for the combatant whose turn is starting
          const updatedCombatants = [...combatants];
          const nextCombatant = updatedCombatants[next];
          if (nextCombatant.conditions.length > 0 && nextCombatant.condition_durations) {
            const updatedDurations = { ...nextCombatant.condition_durations };
            for (const cond of nextCombatant.conditions) {
              if (cond in updatedDurations) updatedDurations[cond]++;
            }
            updatedCombatants[next] = { ...nextCombatant, condition_durations: updatedDurations };
          }
          return {
            combatants: updatedCombatants,
            currentTurnIndex: next,
            roundNumber: roundBumped ? roundNumber + 1 : roundNumber,
          };
        }),

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
            return { ...c, current_hp: Math.max(0, c.current_hp - remaining), temp_hp: newTempHp };
          }),
        })),

      applyHealing: (id, amount) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, current_hp: Math.min(c.max_hp, c.current_hp + amount) } : c
          ),
        })),

      setTempHp: (id, value) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, temp_hp: Math.min(9999, Math.max(0, value)) } : c
          ),
        })),

      toggleCondition: (id, condition) =>
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const has = c.conditions.includes(condition);
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
        })),

      setDefeated: (id, isDefeated) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id
              ? {
                  ...c,
                  is_defeated: isDefeated,
                  current_hp: isDefeated ? 0 : c.current_hp,
                  death_saves: isDefeated ? c.death_saves : undefined,
                }
              : c
          ),
        })),

      addDeathSaveSuccess: (id) =>
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const saves = c.death_saves ?? { successes: 0, failures: 0 };
            const newSuccesses = Math.min(saves.successes + 1, 3);
            return { ...c, death_saves: { ...saves, successes: newSuccesses } };
          }),
        })),

      addDeathSaveFailure: (id) =>
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const saves = c.death_saves ?? { successes: 0, failures: 0 };
            const newFailures = Math.min(saves.failures + 1, 3);
            if (newFailures >= 3) {
              return { ...c, is_defeated: true, death_saves: { ...saves, failures: 3 } };
            }
            return { ...c, death_saves: { ...saves, failures: newFailures } };
          }),
        })),

      resetDeathSaves: (id) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, death_saves: undefined } : c
          ),
        })),

      setRulesetVersion: (id, version) =>
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, ruleset_version: version } : c
          ),
        })),

      resetCombat: () => set(initialState),

      hydrateCombatants: (combatants) => set({ combatants }),
    }),
    {
      name: "guest-combat-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? sessionStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);

/** Returns guest encounter data from sessionStorage if it exists. */
export function getGuestEncounterData(): {
  combatants: Combatant[];
  roundNumber: number;
  currentTurnIndex: number;
  phase: GuestCombatPhase;
} | null {
  try {
    const raw = typeof window !== "undefined"
      ? sessionStorage.getItem("guest-combat-v1")
      : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state?.combatants?.length) return null;
    return {
      combatants: state.combatants,
      roundNumber: state.roundNumber ?? 1,
      currentTurnIndex: state.currentTurnIndex ?? 0,
      phase: state.phase ?? "setup",
    };
  } catch {
    return null;
  }
}

/** Clears guest encounter data from sessionStorage. */
export function clearGuestEncounterData() {
  try {
    sessionStorage.removeItem("guest-combat-v1");
  } catch {
    // storage unavailable
  }
}

/** Auto-number combatants with the same base name.
 *  e.g. adding two "Goblin" monsters produces ["Goblin 1", "Goblin 2"].
 */
export function getGuestNumberedName(
  baseName: string,
  existingCombatants: Combatant[]
): string {
  const sameBase = existingCombatants.filter((c) =>
    c.name.match(new RegExp(`^${escapeRegex(baseName)} \\d+$`))
  );
  return `${baseName} ${sameBase.length + 1}`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
