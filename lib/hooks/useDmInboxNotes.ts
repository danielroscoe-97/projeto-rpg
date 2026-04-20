"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import type { CampaignNote } from "@/lib/types/database";

/**
 * Player-side inbox of DM-private notes addressed to a single character
 * (Wave 4 / migration 149).
 *
 * Backed by RLS policy `campaign_notes_target_player_select` which only
 * returns rows where:
 *   - visibility = 'dm_private_to_player'
 *   - target_character_id = $1 (matches auth.uid() via player_characters.user_id)
 *
 * Read-only: the player can't edit/delete DM-authored rows (covered by the
 * DM ALL policy from migration 030). Surfacing them is safe here.
 */
export function useDmInboxNotes(characterId: string) {
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseRef.current;

    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_notes")
        .select("*")
        .eq("target_character_id", characterId)
        .eq("visibility", "dm_private_to_player")
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        captureError(error, {
          component: "useDmInboxNotes",
          action: "fetch",
          category: "network",
        });
      } else {
        setNotes((data as CampaignNote[]) ?? []);
      }
      setLoading(false);
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  return { notes, loading };
}
