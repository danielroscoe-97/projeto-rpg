"use client";

/**
 * usePostCombatState — Sprint 2 A6 (Campaign + Player Redesign / Grimório).
 *
 * Surface for the Post-Combat Screen (see `20-post-combat-screen-spec.md`).
 *
 * Responsibilities:
 *   1. Persist the "combat just ended" snapshot in sessionStorage with a
 *      bounded TTL (default 5min — configurable via
 *      `DEBUG_POST_COMBAT_REDIRECT_MS` so E2E runs can shrink the window).
 *   2. Expose `visible` = true ONLY when
 *      (a) V2 flag is ON,
 *      (b) mode is not guest (decision #43),
 *      (c) a non-stale snapshot exists in storage.
 *   3. Provide imperative helpers (`recordCombatEnded`, `dismiss`) so the
 *      combat-end listener in `PlayerJoinClient` can hand off state without
 *      re-rendering twice.
 *
 * This hook is intentionally free of network + Supabase dependencies. It
 * consumes a snapshot emitted by the existing `session:combat_recap`
 * broadcast path and reads it back from sessionStorage. Integration with
 * the live `combat:ended` broadcast lands in Sprint 3 when HeroiTab wraps
 * the shell; for Sprint 2 the hook stays dormant but importable.
 */

import { useCallback, useEffect, useState } from "react";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";
import {
  postCombatWindowMs,
  type PostCombatMode,
} from "@/lib/player-hq/post-combat-redirect";

const STORAGE_KEY = "pocketdm_post_combat_snapshot_v1";

export interface PostCombatHp {
  current: number;
  max: number;
}

export interface PostCombatSpellSlotsLevel {
  /** D&D spell slot level (1..9). */
  level: number;
  current: number;
  max: number;
}

export interface PostCombatCondition {
  name: string;
  durationLabel?: string;
  concentration?: boolean;
}

export interface PostCombatPartyMember {
  name: string;
  hpLabel: string; // pre-formatted "62/72 LIGHT" — stays text so copies don't leak thresholds
}

export interface PostCombatSnapshot {
  /** Wall-clock time (ms since epoch) when combat ended. */
  endedAt: number;
  /** Round number at which combat ended. Used for the header copy. */
  round?: number;
  campaignId: string;
  combatId?: string;
  characterName?: string;
  characterHeadline?: string; // "Half-Elf Clérigo/Sorce Nv10"
  hp?: PostCombatHp;
  hpTier?: string; // EN uppercase tier (FULL / LIGHT / ...) — render-as-is per CLAUDE.md
  spellSlots?: PostCombatSpellSlotsLevel[];
  conditions?: PostCombatCondition[];
  inspiration?: number;
  party?: PostCombatPartyMember[];
}

export interface PostCombatStateSnapshot {
  visible: boolean;
  snapshot: PostCombatSnapshot | null;
  /** True when the snapshot is within the live window (fresh). */
  fresh: boolean;
}

export interface UsePostCombatStateOptions {
  mode: PostCombatMode;
  /**
   * Dependency injection for the flag check. Defaults to
   * `isPlayerHqV2Enabled()` — tests pass `false`/`true` without touching
   * `process.env`.
   */
  flagEnabled?: boolean;
  /**
   * Dependency injection for the "now" clock. Default `Date.now`; tests
   * use a fake clock so TTL assertions don't depend on wall time.
   */
  now?: () => number;
}

export interface UsePostCombatStateReturn extends PostCombatStateSnapshot {
  recordCombatEnded: (snapshot: PostCombatSnapshot) => void;
  dismiss: () => void;
  /** Re-read storage — used after tab visibility change. */
  refresh: () => void;
}

function readSnapshot(): PostCombatSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostCombatSnapshot;
    if (!parsed || typeof parsed.endedAt !== "number") return null;
    if (typeof parsed.campaignId !== "string" || !parsed.campaignId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: PostCombatSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage failures are best-effort; the UI still renders while the
    // component is mounted via in-memory state.
  }
}

function clearSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // best-effort
  }
}

export function isSnapshotFresh(
  snapshot: PostCombatSnapshot | null,
  now: () => number = Date.now,
  windowMs: number = postCombatWindowMs(),
): boolean {
  if (!snapshot) return false;
  return now() - snapshot.endedAt <= windowMs;
}

/**
 * Returns the current Post-Combat UI state gated by flag + mode + freshness.
 *
 * Usage pattern (Sprint 3 — HeroiTab mount):
 *   const { visible, snapshot, dismiss } = usePostCombatState({ mode: "auth" });
 *   if (!visible || !snapshot) return null;
 *   return <PostCombatBanner snapshot={snapshot} onDismiss={dismiss} ... />;
 */
export function usePostCombatState(
  options: UsePostCombatStateOptions,
): UsePostCombatStateReturn {
  const {
    mode,
    flagEnabled: flagEnabledOption,
    now = Date.now,
  } = options;

  const [snapshot, setSnapshot] = useState<PostCombatSnapshot | null>(() =>
    readSnapshot(),
  );
  // Re-render bookkeeping — sessionStorage changes on same-tab don't fire
  // `storage` events, so we trigger a local refresh instead.
  const [tick, setTick] = useState(0);

  const flagEnabled = flagEnabledOption ?? isPlayerHqV2Enabled();

  useEffect(() => {
    // Cross-tab storage events — rare but worth catching for Resilient
    // Reconnection parity (player reopens browser into same session).
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setSnapshot(readSnapshot());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const refresh = useCallback(() => {
    setSnapshot(readSnapshot());
    setTick((n) => n + 1);
  }, []);

  const recordCombatEnded = useCallback(
    (next: PostCombatSnapshot) => {
      writeSnapshot(next);
      setSnapshot(next);
      setTick((n) => n + 1);
    },
    [],
  );

  const dismiss = useCallback(() => {
    clearSnapshot();
    setSnapshot(null);
    setTick((n) => n + 1);
  }, []);

  // Decision #43 — Guest never renders the Post-Combat Screen. We still
  // let the hook store the snapshot so legacy analytics downstream can read
  // it; visibility is the guard.
  const guestLocked = mode === "guest";
  const fresh = isSnapshotFresh(snapshot, now);
  const visible = Boolean(flagEnabled) && !guestLocked && fresh;

  // tick is used to invalidate the memoized value when storage mutates
  // from the imperative helpers; reference it so eslint doesn't trim the
  // dependency and so the return identity updates.
  void tick;

  return {
    visible,
    snapshot,
    fresh,
    recordCombatEnded,
    dismiss,
    refresh,
  };
}

// Exported for test harnesses that need deterministic storage state.
export const __POST_COMBAT_STORAGE_KEY__ = STORAGE_KEY;
