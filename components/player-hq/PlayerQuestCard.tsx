"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Circle, Target, CheckCircle2, XCircle, Ban, Star, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { QuestWithPlayerNotes, QuestStatus } from "@/lib/types/quest";

const STATUS_ICON: Record<QuestStatus, React.ComponentType<{ className?: string }>> = {
  available: Circle,
  active: Target,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
};

const STATUS_BORDER: Record<QuestStatus, string> = {
  available: "border-muted-foreground/30",
  active: "border-[#D4A853]/50 shadow-[0_0_8px_rgba(212,168,83,0.15)]",
  completed: "border-green-600/30 opacity-70",
  failed: "border-red-500/30 opacity-70",
  cancelled: "border-zinc-500/30 opacity-50",
};

const STATUS_ICON_CLASS: Record<QuestStatus, string> = {
  available: "text-muted-foreground",
  active: "text-[#D4A853]",
  completed: "text-green-500",
  failed: "text-red-400",
  cancelled: "text-zinc-500",
};

const STATUS_BADGE: Record<QuestStatus, { label: string; className: string }> = {
  active: { label: "active", className: "bg-[#D4A853]/20 text-[#D4A853]" },
  available: { label: "available", className: "bg-muted text-muted-foreground" },
  completed: { label: "completed", className: "bg-green-500/20 text-green-500" },
  failed: { label: "failed", className: "bg-red-500/20 text-red-400" },
  cancelled: { label: "cancelled", className: "bg-zinc-500/20 text-zinc-500" },
};

interface PlayerQuestCardProps {
  quest: QuestWithPlayerNotes;
  isNew: boolean;
  onSaveNote: (questId: string, notes: string) => void;
  onToggleFavorite: (questId: string) => void;
  onMarkSeen: (questId: string) => void;
}

export function PlayerQuestCard({
  quest,
  isNew,
  onSaveNote,
  onToggleFavorite,
  onMarkSeen,
}: PlayerQuestCardProps) {
  const t = useTranslations("player_hq.quests");
  const [expanded, setExpanded] = useState(false);
  const playerNote = quest.player_quest_notes?.[0];
  const isFavorite = playerNote?.is_favorite ?? false;
  const [noteText, setNoteText] = useState(playerNote?.notes ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync local note text with prop
  useEffect(() => {
    setNoteText(playerNote?.notes ?? "");
  }, [playerNote?.notes]);

  const handleExpand = useCallback(() => {
    setExpanded((v) => !v);
    if (isNew) onMarkSeen(quest.id);
  }, [isNew, quest.id, onMarkSeen]);

  const handleNoteChange = (val: string) => {
    setNoteText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSaveNote(quest.id, val);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1000);
  };

  const Icon = STATUS_ICON[quest.status];
  const badge = STATUS_BADGE[quest.status];

  return (
    <div
      className={`border rounded-lg transition-colors ${STATUS_BORDER[quest.status]} ${
        isFavorite ? "ring-1 ring-[#D4A853]/40 border-[#D4A853]/50" : ""
      }`}
    >
      {/* Header — clickable to expand */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer"
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleExpand();
          }
        }}
        aria-expanded={expanded}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${STATUS_ICON_CLASS[quest.status]}`} />
        <span className="font-medium text-sm flex-1 truncate">{quest.title}</span>

        {/* New badge */}
        {isNew && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide">
            {t("new_badge")}
          </span>
        )}

        {/* Status badge */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}>
          {t(`status_${badge.label}`)}
        </span>

        {/* Favorite star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(quest.id);
          }}
          className="p-0.5 hover:scale-110 transition-transform"
          aria-label={t(isFavorite ? "unfavorite" : "favorite")}
        >
          <Star
            className={`h-4 w-4 ${
              isFavorite ? "fill-[#D4A853] text-[#D4A853]" : "text-muted-foreground/40"
            }`}
          />
        </button>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
          {/* Quest description (DM content) */}
          {quest.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {quest.description}
            </p>
          )}

          {/* Player personal notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("my_notes")}
              </label>
              {saved && (
                <span className="text-[10px] text-green-400 animate-in fade-in duration-300">
                  {t("saved")}
                </span>
              )}
            </div>
            <Textarea
              value={noteText}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={t("notes_placeholder")}
              className="text-sm min-h-[60px] bg-card/50 border-border/30 resize-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
