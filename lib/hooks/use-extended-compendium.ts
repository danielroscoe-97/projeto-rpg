"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useFeatureGate } from "@/lib/hooks/use-feature-gate";

const STORAGE_KEY = "ext_compendium_accepted";

// ── Tiny external store so all consumers stay in sync ──

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function notify() {
  listeners.forEach((cb) => cb());
}

/**
 * Hook that combines localStorage acceptance + feature flag kill switch.
 * Returns `isActive` only when BOTH the user accepted AND the global flag is enabled.
 */
export function useExtendedCompendium() {
  const { allowed: flagEnabled } = useFeatureGate("extended_compendium");
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isActive = flagEnabled && accepted;

  const activate = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // private browsing — degrade gracefully
    }
    notify();
  }, []);

  const deactivate = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // private browsing
    }
    notify();
  }, []);

  return { isActive, activate, deactivate, flagEnabled };
}
