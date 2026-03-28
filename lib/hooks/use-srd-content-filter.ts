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
    if (loading) return items.filter((item) => item.is_srd === true);
    if (showNonSrd) return items;
    return items.filter((item) => item.is_srd === true);
  }, [items, showNonSrd, loading]);

  return { filtered, showNonSrd, loading };
}
