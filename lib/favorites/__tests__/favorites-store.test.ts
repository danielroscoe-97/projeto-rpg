/**
 * @jest-environment jsdom
 *
 * S5.2 Beta 4 P0 — unit tests for the shared-state favorites store.
 *
 * These tests assert the invariants that make the store safe to ship:
 *   1. A single `ensureHydrated(kind)` call triggers exactly 1 fetch; a
 *      second call for the same kind is a no-op (dedup).
 *   2. `add` / `remove` update both the `favorites` array and the `slugs`
 *      Set (O(1) lookup contract).
 *   3. 409 `already_favorite` → `add` returns true, no limit flag.
 *   4. 409 `limit_reached`    → `add` returns false, `limitReached=true`.
 *   5. Guest/anon mode does NOT fetch; local-store subscription hydrates.
 *   6. `__resetForTests` clears state and module-scoped flags.
 */

import { __resetForTests as resetLocal, addFavorite as localAdd } from "@/lib/favorites/local-store";

// Mocks must be declared BEFORE importing the store.
const mockGetUser = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

const { useFavoritesStore } = require("@/lib/favorites/favorites-store");

const originalFetch = global.fetch;

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  (global as unknown as { fetch: typeof fetch }).fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) =>
    impl(typeof input === "string" ? input : input.toString(), init),
  ) as unknown as typeof fetch;
  return (global as unknown as { fetch: jest.Mock }).fetch as jest.Mock;
}

function jsonResponse(body: unknown, status = 200): Response {
  // Use a plain object that mimics the `fetch` Response surface used by the
  // store (`ok`, `status`, `json()`). jsdom's built-in `Response` can behave
  // oddly with `.json()` after a `Response` body reconstruction.
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  resetLocal();
  useFavoritesStore.getState().__resetForTests();
  mockGetUser.mockReset();
  (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
});

describe("favorites-store — ensureHydrated dedupe", () => {
  it("calls /api/favorites exactly once across two ensureHydrated calls for the same kind", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    const fetchMock = mockFetch(async () => jsonResponse({ favorites: [] }));

    const { ensureHydrated } = useFavoritesStore.getState();
    await Promise.all([ensureHydrated("monster"), ensureHydrated("monster")]);
    await ensureHydrated("monster");

    // One fetch for the kind (and zero for others).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/favorites?kind=monster");
  });

  it("3 kinds hydrated concurrently ⇒ 3 fetches (1 per kind, not N per star)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    const fetchMock = mockFetch(async () => jsonResponse({ favorites: [] }));

    const { ensureHydrated } = useFavoritesStore.getState();
    await Promise.all([
      ensureHydrated("monster"),
      ensureHydrated("item"),
      ensureHydrated("condition"),
      // redundant calls — must not trigger extra fetches
      ensureHydrated("monster"),
      ensureHydrated("item"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes("kind=monster"))).toBe(true);
    expect(urls.some((u) => u.includes("kind=item"))).toBe(true);
    expect(urls.some((u) => u.includes("kind=condition"))).toBe(true);
  });
});

describe("favorites-store — add/remove mutations (auth path)", () => {
  it("add() updates both favorites array and slugs Set optimistically", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    mockFetch(async (url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(
          { favorite: { slug: "goblin", kind: "monster", favorited_at: "2026-04-19T12:00:00Z" } },
          201,
        );
      }
      return jsonResponse({ favorites: [] });
    });

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");

    const ok = await store.add("monster", "goblin");
    expect(ok).toBe(true);

    const after = useFavoritesStore.getState().byKind.monster;
    expect(after.slugs.has("goblin")).toBe(true);
    expect(after.favorites.map((f: { slug: string }) => f.slug)).toContain("goblin");
  });

  it("remove() drops the slug from both favorites array and slugs Set", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    mockFetch(async (url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(
          { favorite: { slug: "goblin", kind: "monster", favorited_at: "2026-04-19T12:00:00Z" } },
          201,
        );
      }
      if (init?.method === "DELETE") {
        return { ok: true, status: 204, json: async () => ({}) } as unknown as Response;
      }
      return jsonResponse({ favorites: [] });
    });

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");
    await store.add("monster", "goblin");
    await store.remove("monster", "goblin");

    const after = useFavoritesStore.getState().byKind.monster;
    expect(after.slugs.has("goblin")).toBe(false);
    expect(after.favorites.find((f: { slug: string }) => f.slug === "goblin")).toBeUndefined();
  });
});

describe("favorites-store — 409 handling", () => {
  it("409 already_favorite ⇒ add returns true, limitReached stays false", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    mockFetch(async (url, init) => {
      if (init?.method === "POST") {
        return jsonResponse({ error: "already_favorite" }, 409);
      }
      return jsonResponse({ favorites: [{ slug: "goblin", kind: "monster", favorited_at: "2026-04-19T12:00:00Z" }] });
    });

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");
    const ok = await store.add("monster", "goblin");
    expect(ok).toBe(true);
    expect(useFavoritesStore.getState().byKind.monster.limitReached).toBe(false);
  });

  it("409 limit_reached ⇒ add returns false, limitReached flips to true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    mockFetch(async (url, init) => {
      if (init?.method === "POST") {
        return jsonResponse({ error: "limit_reached" }, 409);
      }
      return jsonResponse({ favorites: [] });
    });

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");
    const ok = await store.add("monster", "overflow");
    expect(ok).toBe(false);
    expect(useFavoritesStore.getState().byKind.monster.limitReached).toBe(true);

    // clearLimitReached flips it back.
    store.clearLimitReached("monster");
    expect(useFavoritesStore.getState().byKind.monster.limitReached).toBe(false);
  });
});

describe("favorites-store — guest / anon path", () => {
  it("ensureHydrated in guest mode does NOT call fetch", async () => {
    // No user (guest).
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const fetchMock = mockFetch(async () => jsonResponse({ favorites: [] }));

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");
    await store.ensureHydrated("item");
    await store.ensureHydrated("condition");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anonymous user is treated as guest (no fetch)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "anon1", is_anonymous: true } } });
    const fetchMock = mockFetch(async () => jsonResponse({ favorites: [] }));

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("guest mode hydrates from local-store and reflects local writes via subscription", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFetch(async () => jsonResponse({ favorites: [] }));

    localAdd("monster", "goblin");

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");

    expect(useFavoritesStore.getState().byKind.monster.slugs.has("goblin")).toBe(true);

    // Subsequent direct local-store write propagates via the subscription.
    localAdd("monster", "orc");
    expect(useFavoritesStore.getState().byKind.monster.slugs.has("orc")).toBe(true);
  });
});

describe("favorites-store — __resetForTests", () => {
  it("clears auth cache, kind state, and allows fresh hydration", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", is_anonymous: false } } });
    const fetchMock = mockFetch(async () => jsonResponse({ favorites: [] }));

    const store = useFavoritesStore.getState();
    await store.ensureHydrated("monster");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Reset & confirm we can hydrate again (auth cache cleared).
    useFavoritesStore.getState().__resetForTests();
    expect(useFavoritesStore.getState().auth.resolved).toBe(false);
    expect(useFavoritesStore.getState().byKind.monster.hydrated).toBe(false);

    await useFavoritesStore.getState().ensureHydrated("monster");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
