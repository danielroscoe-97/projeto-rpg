"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignQuest, QuestStatus, QuestType, QuestFormData } from "@/lib/types/quest";

export function sortQuestsByStatus(quests: CampaignQuest[]): CampaignQuest[] {
  const priority: Record<QuestStatus, number> = { active: 0, available: 1, completed: 2, failed: 3, cancelled: 4 };
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
    async (formData: QuestFormData) => {
      const title = formData.title.trim();
      if (!title) return;
      const supabase = createClient();
      const maxOrder = quests.reduce((max, q) => Math.max(max, q.sort_order), -1);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: CampaignQuest = {
        id: optimisticId, campaign_id: campaignId, title,
        description: formData.description ?? "", status: formData.status ?? "available",
        quest_type: formData.quest_type ?? "side", context: formData.context ?? "",
        objective: formData.objective ?? "", reward: formData.reward ?? "",
        image_url: formData.image_url ?? null, is_visible_to_players: formData.is_visible_to_players ?? true,
        sort_order: maxOrder + 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setQuests((prev) => sortQuestsByStatus([...prev, optimistic]));

      const { data, error } = await supabase
        .from("campaign_quests")
        .insert({
          campaign_id: campaignId, title, description: formData.description ?? "",
          status: formData.status ?? "available", quest_type: formData.quest_type ?? "side",
          context: formData.context ?? "", objective: formData.objective ?? "",
          reward: formData.reward ?? "", image_url: formData.image_url ?? null,
          is_visible_to_players: formData.is_visible_to_players ?? true,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (!error && data) {
        setQuests((prev) => sortQuestsByStatus(prev.map((q) => (q.id === optimisticId ? (data as CampaignQuest) : q))));
      } else if (error) {
        setQuests((prev) => prev.filter((q) => q.id !== optimisticId));
        throw error;
      }
    },
    [campaignId, quests],
  );

  const updateQuest = useCallback(
    async (id: string, updates: Partial<{ title: string; description: string; status: QuestStatus; quest_type: QuestType; context: string; objective: string; reward: string; image_url: string | null; is_visible_to_players: boolean }>) => {
      setQuests((prev) =>
        sortQuestsByStatus(prev.map((q) => (q.id === id ? { ...q, ...updates } : q))),
      );

      const supabase = createClient();
      const { error } = await supabase.from("campaign_quests").update(updates).eq("id", id);

      if (error) {
        await fetchQuests();
      }
    },
    [fetchQuests],
  );

  const deleteQuest = useCallback(
    async (id: string) => {
      setQuests((current) => current.filter((q) => q.id !== id));

      const supabase = createClient();
      const { error } = await supabase.from("campaign_quests").delete().eq("id", id);

      if (error) {
        await fetchQuests();
      }
    },
    [fetchQuests],
  );

  const reorderQuest = useCallback(
    async (id: string, newOrder: number) => {
      const supabase = createClient();
      await supabase.from("campaign_quests").update({ sort_order: newOrder }).eq("id", id);
      await fetchQuests();
    },
    [fetchQuests],
  );

  return { quests, loading, createQuest, updateQuest, deleteQuest, reorderQuest, refetch: fetchQuests };
}
