"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Target, Star, StarOff, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DrawerShell } from "./DrawerShell";

interface PlayerQuestDrawerProps {
  questId: string;
  questTitle: string;
  questStatus: string;
  userId: string;
  campaignId: string;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function PlayerQuestDrawer({
  questId,
  questTitle,
  questStatus,
  userId,
  campaignId,
  onClose,
  onNavigateTab,
}: PlayerQuestDrawerProps) {
  const t = useTranslations("player_hq.quest_drawer");
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch quest details + player notes
  useEffect(() => {
    async function fetch() {
      const supabase = createClient();

      const [questRes, noteRes] = await Promise.all([
        supabase
          .from("campaign_quests")
          .select("description")
          .eq("id", questId)
          .single(),
        supabase
          .from("player_quest_notes")
          .select("id, notes, is_favorite")
          .eq("quest_id", questId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (questRes.data) {
        setDescription(questRes.data.description ?? "");
      }
      if (noteRes.data) {
        setNoteId(noteRes.data.id);
        setNotes(noteRes.data.notes ?? "");
        setIsFavorite(noteRes.data.is_favorite);
      }
      setLoading(false);
    }
    fetch();
  }, [questId, userId]);

  const upsertNote = async (updatedNotes: string, updatedFav: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const supabase = createClient();
      if (noteId) {
        await supabase
          .from("player_quest_notes")
          .update({ notes: updatedNotes, is_favorite: updatedFav })
          .eq("id", noteId);
      } else {
        const { data } = await supabase
          .from("player_quest_notes")
          .upsert(
            {
              quest_id: questId,
              user_id: userId,
              campaign_id: campaignId,
              notes: updatedNotes,
              is_favorite: updatedFav,
            },
            { onConflict: "quest_id,user_id" }
          )
          .select("id")
          .single();
        if (data) setNoteId(data.id);
      }
    } finally {
      savingRef.current = false;
    }
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => upsertNote(val, isFavorite), 800);
  };

  const handleToggleFavorite = () => {
    const newFav = !isFavorite;
    setIsFavorite(newFav);
    upsertNote(notes, newFav);
  };

  const statusBadge: Record<string, { label: string; color: string }> = {
    available: { label: t("status_available"), color: "bg-yellow-900/40 text-yellow-300" },
    active: { label: t("status_active"), color: "bg-yellow-900/60 text-yellow-200" },
    completed: { label: t("status_completed"), color: "bg-green-900/40 text-green-300" },
  };

  const badge = statusBadge[questStatus] ?? statusBadge.available;

  return (
    <DrawerShell
      title={questTitle}
      icon={<Target className="w-5 h-5" />}
      iconColor="text-yellow-400"
      onClose={onClose}
    >
      {loading ? (
        <div className="h-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <>
          {/* Status + Favorite */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.color}`}>
              {badge.label}
            </span>
            <button
              type="button"
              onClick={handleToggleFavorite}
              className="ml-auto text-muted-foreground hover:text-yellow-400 transition-colors"
              aria-label={isFavorite ? t("unfavorite") : t("favorite")}
            >
              {isFavorite ? (
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Description */}
          {description && (
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">
                {t("description")}
              </label>
              <p className="text-sm text-foreground/80">{description}</p>
            </div>
          )}

          {/* Player notes */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">
              {t("your_notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder={t("notes_placeholder")}
              className="w-full min-h-[120px] bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>

          {/* Quick access */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => { onClose(); onNavigateTab("quests"); }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs w-full"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("view_in_quest_board")}
            </button>
          )}
        </>
      )}
    </DrawerShell>
  );
}
