import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Combatant } from "@/lib/types/combat";
import type { RulesetVersion } from "@/lib/types/database";
import { sortByInitiative, assignInitiativeOrder } from "@/lib/utils/initiative";

export type GuestCombatPhase = "setup" | "combat" | "ended";

/** Guest session hard limit: 60 minutes */
export const SESSION_LIMIT_MS = 60 * 60 * 1000;
const SESSION_START_KEY = "guest-session-start";
const COMBAT_SNAPSHOT_KEY = "guest-combat-snapshot";
const SNAPSHOT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Check if the guest session has expired (60 min from first visit) */
export function isGuestExpired(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const startStr = localStorage.getItem(SESSION_START_KEY);
    if (!startStr) return false;
    const elapsed = Date.now() - Number(startStr);
    return elapsed >= SESSION_LIMIT_MS;
  } catch {
    return false;
  }
}

/** Save combat state snapshot for post-signup migration */
export function saveGuestCombatSnapshot(state: {
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
}): void {
  try {
    localStorage.setItem(
      COMBAT_SNAPSHOT_KEY,
      JSON.stringify({
        combatants: state.combatants,
        currentTurnIndex: state.currentTurnIndex,
        roundNumber: state.roundNumber,
        timestamp: Date.now(),
      })
    );
  } catch {
    // storage unavailable
  }
}

