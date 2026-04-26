"use client";

import { useCallback, useState } from "react";

/**
 * Player HQ V2 tab state hook (Sprint 3 Track A · Story B4).
 *
 * Per [09-implementation-plan.md §B4](../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md):
 *
 *   - First visit (or > TTL): default tab is `heroi`.
 *   - Switching a tab persists `{ tab, savedAt }` to localStorage under
 *     `pocketdm:lastPlayerHqTab:${campaignId}`.
 *   - Subsequent visits within 24h restore the persisted tab.
 *   - After 24h, the entry is treated as stale and the default returns.
 *   - When `initialTab` is provided (typically derived SSR-side from a
 *     `?tab=` query param), it overrides storage.
 *
 * Dev override: when `NEXT_PUBLIC_DEBUG_TAB_TTL_MS` is set to a positive
 * integer, that value replaces the 24h TTL so E2E specs can exercise the
 * stale-reset branch in seconds. The override is intentionally read at
 * call time (via `getTabTtlMs`) so test suites can mutate the env per
 * scenario without re-importing the module.
 *
 * Hook contract: `{ activeTab, setActiveTab }`. Track B (PlayerHqShellV2)
 * mounts the hook later in EP-2. This PR ships the hook + tests only —
 * no shell wiring yet.
 */

export type PlayerHqV2Tab = "heroi" | "arsenal" | "diario" | "mapa";

export const PLAYER_HQ_TAB_TTL_MS_DEFAULT = 86_400_000; // 24h

export const VALID_PLAYER_HQ_V2_TABS: ReadonlyArray<PlayerHqV2Tab> = [
  "heroi",
  "arsenal",
  "diario",
  "mapa",
];

const DEFAULT_TAB: PlayerHqV2Tab = "heroi";

interface PersistedTab {
  tab: PlayerHqV2Tab;
  savedAt: number;
}

export function getStorageKey(campaignId: string): string {
  return `pocketdm:lastPlayerHqTab:${campaignId}`;
}

export function getTabTtlMs(): number {
  const raw = process.env.NEXT_PUBLIC_DEBUG_TAB_TTL_MS;
  if (!raw) return PLAYER_HQ_TAB_TTL_MS_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return PLAYER_HQ_TAB_TTL_MS_DEFAULT;
  }
  return parsed;
}

function isValidTab(value: unknown): value is PlayerHqV2Tab {
  return (
    typeof value === "string" &&
    (VALID_PLAYER_HQ_V2_TABS as ReadonlyArray<string>).includes(value)
  );
}

/**
 * Pure helper exported for unit tests. Reads + parses + freshness-checks
 * the stored entry, returning the persisted tab when valid+fresh, else
 * `null`. Defensive against malformed JSON, missing fields, unknown tab
 * keys, expired entries, and absent storage (SSR).
 */
export function readPersistedTab(
  campaignId: string,
  now: () => number = Date.now,
  ttlMs: number = getTabTtlMs(),
): PlayerHqV2Tab | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(getStorageKey(campaignId));
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Partial<PersistedTab>;
  if (!isValidTab(candidate.tab)) return null;
  if (typeof candidate.savedAt !== "number") return null;
  if (now() - candidate.savedAt > ttlMs) return null;
  return candidate.tab;
}

function writePersistedTab(
  campaignId: string,
  tab: PlayerHqV2Tab,
  now: () => number,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getStorageKey(campaignId),
      JSON.stringify({ tab, savedAt: now() } satisfies PersistedTab),
    );
  } catch {
    // localStorage may be quota-exceeded or disabled — silently skip;
    // the hook continues to work in-memory for the current session.
  }
}

export interface UsePlayerHqTabStateOptions {
  /**
   * Optional override (typically derived SSR-side from `?tab=`). When
   * provided, takes precedence over storage on initial render. Setting
   * a tab through the returned setter still persists to storage.
   */
  initialTab?: PlayerHqV2Tab;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

export interface UsePlayerHqTabStateReturn {
  activeTab: PlayerHqV2Tab;
  setActiveTab: (tab: PlayerHqV2Tab) => void;
}

export function usePlayerHqTabState(
  campaignId: string,
  options: UsePlayerHqTabStateOptions = {},
): UsePlayerHqTabStateReturn {
  const { initialTab, now = Date.now } = options;

  const [activeTab, setActiveTabState] = useState<PlayerHqV2Tab>(() => {
    if (initialTab && isValidTab(initialTab)) return initialTab;
    return readPersistedTab(campaignId, now) ?? DEFAULT_TAB;
  });

  const setActiveTab = useCallback(
    (next: PlayerHqV2Tab) => {
      setActiveTabState(next);
      writePersistedTab(campaignId, next, now);
    },
    [campaignId, now],
  );

  return { activeTab, setActiveTab };
}
