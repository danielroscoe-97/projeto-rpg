"use client";

import { useState, useMemo, useCallback } from "react";
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
import { useCampaignNpcs } from "@/lib/hooks/use-campaign-npcs";
import { captureError } from "@/lib/errors/capture";
import type { CampaignNpc, CampaignNpcInsert } from "@/lib/types/campaign-npcs";

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
  const {
    npcs,
    npcLinks,
    noteInfos,
    loading,
    addNpc,
    editNpc,
    removeNpc,
    toggleVisibility,
  } = useCampaignNpcs(campaignId);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<CampaignNpc | null>(null);
  const [viewingNpc, setViewingNpc] = useState<CampaignNpc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignNpc | null>(null);

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
      await addNpc(data);
    },
    [addNpc],
  );

  const handleEdit = useCallback(
    async (data: CampaignNpcInsert) => {
      if (!editingNpc) return;
      await editNpc(editingNpc.id, {
        name: data.name,
        description: data.description,
        stats: data.stats,
        avatar_url: data.avatar_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setEditingNpc(null);
    },
    [editingNpc, editNpc],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await removeNpc(deleteTarget.id);
    } catch (err) {
      captureError(err, {
        component: "NpcList",
        action: "deleteNpc",
        category: "network",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeNpc]);

  const handleToggleVisibility = useCallback(
    async (npc: CampaignNpc) => {
      try {
        await toggleVisibility(npc);
      } catch (err) {
        captureError(err, {
          component: "NpcList",
          action: "toggleVisibility",
          category: "network",
        });
      }
    },
    [toggleVisibility],
  );

  const openEditForm = useCallback((npc: CampaignNpc) => {
    setEditingNpc(npc);
    setFormOpen(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingNpc(null);
    setFormOpen(true);
  }, []);

  const handleViewSave = useCallback(
    async (data: CampaignNpcInsert) => {
      if (!viewingNpc) return;
      await editNpc(viewingNpc.id, {
        name: data.name,
        description: data.description,
        stats: data.stats,
        avatar_url: data.avatar_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setViewingNpc(null);
    },
    [viewingNpc, editNpc],
  );

  if (loading) {
    return <NpcCardSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
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
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
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
        <div className="rounded-lg border border-white/[0.04] bg-card p-8 text-center" data-testid="npc-empty-state">
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
              onCardClick={setViewingNpc}
            />
          ))}
        </div>
      )}

      {/* Filtered empty (NPCs exist but none match filter) */}
      {npcs.length > 0 && filteredNpcs.length === 0 && (
        <div className="rounded-lg border border-white/[0.04] bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">{t("no_npcs")}</p>
        </div>
      )}

      {/* Create/Edit form dialog */}
      <NpcForm
        key={editingNpc?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingNpc(null);
        }}
        campaignId={campaignId}
        npc={editingNpc}
        onSave={editingNpc ? handleEdit : handleCreate}
      />

      {/* Read-only view (card body click) */}
      {viewingNpc && (
        <NpcForm
          key={`view-${viewingNpc.id}`}
          open={!!viewingNpc}
          onOpenChange={(open) => {
            if (!open) setViewingNpc(null);
          }}
          campaignId={campaignId}
          npc={viewingNpc}
          readOnly
          canEdit
          onSave={handleViewSave}
        />
      )}

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
