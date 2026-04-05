"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignFaction, FactionAlignment } from "@/lib/types/mind-map";

export interface FactionFormData {
  name: string;
  description?: string;
  alignment?: FactionAlignment;
  image_url?: string | null;
  is_visible_to_players?: boolean;
}

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
    async (formData: FactionFormData) => {
      const name = formData.name.trim();
      if (!name) return { data: null, error: new Error("Name required") };

      const supabase = createClient();

      // Optimistic insert
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: CampaignFaction = {
        id: optimisticId,
        campaign_id: campaignId,
        name,
        description: formData.description ?? "",
        alignment: formData.alignment ?? "neutral",
        image_url: formData.image_url ?? null,
        is_visible_to_players: formData.is_visible_to_players ?? true,
        sort_order: factions.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFactions((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("campaign_factions")
        .insert({
          campaign_id: campaignId,
          name,
          description: formData.description ?? "",
          alignment: formData.alignment ?? "neutral",
          image_url: formData.image_url ?? null,
          is_visible_to_players: formData.is_visible_to_players ?? true,
          sort_order: factions.length,
        })
        .select()
        .single();

      if (!error && data) {
        setFactions((prev) =>
          prev.map((f) => (f.id === optimisticId ? (data as CampaignFaction) : f)),
        );
      } else if (error) {
        setFactions((prev) => prev.filter((f) => f.id !== optimisticId));
      }
      return { data, error };
    },
    [campaignId, factions.length],
  );

  const updateFaction = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<CampaignFaction, "name" | "description" | "alignment" | "image_url" | "is_visible_to_players">
      >,
    ) => {
      // Optimistic update
      setFactions((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));

      const supabase = createClient();
      const { error } = await supabase.from("campaign_factions").update(updates).eq("id", id);

      if (error) {
        await fetchFactions();
      }
      return { error };
    },
    [fetchFactions],
  );

  const deleteFaction = useCallback(
    async (id: string) => {
      // Optimistic removal
      const prev = factions;
      setFactions((current) => current.filter((f) => f.id !== id));

      const supabase = createClient();
      const { error } = await supabase.from("campaign_factions").delete().eq("id", id);

      if (error) {
        setFactions(prev);
      }
      return { error };
    },
    [factions],
  );

  return { factions, loading, addFaction, updateFaction, deleteFaction, refetch: fetchFactions };
}
