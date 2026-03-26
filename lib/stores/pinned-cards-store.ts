import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RulesetVersion } from "@/lib/types/database";

export interface OracleAIData {
  question: string;
  answer: string;
  sources?: { title: string; uri: string }[];
}

export interface PinnedCard {
  id: string;
  type: "monster" | "spell" | "condition" | "oracle-ai";
  entityId: string;
  rulesetVersion: RulesetVersion;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized: boolean;
  pinnedAt: number;
  /** Only present for oracle-ai cards */
  oracleData?: OracleAIData;
}

interface PinnedCardsState {
  cards: PinnedCard[];
  nextZIndex: number;
}

interface PinnedCardsActions {
  pinCard: (
    type: PinnedCard["type"],
    entityId: string,
    rulesetVersion: RulesetVersion,
  ) => void;
  pinOracleAI: (data: OracleAIData) => void;
  unpinCard: (cardId: string) => void;
  moveCard: (cardId: string, position: { x: number; y: number }) => void;
  focusCard: (cardId: string) => void;
  toggleMinimize: (cardId: string) => void;
  unpinAll: () => void;
}

type PinnedCardsStore = PinnedCardsState & PinnedCardsActions;

const MAX_PINNED_CARDS = 8;
const CASCADE_OFFSET = 30;
const BASE_POSITION = { x: 100, y: 100 };

function getSessionStorage() {
  if (typeof window === "undefined") return undefined;
  return sessionStorage;
}

export const usePinnedCardsStore = create<PinnedCardsStore>()(
  persist(
    (set, get) => ({
      cards: [],
      nextZIndex: 1,

      pinCard: (type, entityId, rulesetVersion) => {
        const state = get();

        // Idempotent: if already pinned, focus instead
        const existing = state.cards.find(
          (c) =>
            c.type === type &&
            c.entityId === entityId &&
            c.rulesetVersion === rulesetVersion,
        );
        if (existing) {
          get().focusCard(existing.id);
          return;
        }

        // Build card list, then evict if over max, then compute cascade position
        let currentCards = [...state.cards];

        // LRU eviction: remove oldest card(s) to make room
        if (currentCards.length >= MAX_PINNED_CARDS) {
          const sorted = [...currentCards].sort((a, b) => a.pinnedAt - b.pinnedAt);
          const toRemove = sorted.slice(0, currentCards.length - MAX_PINNED_CARDS + 1);
          const removeIds = new Set(toRemove.map((c) => c.id));
          currentCards = currentCards.filter((c) => !removeIds.has(c.id));
        }

        const cascadeIndex = currentCards.length % MAX_PINNED_CARDS;
        const position = {
          x: BASE_POSITION.x + cascadeIndex * CASCADE_OFFSET,
          y: BASE_POSITION.y + cascadeIndex * CASCADE_OFFSET,
        };

        const newCard: PinnedCard = {
          id: crypto.randomUUID(),
          type,
          entityId,
          rulesetVersion,
          position,
          zIndex: state.nextZIndex,
          isMinimized: false,
          pinnedAt: Date.now(),
        };

        set({ cards: [...currentCards, newCard], nextZIndex: state.nextZIndex + 1 });
      },

      pinOracleAI: (data) => {
        const state = get();
        let currentCards = [...state.cards];

        if (currentCards.length >= MAX_PINNED_CARDS) {
          const sorted = [...currentCards].sort((a, b) => a.pinnedAt - b.pinnedAt);
          const toRemove = sorted.slice(0, currentCards.length - MAX_PINNED_CARDS + 1);
          const removeIds = new Set(toRemove.map((c) => c.id));
          currentCards = currentCards.filter((c) => !removeIds.has(c.id));
        }

        const cascadeIndex = currentCards.length % MAX_PINNED_CARDS;
        const position = {
          x: BASE_POSITION.x + cascadeIndex * CASCADE_OFFSET,
          y: BASE_POSITION.y + cascadeIndex * CASCADE_OFFSET,
        };

        const newCard: PinnedCard = {
          id: crypto.randomUUID(),
          type: "oracle-ai",
          entityId: `oracle-${Date.now()}`,
          rulesetVersion: "2014",
          position,
          zIndex: state.nextZIndex,
          isMinimized: false,
          pinnedAt: Date.now(),
          oracleData: data,
        };

        set({ cards: [...currentCards, newCard], nextZIndex: state.nextZIndex + 1 });
      },

      unpinCard: (cardId) =>
        set((state) => {
          const remaining = state.cards.filter((c) => c.id !== cardId);
          // Compact z-indices when all cards are removed to avoid unbounded growth
          if (remaining.length === 0) return { cards: [], nextZIndex: 1 };
          return { cards: remaining };
        }),

      moveCard: (cardId, position) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId ? { ...c, position } : c,
          ),
        })),

      focusCard: (cardId) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId
              ? { ...c, zIndex: state.nextZIndex, pinnedAt: Date.now() }
              : c,
          ),
          nextZIndex: state.nextZIndex + 1,
        })),

      toggleMinimize: (cardId) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId ? { ...c, isMinimized: !c.isMinimized } : c,
          ),
        })),

      unpinAll: () => set({ cards: [], nextZIndex: 1 }),
    }),
    {
      name: "pinned-cards",
      storage: createJSONStorage(() => {
        const storage = getSessionStorage();
        // Fallback to a no-op storage for SSR
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
        cards: state.cards,
        nextZIndex: state.nextZIndex,
      }),
    },
  ),
);