/** Retrieve combat snapshot if it exists and is less than 24h old */
export function getGuestCombatSnapshot(): {
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  timestamp: number;
} | null {
  try {
    const raw = localStorage.getItem(COMBAT_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.combatants?.length) return null;
    if (Date.now() - parsed.timestamp > SNAPSHOT_EXPIRY_MS) {
      localStorage.removeItem(COMBAT_SNAPSHOT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Clear combat snapshot after import */
export function clearGuestCombatSnapshot(): void {
  try {
    localStorage.removeItem(COMBAT_SNAPSHOT_KEY);
  } catch {
    // storage unavailable
  }
}

/** Reset guest session timer and clear combat state */
export function resetGuestSession(): void {
  try {
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem("guest-banner-dismissed");
    // Set fresh start time
    localStorage.setItem(SESSION_START_KEY, String(Date.now()));
  } catch {
    // storage unavailable
  }
}

interface GuestCombatState {
  phase: GuestCombatPhase;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  combatStartTime: number | null;
  turnStartedAt: number | null;
  turnTimeAccumulated: Record<string, number>;
  /** Turn count per combatant (ID → count). Incremented on advanceTurn. */
  turnCountById: Record<string, number>;
  isExpired: boolean;
  expandedGroups: Record<string, boolean>;
}

interface GuestCombatActions {
  addCombatant: (combatant: Omit<Combatant, "id">) => void;
  addMonsterGroup: (newCombatants: Omit<Combatant, "id">[]) => void;
  removeCombatant: (id: string) => void;
  setInitiative: (id: string, value: number | null) => void;
  batchSetInitiatives: (entries: Array<{ id: string; value: number }>) => void;
  setGroupInitiative: (groupId: string, value: number) => void;
  toggleGroupExpanded: (groupId: string) => void;
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
  incrementLegendaryAction: (id: string) => void;
  setLegendaryActionsUsed: (id: string, count: number) => void;
  setRulesetVersion: (id: string, version: RulesetVersion) => void;
  resetCombat: () => void;
  resetForNewSession: () => void;
  hydrateCombatants: (combatants: Combatant[]) => void;
  checkExpiry: () => boolean;
}

type GuestCombatStore = GuestCombatState & GuestCombatActions;

const initialState: GuestCombatState = {
  phase: "setup",
  combatants: [],
  currentTurnIndex: 0,
  roundNumber: 1,
  combatStartTime: null,
  turnStartedAt: null,
  turnTimeAccumulated: {},
  turnCountById: {},
  isExpired: false,
  expandedGroups: {},
};

export const useGuestCombatStore = create<GuestCombatStore>()(
  persist(
    (set) => {
      /** Guard: if session expired, set isExpired and block the action */
      const guardExpired = (): boolean => {
        if (isGuestExpired()) {
          set({ isExpired: true });
          return true;
        }
        return false;
      };

      return {
      ...initialState,

      checkExpiry: () => {
        const expired = isGuestExpired();
        if (expired) set({ isExpired: true });
        return expired;
      },

      addCombatant: (combatant) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: [...state.combatants, { ...combatant, id: crypto.randomUUID() }],
        }));
      },

      addMonsterGroup: (newCombatants) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: [
            ...state.combatants,
            ...newCombatants.map((c) => ({ ...c, id: crypto.randomUUID() })),
          ],
        }));
      },

      removeCombatant: (id) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.filter((c) => c.id !== id),
        }));
      },

      setInitiative: (id, value) => {
        if (guardExpired()) return;
        set((state) => {
          const updated = state.combatants.map((c) =>
            c.id === id ? { ...c, initiative: value } : c
          );
          const sorted = assignInitiativeOrder(sortByInitiative(updated));
          return { combatants: sorted };
        });
      },

      batchSetInitiatives: (entries) => {
        if (guardExpired()) return;
        set((state) => {
          const initMap = new Map(entries.map((e) => [e.id, e.value]));
          const updated = state.combatants.map((c) =>
            initMap.has(c.id) ? { ...c, initiative: initMap.get(c.id)! } : c
          );
          return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
        });
      },

      setGroupInitiative: (groupId, value) => {
        if (guardExpired()) return;
        set((state) => {
          const updated = state.combatants.map((c) =>
            c.monster_group_id === groupId ? { ...c, initiative: value } : c
          );
          return { combatants: assignInitiativeOrder(sortByInitiative(updated)) };
        });
      },

      toggleGroupExpanded: (groupId) => {
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [groupId]: !state.expandedGroups[groupId],
          },
        }));
      },

      reorderCombatants: (newOrder) => {
        if (guardExpired()) return;
        set({ combatants: assignInitiativeOrder(newOrder) });
      },

      updateCombatantStats: (id, stats) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, ...stats };
            if (stats.max_hp !== undefined && updated.current_hp > updated.max_hp) {
              updated.current_hp = updated.max_hp;
            }
            return updated;
          }),
        }));
      },

      updatePlayerNotes: (id, notes) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, player_notes: notes } : c
          ),
        }));
      },

      updateDmNotes: (id, notes) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, dm_notes: notes } : c
          ),
        }));
      },

      startCombat: () => {
        if (guardExpired()) return;
        const now = Date.now();
        set((state) => {
          const sorted = assignInitiativeOrder(sortByInitiative(state.combatants));
          // First combatant starts with turnCount 1 (their turn begins immediately)
          const initialTurnCount: Record<string, number> = {};
          if (sorted.length > 0) initialTurnCount[sorted[0].id] = 1;
          return { phase: "combat", combatants: sorted, currentTurnIndex: 0, roundNumber: 1, combatStartTime: now, turnStartedAt: now, turnTimeAccumulated: {}, turnCountById: initialTurnCount };
        });
      },

      advanceTurn: () => {
        if (guardExpired()) return;
        set((state) => {
          const { combatants, currentTurnIndex, roundNumber } = state;
          if (combatants.length === 0) return state;

          // Accumulate elapsed turn time for the current combatant
          const currentId = combatants[currentTurnIndex]?.id;
          const elapsed = state.turnStartedAt ? Date.now() - state.turnStartedAt : 0;
          const accumulated = { ...state.turnTimeAccumulated };
          if (currentId && elapsed > 0) {
            accumulated[currentId] = (accumulated[currentId] ?? 0) + elapsed;
          }

          // Re-sort by initiative (applies mid-combat initiative changes)
          const currentCombatantId = combatants[currentTurnIndex]?.id;
          const sorted = assignInitiativeOrder(sortByInitiative([...combatants]));
          const sortedIndex = sorted.findIndex((c) => c.id === currentCombatantId);
          const baseIndex = sortedIndex >= 0 ? sortedIndex : Math.min(currentTurnIndex, sorted.length - 1);

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
          // Reset legendary actions when a new round starts
          const finalCombatants = roundBumped
            ? sorted.map((c) => c.legendary_actions_total != null ? { ...c, legendary_actions_used: 0 } : c)
            : sorted;
          // Increment turn count for the combatant whose turn is starting
          const nextId = finalCombatants[next]?.id;
          const updatedTurnCount = { ...state.turnCountById };
          if (nextId) updatedTurnCount[nextId] = (updatedTurnCount[nextId] ?? 0) + 1;
          return {
            combatants: finalCombatants,
            currentTurnIndex: next,
            roundNumber: roundBumped ? roundNumber + 1 : roundNumber,
            turnTimeAccumulated: accumulated,
            turnCountById: updatedTurnCount,
            turnStartedAt: Date.now(),
          };
        });
      },

      applyDamage: (id, amount) => {
        if (guardExpired()) return;
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
        }));
      },

      applyHealing: (id, amount) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const newHp = Math.min(c.max_hp, c.current_hp + amount);
            const resetSaves = c.current_hp === 0 && newHp > 0;
            return { ...c, current_hp: newHp, ...(resetSaves ? { death_saves: undefined, is_defeated: false } : {}) };
          }),
        }));
      },

      setTempHp: (id, value) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, temp_hp: Math.min(9999, Math.max(c.temp_hp, value)) } : c
          ),
        }));
      },

      toggleCondition: (id, condition) => {
        if (guardExpired()) return;
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
        }));
      },

      setDefeated: (id, isDefeated) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id
              ? {
                  ...c,
                  is_defeated: isDefeated,
                  current_hp: isDefeated ? 0 : Math.max(1, c.current_hp),
                  death_saves: undefined,
                }
              : c
          ),
        }));
      },

      addDeathSaveSuccess: (id) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) => {
            if (c.id !== id) return c;
            const saves = c.death_saves ?? { successes: 0, failures: 0 };
            const newSuccesses = Math.min(saves.successes + 1, 3);
            return { ...c, death_saves: { ...saves, successes: newSuccesses } };
          }),
        }));
      },

      addDeathSaveFailure: (id) => {
        if (guardExpired()) return;
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
        }));
      },

      resetDeathSaves: (id) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, death_saves: undefined } : c
          ),
        }));
      },

      incrementLegendaryAction: (id) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id && c.legendary_actions_total != null && c.legendary_actions_used < c.legendary_actions_total
              ? { ...c, legendary_actions_used: c.legendary_actions_used + 1 }
              : c
          ),
        }));
      },

      setLegendaryActionsUsed: (id, count) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id && c.legendary_actions_total != null
              ? { ...c, legendary_actions_used: Math.max(0, Math.min(count, c.legendary_actions_total)) }
              : c
          ),
        }));
      },

      setRulesetVersion: (id, version) => {
        if (guardExpired()) return;
        set((state) => ({
          combatants: state.combatants.map((c) =>
            c.id === id ? { ...c, ruleset_version: version } : c
          ),
        }));
      },

      resetCombat: () => set(initialState),

      resetForNewSession: () => {
        resetGuestSession();
        set(initialState);
      },

      hydrateCombatants: (combatants) => set({ combatants }),
    };
    },
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
 *  Uses max-number approach to avoid duplicates after removals.
 */
export function getGuestNumberedName(
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
