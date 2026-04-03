"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ResourceTracker } from "@/lib/types/database";

export function useResourceTrackers(characterId: string) {
  const [trackers, setTrackers] = useState<ResourceTracker[]>([]);
  const [loading, setLoading] = useState(true);
  // I-08 fix: stable supabase ref
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Fetch
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("character_resource_trackers")
        .select("*")
        .eq("player_character_id", characterId)
        .order("display_order", { ascending: true });
      if (error) {
        toast.error("Failed to load resource trackers");
      }
      setTrackers(data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [characterId, supabase]);

  // Add tracker
  const addTracker = useCallback(
    async (input: {
      name: string;
      max_uses: number;
      reset_type: ResourceTracker["reset_type"];
    }) => {
      const maxOrder = trackers.reduce(
        (max, t) => Math.max(max, t.display_order),
        -1
      );
      const { data, error } = await supabase
        .from("character_resource_trackers")
        .insert({
          player_character_id: characterId,
          name: input.name,
          max_uses: input.max_uses,
          reset_type: input.reset_type,
          display_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to add tracker");
        return { data: null, error };
      }
      if (data) setTrackers((prev) => [...prev, data]);
      return { data, error: null };
    },
    [characterId, trackers, supabase]
  );

  // I-04 fix: Update tracker (optimistic) with error rollback
  const updateTracker = useCallback(
    async (id: string, updates: Partial<ResourceTracker>) => {
      const prev = trackers;
      setTrackers((current) =>
        current.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      const { error } = await supabase
        .from("character_resource_trackers")
        .update(updates)
        .eq("id", id);
      if (error) {
        setTrackers(prev); // rollback
        toast.error("Failed to update tracker");
      }
    },
    [trackers, supabase]
  );

  // Toggle a dot (use/restore)
  const toggleDot = useCallback(
    (trackerId: string, dotIndex: number) => {
      const tracker = trackers.find((t) => t.id === trackerId);
      if (!tracker) return;

      const filled = tracker.max_uses - tracker.current_uses;
      let newCurrent: number;

      if (dotIndex < filled) {
        newCurrent = tracker.current_uses + 1;
      } else {
        newCurrent = tracker.current_uses - 1;
      }

      newCurrent = Math.max(0, Math.min(tracker.max_uses, newCurrent));
      updateTracker(trackerId, { current_uses: newCurrent });
    },
    [trackers, updateTracker]
  );

  // Delete tracker
  const deleteTracker = useCallback(
    async (id: string) => {
      const prev = trackers;
      setTrackers((current) => current.filter((t) => t.id !== id));
      const { error } = await supabase
        .from("character_resource_trackers")
        .delete()
        .eq("id", id);
      if (error) {
        setTrackers(prev); // rollback
        toast.error("Failed to delete tracker");
      }
    },
    [trackers, supabase]
  );

  // C-02 fix: Reset by type — only count trackers with current_uses > 0
  const resetByType = useCallback(
    async (resetTypes: string[]) => {
      const affected = trackers.filter(
        (t) => resetTypes.includes(t.reset_type) && t.current_uses > 0
      );
      if (affected.length === 0) return 0;

      // Optimistic
      setTrackers((prev) =>
        prev.map((t) =>
          resetTypes.includes(t.reset_type) ? { ...t, current_uses: 0 } : t
        )
      );

      // Batch update
      const ids = affected.map((t) => t.id);
      const { error } = await supabase
        .from("character_resource_trackers")
        .update({ current_uses: 0 })
        .in("id", ids);

      if (error) {
        toast.error("Failed to reset trackers");
      }

      return affected.length;
    },
    [trackers, supabase]
  );

  // Reset single tracker
  const resetTracker = useCallback(
    (id: string) => {
      updateTracker(id, { current_uses: 0 });
    },
    [updateTracker]
  );

  // Count affected by reset type (only those with uses > 0)
  const countByResetType = useCallback(
    (resetTypes: string[]) => {
      return trackers.filter(
        (t) => resetTypes.includes(t.reset_type) && t.current_uses > 0
      ).length;
    },
    [trackers]
  );

  return {
    trackers,
    loading,
    addTracker,
    updateTracker,
    toggleDot,
    deleteTracker,
    resetByType,
    resetTracker,
    countByResetType,
  };
}
