"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import type { CampaignNote, JournalEntry } from "@/lib/types/database";

/**
 * DM-side view of player notes (Wave 4 / migration 149).
 *
 * Two data sources — both guarded by the RLS policies added in 149:
 *  1. `player_journal_entries` with `visibility = 'shared_with_dm'`
 *     (player opted in to share with the DM).
 *  2. `campaign_notes` with `visibility = 'dm_private_to_player'` authored
 *     by the DM themselves, for audit/reference inside the same UI.
 *
 * Grouped by `player_character_id` for the inspector UI.
 */

export interface PlayerNotesGroup {
  playerCharacterId: string;
  playerCharacterName: string;
  sharedEntries: JournalEntry[];
  dmPrivateNotes: CampaignNote[];
}

type CharacterLite = { id: string; name: string };

export function useDmPlayerNotes(campaignId: string) {
  const [groups, setGroups] = useState<PlayerNotesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  const supabaseRef = useRef(createClient());

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseRef.current;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [charsRes, journalRes, notesRes] = await Promise.all([
          supabase
            .from("player_characters")
            .select("id, name")
            .eq("campaign_id", campaignId),
          supabase
            .from("player_journal_entries")
            .select("*")
            .eq("campaign_id", campaignId)
            .eq("visibility", "shared_with_dm")
            .order("created_at", { ascending: false }),
          supabase
            .from("campaign_notes")
            .select("*")
            .eq("campaign_id", campaignId)
            .eq("visibility", "dm_private_to_player")
            .order("updated_at", { ascending: false }),
        ]);

        if (cancelled) return;
        if (charsRes.error) throw charsRes.error;
        if (journalRes.error) throw journalRes.error;
        if (notesRes.error) throw notesRes.error;

        const chars: CharacterLite[] = (charsRes.data as CharacterLite[]) ?? [];
        const journal: JournalEntry[] = (journalRes.data as JournalEntry[]) ?? [];
        const notes: CampaignNote[] = (notesRes.data as CampaignNote[]) ?? [];

        const byChar: Record<string, PlayerNotesGroup> = {};
        for (const c of chars) {
          byChar[c.id] = {
            playerCharacterId: c.id,
            playerCharacterName: c.name,
            sharedEntries: [],
            dmPrivateNotes: [],
          };
        }
        for (const entry of journal) {
          const bucket = byChar[entry.player_character_id];
          if (bucket) bucket.sharedEntries.push(entry);
        }
        for (const note of notes) {
          if (!note.target_character_id) continue;
          const bucket = byChar[note.target_character_id];
          if (bucket) bucket.dmPrivateNotes.push(note);
        }

        // Characters without any notes are still surfaced (empty lists) so
        // the inspector UI can CTA "send a note" from the same grouped view.
        setGroups(Object.values(byChar));
      } catch (err) {
        if (!cancelled) {
          captureError(err, {
            component: "useDmPlayerNotes",
            action: "fetch",
            category: "network",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [campaignId, reloadCount]);

  return { groups, loading, reload };
}
