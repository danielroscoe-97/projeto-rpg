"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Target, Circle, CheckCircle2, ChevronDown, Map } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { usePlayerQuestBoard } from "@/lib/hooks/usePlayerQuestBoard";
import { PlayerQuestCard } from "./PlayerQuestCard";

interface PlayerQuestBoardProps {
  campaignId: string;
  userId: string;
}

// localStorage key helper for "seen" tracking
function seenKey(questId: string, userId: string) {
  return `quest_seen_${questId}_${userId}`;
}

export function PlayerQuestBoard({ campaignId, userId }: PlayerQuestBoardProps) {
  const t = useTranslations("player_hq.quests");
  const {
    activeQuests,
    availableQuests,
    completedQuests,
    loading,
    saveNote,
    toggleFavorite,
  } = usePlayerQuestBoard(campaignId, userId);

  const [completedOpen, setCompletedOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    const allQuests = [...activeQuests, ...availableQuests, ...completedQuests];
    const seen = new Set<string>();
    for (const q of allQuests) {
      if (localStorage.getItem(seenKey(q.id, userId))) {
        seen.add(q.id);
      }
    }
    setSeenIds(seen);
  }, [activeQuests, availableQuests, completedQuests, userId]);

  const markSeen = useCallback(
    (questId: string) => {
      localStorage.setItem(seenKey(questId, userId), "1");
      setSeenIds((prev) => new Set([...prev, questId]));
    },
    [userId]
  );

  const isNew = useCallback(
    (questId: string) => !seenIds.has(questId),
    [seenIds]
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-card/50 rounded-lg border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty = activeQuests.length === 0 && availableQuests.length === 0 && completedQuests.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Map className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active quests */}
      {activeQuests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-[#D4A853]" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("section_active")} ({activeQuests.length})
            </h3>
          </div>
          <div className="space-y-2">
            {activeQuests.map((q) => (
              <PlayerQuestCard
                key={q.id}
                quest={q}
                isNew={isNew(q.id)}
                onSaveNote={saveNote}
                onToggleFavorite={toggleFavorite}
                onMarkSeen={markSeen}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available quests */}
      {availableQuests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Circle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("section_available")} ({availableQuests.length})
            </h3>
          </div>
          <div className="space-y-2">
            {availableQuests.map((q) => (
              <PlayerQuestCard
                key={q.id}
                quest={q}
                isNew={isNew(q.id)}
                onSaveNote={saveNote}
                onToggleFavorite={toggleFavorite}
                onMarkSeen={markSeen}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed quests — collapsed by default */}
      {completedQuests.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border/40 bg-card/30 hover:bg-card/50 transition-colors text-left min-h-[40px]"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                {t("section_completed")} ({completedQuests.length})
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  completedOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {completedQuests.map((q) => (
                <PlayerQuestCard
                  key={q.id}
                  quest={q}
                  isNew={isNew(q.id)}
                  onSaveNote={saveNote}
                  onToggleFavorite={toggleFavorite}
                  onMarkSeen={markSeen}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
