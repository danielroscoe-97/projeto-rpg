"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { CampaignNote } from "@/lib/types/database";

interface CampaignNotesProps {
  campaignId: string;
}

type SaveStatus = "idle" | "saving" | "saved";

export function CampaignNotes({ campaignId }: CampaignNotesProps) {
  const supabase = createClient();
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from("campaign_notes")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        setNotes(data ?? []);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "fetchNotes",
          category: "network",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [campaignId, supabase]);

  // Flush pending saves and cleanup debounce timers on unmount
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.keys(timers).forEach((id) => {
        clearTimeout(timers[id]);
        // Fire pending save for each note with a timer
        const note = notesRef.current.find((n) => n.id === id);
        if (note) {
          saveNote(id, { title: note.title, content: note.content });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const saveNote = useCallback(
    async (id: string, fields: { title?: string; content?: string }) => {
      setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));

      try {
        const { error } = await supabase
          .from("campaign_notes")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (error) throw error;

        setSaveStatus((prev) => ({ ...prev, [id]: "saved" }));
        setTimeout(() => {
          setSaveStatus((prev) => {
            if (prev[id] === "saved") return { ...prev, [id]: "idle" };
            return prev;
          });
        }, 2000);
      } catch (err) {
        setSaveStatus((prev) => ({ ...prev, [id]: "idle" }));
        captureError(err, {
          component: "CampaignNotes",
          action: "saveNote",
          category: "network",
        });
      }
    },
    [supabase],
  );

  const debouncedSave = useCallback(
    (id: string, fields: { title?: string; content?: string }) => {
      if (debounceTimers.current[id]) {
        clearTimeout(debounceTimers.current[id]);
      }
      debounceTimers.current[id] = setTimeout(() => {
        saveNote(id, fields);
        delete debounceTimers.current[id];
      }, 800);
    },
    [saveNote],
  );

  const handleFieldChange = useCallback(
    (id: string, field: "title" | "content", value: string) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)),
      );
      debouncedSave(id, { [field]: value });
    },
    [debouncedSave],
  );

  const createNote = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaign_notes")
        .insert({ campaign_id: campaignId, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setNotes((prev) => [data, ...prev]);
        setExpandedIds((prev) => new Set(prev).add(data.id));
      }
    } catch (err) {
      captureError(err, {
        component: "CampaignNotes",
        action: "createNote",
        category: "network",
      });
    }
  }, [campaignId, supabase]);

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("campaign_notes")
          .delete()
          .eq("id", id);

        if (error) throw error;
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "deleteNote",
          category: "network",
        });
      } finally {
        setDeleteTarget(null);
      }
    },
    [supabase],
  );

  const getPreviewText = (note: CampaignNote): string => {
    if (!note.content) return "";
    const firstLine = note.content.split("\n")[0];
    return firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-surface-secondary animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Notas da Campanha
        </h2>
        <Button
          variant="goldOutline"
          size="sm"
          onClick={createNote}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova nota
        </Button>
      </div>

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="rounded-xl border border-border bg-surface-secondary p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhuma nota ainda. Crie uma nota para organizar sua campanha.
          </p>
        </div>
      )}

      {/* Note cards */}
      <div className="space-y-3">
        {notes.map((note) => {
          const isExpanded = expandedIds.has(note.id);
          const status = saveStatus[note.id] ?? "idle";

          return (
            <div
              key={note.id}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all duration-200"
            >
              {/* Collapsed header */}
              <button
                type="button"
                onClick={() => toggleExpanded(note.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/5 transition-colors min-h-[48px]"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {note.title || "Sem titulo"}
                  </p>
                  {!isExpanded && note.content && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {getPreviewText(note)}
                    </p>
                  )}
                </div>
                {/* Save indicator */}
                {status !== "idle" && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {status === "saving" ? "Salvando..." : "Salvo"}
                  </span>
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  <Input
                    value={note.title}
                    onChange={(e) =>
                      handleFieldChange(note.id, "title", e.target.value)
                    }
                    placeholder="Titulo da nota..."
                    className="font-medium"
                    data-testid={`note-title-${note.id}`}
                  />
                  <textarea
                    value={note.content}
                    onChange={(e) => {
                      handleFieldChange(note.id, "content", e.target.value);
                      // Auto-resize
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
                    }}
                    placeholder="Escreva sua nota aqui..."
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm"
                    style={{ minHeight: "4.5rem", maxHeight: "15rem" }}
                    data-testid={`note-content-${note.id}`}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Button
                      variant="destructiveSubtle"
                      size="sm"
                      onClick={() => setDeleteTarget(note.id)}
                      className="gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta nota? Esta acao nao pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteNote(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
