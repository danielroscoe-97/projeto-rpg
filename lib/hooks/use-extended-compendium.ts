"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useFeatureGate } from "@/lib/hooks/use-feature-gate";
import { useContentAccess } from "@/lib/hooks/use-content-access";

const STORAGE_KEY = "ext_compendium_accepted";

// ── Tiny external store for localStorage cache ──

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
 * @deprecated Use `useContentAccess` directly for new code.
 *
 * Hook that combines Supabase-backed access check + localStorage cache + feature flag kill switch.
 *
 * Access is granted when ALL conditions are met:
 * 1. `extended_compendium` feature flag is enabled (global kill switch)
 * 2. User is whitelisted (bypass) OR has accepted the agreement (Supabase)
 * 3. OR: localStorage cache is set (fallback while Supabase loads)
 *
 * The localStorage cache prevents a flash of "locked" state on page load
 * while the Supabase query is in flight.
 */
export function useExtendedCompendium() {
  const { allowed: flagEnabled } = useFeatureGate("extended_compendium");
  const localAccepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { canAccess: dbAccess, isLoading: dbLoading, onGateCompleted } = useContentAccess();

  // IG2: Clear stale localStorage when DB confirms no access (e.g. agreement version bumped)
  // This prevents "flash of content → gate reappears" on version changes.
  useEffect(() => {
    if (!dbLoading && !dbAccess && localAccepted) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // private browsing
      }
      notify();
    }
  }, [dbLoading, dbAccess, localAccepted]);

  // Use localStorage as optimistic cache while DB loads
  const isActive = flagEnabled && (dbAccess || (dbLoading && localAccepted));

  const activate = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // private browsing — degrade gracefully
    }
    notify();
    onGateCompleted();
  }, [onGateCompleted]);

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
