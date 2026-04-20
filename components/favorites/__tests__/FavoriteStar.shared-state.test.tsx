/**
 * @jest-environment jsdom
 *
 * S5.2 Beta 4 P0 — integration test for FavoriteStar under the shared-state
 * feature flag. Proves the rate-limit storm is eliminated:
 *
 *   - Rendering 150 `<FavoriteStar>` (50 monsters × 3 kinds) must result in
 *     EXACTLY 3 fetches against /api/favorites (one per kind), not 150.
 *   - A single focus event must trigger 3 refetches (debounced), not 150.
 *   - Toggling one star propagates via the shared store so every instance
 *     reflects the new state.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { __resetForTests as resetLocal } from "@/lib/favorites/local-store";
import { setFeatureFlagOverrideForTests } from "@/lib/flags";

// Auth mock — signed-in non-anon user so we exercise the /api path.
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "u1", is_anonymous: false } }, error: null }),
    },
  }),
}));

jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

const { useFavoritesStore } = require("@/lib/favorites/favorites-store");

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function installFetchMock() {
  fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (init?.method === "POST") {
      return {
        ok: true,
        status: 201,
        json: async () => ({ favorite: { slug: "x", kind: "monster", favorited_at: "2026-04-19T00:00:00Z" } }),
      } as unknown as Response;
    }
    if (init?.method === "DELETE") {
      return { ok: true, status: 204, json: async () => ({}) } as unknown as Response;
    }
    // GET /api/favorites?kind=X
    void url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ favorites: [] }),
    } as unknown as Response;
  });
  (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
}

beforeEach(() => {
  resetLocal();
  useFavoritesStore.getState().__resetForTests();
  setFeatureFlagOverrideForTests("ff_favorites_v1", true);
  setFeatureFlagOverrideForTests("ff_favorites_v2_shared_state", true);
  installFetchMock();
});

afterEach(() => {
  setFeatureFlagOverrideForTests("ff_favorites_v1", undefined);
  setFeatureFlagOverrideForTests("ff_favorites_v2_shared_state", undefined);
  (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
});

function flush() {
  return act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("FavoriteStar shared-state (ff_favorites_v2_shared_state)", () => {
  it("150 stars across 3 kinds ⇒ exactly 3 fetches (not 150)", async () => {
    const kinds: Array<"monster" | "item" | "condition"> = ["monster", "item", "condition"];
    const perKind = 50;
    const rows: React.ReactNode[] = [];
    for (const kind of kinds) {
      for (let i = 0; i < perKind; i++) {
        rows.push(<FavoriteStar key={`${kind}-${i}`} kind={kind} slug={`${kind}-${i}`} name={`${kind} ${i}`} />);
      }
    }

    render(<div>{rows}</div>);
    // Wait for all ensureHydrated promises to resolve.
    await flush();
    await flush();

    const favoritesCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/favorites"),
    );
    expect(favoritesCalls).toHaveLength(3);
    const urls = favoritesCalls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("kind=monster"))).toBe(true);
    expect(urls.some((u) => u.includes("kind=item"))).toBe(true);
    expect(urls.some((u) => u.includes("kind=condition"))).toBe(true);
  });

  it("focus event ⇒ 3 refetches (one per kind), not N per star", async () => {
    const kinds: Array<"monster" | "item" | "condition"> = ["monster", "item", "condition"];
    const rows: React.ReactNode[] = [];
    for (const kind of kinds) {
      for (let i = 0; i < 10; i++) {
        rows.push(<FavoriteStar key={`${kind}-${i}`} kind={kind} slug={`${kind}-${i}`} name={`${kind} ${i}`} />);
      }
    }

    render(<div>{rows}</div>);
    await flush();
    await flush();

    const beforeCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/favorites")).length;
    expect(beforeCalls).toBe(3);

    // Simulate tab regaining focus. Note: in jsdom, visibilityState defaults
    // to 'visible'; our handler checks that and fires the debounced refresh.
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      // Wait for the 500ms debounce + refetch.
      await new Promise((r) => setTimeout(r, 700));
    });

    const afterCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("/api/favorites")).length;
    // Exactly 3 new fetches (one per hydrated kind), not 30.
    expect(afterCalls - beforeCalls).toBe(3);
  });

  it("toggling one star propagates via shared store (sibling stars update)", async () => {
    // Two stars for the same (kind, slug) — clicking one should reflect on the other.
    render(
      <>
        <FavoriteStar kind="monster" slug="goblin" name="Goblin" />
        <FavoriteStar kind="monster" slug="goblin" name="Goblin 2" />
      </>,
    );
    await flush();
    await flush();

    const stars = screen.getAllByTestId("favorite-star");
    expect(stars).toHaveLength(2);
    expect(stars[0].getAttribute("aria-pressed")).toBe("false");
    expect(stars[1].getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      fireEvent.click(stars[0]);
    });
    await flush();

    const starsAfter = screen.getAllByTestId("favorite-star");
    expect(starsAfter[0].getAttribute("aria-pressed")).toBe("true");
    // Sibling (same kind+slug) reflects the same state via shared selector.
    expect(starsAfter[1].getAttribute("aria-pressed")).toBe("true");
  });
});
