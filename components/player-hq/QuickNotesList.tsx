"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { JournalEntry } from "@/lib/types/database";

interface QuickNotesListProps {
  notes: JournalEntry[];
  onAdd: (content: string) => Promise<unknown>;
  onUpdate: (id: string, updates: { content: string }) => void;
  onDelete: (id: string) => Promise<void>;
}

const MAX_CHARS = 500;

function timeAgo(dateStr: string, t: (key: string, values?: Record<string, string | number | Date>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return ""; // M-3: guard against invalid dates
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("just_now");
  if (minutes < 60) return t("minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  return t("days_ago", { count: days });
}

export function QuickNotesList({ notes, onAdd, onUpdate, onDelete }: QuickNotesListProps) {
  const t = useTranslations("player_hq.notes");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // C-4: track if a button was clicked to prevent onBlur auto-save
  const cancellingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (composing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [composing]);

  const handleAdd = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setDraft("");
    setComposing(false);
    navigator.vibrate?.([30]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") {
      setComposing(false);
      setDraft("");
    }
  };

  // C-4: onBlur checks if cancel was clicked before auto-saving
  const handleBlur = () => {
    // Give time for button mousedown to set cancellingRef
    requestAnimationFrame(() => {
      if (cancellingRef.current) {
        cancellingRef.current = false;
        return;
      }
      if (draft.trim()) handleAdd();
      else setComposing(false);
    });
  };

  const handleCancel = () => {
    cancellingRef.current = true;
    setComposing(false);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {/* Compose */}
      {composing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={t("quick_note_placeholder")}
            className="w-full bg-white/5 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{MAX_CHARS}
            </span>
            <div className="flex gap-2">
              {/* I-1: touch targets with min-h */}
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
                className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-3"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleAdd(); }}
                disabled={!draft.trim()}
                className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 min-h-[44px] px-3"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          {t("add_quick_note")}
        </button>
      )}

      {/* Notes list */}
      {notes.length === 0 && !composing && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("no_quick_notes")}
        </p>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className="group bg-white/5 rounded-lg p-3 space-y-1.5 border border-transparent hover:border-border/50 transition-colors"
        >
          {editingId === note.id ? (
            <textarea
              autoFocus
              defaultValue={note.content}
              maxLength={MAX_CHARS}
              onChange={(e) => onUpdate(note.id, { content: e.target.value })}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full bg-transparent text-sm text-foreground resize-none focus:outline-none"
              rows={3}
            />
          ) : (
            <p
              onClick={() => setEditingId(note.id)}
              className="text-sm text-foreground whitespace-pre-wrap cursor-text"
            >
              {note.content}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {timeAgo(note.created_at, t)}
            </span>
            <div className="flex items-center gap-1">
              {deletingId === note.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-400">{t("confirm_delete")}</span>
                  {/* I-1: touch targets */}
                  <button
                    type="button"
                    onClick={() => { onDelete(note.id); setDeletingId(null); }}
                    className="text-xs text-red-400 font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {t("yes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="text-xs text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {t("no")}
                  </button>
                </div>
              ) : (
                // M-1: always visible on mobile, hover-only on desktop
                <button
                  type="button"
                  onClick={() => setDeletingId(note.id)}
                  className="opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={t("delete_note")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
