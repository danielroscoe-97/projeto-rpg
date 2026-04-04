"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type PinColor = "amber" | "blue" | "green" | "red" | "purple";

export interface PlayerPin {
  id: string;
  player_character_id: string;
  campaign_id: string;
  label: string;
  note: string;
  color: PinColor;
  attached_to_node: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

const MAX_PINS = 20;

export function usePlayerPins(characterId: string, campaignId: string) {
  const [pins, setPins] = useState<PlayerPin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPins = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("player_mind_map_pins")
      .select("*")
      .eq("player_character_id", characterId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (data) setPins(data as PlayerPin[]);
    setLoading(false);
  }, [characterId, campaignId]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const createPin = useCallback(
    async (pin: {
      label: string;
      note?: string;
      color?: PinColor;
      attached_to_node?: string | null;
      position_x?: number;
      position_y?: number;
    }) => {
      if (pins.length >= MAX_PINS) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("player_mind_map_pins")
        .insert({
          player_character_id: characterId,
          campaign_id: campaignId,
          label: pin.label,
          note: pin.note ?? "",
          color: pin.color ?? "amber",
          attached_to_node: pin.attached_to_node ?? null,
          position_x: pin.position_x ?? null,
          position_y: pin.position_y ?? null,
        })
        .select("*")
        .single();

      if (data) {
        setPins((prev) => [...prev, data as PlayerPin]);
        return data as PlayerPin;
      }
      return null;
    },
    [characterId, campaignId, pins.length]
  );

  const updatePin = useCallback(
    async (id: string, updates: Partial<Pick<PlayerPin, "label" | "note" | "color">>) => {
      const supabase = createClient();
      await supabase.from("player_mind_map_pins").update(updates).eq("id", id);
      setPins((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const deletePin = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from("player_mind_map_pins").delete().eq("id", id);
      setPins((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  return {
    pins,
    loading,
    canAdd: pins.length < MAX_PINS,
    createPin,
    updatePin,
    deletePin,
    refetch: fetchPins,
  };
}
