import { create } from "zustand";

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
  };
}

interface CombatLogState {
  entries: CombatLogEntry[];
  addEntry: (entry: Omit<CombatLogEntry, "id" | "timestamp">) => void;
  /** Remove the most recent "turn" log entry (used by undo to clean up phantom entries). */
  removeLastTurnEntry: () => void;
  clear: () => void;
}

const MAX_ENTRIES = 200;

export const useCombatLogStore = create<CombatLogState>((set) => ({
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
  clear: () => set({ entries: [] }),
}));
