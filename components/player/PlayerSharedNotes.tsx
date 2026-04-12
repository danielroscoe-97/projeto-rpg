"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";

interface SharedNote {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

interface PlayerNote {
  id: string;
  content: string;
  updated_at: string;
}

interface PlayerSharedNotesProps {
  campaignId: string;
  userId?: string; // if present, enables personal notes section
}

export function PlayerSharedNotes({ campaignId, userId }: PlayerSharedNotesProps) {
  const t = useTranslations("player");

  // Shared notes (DM → player, read-only)
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);

  // Personal notes (player's own)
  const [myNotes, setMyNotes] = useState<PlayerNote[]>([]);
  const [myNotesLoading, setMyNotesLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState<Record<string, "saving" | "saved" | "idle">>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const newNoteRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch shared notes
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campaign_notes")
      .select("id, title, content, updated_at")
      .eq("campaign_id", campaignId)
      .eq("is_shared", true)
      .order("updated_at", { ascending: false })
      .then(({ data, error }: { data: { id: string; title: string; content: string; updated_at: string }[] | null; error: { message: string } | null }) => {
        if (error) {
          captureError(error, {
            component: "PlayerSharedNotes",
            action: "fetch_shared",
            category: "network",
          });
        } else {
          setSharedNotes(data ?? []);
        }
        setSharedLoading(false);
      });
  }, [campaignId]);

  // Fetch personal notes
  useEffect(() => {
    if (!userId) return;
    setMyNotesLoading(true);
    const supabase = createClient();
    supabase
      .from("campaign_notes")
      .select("id, content, updated_at")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .eq("is_shared", false)
      .order("updated_at", { ascending: false })
      .then(({ data, error }: { data: { id: string; content: string; updated_at: string }[] | null; error: { message: string } | null }) => {
        if (error) {
          captureError(error, {
            component: "PlayerSharedNotes",
            action: "fetch_personal",
            category: "network",
          });
        } else {
          setMyNotes(data ?? []);
        }
        setMyNotesLoading(false);
      });
  }, [campaignId, userId]);

  const persistNote = useCallback(async (noteId: string, content: string) => {
    setSavingStatus((prev) => ({ ...prev, [noteId]: "saving" }));
    const supabase = createClient();
    const { error } = await supabase
      .from("campaign_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", userId);
    if (error) {
      setSavingStatus((prev) => ({ ...prev, [noteId]: "idle" }));
      captureError(error, { component: "PlayerSharedNotes", action: "update_note", category: "network" });
    } else {
      setSavingStatus((prev) => ({ ...prev, [noteId]: "saved" }));
      setTimeout(() => {
        setSavingStatus((prev) =>
          prev[noteId] === "saved" ? { ...prev, [noteId]: "idle" } : prev
        );
      }, 2000);
    }
  }, [userId]);

  // Auto-save debounced — same pattern as PlayerCharacterManager dm_notes
  const handleNoteChange = useCallback((noteId: string, content: string) => {
    setMyNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, content } : n)));
    if (debounceTimers.current[noteId]) clearTimeout(debounceTimers.current[noteId]);
    setSavingStatus((prev) => ({ ...prev, [noteId]: "idle" }));
    debounceTimers.current[noteId] = setTimeout(() => persistNote(noteId, content), 1500);
  }, [persistNote]);

  // Flush pending saves on page unload — best-effort only.
  // keepalive: true is set on the fetch so the browser doesn't cancel it mid-flight on pagehide.
  // Mobile Safari may still silently drop it; this is an accepted limitation for a best-effort save.
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const flush = () => {
      if (!supabaseUrl || !supabaseKey || !userId) return;
      for (const [noteId, timer] of Object.entries(debounceTimers.current)) {
        clearTimeout(timer);
        const note = myNotes.find((n) => n.id === noteId);
        if (note && savingStatus[noteId] === "idle") {
          fetch(
            `${supabaseUrl}/rest/v1/campaign_notes?id=eq.${noteId}&user_id=eq.${userId}`,
            {
              method: "PATCH",
              keepalive: true,
              headers: {
                "Content-Type": "application/json",
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ content: note.content, updated_at: new Date().toISOString() }),
            }
          );
        }
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [myNotes, savingStatus, userId]);

  const handleAddNote = useCallback(async () => {
    if (!userId || myNotes.length >= 10) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("campaign_notes")
      .insert({
        campaign_id: campaignId,
        user_id: userId,
        title: "",
        content: "",
        is_shared: false,
      })
      .select("id, content, updated_at")
      .single();
    if (data) {
      setMyNotes((prev) => [data, ...prev]);
      // Focus the new textarea on next tick
      setTimeout(() => newNoteRef.current?.focus(), 50);
    }
    if (error) {
      captureError(error, { component: "PlayerSharedNotes", action: "insert_note", category: "network" });
    }
  }, [userId, campaignId, myNotes.length]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (deleteConfirm !== noteId) {
      setDeleteConfirm(noteId);
      return;
    }
    setDeleteConfirm(null);
    if (debounceTimers.current[noteId]) clearTimeout(debounceTimers.current[noteId]);
    // Optimistic remove — restore on error
    const removedNote = myNotes.find((n) => n.id === noteId);
    setMyNotes((prev) => prev.filter((n) => n.id !== noteId));
    const supabase = createClient();
    const { error } = await supabase
      .from("campaign_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);
    if (error) {
      if (removedNote) setMyNotes((prev) => [removedNote, ...prev]);
      captureError(error, { component: "PlayerSharedNotes", action: "delete_note", category: "network" });
    }
  }, [deleteConfirm, userId, myNotes]);

  const atLimit = myNotes.length >= 10;

  return (
    <div className="space-y-4">
      {/* DM Shared Notes (read-only) */}
      {sharedLoading ? (
        <p className="text-muted-foreground text-xs px-1">{t("notes_loading")}</p>
      ) : sharedNotes.length === 0 ? (
        <p className="text-muted-foreground text-xs px-1">{t("notes_none")}</p>
      ) : (
        <ul className="space-y-2">
          {sharedNotes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-border bg-surface-tertiary px-3 py-2.5 space-y-1"
            >
              {note.title && (
                <p className="text-sm font-medium text-foreground">{note.title}</p>
              )}
              {note.content && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Personal Notes (auth players only) */}
      {userId && (
        <>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("my_notes")}
              </span>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={atLimit}
                title={atLimit ? t("my_notes_limit") : t("my_notes_add")}
                aria-label={t("my_notes_add")}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {myNotesLoading ? (
              <p className="text-muted-foreground text-xs px-1">{t("notes_loading")}</p>
            ) : myNotes.length === 0 ? (
              <p className="text-muted-foreground text-xs px-1">{t("my_notes_empty")}</p>
            ) : (
              <ul className="space-y-2">
                {myNotes.map((note, index) => (
                  <li key={note.id} className="rounded-lg border border-border bg-surface-tertiary px-3 py-2 space-y-1.5">
                    <textarea
                      ref={index === 0 ? newNoteRef : undefined}
                      value={note.content}
                      onChange={(e) => handleNoteChange(note.id, e.target.value)}
                      placeholder={t("my_notes_placeholder")}
                      rows={2}
                      className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/60">
                        {savingStatus[note.id] === "saving" ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {t("my_notes_saving")}
                          </span>
                        ) : savingStatus[note.id] === "saved" ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            {t("my_notes_saved")}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        aria-label={t("my_notes_delete_confirm")}
                        className={`flex items-center gap-0.5 text-[10px] transition-colors ${
                          deleteConfirm === note.id
                            ? "text-red-400"
                            : "text-muted-foreground/40 hover:text-muted-foreground"
                        }`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        {deleteConfirm === note.id && t("my_notes_delete_confirm")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
