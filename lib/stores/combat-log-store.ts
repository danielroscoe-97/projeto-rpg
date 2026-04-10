import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  round: number;
  type: "attack" | "damage" | "heal" | "condition" | "turn" | "defeat" | "save" | "system";
  actorName: string;
  targetName?: string;
  description: string;
  details?: {
    targetId?: string;
    damageAmount?: number;
    damageType?: string;
    damageModifier?: string;
    /** Source type of the attack/damage (melee, ranged, spell). Populated from parsed monster actions. */
    attackType?: "melee" | "ranged" | "spell";
    rollResult?: number;
    rollMode?: string;
    isNat1?: boolean;
    isNat20?: boolean;
    conditionName?: string;
    conditionAction?: "applied" | "removed";
    /** Death save result — "success" or "failure". */
    saveResult?: "success" | "failure";
  };
}

interface CombatLogState {
  entries: CombatLogEntry[];
  addEntry: (entry: Omit<CombatLogEntry, "id" | "timestamp">) => void;
  /** Remove the most recent "turn" log entry (used by undo to clean up phantom entries). */
  removeLastTurnEntry: () => void;
  /** Hydrate entries from an external source (DB or backup). Merges without duplicates. */
  hydrateEntries: (entries: CombatLogEntry[]) => void;
  clear: () => void;
}

const MAX_ENTRIES = 500;

export const useCombatLogStore = create<CombatLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => {
          const newEntry: CombatLogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          };
          const next = [...state.entries, newEntry];
          return { entries: next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next };
        }),
      removeLastTurnEntry: () =>
        set((state) => {
          for (let i = state.entries.length - 1; i >= 0; i--) {
            if (state.entries[i].type === "turn") {
              return { entries: [...state.entries.slice(0, i), ...state.entries.slice(i + 1)] };
            }
          }
          return state;
        }),
      hydrateEntries: (incoming) =>
        set((state) => {
          // Merge: keep existing entries, add incoming entries that don't exist yet (by id)
          const existingIds = new Set(state.entries.map((e) => e.id));
          const newEntries = incoming.filter((e) => !existingIds.has(e.id));
          const merged = [...state.entries, ...newEntries].sort((a, b) => a.timestamp - b.timestamp);
          return { entries: merged.length > MAX_ENTRIES ? merged.slice(merged.length - MAX_ENTRIES) : merged };
        }),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "pocketdm_combat_log_v1",
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
