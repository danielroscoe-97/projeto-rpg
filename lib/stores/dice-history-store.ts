import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RollResult } from "@/lib/dice/roll";

// ---------------------------------------------------------------------------
// Dice History Store — tracks all dice rolls in the current session
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  result: RollResult;
  timestamp: number;
}

const MAX_ENTRIES = 50;
const MAX_UNREAD = 99;

interface DiceHistoryState {
  entries: HistoryEntry[];
  isOpen: boolean;
  unreadCount: number;
}

interface DiceHistoryActions {
  addEntry: (result: RollResult) => void;
  clear: () => void;
  togglePanel: () => void;
  markRead: () => void;
}

type DiceHistoryStore = DiceHistoryState & DiceHistoryActions;

function getSessionStorage() {
  if (typeof window === "undefined") return undefined;
  return sessionStorage;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useDiceHistoryStore = create<DiceHistoryStore>()(
  persist(
    (set) => ({
      entries: [],
      isOpen: false,
      unreadCount: 0,

      addEntry: (result) => {
        const entry: HistoryEntry = {
          id: generateId(),
          result,
          timestamp: Date.now(),
        };
        set((state) => {
          const entries = [...state.entries, entry];
          // FIFO eviction
          if (entries.length > MAX_ENTRIES) {
            entries.splice(0, entries.length - MAX_ENTRIES);
          }
          return {
            entries,
            unreadCount: state.isOpen
              ? 0
              : Math.min(state.unreadCount + 1, MAX_UNREAD),
          };
        });
      },

      clear: () => set({ entries: [], unreadCount: 0 }),

      // F1: use updater form for atomic read+write
      togglePanel: () =>
        set((state) => {
          const isOpen = !state.isOpen;
          return { isOpen, unreadCount: isOpen ? 0 : state.unreadCount };
        }),

      markRead: () => set({ unreadCount: 0 }),
    }),
    {
      name: "dice-history",
      version: 1,
      storage: createJSONStorage(() => {
        const storage = getSessionStorage();
        if (!storage) {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return storage;
      }),
      partialize: (state) => ({
        entries: state.entries,
      }),
    },
  ),
);

/**
 * Attach a listener for 'dice-roll-result' CustomEvents.
 * Call in a useEffect — returns the cleanup function.
 */
export function initDiceHistoryListener(): () => void {
  // F2: SSR guard
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleRollResult(e: Event) {
    const detail = (e as CustomEvent).detail as RollResult;
    if (detail) {
      useDiceHistoryStore.getState().addEntry(detail);
    }
  }
  window.addEventListener("dice-roll-result", handleRollResult);
  return () => window.removeEventListener("dice-roll-result", handleRollResult);
}
