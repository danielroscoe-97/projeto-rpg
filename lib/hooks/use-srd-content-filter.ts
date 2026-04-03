"use client";

import { useMemo } from "react";
import { useFeatureGate } from "@/lib/hooks/use-feature-gate";
import { useContentAccess } from "@/lib/hooks/use-content-access";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";

/**
 * Filters SRD content based on the `show_non_srd_content` feature flag
 * AND the user's content access (whitelist or agreement).
 *
 * Non-SRD content is only shown when both:
 * 1. The feature flag is enabled (global kill switch)
 * 2. The user has content access (whitelisted or accepted agreement)
 *
 * MAD (Monster A Day) content is always shown — it's community content.
 */
export function useSrdContentFilter<T extends SrdMonster | SrdSpell>(
  items: T[]
): { filtered: T[]; showNonSrd: boolean; loading: boolean } {
  const { allowed: flagAllowed, loading: flagLoading } = useFeatureGate("show_non_srd_content");
  const { canAccess, isLoading: accessLoading } = useContentAccess();

  const loading = flagLoading || accessLoading;
  const showNonSrd = flagAllowed && canAccess;

  const filtered = useMemo(() => {
    const isMad = (item: T) =>
      "monster_a_day_url" in item && !!(item as SrdMonster).monster_a_day_url;
    if (loading) return items.filter((item) => item.is_srd !== false || isMad(item));
    if (showNonSrd) return items;
    // Always show MAD monsters — community content with independent approval
    return items.filter((item) => item.is_srd !== false || isMad(item));
  }, [items, showNonSrd, loading]);

  return { filtered, showNonSrd, loading };
}
