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
import type { NpcFormExtras } from "./NpcForm";
import { NpcCardSkeleton } from "@/components/ui/skeletons/NpcCardSkeleton";
import { useCampaignNpcs } from "@/lib/hooks/use-campaign-npcs";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import { useCampaignEdges } from "@/lib/hooks/useCampaignEdges";
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { useCampaignNotesIndex } from "@/lib/hooks/useCampaignNotesIndex";
import { useListViewPreference } from "@/lib/hooks/useListViewPreference";
import { captureError } from "@/lib/errors/capture";
import {
  upsertEntityLink,
  unlinkEntities,
  listEntityLinks,
} from "@/lib/supabase/entity-links";
import { selectCounterpartyIds, findEdgeId } from "@/lib/types/entity-links";
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
  const { locations: availableLocations } = useCampaignLocations(campaignId);
  const { factions: availableFactions } = useCampaignFactions(campaignId);
  const { edges, refetch: refetchEdges } = useCampaignEdges(campaignId);
  const { notes: notesIndex } = useCampaignNotesIndex(campaignId);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [factionFilter, setFactionFilter] = useListViewPreference<string>(
    campaignId,
    "npcs:faction",
    "all",
  );
  const [locationFilter, setLocationFilter] = useListViewPreference<string>(
    campaignId,
    "npcs:location",
    "all",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<CampaignNpc | null>(null);
  const [viewingNpc, setViewingNpc] = useState<CampaignNpc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignNpc | null>(null);

  // Build related notes map per NPC — union of legacy note_npc_links with
  // Fase 3e `mentions` edges. De-duplicated by note id so double-entries
  // (present in both legacy and edges after mig 153) collapse cleanly.
  const relatedNotesMap = useMemo(() => {
    const legacyNoteMap = new Map<string, NoteInfo>();
    for (const n of noteInfos) legacyNoteMap.set(n.id, n);
    const edgeNoteMap = new Map<string, NoteInfo>();
    for (const n of notesIndex) {
      edgeNoteMap.set(n.id, { id: n.id, title: n.title });
    }

    const map = new Map<string, NoteInfo[]>();
    // Legacy contributions
    for (const link of npcLinks) {
      const note = legacyNoteMap.get(link.note_id);
      if (!note) continue;
      const existing = map.get(link.npc_id) ?? [];
      if (!existing.some((x) => x.id === note.id)) existing.push(note);
      map.set(link.npc_id, existing);
    }
    // Edge contributions (Fase 3e `mentions`)
    for (const npc of npcs) {
      const mentionedNoteIds = selectCounterpartyIds(
        edges,
        { type: "npc", id: npc.id },
        {
          direction: "incoming",
          counterpartyType: "note",
          relationship: "mentions",
        },
      );
      if (mentionedNoteIds.length === 0) continue;
      const existing = map.get(npc.id) ?? [];
      for (const noteId of mentionedNoteIds) {
        const note = edgeNoteMap.get(noteId);
        if (!note) continue;
        if (!existing.some((x) => x.id === note.id)) existing.push(note);
      }
      map.set(npc.id, existing);
    }
    return map;
  }, [npcLinks, noteInfos, notesIndex, edges, npcs]);

  // Per-NPC morada + factions derived from the campaign edge list. Computed
  // once per edges change; forms read the relevant slice via npc.id.
  const npcMoradaMap = useMemo<Map<string, string | null>>(() => {
    const map = new Map<string, string | null>();
    for (const npc of npcs) {
      const [locationId] = selectCounterpartyIds(
        edges,
        { type: "npc", id: npc.id },
        {
          direction: "outgoing",
          counterpartyType: "location",
          relationship: "lives_in",
        },
      );
      map.set(npc.id, locationId ?? null);
    }
    return map;
  }, [edges, npcs]);

  const npcFactionsMap = useMemo<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>();
    for (const npc of npcs) {
      const factionIds = selectCounterpartyIds(
        edges,
        { type: "npc", id: npc.id },
        {
          direction: "outgoing",
          counterpartyType: "faction",
          relationship: "member_of",
        },
      );
      map.set(npc.id, factionIds);
    }
    return map;
  }, [edges, npcs]);

  const filteredNpcs = npcs.filter((npc) => {
    // Visibility filter (legacy)
    if (filter === "visible" && !npc.is_visible_to_players) return false;
    if (filter === "hidden" && npc.is_visible_to_players) return false;

    // Faction filter: "all" skips; "__none__" keeps NPCs with zero factions;
    // otherwise require the faction id to appear in the NPC's member_of set.
    if (factionFilter !== "all") {
      const ids = npcFactionsMap.get(npc.id) ?? [];
      if (factionFilter === "__none__") {
        if (ids.length > 0) return false;
      } else if (!ids.includes(factionFilter)) {
        return false;
      }
    }

    // Location filter: mirrors faction filter but on the single morada.
    if (locationFilter !== "all") {
      const moradaId = npcMoradaMap.get(npc.id) ?? null;
      if (locationFilter === "__none__") {
        if (moradaId !== null) return false;
      } else if (moradaId !== locationFilter) {
        return false;
      }
    }

    return true;
  });

  /**
   * Reconciles the `lives_in` + `member_of` edges for a given NPC against the
   * desired state from the form. Performs the minimum diff:
   *   - lives_in: upsert if changed, delete existing if cleared.
   *   - member_of: upsert any new faction, delete edges for removed ones.
   * Idempotent — safe to call after addNpc even when no edges change.
   */
  const syncNpcEdges = useCallback(
    async (npcId: string, _previousFactionIds: string[], extras: NpcFormExtras) => {
      // Reconcile against a FRESH read of this NPC's edges, not the cached
      // `edges` snapshot from the list hook. The cached snapshot can be stale
      // if the user saves rapidly or if another tab mutated the graph —
      // diffing against stale data produces orphan or duplicate rows.
      // `_previousFactionIds` is kept in the signature for API stability but
      // is no longer used for diffing.
      void _previousFactionIds;

      let currentEdges: Awaited<ReturnType<typeof listEntityLinks>> = [];
      try {
        currentEdges = await listEntityLinks(campaignId, {
          type: "npc",
          id: npcId,
        });
      } catch (err) {
        captureError(err, {
          component: "NpcList",
          action: "syncNpcEdges.fetchFresh",
          category: "network",
        });
        return;
      }

      const tasks: Promise<unknown>[] = [];

      // ----- Morada (lives_in → location) -----
      const existingMorada = selectCounterpartyIds(
        currentEdges,
        { type: "npc", id: npcId },
        {
          direction: "outgoing",
          counterpartyType: "location",
          relationship: "lives_in",
        },
      )[0] ?? null;

      if (extras.moradaLocationId !== existingMorada) {
        if (extras.moradaLocationId) {
          tasks.push(
            upsertEntityLink(
              campaignId,
              { type: "npc", id: npcId },
              { type: "location", id: extras.moradaLocationId },
              "lives_in",
            ),
          );
        }
        if (existingMorada) {
          const staleId = findEdgeId(
            currentEdges,
            { type: "npc", id: npcId },
            { type: "location", id: existingMorada },
            "lives_in",
          );
          if (staleId) tasks.push(unlinkEntities(staleId));
        }
      }

      // ----- Facções (member_of → faction) -----
      const currentFactionIds = selectCounterpartyIds(
        currentEdges,
        { type: "npc", id: npcId },
        {
          direction: "outgoing",
          counterpartyType: "faction",
          relationship: "member_of",
        },
      );
      const targetFactions = new Set(extras.factionIds);
      const currentFactions = new Set(currentFactionIds);

      for (const factionId of targetFactions) {
        if (!currentFactions.has(factionId)) {
          tasks.push(
            upsertEntityLink(
              campaignId,
              { type: "npc", id: npcId },
              { type: "faction", id: factionId },
              "member_of",
            ),
          );
        }
      }
      for (const factionId of currentFactions) {
        if (!targetFactions.has(factionId)) {
          const staleId = findEdgeId(
            currentEdges,
            { type: "npc", id: npcId },
            { type: "faction", id: factionId },
            "member_of",
          );
          if (staleId) tasks.push(unlinkEntities(staleId));
        }
      }

      if (tasks.length > 0) {
        // Use allSettled so a single failure doesn't swallow the other
        // successes — always refetch the campaign snapshot so the list
        // reflects whatever landed, and surface per-task failures.
        const results = await Promise.allSettled(tasks);
        for (const r of results) {
          if (r.status === "rejected") {
            captureError(r.reason, {
              component: "NpcList",
              action: "syncNpcEdges.taskFailed",
              category: "network",
            });
          }
        }
        await refetchEdges();
      }
    },
    [campaignId, refetchEdges],
  );

  const handleCreate = useCallback(
    async (data: CampaignNpcInsert, extras: NpcFormExtras) => {
      const created = await addNpc(data);
      if (created?.id) {
        try {
          await syncNpcEdges(created.id, [], extras);
        } catch (err) {
          captureError(err, {
            component: "NpcList",
            action: "syncNpcEdges.create",
            category: "network",
          });
        }
      }
    },
    [addNpc, syncNpcEdges],
  );

  const handleEdit = useCallback(
    async (data: CampaignNpcInsert, extras: NpcFormExtras) => {
      if (!editingNpc) return;
      const previousFactions = npcFactionsMap.get(editingNpc.id) ?? [];
      await editNpc(editingNpc.id, {
        name: data.name,
        description: data.description,
        stats: data.stats,
        avatar_url: data.avatar_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      try {
        await syncNpcEdges(editingNpc.id, previousFactions, extras);
      } catch (err) {
        captureError(err, {
          component: "NpcList",
          action: "syncNpcEdges.edit",
          category: "network",
        });
      }
      setEditingNpc(null);
    },
    [editingNpc, editNpc, npcFactionsMap, syncNpcEdges],
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
    async (data: CampaignNpcInsert, extras: NpcFormExtras) => {
      if (!viewingNpc) return;
      const previousFactions = npcFactionsMap.get(viewingNpc.id) ?? [];
      await editNpc(viewingNpc.id, {
        name: data.name,
        description: data.description,
        stats: data.stats,
        avatar_url: data.avatar_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      try {
        await syncNpcEdges(viewingNpc.id, previousFactions, extras);
      } catch (err) {
        captureError(err, {
          component: "NpcList",
          action: "syncNpcEdges.view",
          category: "network",
        });
      }
      setViewingNpc(null);
    },
    [viewingNpc, editNpc, npcFactionsMap, syncNpcEdges],
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

          {/* Faction filter — Fase 3f */}
          {availableFactions.length > 0 && (
            <select
              value={factionFilter}
              onChange={(e) => setFactionFilter(e.target.value)}
              className="text-xs bg-surface-tertiary border border-input rounded px-2 py-1 text-foreground"
              aria-label={t("filter_by_faction")}
              data-testid="npc-filter-faction"
            >
              <option value="all">
                {t("filter_by_faction")} · {t("filter_all")}
              </option>
              <option value="__none__">{t("filter_no_faction")}</option>
              {availableFactions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          {/* Location filter — Fase 3f */}
          {availableLocations.length > 0 && (
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="text-xs bg-surface-tertiary border border-input rounded px-2 py-1 text-foreground"
              aria-label={t("filter_by_location")}
              data-testid="npc-filter-location"
            >
              <option value="all">
                {t("filter_by_location")} · {t("filter_all")}
              </option>
              <option value="__none__">{t("filter_no_location")}</option>
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
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
          {filteredNpcs.map((npc) => {
            const moradaId = npcMoradaMap.get(npc.id) ?? null;
            const morada = moradaId
              ? availableLocations.find((l) => l.id === moradaId)
              : null;
            const factionIds = npcFactionsMap.get(npc.id) ?? [];
            const factions = factionIds
              .map((fid) => availableFactions.find((f) => f.id === fid))
              .filter((f): f is NonNullable<typeof f> => !!f)
              .map((f) => ({ id: f.id, name: f.name }));
            return (
              <NpcCard
                key={npc.id}
                npc={npc}
                relatedNotes={relatedNotesMap.get(npc.id)}
                morada={morada ? { id: morada.id, name: morada.name } : null}
                factions={factions}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
                onToggleVisibility={handleToggleVisibility}
                onCardClick={setViewingNpc}
              />
            );
          })}
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
        availableLocations={availableLocations}
        availableFactions={availableFactions}
        initialMoradaLocationId={editingNpc ? npcMoradaMap.get(editingNpc.id) ?? null : null}
        initialFactionIds={editingNpc ? npcFactionsMap.get(editingNpc.id) ?? [] : []}
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
          availableLocations={availableLocations}
          availableFactions={availableFactions}
          initialMoradaLocationId={npcMoradaMap.get(viewingNpc.id) ?? null}
          initialFactionIds={npcFactionsMap.get(viewingNpc.id) ?? []}
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
