"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { JournalEntry } from "@/lib/types/database";

interface JournalEntryCardProps {
  entry: JournalEntry;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => void;
  onDelete: (id: string) => Promise<void>;
}

export function JournalEntryCard({ entry, onUpdate, onDelete }: JournalEntryCardProps) {
  const t = useTranslations("player_hq.notes");
  const locale = useLocale(); // M-4: use app locale, not browser
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // I-8: use controlled state instead of defaultValue to avoid stale display
  const [editTitle, setEditTitle] = useState(entry.title ?? "");
  const [editContent, setEditContent] = useState(entry.content);

  const preview = entry.title || entry.content.slice(0, 60) + (entry.content.length > 60 ? "…" : "");
  const date = new Date(entry.created_at).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    await onDelete(entry.id);
  };

  const handleStartEdit = () => {
    setEditTitle(entry.title ?? "");
    setEditContent(entry.content);
    setEditing(true);
  };

  return (
    <div className="bg-white/5 rounded-lg border border-transparent hover:border-border/50 transition-colors overflow-hidden">
      {/* Header — always visible. I-5: aria-expanded */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 text-left min-h-[44px]"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{preview}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        {entry.type === "lore" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
            {t("lore_badge")}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
          {editing ? (
            <>
              <input
                type="text"
                value={editTitle}
                placeholder={t("journal_title_placeholder")}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  onUpdate(entry.id, { title: e.target.value || undefined });
                }}
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border/30 pb-1"
              />
              <textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  onUpdate(entry.id, { content: e.target.value });
                }}
                onBlur={() => setEditing(false)}
                className="w-full bg-transparent text-sm text-foreground resize-none focus:outline-none min-h-[100px]"
                autoFocus
              />
            </>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{entry.content}</p>
          )}

          {/* I-1: touch targets with min-h */}
          <div className="flex items-center justify-end gap-1 pt-1">
            <button
              type="button"
              onClick={editing ? () => setEditing(false) : handleStartEdit}
              className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t("edit_entry")}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                confirming
                  ? "text-red-400 animate-pulse"
                  : "text-muted-foreground hover:text-red-400"
              }`}
              aria-label={confirming ? t("confirm_delete") : t("delete_entry")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
