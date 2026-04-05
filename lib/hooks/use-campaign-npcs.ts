"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNpcs,
  createNpc,
  updateNpc,
  deleteNpc,
  toggleNpcVisibility,
} from "@/lib/supabase/campaign-npcs";
import { getCampaignNoteNpcLinks } from "@/lib/supabase/note-npc-links";
import { captureError } from "@/lib/errors/capture";
import type { CampaignNpc, CampaignNpcInsert, CampaignNpcUpdate } from "@/lib/types/campaign-npcs";
import type { NoteNpcLink } from "@/lib/types/note-npc-links";

interface NoteInfo {
  id: string;
  title: string;
}

export function useCampaignNpcs(campaignId: string) {
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [npcLinks, setNpcLinks] = useState<NoteNpcLink[]>([]);
  const [noteInfos, setNoteInfos] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [npcsData, linksData] = await Promise.all([
        getNpcs(campaignId),
        getCampaignNoteNpcLinks(campaignId),
      ]);
      setNpcs(npcsData);
      setNpcLinks(linksData);

      if (linksData.length > 0) {
        const supabase = createClient();
        const noteIds = [...new Set(linksData.map((l) => l.note_id))];
        const { data: notesData } = await supabase
          .from("campaign_notes")
          .select("id, title")
          .in("id", noteIds);
        setNoteInfos(
          (notesData ?? []).map((n: { id: string; title: string }) => ({
            id: n.id,
            title: n.title,
          })),
        );
      } else {
        setNoteInfos([]);
      }
    } catch (err) {
      captureError(err, {
        component: "useCampaignNpcs",
        action: "fetchData",
        category: "network",
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addNpc = useCallback(
    async (data: CampaignNpcInsert) => {
      const created = await createNpc(data);
      setNpcs((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    [],
  );

  const editNpc = useCallback(
    async (id: string, data: CampaignNpcUpdate) => {
      const updated = await updateNpc(id, data);
      setNpcs((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      return updated;
    },
    [],
  );

  const removeNpc = useCallback(
    async (id: string) => {
      await deleteNpc(id);
      setNpcs((prev) => prev.filter((n) => n.id !== id));
    },
    [],
  );

  const toggleVisibility = useCallback(
    async (npc: CampaignNpc) => {
      const updated = await toggleNpcVisibility(npc.id, !npc.is_visible_to_players);
      setNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      return updated;
    },
    [],
  );

  return {
    npcs,
    npcLinks,
    noteInfos,
    loading,
    addNpc,
    editNpc,
    removeNpc,
    toggleVisibility,
    refetch: fetchData,
  };
}
