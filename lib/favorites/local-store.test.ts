/**
 * S5.2 — unit tests for the localStorage-backed favorites store.
 *
 * Framework: Jest (testEnvironment: jsdom — localStorage is available).
 */

import {
  FAVORITES_KEY,
  MAX_PER_KIND,
  addFavorite,
  getFavorites,
  isFavorite,
  removeFavorite,
  subscribe,
  __resetForTests,
} from "@/lib/favorites/local-store";

beforeEach(() => {
  __resetForTests();
});

describe("local-store — add/remove/isFavorite", () => {
  it("adds a favorite and returns it from getFavorites", () => {
    expect(addFavorite("monster", "goblin")).toBe(true);
    const favs = getFavorites("monster");
    expect(favs).toHaveLength(1);
    expect(favs[0].slug).toBe("goblin");
    expect(favs[0].kind).toBe("monster");
    expect(isFavorite("monster", "goblin")).toBe(true);
  });

  it("remove() clears the entry", () => {
    addFavorite("monster", "goblin");
    expect(isFavorite("monster", "goblin")).toBe(true);
    removeFavorite("monster", "goblin");
    expect(isFavorite("monster", "goblin")).toBe(false);
    expect(getFavorites("monster")).toHaveLength(0);
  });

  it("re-adding an existing slug is a no-op and returns true (idempotent)", () => {
    expect(addFavorite("monster", "goblin")).toBe(true);
    expect(addFavorite("monster", "goblin")).toBe(true);
    expect(getFavorites("monster")).toHaveLength(1);
  });

  it("remove() is a no-op when slug not present", () => {
    removeFavorite("monster", "nonexistent");
    expect(getFavorites("monster")).toHaveLength(0);
  });
});

describe("local-store — per-kind cap (50)", () => {
  it("enforces the per-kind cap and returns false at the limit", () => {
    for (let i = 0; i < MAX_PER_KIND; i++) {
      expect(addFavorite("monster", `m-${i}`)).toBe(true);
    }
    expect(getFavorites("monster")).toHaveLength(MAX_PER_KIND);
    // 51st — should fail
    expect(addFavorite("monster", "overflow")).toBe(false);
    expect(getFavorites("monster")).toHaveLength(MAX_PER_KIND);
    expect(isFavorite("monster", "overflow")).toBe(false);
  });

  it("cap is independent across kinds — monster limit does not affect items", () => {
    for (let i = 0; i < MAX_PER_KIND; i++) addFavorite("monster", `m-${i}`);
    // Add an item — should succeed, kinds are independent
    expect(addFavorite("item", "potion")).toBe(true);
    expect(isFavorite("item", "potion")).toBe(true);
    expect(getFavorites("item")).toHaveLength(1);
  });
});

describe("local-store — cross-kind independence", () => {
  it("adding under one kind does not list under another", () => {
    addFavorite("monster", "goblin");
    addFavorite("item", "potion");
    addFavorite("condition", "poisoned");

    expect(getFavorites("monster").map((f) => f.slug)).toEqual(["goblin"]);
    expect(getFavorites("item").map((f) => f.slug)).toEqual(["potion"]);
    expect(getFavorites("condition").map((f) => f.slug)).toEqual(["poisoned"]);

    // getFavorites() without kind returns all
    expect(getFavorites()).toHaveLength(3);
  });
});

describe("local-store — subscribe (cross-tab sync)", () => {
  it("notifies in-process listeners when favorites change", () => {
    const listener = jest.fn();
    const unsub = subscribe(listener);

    addFavorite("monster", "goblin");
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    removeFavorite("monster", "goblin");
    expect(listener).toHaveBeenCalled();

    unsub();
  });

  it("unsubscribe stops future notifications", () => {
    const listener = jest.fn();
    const unsub = subscribe(listener);
    unsub();
    addFavorite("monster", "goblin");
    expect(listener).not.toHaveBeenCalled();
  });

  it("fires on StorageEvent for key FAVORITES_KEY (cross-tab fallback)", () => {
    const listener = jest.fn();
    const unsub = subscribe(listener);

    // Simulate a write from another tab
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: FAVORITES_KEY,
        newValue: JSON.stringify([{ kind: "monster", slug: "owlbear", favorited_at: Date.now() }]),
      }),
    );
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("ignores StorageEvent with unrelated keys", () => {
    const listener = jest.fn();
    const unsub = subscribe(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", newValue: "x" }));
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});

describe("local-store — defensive parsing", () => {
  it("returns [] when stored JSON is malformed", () => {
    window.localStorage.setItem(FAVORITES_KEY, "not-valid-json{");
    expect(getFavorites()).toHaveLength(0);
  });

  it("drops malformed entries but preserves valid ones", () => {
    window.localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify([
        { kind: "monster", slug: "goblin", favorited_at: 1 }, // valid
        null, // invalid
        { kind: "unknown", slug: "x", favorited_at: 1 }, // invalid kind
        { kind: "item", slug: "potion", favorited_at: 2 }, // valid
      ]),
    );
    const favs = getFavorites();
    const slugs = favs.map((f) => f.slug).sort();
    expect(slugs).toEqual(["goblin", "potion"]);
  });
});

describe("local-store — cap is NOT silent", () => {
  it("addFavorite returns false and does not mutate state when at cap", () => {
    for (let i = 0; i < MAX_PER_KIND; i++) addFavorite("monster", `m-${i}`);
    const snapshotBefore = getFavorites("monster");
    const added = addFavorite("monster", "would-overflow");
    expect(added).toBe(false);
    const snapshotAfter = getFavorites("monster");
    expect(snapshotAfter).toEqual(snapshotBefore);
  });
});
