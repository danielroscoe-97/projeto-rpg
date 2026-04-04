"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";

export function useCampaignLocations(campaignId: string) {
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaign_locations")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order")
      .order("name");

    setLocations((data as CampaignLocation[]) ?? []);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = useCallback(
    async (name: string, locationType: LocationType = "building") => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("campaign_locations")
        .insert({
          campaign_id: campaignId,
          name,
          location_type: locationType,
          sort_order: locations.length,
        })
        .select()
        .single();

      if (!error && data) {
        setLocations((prev) => [...prev, data as CampaignLocation]);
      }
      return { data, error };
    },
    [campaignId, locations.length]
  );

  const updateLocation = useCallback(
    async (id: string, updates: Partial<Pick<CampaignLocation, "name" | "description" | "location_type" | "is_discovered" | "parent_location_id">>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("campaign_locations")
        .update(updates)
        .eq("id", id);

      if (!error) {
        setLocations((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
        );
      }
      return { error };
    },
    []
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("campaign_locations")
        .delete()
        .eq("id", id);

      if (!error) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
      }
      return { error };
    },
    []
  );

  return { locations, loading, addLocation, updateLocation, deleteLocation, refetch: fetchLocations };
}
