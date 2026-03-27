"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { NotebookPen, Eye, Pencil } from "lucide-react";

const DEBOUNCE_MS = 1000;
const STORAGE_KEY_PREFIX = "gm-notes-panel-open:";

interface GMNotesSheetProps {
  sessionId: string;
  userId: string;
}

export function GMNotesSheet({ sessionId, userId }: GMNotesSheetProps) {
  const t = useTranslations("session");
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`) === "true";
  });
  const [content, setContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Persist panel open/close state
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, String(isOpen));
  }, [isOpen, sessionId]);

  // Load notes from DB on mount
  useEffect(() => {
    if (!isOpen || isLoaded) return;
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("session_notes")
          .select("content")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
          .maybeSingle();
        if (data) setContent(data.content);
      } catch (err) {
        Sentry.captureException(err);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [isOpen, isLoaded, sessionId, userId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const saveNotes = useCallback(async (text: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("session_notes")
        .upsert(
          { session_id: sessionId, user_id: userId, content: text },
          { onConflict: "session_id,user_id" }
        );
      if (error) throw error;
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        savedTimerRef.current = undefined;
        setShowSaved(false);
      }, 2000);
    } catch (err) {
      toast.error(t("notes_save_error"));
      Sentry.captureException(err);
    }
  }, [sessionId, userId, t]);

  const handleChange = useCallback((value: string) => {
    setContent(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = undefined;
      saveNotes(value);
    }, DEBOUNCE_MS);
  }, [saveNotes]);

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.04] min-h-[44px]"
        aria-expanded={isOpen}
        aria-label={t("notes_title")}
        data-testid="gm-notes-toggle"
      >
        <NotebookPen className="w-4 h-4" />
        <span className="hidden sm:inline">{t("notes_title")}</span>
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div
          className="mt-2 bg-card border border-border rounded-lg p-4 space-y-3"
          data-testid="gm-notes-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-foreground text-sm font-medium">{t("notes_title")}</h3>
            <div className="flex items-center gap-2">
              {showSaved && (
                <span className="text-green-400 text-xs animate-fade-in">
                  {t("notes_saved")}
                </span>
              )}
              <button
                type="button"
                onClick={() => setPreviewMode((p) => !p)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded"
                data-testid="gm-notes-preview-toggle"
              >
                {previewMode ? (
                  <><Pencil className="w-3 h-3" /> {t("notes_edit")}</>
                ) : (
                  <><Eye className="w-3 h-3" /> {t("notes_preview")}</>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          {previewMode ? (
            <div
              className="prose prose-invert prose-sm max-w-none min-h-[150px] text-foreground/80"
              // Simple markdown rendering: headers, bold, italic, lists
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(content) }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={t("notes_placeholder")}
              className="w-full min-h-[150px] bg-transparent border border-border rounded-lg px-3 py-2 text-foreground text-sm resize-y focus:outline-none focus:ring-1 focus:ring-gold/50 placeholder:text-muted-foreground/40"
              data-testid="gm-notes-textarea"
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Minimal markdown → HTML (headers, bold, italic, lists). No external dep needed. */
function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n/g, "<br />");
}
