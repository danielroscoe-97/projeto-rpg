"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, ChevronDown, ChevronRight, Lock, Eye } from "lucide-react";
import { NotesListSkeleton } from "@/components/ui/skeletons/NotesListSkeleton";
import { NotesFolderTree } from "./NotesFolderTree";
import { NoteCard } from "./NoteCard";
import { NpcTagSelector } from "./NpcTagSelector";
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveNoteToFolder,
  toggleNoteShared,
} from "@/lib/supabase/campaign-notes";
import {
  getCampaignNoteNpcLinks,
  linkNoteToNpc,
  unlinkNoteFromNpc,
} from "@/lib/supabase/note-npc-links";
import { getNpcs } from "@/lib/supabase/campaign-npcs";
import type { CampaignNote, CampaignNoteFolder } from "@/lib/types/database";
import type { NoteNpcLink } from "@/lib/types/note-npc-links";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

interface CampaignNotesProps {
  campaignId: string;
  isOwner?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved";

export function CampaignNotes({ campaignId, isOwner = true }: CampaignNotesProps) {
  const supabase = createClient();
  const t = useTranslations("notes");
  const tLinks = useTranslations("links");
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [folders, setFolders] = useState<CampaignNoteFolder[]>([]);
  const [npcLinks, setNpcLinks] = useState<NoteNpcLink[]>([]);
  const [campaignNpcs, setCampaignNpcs] = useState<CampaignNpc[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch notes and folders on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notesRes, foldersData, linksData, npcsData] = await Promise.all([
          supabase
            .from("campaign_notes")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("updated_at", { ascending: false }),
          getFolders(campaignId),
          getCampaignNoteNpcLinks(campaignId),
          getNpcs(campaignId),
        ]);

        if (notesRes.error) throw notesRes.error;
        setNotes(notesRes.data ?? []);
        setFolders(foldersData);
        setNpcLinks(linksData);
        setCampaignNpcs(npcsData);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "fetchData",
          category: "network",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId, supabase]);

  // Note counts per folder
  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unfiled = 0;
    for (const note of notes) {
      if (note.folder_id) {
        counts[note.folder_id] = (counts[note.folder_id] ?? 0) + 1;
      } else {
        unfiled++;
      }
    }
    counts["unfiled"] = unfiled;
    return counts;
  }, [notes]);

  // Folder map for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, CampaignNoteFolder>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  // Filter notes by selected folder
  const filteredNotes = useMemo(() => {
    if (selectedFolderId === null) {
      return notes; // show all notes when "All/Unfiled" is selected
    }
    return notes.filter((n) => n.folder_id === selectedFolderId);
  }, [notes, selectedFolderId]);

  // Links per note for quick lookup
  const linksByNote = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of npcLinks) {
      const existing = map.get(link.note_id) ?? [];
      existing.push(link.npc_id);
      map.set(link.note_id, existing);
    }
    return map;
  }, [npcLinks]);

  // NPC map for quick name lookup
  const npcMap = useMemo(() => {
    const map = new Map<string, CampaignNpc>();
    for (const npc of campaignNpcs) map.set(npc.id, npc);
    return map;
  }, [campaignNpcs]);

  const handleLinkNpc = useCallback(
    async (noteId: string, npcId: string) => {
      try {
        const link = await linkNoteToNpc(noteId, npcId);
        setNpcLinks((prev) => [...prev, link]);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "linkNpc",
          category: "network",
        });
      }
    },
    [],
  );

  const handleUnlinkNpc = useCallback(
    async (noteId: string, npcId: string) => {
      try {
        await unlinkNoteFromNpc(noteId, npcId);
        setNpcLinks((prev) =>
          prev.filter((l) => !(l.note_id === noteId && l.npc_id === npcId)),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "unlinkNpc",
          category: "network",
        });
      }
    },
    [],
  );

  // Flush pending saves and cleanup debounce timers on unmount
  const notesRef = useRef(notes);
  notesRef.current = notes;
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.keys(timers).forEach((id) => {
        clearTimeout(timers[id]);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          folder_id: selectedFolderId,
          is_shared: false,
        })
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
  }, [campaignId, supabase, selectedFolderId]);

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

  const handleToggleShared = useCallback(
    async (noteId: string, isShared: boolean) => {
      try {
        await toggleNoteShared(noteId, isShared);
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, is_shared: isShared } : n)),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "toggleShared",
          category: "network",
        });
      }
    },
    [],
  );

  const handleMoveToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      try {
        await moveNoteToFolder(noteId, folderId);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, folder_id: folderId } : n,
          ),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "moveToFolder",
          category: "network",
        });
      }
    },
    [],
  );

  // Folder CRUD handlers
  const handleCreateFolder = useCallback(
    async (name: string, parentId?: string | null) => {
      try {
        const newFolder = await createFolder(campaignId, name, parentId);
        setFolders((prev) => [...prev, newFolder]);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "createFolder",
          category: "network",
        });
      }
    },
    [campaignId],
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      try {
        await updateFolder(folderId, name);
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, name } : f)),
        );
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "renameFolder",
          category: "network",
        });
      }
    },
    [],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolder(folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        // Unfiled notes that were in the deleted folder
        setNotes((prev) =>
          prev.map((n) =>
            n.folder_id === folderId ? { ...n, folder_id: null } : n,
          ),
        );
        if (selectedFolderId === folderId) setSelectedFolderId(null);
      } catch (err) {
        captureError(err, {
          component: "CampaignNotes",
          action: "deleteFolder",
          category: "network",
        });
      }
    },
    [selectedFolderId],
  );

  if (loading) {
    return <NotesListSkeleton count={2} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
        {isOwner && (
          <Button
            variant="goldOutline"
            size="sm"
            onClick={createNote}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("new_note")}
          </Button>
        )}
      </div>

      <div className="flex gap-4">
        {/* Sidebar: Folder tree */}
        <div className="w-48 shrink-0 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            {t("folders")}
          </h3>
          <NotesFolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            noteCounts={noteCounts}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            isOwner={isOwner}
          />
        </div>

        {/* Main: Notes list */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Empty state */}
          {filteredNotes.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-amber-400/60" />
              </div>
              <p className="text-muted-foreground text-sm">
                {t("no_notes")}
              </p>
              {isOwner && (
                <>
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    {t("create_first")}
                  </p>
                  <Button
                    variant="goldOutline"
                    size="sm"
                    onClick={createNote}
                    className="mt-4 gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    {t("new_note")}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Note cards */}
          {filteredNotes.map((note) => {
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {note.title || t("untitled")}
                      </p>
                      {/* Visibility badge */}
                      {note.is_shared ? (
                        <span className="flex items-center gap-0.5 text-xs text-emerald-400" title={t("shared_hint")}>
                          <Eye className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground/50" title={t("private_hint")}>
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {!isExpanded && note.content && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {note.content.split("\n")[0].slice(0, 80)}
                        {note.content.length > 80 ? "..." : ""}
                      </p>
                    )}
                    {/* Linked NPC chips in collapsed view */}
                    {!isExpanded && (linksByNote.get(note.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(linksByNote.get(note.id) ?? []).map((npcId) => {
                          const npc = npcMap.get(npcId);
                          if (!npc) return null;
                          return (
                            <span
                              key={npcId}
                              className="inline-flex items-center bg-purple-400/10 text-purple-400 rounded-full px-2 py-0.5 text-xs"
                            >
                              {npc.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Save indicator */}
                  {status !== "idle" && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {status === "saving" ? t("saving") : t("saved")}
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
                      placeholder={t("title_placeholder")}
                      className="font-medium"
                      data-testid={`note-title-${note.id}`}
                    />
                    <textarea
                      value={note.content}
                      onChange={(e) => {
                        handleFieldChange(note.id, "content", e.target.value);
                        const el = e.target;
                        el.style.height = "auto";
                        el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
                      }}
                      placeholder={t("content_placeholder")}
                      rows={3}
                      className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm"
                      style={{ minHeight: "4.5rem", maxHeight: "15rem" }}
                      data-testid={`note-content-${note.id}`}
                    />

                    {/* NPC tag selector */}
                    {isOwner && campaignNpcs.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {tLinks("related_npcs")}
                        </p>
                        <NpcTagSelector
                          availableNpcs={campaignNpcs}
                          linkedNpcIds={linksByNote.get(note.id) ?? []}
                          onLink={(npcId) => handleLinkNpc(note.id, npcId)}
                          onUnlink={(npcId) => handleUnlinkNpc(note.id, npcId)}
                        />
                      </div>
                    )}

                    {/* Linked NPC chips (read-only for non-owners) */}
                    {!isOwner && (linksByNote.get(note.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground mr-1">
                          {tLinks("related_npcs")}:
                        </span>
                        {(linksByNote.get(note.id) ?? []).map((npcId) => {
                          const npc = npcMap.get(npcId);
                          if (!npc) return null;
                          return (
                            <span
                              key={npcId}
                              className="inline-flex items-center bg-purple-400/10 text-purple-400 rounded-full px-2 py-0.5 text-xs"
                            >
                              {npc.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Controls row */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-4">
                        {/* Shared toggle */}
                        {isOwner && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Switch
                              checked={note.is_shared}
                              onCheckedChange={(checked) =>
                                handleToggleShared(note.id, checked)
                              }
                              data-testid={`note-shared-toggle-${note.id}`}
                            />
                            <span className={note.is_shared ? "text-emerald-400" : "text-muted-foreground"}>
                              {note.is_shared ? t("shared") : t("private")}
                            </span>
                            <span className="text-muted-foreground/50">
                              {note.is_shared ? t("shared_hint") : t("private_hint")}
                            </span>
                          </label>
                        )}

                        {/* Folder selector */}
                        {isOwner && folders.length > 0 && (
                          <select
                            value={note.folder_id ?? ""}
                            onChange={(e) =>
                              handleMoveToFolder(
                                note.id,
                                e.target.value || null,
                              )
                            }
                            className="text-xs bg-surface-tertiary border border-input rounded px-2 py-1 text-foreground"
                            data-testid={`note-folder-select-${note.id}`}
                          >
                            <option value="">{t("unfiled")}</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <span className="text-xs text-muted-foreground">
                          {new Date(note.updated_at).toLocaleDateString(
                            undefined,
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

                      {isOwner && (
                        <Button
                          variant="destructiveSubtle"
                          size="sm"
                          onClick={() => setDeleteTarget(note.id)}
                          className="gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("delete_note")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_note")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_note_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteNote(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete_note")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
