"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pocketdm:recent_campaigns";
const MAX_RECENT = 10;

export interface RecentCampaign {
  id: string;
  name: string;
  visited_at: number;
}

/**
 * Tracks recently visited campaigns in localStorage.
 * Returns [items, recordVisit, clear].
 */
export function useRecentCampaigns(): [RecentCampaign[], (id: string, name: string) => void, () => void] {
  const [items, setItems] = useState<RecentCampaign[]>([]);

  // Hydrate
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((x) => x && typeof x.id === "string" && typeof x.name === "string"));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const recordVisit = useCallback((id: string, name: string) => {
    setItems((prev) => {
      const next = [
        { id, name, visited_at: Date.now() },
        ...prev.filter((x) => x.id !== id),
      ].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return [items, recordVisit, clear];
}
