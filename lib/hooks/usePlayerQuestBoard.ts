"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  CampaignQuest,
  QuestWithPlayerNotes,
  PlayerQuestNote,
} from "@/lib/types/quest";

export function usePlayerQuestBoard(campaignId: string, userId: string) {
  const [quests, setQuests] = useState<QuestWithPlayerNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchQuests = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data, error } = await supabase
      .from("campaign_quests")
      .select("*, player_quest_notes!left(id, notes, is_favorite, quest_id, user_id, campaign_id, created_at, updated_at)")
      .eq("campaign_id", campaignId)
      .eq("player_quest_notes.user_id", userId)
      .order("sort_order", { ascending: true })
      .limit(200);

    if (error) {
      toast.error("Failed to load quests");
    }
    if (!error && data) {
      setQuests(data as unknown as QuestWithPlayerNotes[]);
    }
    setLoading(false);
  }, [campaignId, userId]);

  // Initial fetch
  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // Realtime: listen for DM changes to campaign_quests
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`quest-board-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_quests",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchQuests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchQuests]);

  // Save personal note (upsert)
  const saveNote = useCallback(
    async (questId: string, notes: string) => {
      const supabase = supabaseRef.current;
      const { error } = await supabase
        .from("player_quest_notes")
        .upsert(
          {
            quest_id: questId,
            user_id: userId,
            campaign_id: campaignId,
            notes,
          },
          { onConflict: "quest_id,user_id" }
        );

      if (error) {
        toast.error("Failed to save note");
        return;
      }

      // Only update local state on success
      setQuests((prev) =>
        prev.map((q) => {
          if (q.id !== questId) return q;
          const existing = q.player_quest_notes?.[0];
          return {
            ...q,
            player_quest_notes: [
              {
                id: existing?.id ?? "",
                quest_id: questId,
                user_id: userId,
                campaign_id: campaignId,
                notes,
                is_favorite: existing?.is_favorite ?? false,
                created_at: existing?.created_at ?? new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        })
      );
    },
    [campaignId, userId]
  );

  // Toggle favorite (upsert)
  const toggleFavorite = useCallback(
    async (questId: string) => {
      const quest = quests.find((q) => q.id === questId);
      const currentFav = quest?.player_quest_notes?.[0]?.is_favorite ?? false;
      const newFav = !currentFav;

      // Backup for rollback
      const prevQuests = quests;

      // Optimistic update
      setQuests((prev) =>
        prev.map((q) => {
          if (q.id !== questId) return q;
          const existing = q.player_quest_notes?.[0];
          return {
            ...q,
            player_quest_notes: [
              {
                id: existing?.id ?? "",
                quest_id: questId,
                user_id: userId,
                campaign_id: campaignId,
                notes: existing?.notes ?? null,
                is_favorite: newFav,
                created_at: existing?.created_at ?? new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        })
      );

      const supabase = supabaseRef.current;
      const { error } = await supabase
        .from("player_quest_notes")
        .upsert(
          {
            quest_id: questId,
            user_id: userId,
            campaign_id: campaignId,
            is_favorite: newFav,
          },
          { onConflict: "quest_id,user_id" }
        );

      if (error) {
        setQuests(prevQuests);
        toast.error("Failed to update favorite");
      }
    },
    [campaignId, userId, quests]
  );

  // Categorize quests: favorites first within each group
  const sortWithFavorites = (list: QuestWithPlayerNotes[]) =>
    [...list].sort((a, b) => {
      const aFav = a.player_quest_notes?.[0]?.is_favorite ? 1 : 0;
      const bFav = b.player_quest_notes?.[0]?.is_favorite ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
      return a.sort_order - b.sort_order;
    });

  const activeQuests = sortWithFavorites(quests.filter((q) => q.status === "active"));
  const availableQuests = sortWithFavorites(quests.filter((q) => q.status === "available"));
  const completedQuests = sortWithFavorites(quests.filter((q) => q.status === "completed"));

  return {
    quests,
    activeQuests,
    availableQuests,
    completedQuests,
    loading,
    saveNote,
    toggleFavorite,
    refetch: fetchQuests,
  };
}
