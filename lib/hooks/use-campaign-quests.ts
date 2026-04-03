"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignQuest, QuestStatus } from "@/lib/types/quest";

export function sortQuestsByStatus(quests: CampaignQuest[]): CampaignQuest[] {
  const priority: Record<QuestStatus, number> = { active: 0, available: 1, completed: 2 };
  return [...quests].sort((a, b) => {
    const statusDiff = priority[a.status] - priority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.sort_order - b.sort_order;
  });
}

export function useCampaignQuests(campaignId: string) {
  const [quests, setQuests] = useState<CampaignQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaign_quests")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true });

    if (data) {
      setQuests(sortQuestsByStatus(data as CampaignQuest[]));
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const createQuest = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      const supabase = createClient();
      const maxOrder = quests.reduce((max, q) => Math.max(max, q.sort_order), -1);
      await supabase.from("campaign_quests").insert({
        campaign_id: campaignId,
        title: title.trim(),
        description: "",
        status: "available",
        sort_order: maxOrder + 1,
      });
      await fetchQuests();
    },
    [campaignId, quests, fetchQuests]
  );

  const updateQuest = useCallback(
    async (id: string, updates: Partial<{ title: string; description: string; status: QuestStatus }>) => {
      const supabase = createClient();
      await supabase.from("campaign_quests").update(updates).eq("id", id);
      await fetchQuests();
    },
    [fetchQuests]
  );

  const deleteQuest = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from("campaign_quests").delete().eq("id", id);
      await fetchQuests();
    },
    [fetchQuests]
  );

  const reorderQuest = useCallback(
    async (id: string, newOrder: number) => {
      const supabase = createClient();
      await supabase.from("campaign_quests").update({ sort_order: newOrder }).eq("id", id);
      await fetchQuests();
    },
    [fetchQuests]
  );

  return { quests, loading, createQuest, updateQuest, deleteQuest, reorderQuest, refetch: fetchQuests };
}
