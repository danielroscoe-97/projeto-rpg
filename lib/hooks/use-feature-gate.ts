"use client";

import { useEffect, useState } from "react";
import { getFeatureFlags, canAccess } from "@/lib/feature-flags";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import type { FeatureFlag, FeatureFlagKey } from "@/lib/types/subscription";

interface FeatureGateResult {
  allowed: boolean;
  loading: boolean;
}

/**
 * React hook for client-side feature gating.
 *
 * Checks both:
 * 1. Individual user plan (from subscription store)
 * 2. Session DM plan (Mesa model — if player is in a Pro DM's session)
 *
 * Returns { allowed: true } if either is sufficient.
 */
export function useFeatureGate(flagKey: FeatureFlagKey): FeatureGateResult {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(true);

  // Derive effective plan inline for proper Zustand reactivity
  const effectivePlan = useSubscriptionStore((s) => {
    if (s.sessionDmPlan === "pro" || s.sessionDmPlan === "mesa") return "pro" as const;
    return s.plan;
  });
  const subLoading = useSubscriptionStore((s) => s.loading);
  const initialized = useSubscriptionStore((s) => s.initialized);
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);

  // Load subscription on first use
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Load feature flags
  useEffect(() => {
    let cancelled = false;
    getFeatureFlags().then((f) => {
      if (!cancelled) {
        setFlags(f);
        setFlagsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const loading = flagsLoading || subLoading || !initialized;

  if (loading || !flags) {
    return { allowed: false, loading: true };
  }

  return {
    allowed: canAccess(flags, flagKey, effectivePlan),
    loading: false,
  };
}
