"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pocketdm:sidebar:collapsed";

/**
 * Persists sidebar collapse state to localStorage and syncs across tabs.
 * Returns [collapsed, setCollapsed, toggle].
 */
export function useSidebarCollapse(defaultValue = false): [boolean, (v: boolean) => void, () => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsedState(stored === "true");
      }
    } catch {
      // localStorage may be blocked — fall back to default
    }
    setHydrated(true);
  }, []);

  // Sync across tabs via storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setCollapsedState(e.newValue === "true");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setCollapsed = useCallback((val: boolean) => {
    setCollapsedState(val);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return [hydrated ? collapsed : defaultValue, setCollapsed, toggle];
}
