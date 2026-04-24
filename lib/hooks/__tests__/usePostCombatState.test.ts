/**
 * Unit coverage for `usePostCombatState` (Sprint 2 A6).
 *
 * We exercise the pure branching + storage contract. React Testing
 * Library coverage lives in the PostCombatBanner suite; this file keeps
 * the hook's deterministic logic asserted without a DOM harness.
 */

import { renderHook, act } from "@testing-library/react";
import {
  __POST_COMBAT_STORAGE_KEY__,
  isSnapshotFresh,
  usePostCombatState,
  type PostCombatSnapshot,
} from "@/lib/hooks/usePostCombatState";

const FRESH_SNAPSHOT: PostCombatSnapshot = {
  endedAt: 1_700_000_000_000,
  campaignId: "c1",
  round: 5,
  characterName: "Capa Barsavi",
  hp: { current: 45, max: 88 },
  hpTier: "MODERATE",
};

describe("isSnapshotFresh", () => {
  it("returns false for null snapshots", () => {
    expect(isSnapshotFresh(null)).toBe(false);
  });

  it("returns true when the window has not elapsed", () => {
    const now = () => FRESH_SNAPSHOT.endedAt + 1_000;
    expect(isSnapshotFresh(FRESH_SNAPSHOT, now, 5_000)).toBe(true);
  });

  it("returns false when the window has elapsed", () => {
    const now = () => FRESH_SNAPSHOT.endedAt + 10_000;
    expect(isSnapshotFresh(FRESH_SNAPSHOT, now, 5_000)).toBe(false);
  });
});

describe("usePostCombatState", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.clear();
    }
  });

  it("hides the banner for Guest regardless of flag or stored snapshot", () => {
    const { result } = renderHook(() =>
      usePostCombatState({
        mode: "guest",
        flagEnabled: true,
        now: () => FRESH_SNAPSHOT.endedAt + 1_000,
      }),
    );
    act(() => {
      result.current.recordCombatEnded(FRESH_SNAPSHOT);
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.snapshot).not.toBeNull();
  });

  it("hides the banner when the V2 flag is OFF even with a fresh snapshot", () => {
    const { result } = renderHook(() =>
      usePostCombatState({
        mode: "auth",
        flagEnabled: false,
        now: () => FRESH_SNAPSHOT.endedAt + 1_000,
      }),
    );
    act(() => {
      result.current.recordCombatEnded(FRESH_SNAPSHOT);
    });
    expect(result.current.visible).toBe(false);
  });

  it("shows the banner for Auth with a fresh snapshot + flag ON", () => {
    const { result } = renderHook(() =>
      usePostCombatState({
        mode: "auth",
        flagEnabled: true,
        now: () => FRESH_SNAPSHOT.endedAt + 1_000,
      }),
    );
    act(() => {
      result.current.recordCombatEnded(FRESH_SNAPSHOT);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.snapshot?.campaignId).toBe("c1");
  });

  it("dismiss clears sessionStorage and hides the banner", () => {
    const { result } = renderHook(() =>
      usePostCombatState({
        mode: "auth",
        flagEnabled: true,
        now: () => FRESH_SNAPSHOT.endedAt + 1_000,
      }),
    );
    act(() => {
      result.current.recordCombatEnded(FRESH_SNAPSHOT);
    });
    expect(window.sessionStorage.getItem(__POST_COMBAT_STORAGE_KEY__)).not.toBeNull();
    act(() => {
      result.current.dismiss();
    });
    expect(window.sessionStorage.getItem(__POST_COMBAT_STORAGE_KEY__)).toBeNull();
    expect(result.current.visible).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });
});
