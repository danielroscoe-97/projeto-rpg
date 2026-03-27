import { usePinnedCardsStore } from "../pinned-cards-store";
// PinnedCard type available via "../pinned-cards-store" if needed

// Reset store state before each test
beforeEach(() => {
  usePinnedCardsStore.setState({ cards: [], nextZIndex: 1 });
});

describe("usePinnedCardsStore", () => {
  describe("pinCard", () => {
    it("adds a card to the store", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe("monster");
      expect(cards[0].entityId).toBe("goblin-1");
      expect(cards[0].rulesetVersion).toBe("2024");
      expect(cards[0].isMinimized).toBe(false);
      expect(cards[0].id).toBeDefined();
      expect(cards[0].pinnedAt).toBeGreaterThan(0);
    });

    it("is idempotent — pinning the same entity focuses instead of duplicating", () => {
      const store = usePinnedCardsStore.getState();
      store.pinCard("monster", "goblin-1", "2024");
      const firstCard = usePinnedCardsStore.getState().cards[0];
      const initialZIndex = firstCard.zIndex;

      // Pin the same entity again
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards).toHaveLength(1);
      // z-index should have increased (focused)
      expect(cards[0].zIndex).toBeGreaterThan(initialZIndex);
    });

    it("allows pinning same entity with different rulesetVersion", () => {
      const store = usePinnedCardsStore.getState();
      store.pinCard("monster", "goblin-1", "2024");
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2014");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards).toHaveLength(2);
    });

    it("allows pinning same entityId with different type", () => {
      const store = usePinnedCardsStore.getState();
      store.pinCard("monster", "fire-bolt", "2024");
      usePinnedCardsStore.getState().pinCard("spell", "fire-bolt", "2024");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards).toHaveLength(2);
    });

    it("cascading position offsets each new card by +30px", () => {
      const store = usePinnedCardsStore.getState();
      store.pinCard("monster", "goblin-1", "2024");
      usePinnedCardsStore.getState().pinCard("monster", "goblin-2", "2024");
      usePinnedCardsStore.getState().pinCard("monster", "goblin-3", "2024");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards[0].position).toEqual({ x: 100, y: 100 });
      expect(cards[1].position).toEqual({ x: 130, y: 130 });
      expect(cards[2].position).toEqual({ x: 160, y: 160 });
    });

    it("enforces max 8 cards with LRU eviction", () => {
      // Pin 8 cards
      for (let i = 0; i < 8; i++) {
        usePinnedCardsStore
          .getState()
          .pinCard("monster", `monster-${i}`, "2024");
      }
      expect(usePinnedCardsStore.getState().cards).toHaveLength(8);
      const oldestId = usePinnedCardsStore.getState().cards[0].entityId;
      expect(oldestId).toBe("monster-0");

      // Pin a 9th card — oldest should be evicted
      usePinnedCardsStore.getState().pinCard("monster", "monster-8", "2024");

      const { cards } = usePinnedCardsStore.getState();
      expect(cards).toHaveLength(8);
      expect(cards.find((c) => c.entityId === "monster-0")).toBeUndefined();
      expect(cards.find((c) => c.entityId === "monster-8")).toBeDefined();
    });
  });

  describe("unpinCard", () => {
    it("removes a card by id", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      const cardId = usePinnedCardsStore.getState().cards[0].id;

      usePinnedCardsStore.getState().unpinCard(cardId);

      expect(usePinnedCardsStore.getState().cards).toHaveLength(0);
    });

    it("does nothing when card id does not exist", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      usePinnedCardsStore.getState().unpinCard("nonexistent-id");

      expect(usePinnedCardsStore.getState().cards).toHaveLength(1);
    });
  });

  describe("moveCard", () => {
    it("updates the position of a card", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      const cardId = usePinnedCardsStore.getState().cards[0].id;

      usePinnedCardsStore.getState().moveCard(cardId, { x: 500, y: 300 });

      const card = usePinnedCardsStore.getState().cards[0];
      expect(card.position).toEqual({ x: 500, y: 300 });
    });
  });

  describe("focusCard", () => {
    it("brings card to the highest z-index", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      usePinnedCardsStore.getState().pinCard("monster", "goblin-2", "2024");

      const cards = usePinnedCardsStore.getState().cards;
      const firstCardId = cards[0].id;
      const secondCardZIndex = cards[1].zIndex;

      usePinnedCardsStore.getState().focusCard(firstCardId);

      const updated = usePinnedCardsStore.getState().cards;
      const focusedCard = updated.find((c) => c.id === firstCardId)!;
      expect(focusedCard.zIndex).toBeGreaterThan(secondCardZIndex);
    });
  });

  describe("toggleMinimize", () => {
    it("toggles the isMinimized state", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      const cardId = usePinnedCardsStore.getState().cards[0].id;

      expect(usePinnedCardsStore.getState().cards[0].isMinimized).toBe(false);

      usePinnedCardsStore.getState().toggleMinimize(cardId);
      expect(usePinnedCardsStore.getState().cards[0].isMinimized).toBe(true);

      usePinnedCardsStore.getState().toggleMinimize(cardId);
      expect(usePinnedCardsStore.getState().cards[0].isMinimized).toBe(false);
    });
  });

  describe("unpinAll", () => {
    it("clears all cards and resets nextZIndex", () => {
      usePinnedCardsStore.getState().pinCard("monster", "goblin-1", "2024");
      usePinnedCardsStore.getState().pinCard("spell", "fireball", "2024");
      usePinnedCardsStore.getState().pinCard("condition", "stunned", "2024");

      expect(usePinnedCardsStore.getState().cards).toHaveLength(3);

      usePinnedCardsStore.getState().unpinAll();

      expect(usePinnedCardsStore.getState().cards).toHaveLength(0);
      expect(usePinnedCardsStore.getState().nextZIndex).toBe(1);
    });
  });
});
