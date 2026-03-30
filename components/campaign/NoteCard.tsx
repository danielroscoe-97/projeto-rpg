"use client";

import { useTranslations } from "next-intl";
import { Lock, Eye, FolderClosed } from "lucide-react";
import type { CampaignNote, CampaignNoteFolder } from "@/lib/types/database";

interface NoteCardProps {
  note: CampaignNote;
  folder?: CampaignNoteFolder | null;
  onClick: () => void;
}

export function NoteCard({ note, folder, onClick }: NoteCardProps) {
  const t = useTranslations("notes");

  const preview = note.content
    ? note.content.split("\n")[0].slice(0, 100) + (note.content.length > 100 ? "..." : "")
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card p-3 shadow-card hover:border-amber-500/30 transition-all duration-200"
      data-testid={`note-card-${note.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {note.title || t("untitled")}
          </p>
          {preview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>

        {/* Shared/Private badge */}
        {note.is_shared ? (
          <span
            className="flex items-center gap-1 text-xs text-emerald-400 shrink-0"
            title={t("shared_hint")}
          >
            <Eye className="w-3.5 h-3.5" />
            {t("shared")}
          </span>
        ) : (
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            title={t("private_hint")}
          >
            <Lock className="w-3.5 h-3.5" />
            {t("private")}
          </span>
        )}
      </div>

      {/* Folder tag */}
      {folder && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
          <FolderClosed className="w-3 h-3" />
          <span className="truncate">{folder.name}</span>
        </div>
      )}
    </button>
  );
}
