"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { nodeIdToKey } from "@/lib/utils/mind-map-layout";

interface NodeView {
  node_key: string;
  last_seen_at: string;
}

export function useNodeViews(characterId: string, campaignId: string) {
  const [views, setViews] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  // Fetch all node views for this character
  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("player_node_views")
        .select("node_key, last_seen_at")
        .eq("player_character_id", characterId)
        .eq("campaign_id", campaignId);

      if (data) {
        const map = new Map<string, string>();
        for (const row of data as NodeView[]) {
          map.set(row.node_key, row.last_seen_at);
        }
        setViews(map);
        seededRef.current = map.size > 0;
      }
      setLoading(false);
    }
    fetch();
  }, [characterId, campaignId]);

  // Check if a node should show "NEW" badge
  const isNew = useCallback(
    (nodeId: string, entityUpdatedAt?: string): boolean => {
      // First-time user: no views yet, don't flood with badges
      if (!seededRef.current && views.size === 0) return false;

      const key = nodeIdToKey(nodeId);
      const lastSeen = views.get(key);

      // Never viewed → it's new
      if (!lastSeen) return true;

      // If entity was updated after last view, it's new
      if (entityUpdatedAt) {
        return new Date(entityUpdatedAt) > new Date(lastSeen);
      }

      // Already viewed, no entityUpdatedAt → not new
      return false;
    },
    [views]
  );

  // Mark a node as viewed (upsert)
  const markViewed = useCallback(
    async (nodeId: string) => {
      const key = nodeIdToKey(nodeId);
      const now = new Date().toISOString();

      // Optimistic update
      setViews((prev) => {
        const next = new Map(prev);
        next.set(key, now);
        return next;
      });

      const supabase = createClient();
      await supabase
        .from("player_node_views")
        .upsert(
          {
            player_character_id: characterId,
            campaign_id: campaignId,
            node_key: key,
            last_seen_at: now,
          },
          { onConflict: "player_character_id,node_key" }
        );
    },
    [characterId, campaignId]
  );

  // Mark all nodes as viewed
  const markAllViewed = useCallback(
    async (nodeIds: string[]) => {
      const now = new Date().toISOString();
      const entries = nodeIds.map((nodeId) => ({
        player_character_id: characterId,
        campaign_id: campaignId,
        node_key: nodeIdToKey(nodeId),
        last_seen_at: now,
      }));

      // Optimistic update
      setViews((prev) => {
        const next = new Map(prev);
        for (const entry of entries) {
          next.set(entry.node_key, now);
        }
        return next;
      });
      seededRef.current = true;

      const supabase = createClient();
      await supabase
        .from("player_node_views")
        .upsert(entries, { onConflict: "player_character_id,node_key" });
    },
    [characterId, campaignId]
  );

  // Seed first visit: mark all current nodes as viewed so they don't all show as NEW
  const seedFirstVisit = useCallback(
    async (nodeIds: string[]) => {
      if (seededRef.current || views.size > 0) return;
      seededRef.current = true;
      await markAllViewed(nodeIds);
    },
    [views.size, markAllViewed]
  );

  return { views, loading, isNew, markViewed, markAllViewed, seedFirstVisit };
}
