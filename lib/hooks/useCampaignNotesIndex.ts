"use client";

/**
 * useCampaignNotesIndex — lightweight fetcher for the campaign note index
 * (id + title + is_shared). Used by list screens to resolve note IDs
 * referenced by `mentions` edges into human-readable titles without
 * loading the full note content.
 *
 * Fetches owner-visible notes only (RLS on `campaign_notes` already enforces
 * that: DM sees all, member only sees shared).
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3e.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CampaignNoteIndexEntry {
  id: string;
  title: string;
  is_shared: boolean;
}

export interface UseCampaignNotesIndexResult {
  notes: CampaignNoteIndexEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCampaignNotesIndex(
  campaignId: string | null | undefined,
): UseCampaignNotesIndexResult {
  const [notes, setNotes] = useState<CampaignNoteIndexEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!campaignId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from("campaign_notes")
        .select("id, title, is_shared")
        .eq("campaign_id", campaignId)
        .order("updated_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setNotes(((data as CampaignNoteIndexEntry[] | null) ?? []).filter(Boolean));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useCampaignNotesIndex] fetch failed:", msg);
      setError(msg);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}
