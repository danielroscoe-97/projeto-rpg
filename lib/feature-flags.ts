"use client";

import { createClient } from "@/lib/supabase/client";
import type { FeatureFlag, FeatureFlagKey, Plan } from "@/lib/types/subscription";
import { planMeetsRequirement } from "@/lib/types/subscription";

// ── Client-side cache with 5min TTL + stale-while-revalidate ──

let flagCache: FeatureFlag[] | null = null;
let cacheTimestamp = 0;
let fetchPromise: Promise<FeatureFlag[]> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Default flags used as fallback when Supabase is unreachable */
const DEFAULT_FLAGS: FeatureFlag[] = [
  ...[
    "persistent_campaigns",
    "saved_presets",
    "export_data",
    "homebrew",
    "session_analytics",
    "cr_calculator",
    "file_sharing",
    "email_invites",
  ].map((key) => ({
    id: "",
    key,
    enabled: true,
    plan_required: "pro" as Plan,
    description: null,
    updated_at: "",
  })),
  {
    id: "",
    key: "show_non_srd_content",
    enabled: true,
    plan_required: "free" as Plan,
    description: null,
    updated_at: "",
  },
  {
    id: "",
    key: "extended_compendium",
    enabled: true,
    plan_required: "free" as Plan,
    description: null,
    updated_at: "",
  },
];

async function fetchFlags(): Promise<FeatureFlag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*");

  if (error || !data) {
    // Fallback: return stale cache or defaults
    return flagCache ?? DEFAULT_FLAGS;
  }

  flagCache = data as FeatureFlag[];
  cacheTimestamp = Date.now();
  fetchPromise = null;
  return flagCache;
}

/**
 * Get all feature flags with client-side caching.
 * Uses stale-while-revalidate: returns stale data immediately,
 * triggers background refresh if TTL expired.
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const now = Date.now();
  const isStale = now - cacheTimestamp > CACHE_TTL;

  if (flagCache && !isStale) {
    return flagCache;
  }

  if (flagCache && isStale) {
    // Stale-while-revalidate: return stale, refresh in background
    if (!fetchPromise) {
      fetchPromise = fetchFlags();
    }
    return flagCache;
  }

  // No cache at all — must wait for fetch
  if (!fetchPromise) {
    fetchPromise = fetchFlags();
  }
  return fetchPromise;
}

/**
 * Check if a user with the given plan can access a feature.
 * Client-side only — uses cached flags.
 */
export function canAccess(
  flags: FeatureFlag[],
  flagKey: FeatureFlagKey,
  userPlan: Plan
): boolean {
  const flag = flags.find((f) => f.key === flagKey);
  if (!flag) return false;
  if (!flag.enabled) return false; // Global kill switch
  if (flag.plan_required === "free") return true;
  return planMeetsRequirement(userPlan, flag.plan_required);
}

/** Invalidate the client cache (e.g. after subscription change) */
export function invalidateFlagCache(): void {
  flagCache = null;
  cacheTimestamp = 0;
  fetchPromise = null;
}
