/**
 * Unit coverage for `usePlayerHqTabState` (Sprint 3 Track A · Story B4).
 *
 * The hook is pure-ish: branching is driven by storage, optional
 * `initialTab`, and an injectable clock. We assert each branch from
 * the AC checklist:
 *
 *   - First visit: returns 'heroi'
 *   - Switch tab: persists to localStorage with `savedAt`
 *   - Reload <24h: restores stored tab
 *   - Reload >24h: resets to 'heroi' (storage is treated as stale)
 *   - `initialTab` (query param override): wins over storage
 *   - Malformed/foreign storage entries are ignored gracefully
 */

import { renderHook, act } from "@testing-library/react";
import {
  PLAYER_HQ_TAB_TTL_MS_DEFAULT,
  getStorageKey,
  readPersistedTab,
  usePlayerHqTabState,
} from "@/lib/hooks/usePlayerHqTabState";

const CAMPAIGN_ID = "camp-001";
const T0 = 1_700_000_000_000;

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

describe("readPersistedTab", () => {
  it("returns null when no entry exists", () => {
    expect(readPersistedTab(CAMPAIGN_ID, () => T0)).toBeNull();
  });

  it("returns the stored tab when fresh", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "diario", savedAt: T0 }),
    );
    expect(readPersistedTab(CAMPAIGN_ID, () => T0 + 1_000)).toBe("diario");
  });

  it("returns null when entry is older than the TTL", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "diario", savedAt: T0 }),
    );
    expect(
      readPersistedTab(CAMPAIGN_ID, () => T0 + PLAYER_HQ_TAB_TTL_MS_DEFAULT + 1),
    ).toBeNull();
  });

  it("returns null when the stored tab key is unknown", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "ficha", savedAt: T0 }),
    );
    expect(readPersistedTab(CAMPAIGN_ID, () => T0 + 1_000)).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    window.localStorage.setItem(getStorageKey(CAMPAIGN_ID), "{not-json");
    expect(readPersistedTab(CAMPAIGN_ID, () => T0 + 1_000)).toBeNull();
  });

  it("returns null when savedAt is missing or non-numeric", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "diario" }),
    );
    expect(readPersistedTab(CAMPAIGN_ID, () => T0 + 1_000)).toBeNull();
  });
});

describe("usePlayerHqTabState", () => {
  it("defaults to 'heroi' on first visit (no storage, no initialTab)", () => {
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, { now: () => T0 }),
    );
    expect(result.current.activeTab).toBe("heroi");
  });

  it("persists the chosen tab to localStorage with savedAt", () => {
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, { now: () => T0 }),
    );
    act(() => {
      result.current.setActiveTab("arsenal");
    });
    expect(result.current.activeTab).toBe("arsenal");
    const raw = window.localStorage.getItem(getStorageKey(CAMPAIGN_ID));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tab).toBe("arsenal");
    expect(parsed.savedAt).toBe(T0);
  });

  it("restores the stored tab on reload within the TTL", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "mapa", savedAt: T0 }),
    );
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, { now: () => T0 + 1_000 }),
    );
    expect(result.current.activeTab).toBe("mapa");
  });

  it("resets to 'heroi' when the stored entry is older than the TTL", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "mapa", savedAt: T0 }),
    );
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, {
        now: () => T0 + PLAYER_HQ_TAB_TTL_MS_DEFAULT + 1,
      }),
    );
    expect(result.current.activeTab).toBe("heroi");
  });

  it("query param (initialTab) wins over a fresh stored value", () => {
    window.localStorage.setItem(
      getStorageKey(CAMPAIGN_ID),
      JSON.stringify({ tab: "mapa", savedAt: T0 }),
    );
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, {
        initialTab: "diario",
        now: () => T0 + 1_000,
      }),
    );
    expect(result.current.activeTab).toBe("diario");
  });

  it("namespaces storage by campaignId", () => {
    window.localStorage.setItem(
      getStorageKey("other-campaign"),
      JSON.stringify({ tab: "arsenal", savedAt: T0 }),
    );
    const { result } = renderHook(() =>
      usePlayerHqTabState(CAMPAIGN_ID, { now: () => T0 + 1_000 }),
    );
    // Default — the other campaign's entry must not bleed in.
    expect(result.current.activeTab).toBe("heroi");
  });
});
