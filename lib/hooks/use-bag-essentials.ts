"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BagEssentials } from "@/lib/types/bag-essentials";
import { DEFAULT_BAG_ESSENTIALS } from "@/lib/types/bag-essentials";

export function useBagEssentials(campaignId: string) {
  const [essentials, setEssentials] = useState<BagEssentials>(DEFAULT_BAG_ESSENTIALS);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEssentials = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("bag_essentials")
      .eq("id", campaignId)
      .single();

    if (data?.bag_essentials) {
      // Merge with defaults to handle missing keys from older data
      const merged: BagEssentials = {
        potions: { ...DEFAULT_BAG_ESSENTIALS.potions, ...(data.bag_essentials as BagEssentials).potions },
        goodberries: (data.bag_essentials as BagEssentials).goodberries ?? 0,
        currency: { ...DEFAULT_BAG_ESSENTIALS.currency, ...(data.bag_essentials as BagEssentials).currency },
        components: { ...DEFAULT_BAG_ESSENTIALS.components, ...(data.bag_essentials as BagEssentials).components },
      };
      setEssentials(merged);
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchEssentials();
  }, [fetchEssentials]);

  const updateEssentials = useCallback(
    (next: BagEssentials) => {
      // Optimistic local update
      setEssentials(next);

      // Debounced save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const supabase = createClient();
        const { error } = await supabase
          .from("campaigns")
          .update({ bag_essentials: next as unknown as Record<string, unknown> })
          .eq("id", campaignId);

        if (error) {
          console.error("[useBagEssentials] save failed:", error.message);
          await fetchEssentials();
        }
      }, 800);
    },
    [campaignId, fetchEssentials],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { essentials, loading, updateEssentials, refetch: fetchEssentials };
}
