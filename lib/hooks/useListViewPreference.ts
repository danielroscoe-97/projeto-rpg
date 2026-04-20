"use client";

/**
 * useListViewPreference — persists a list-view preference (string key) per
 * campaign+entity in localStorage. Key format: `pocketdm:list-view:{campaignId}:{entity}`.
 *
 * Designed for simple categorical preferences (tree / flat / by_type, or
 * filter=faction:<id>). Never stores PII — only ui state — so no TTL.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3f.
 */

import { useCallback, useEffect, useState } from "react";

const PREFIX = "pocketdm:list-view";

function storageKey(
  campaignId: string | null | undefined,
  entity: string,
): string | null {
  if (!campaignId) return null;
  return `${PREFIX}:${campaignId}:${entity}`;
}

export function useListViewPreference<T extends string>(
  campaignId: string | null | undefined,
  entity: string,
  defaultValue: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const key = storageKey(campaignId, entity);
    if (!key) return;
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(stored as T);
    } catch {
      // localStorage can throw in some embedded / incognito contexts — the
      // default value stays in place silently.
    }
  }, [campaignId, entity]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      const key = storageKey(campaignId, entity);
      if (!key) return;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // ignore write failures — UI still reflects the in-memory state.
      }
    },
    [campaignId, entity],
  );

  return [value, update];
}
