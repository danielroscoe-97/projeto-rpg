"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFeatureGate } from "@/lib/hooks/use-feature-gate";
import { CURRENT_AGREEMENT_VERSION } from "@/lib/constants/content";

interface ContentAccess {
  /** User can see "Completo" content (whitelisted beta testers only) */
  canAccess: boolean;
  /** User is on the admin whitelist (total bypass) */
  isWhitelisted: boolean;
  /** User accepted the current agreement version */
  hasAgreed: boolean;
  /** User is authenticated */
  isAuthenticated: boolean;
  /** Still loading from Supabase */
  isLoading: boolean;
  /** Trigger to open the gate modal */
  requestGate: () => void;
  /** Signal that the gate was completed — refresh access */
  onGateCompleted: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Module-level cache shared across all hook instances
let cachedUserId: string | null = null;
let cachedResult: { isWhitelisted: boolean; hasAgreed: boolean } | null = null;
let cacheTimestamp = 0;
let fetchPromise: Promise<{ isWhitelisted: boolean; hasAgreed: boolean }> | null = null;

function invalidateCache() {
  cachedResult = null;
  cacheTimestamp = 0;
  fetchPromise = null;
}

async function fetchContentAccess(userId: string) {
  try {
    const supabase = createClient();

    const [whitelistRes, agreementRes, adminRes] = await Promise.all([
      supabase
        .from("content_whitelist")
        .select("id")
        .eq("user_id", userId)
        .is("revoked_at", null)
        .maybeSingle(),
      supabase
        .from("content_agreements")
        .select("id")
        .eq("user_id", userId)
        .eq("agreement_version", CURRENT_AGREEMENT_VERSION)
        .maybeSingle(),
      supabase
        .from("users")
        .select("is_admin")
        .eq("id", userId)
        .single(),
    ]);

    const isAdmin = !adminRes.error && !!adminRes.data?.is_admin;

    // P5: check for errors (maybeSingle returns error if multiple rows)
    // Admins bypass whitelist — they always have full access
    const result = {
      isWhitelisted: isAdmin || (!whitelistRes.error && !!whitelistRes.data),
      hasAgreed: isAdmin || (!agreementRes.error && !!agreementRes.data),
    };

    cachedUserId = userId;
    cachedResult = result;
    cacheTimestamp = Date.now();
    fetchPromise = null;

    return result;
  } catch {
    // P1: clear fetchPromise on network failure so retries can happen
    fetchPromise = null;
    return { isWhitelisted: false, hasAgreed: false };
  }
}

/**
 * Hook that checks if the current user can access gated "Completo" content.
 * Checks whitelist (bypass) and agreement (accepted terms) with 5min cache.
 */
export function useContentAccess(): ContentAccess {
  const { allowed: flagEnabled } = useFeatureGate("extended_compendium");
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [gateRequested, setGateRequested] = useState(false);
  const mountedRef = useRef(true);

  // Check auth state
  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!mountedRef.current) return;
      setUserId(user?.id ?? null);
      setAuthChecked(true);
      if (!user) setDbLoading(false);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // P2: invalidate cache when user changes (logout → login as different user)
  useEffect(() => {
    if (userId && cachedUserId && cachedUserId !== userId) {
      invalidateCache();
    }
  }, [userId]);

  // Fetch whitelist + agreement status
  useEffect(() => {
    if (!userId) return;

    const currentUserId = userId; // capture for closure

    const now = Date.now();
    const cacheValid =
      cachedUserId === currentUserId &&
      cachedResult &&
      now - cacheTimestamp < CACHE_TTL;

    if (cacheValid && cachedResult) {
      setIsWhitelisted(cachedResult.isWhitelisted);
      setHasAgreed(cachedResult.hasAgreed);
      setDbLoading(false);
      return;
    }

    setDbLoading(true);
    if (!fetchPromise || cachedUserId !== currentUserId) {
      // P2: force new fetch if userId changed since last promise
      fetchPromise = fetchContentAccess(currentUserId);
    }
    fetchPromise.then((result) => {
      if (!mountedRef.current) return;
      // P2: verify result is still for the current user
      if (cachedUserId !== currentUserId) return;
      setIsWhitelisted(result.isWhitelisted);
      setHasAgreed(result.hasAgreed);
      setDbLoading(false);
    });
  }, [userId, gateRequested]);

  const requestGate = useCallback(() => {
    setGateRequested((g) => !g);
  }, []);

  const onGateCompleted = useCallback(() => {
    invalidateCache();
    setGateRequested((g) => !g);
  }, []);

  const isAuthenticated = authChecked && !!userId;
  const isLoading = !authChecked || (isAuthenticated && dbLoading);
  // Access granted if user is whitelisted OR has accepted the content agreement
  const canAccess = flagEnabled && isAuthenticated && (isWhitelisted || hasAgreed);

  return {
    canAccess,
    isWhitelisted,
    hasAgreed,
    isAuthenticated,
    isLoading,
    requestGate,
    onGateCompleted,
  };
}
