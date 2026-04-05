"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";

export interface LocationFormData {
  name: string;
  description?: string;
  location_type?: LocationType;
  is_discovered?: boolean;
  image_url?: string | null;
  is_visible_to_players?: boolean;
}

export function useCampaignLocations(campaignId: string) {
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setFetchError(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("campaign_locations")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sort_order")
        .order("name");

      if (error) {
        console.error("[useCampaignLocations] fetchLocations failed:", error.message);
        setFetchError(error.message);
        setLocations([]);
      } else {
        setLocations((data as CampaignLocation[]) ?? []);
      }
    } catch (err) {
      console.error("[useCampaignLocations] fetchLocations failed:", err);
      setFetchError(err instanceof Error ? err.message : String(err));
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = useCallback(
    async (formData: LocationFormData) => {
      const name = formData.name.trim();
      if (!name) return { data: null, error: new Error("Name required") };

      try {
        const supabase = createClient();

        // Optimistic insert
        const optimisticId = `optimistic-${Date.now()}`;
        const optimistic: CampaignLocation = {
          id: optimisticId,
          campaign_id: campaignId,
          name,
          description: formData.description ?? "",
          location_type: formData.location_type ?? "building",
          parent_location_id: null,
          is_discovered: formData.is_discovered ?? true,
          image_url: formData.image_url ?? null,
          is_visible_to_players: formData.is_visible_to_players ?? true,
          sort_order: locations.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLocations((prev) => [...prev, optimistic]);

        const { data, error } = await supabase
          .from("campaign_locations")
          .insert({
            campaign_id: campaignId,
            name,
            description: formData.description ?? "",
            location_type: formData.location_type ?? "building",
            is_discovered: formData.is_discovered ?? true,
            image_url: formData.image_url ?? null,
            is_visible_to_players: formData.is_visible_to_players ?? true,
            sort_order: locations.length,
          })
          .select()
          .single();

        if (!error && data) {
          setLocations((prev) =>
            prev.map((l) => (l.id === optimisticId ? (data as CampaignLocation) : l)),
          );
        } else if (error) {
          setLocations((prev) => prev.filter((l) => l.id !== optimisticId));
        }
        return { data, error };
      } catch (err) {
        console.error("[useCampaignLocations] addLocation failed:", err);
        return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [campaignId, locations.length],
  );

  const updateLocation = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<
          CampaignLocation,
          "name" | "description" | "location_type" | "is_discovered" | "parent_location_id" | "image_url" | "is_visible_to_players"
        >
      >,
    ) => {
      // Optimistic update
      setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));

      try {
        const supabase = createClient();
        const { error } = await supabase.from("campaign_locations").update(updates).eq("id", id);

        if (error) {
          await fetchLocations();
        }
        return { error };
      } catch (err) {
        console.error("[useCampaignLocations] updateLocation failed:", err);
        await fetchLocations();
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [fetchLocations],
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      // Optimistic removal
      const prev = locations;
      setLocations((current) => current.filter((l) => l.id !== id));

      try {
        const supabase = createClient();
        const { error } = await supabase.from("campaign_locations").delete().eq("id", id);

        if (error) {
          setLocations(prev);
        }
        return { error };
      } catch (err) {
        console.error("[useCampaignLocations] deleteLocation failed:", err);
        setLocations(prev);
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [locations],
  );

  return { locations, loading, fetchError, addLocation, updateLocation, deleteLocation, refetch: fetchLocations };
}
