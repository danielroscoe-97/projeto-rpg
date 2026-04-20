"use client";

/**
 * useListViewPreference — persists a list-view preference (string key) per
 * campaign+entity in localStorage. Key format: `pocketdm:list-view:{campaignId}:{entity}`.
 *
 * Designed for simple categorical preferences (tree / flat / by_type, or
 * filter=faction:<id>). Never stores PII — only ui state — so no TTL.
 *
 * Hydration rules (matter for SPA navigation between two campaigns):
 *   - Initial state uses a lazy init to read localStorage synchronously,
 *     so the first render already shows the stored value (no flash of
 *     default) and no user interaction is ever overwritten by a delayed
 *     effect.
 *   - The sync-from-storage effect runs only when the *storage key* changes
 *     (campaign switch), not on every render. That guarantees a user who
 *     flips a preference immediately after mount doesn't have their choice
 *     clobbered by a re-read of the same storage key.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3f + MA-3 fix.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "pocketdm:list-view";

function storageKey(
  campaignId: string | null | undefined,
  entity: string,
): string | null {
  if (!campaignId) return null;
  return `${PREFIX}:${campaignId}:${entity}`;
}

function readValue<T extends string>(key: string | null, fallback: T): T {
  if (!key) return fallback;
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return (stored as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useListViewPreference<T extends string>(
  campaignId: string | null | undefined,
  entity: string,
  defaultValue: T,
): [T, (next: T) => void] {
  const key = storageKey(campaignId, entity);

  // Lazy init — synchronous read on first render means no flash of default
  // and no opportunity for a follow-up effect to overwrite an in-flight
  // user interaction.
  const [value, setValue] = useState<T>(() => readValue(key, defaultValue));

  // Remember which storage key we last synced from. We only re-read when
  // the key actually changes (campaign switch). A change in `defaultValue`
  // alone should NOT trigger a storage read — that would race with user
  // input during the same render tick.
  const lastSyncedKey = useRef<string | null>(key);

  useEffect(() => {
    if (key === lastSyncedKey.current) return;
    lastSyncedKey.current = key;
    setValue(readValue(key, defaultValue));
    // `defaultValue` intentionally omitted from deps — a parent re-rendering
    // with a new-identity-same-string default should not retrigger a read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      if (!key) return;
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // ignore write failures — UI still reflects the in-memory state.
      }
    },
    [key],
  );

  return [value, update];
}
