"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, LayoutGrid, List, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { NpcCard } from "./NpcCard";
import { NpcForm } from "./NpcForm";
import { NpcCardSkeleton } from "@/components/ui/skeletons/NpcCardSkeleton";
import {
  getNpcs,
  createNpc,
  updateNpc,
  deleteNpc,
  toggleNpcVisibility,
} from "@/lib/supabase/campaign-npcs";
import { getCampaignNoteNpcLinks } from "@/lib/supabase/note-npc-links";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import type { CampaignNpc, CampaignNpcInsert } from "@/lib/types/campaign-npcs";
import type { NoteNpcLink } from "@/lib/types/note-npc-links";

interface NoteInfo {
  id: string;
  title: string;
}

type ViewMode = "grid" | "list";
type FilterMode = "all" | "visible" | "hidden";

interface NpcListProps {
  campaignId: string;
}

export function NpcList({ campaignId }: NpcListProps) {
  const t = useTranslations("npcs");
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [npcLinks, setNpcLinks] = useState<NoteNpcLink[]>([]);
  const [noteInfos, setNoteInfos] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<CampaignNpc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignNpc | null>(null);

  // Fetch NPCs, links, and note titles on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [npcsData, linksData] = await Promise.all([
          getNpcs(campaignId),
          getCampaignNoteNpcLinks(campaignId),
        ]);
        setNpcs(npcsData);
        setNpcLinks(linksData);

        // Fetch note titles for linked notes
        if (linksData.length > 0) {
          const supabase = createClient();
          const noteIds = [...new Set(linksData.map((l) => l.note_id))];
          const { data: notesData } = await supabase
            .from("campaign_notes")
            .select("id, title")
            .in("id", noteIds);
          setNoteInfos(
            (notesData ?? []).map((n: { id: string; title: string }) => ({
              id: n.id,
              title: n.title,
            })),
          );
        }
      } catch (err) {
        captureError(err, {
          component: "NpcList",
          action: "fetchNpcs",
          category: "network",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [campaignId]);

  // Build related notes map per NPC
  const relatedNotesMap = useMemo(() => {
    const noteMap = new Map<string, NoteInfo>();
    for (const n of noteInfos) noteMap.set(n.id, n);

    const map = new Map<string, NoteInfo[]>();
    for (const link of npcLinks) {
      const note = noteMap.get(link.note_id);
      if (!note) continue;
      const existing = map.get(link.npc_id) ?? [];
      existing.push(note);
      map.set(link.npc_id, existing);
    }
    return map;
  }, [npcLinks, noteInfos]);

  const filteredNpcs = npcs.filter((npc) => {
    if (filter === "visible") return npc.is_visible_to_players;
    if (filter === "hidden") return !npc.is_visible_to_players;
    return true;
  });

  const handleCreate = useCallback(
    async (data: CampaignNpcInsert) => {
      const created = await createNpc(data);
      setNpcs((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    },
    []
  );

  const handleEdit = useCallback(
    async (data: CampaignNpcInsert) => {
      if (!editingNpc) return;
      const updated = await updateNpc(editingNpc.id, {
        name: data.name,
        description: data.description,
        stats: data.stats,
        avatar_url: data.avatar_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setNpcs((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingNpc(null);
    },
    [editingNpc]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteNpc(deleteTarget.id);
      setNpcs((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    } catch (err) {
      captureError(err, {
        component: "NpcList",
        action: "deleteNpc",
        category: "network",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  const handleToggleVisibility = useCallback(async (npc: CampaignNpc) => {
    try {
      const updated = await toggleNpcVisibility(npc.id, !npc.is_visible_to_players);
      setNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      captureError(err, {
        component: "NpcList",
        action: "toggleVisibility",
        category: "network",
      });
    }
  }, []);

  const openEditForm = useCallback((npc: CampaignNpc) => {
    setEditingNpc(npc);
    setFormOpen(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingNpc(null);
    setFormOpen(true);
  }, []);

  if (loading) {
    return <NpcCardSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {(["all", "visible", "hidden"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`npc-filter-${f}`}
              >
                {t(`filter_${f}`)}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("view_grid")}
              data-testid="npc-view-grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("view_list")}
              data-testid="npc-view-list"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Button
          variant="goldOutline"
          size="sm"
          onClick={openCreateForm}
          className="gap-1.5"
          data-testid="npc-add-button"
        >
          <Plus className="w-4 h-4" />
          {t("add_npc")}
        </Button>
      </div>

      {/* Empty state */}
      {npcs.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center" data-testid="npc-empty-state">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <User className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-muted-foreground text-sm">{t("no_npcs")}</p>
          <p className="text-muted-foreground/60 text-xs mt-1">{t("create_first")}</p>
          <Button
            variant="goldOutline"
            size="sm"
            onClick={openCreateForm}
            className="mt-4 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t("add_npc")}
          </Button>
        </div>
      )}

      {/* NPC Grid/List */}
      {filteredNpcs.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-3"
          }
          data-testid="npc-container"
        >
          {filteredNpcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              relatedNotes={relatedNotesMap.get(npc.id)}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}

      {/* Filtered empty (NPCs exist but none match filter) */}
      {npcs.length > 0 && filteredNpcs.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">{t("no_npcs")}</p>
        </div>
      )}

      {/* Create/Edit form dialog */}
      <NpcForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingNpc(null);
        }}
        campaignId={campaignId}
        npc={editingNpc}
        onSave={editingNpc ? handleEdit : handleCreate}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_npc")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{/* uses common cancel */}Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete_npc")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
