"use client";

import { useMemo } from "react";
import { useFeatureGate } from "@/lib/hooks/use-feature-gate";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";

/**
 * Filters SRD content based on the `show_non_srd_content` feature flag.
 * When the flag is disabled, only SRD content (is_srd: true) is shown.
 */
export function useSrdContentFilter<T extends SrdMonster | SrdSpell>(
  items: T[]
): { filtered: T[]; showNonSrd: boolean; loading: boolean } {
  const { allowed: showNonSrd, loading } = useFeatureGate("show_non_srd_content");

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
