"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignFaction, FactionAlignment } from "@/lib/types/mind-map";

export function useCampaignFactions(campaignId: string) {
  const [factions, setFactions] = useState<CampaignFaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFactions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaign_factions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order")
      .order("name");

    setFactions((data as CampaignFaction[]) ?? []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchFactions();
  }, [fetchFactions]);

  const addFaction = useCallback(
    async (name: string, alignment: FactionAlignment = "neutral") => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("campaign_factions")
        .insert({
          campaign_id: campaignId,
          name,
          alignment,
          sort_order: factions.length,
        })
        .select()
        .single();

      if (!error && data) {
        setFactions((prev) => [...prev, data as CampaignFaction]);
      }
      return { data, error };
    },
    [campaignId, factions.length]
  );

  const updateFaction = useCallback(
    async (id: string, updates: Partial<Pick<CampaignFaction, "name" | "description" | "alignment" | "is_visible_to_players">>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("campaign_factions")
        .update(updates)
        .eq("id", id);

      if (!error) {
        setFactions((prev) =>
          prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
      }
      return { error };
    },
    []
  );

  const deleteFaction = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("campaign_factions")
        .delete()
        .eq("id", id);

      if (!error) {
        setFactions((prev) => prev.filter((f) => f.id !== id));
      }
      return { error };
    },
    []
  );

  return { factions, loading, addFaction, updateFaction, deleteFaction, refetch: fetchFactions };
}
