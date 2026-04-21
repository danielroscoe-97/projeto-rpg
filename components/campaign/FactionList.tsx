"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Flag } from "lucide-react";
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
import { FactionCard } from "./FactionCard";
import { FactionForm } from "./FactionForm";
import type { FactionFormExtras } from "./FactionForm";
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import { useCampaignNpcs } from "@/lib/hooks/use-campaign-npcs";
import { useCampaignEdges } from "@/lib/hooks/useCampaignEdges";
import { useCampaignNotesIndex } from "@/lib/hooks/useCampaignNotesIndex";
import { selectCounterpartyIds, findEdgeId } from "@/lib/types/entity-links";
import {
  upsertEntityLink,
  unlinkEntities,
  listEntityLinks,
} from "@/lib/supabase/entity-links";
import { captureError } from "@/lib/errors/capture";
import type { CampaignFaction } from "@/lib/types/mind-map";
import type { FactionFormData } from "@/lib/hooks/use-campaign-factions";

type FilterMode = "all" | "ally" | "neutral" | "hostile";

const FILTER_OPTIONS: { key: FilterMode; i18nKey: string }[] = [
  { key: "all", i18nKey: "filter_all" },
  { key: "ally", i18nKey: "filter_allies" },
  { key: "neutral", i18nKey: "filter_neutral" },
  { key: "hostile", i18nKey: "filter_hostile" },
];

function FactionCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse bg-card border border-white/[0.04] rounded-xl p-4 space-y-3 border-l-4 border-l-zinc-700"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/[0.06]" />
                <div className="h-4 w-28 bg-white/[0.06] rounded" />
              </div>
              <div className="h-5 w-16 bg-white/[0.06] rounded-md" />
            </div>
          </div>
          <div className="h-3 w-full bg-white/[0.06] rounded" />
          <div className="h-3 w-2/3 bg-white/[0.06] rounded" />
        </div>
      ))}
    </div>
  );
}

interface FactionListProps {
  campaignId: string;
  isEditable?: boolean;
}

export function FactionList({ campaignId, isEditable = true }: FactionListProps) {
  const t = useTranslations("factions");
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusedFactionId = searchParams?.get("factionId") ?? null;

  const openInMap = useCallback(
    (faction: CampaignFaction) => {
      router.push(
        `/app/campaigns/${campaignId}?section=mindmap&focus=faction-${faction.id}`,
      );
    },
    [campaignId, router],
  );
  const { factions, loading, addFaction, updateFaction, deleteFaction } =
    useCampaignFactions(campaignId);
  const { locations: availableLocations } = useCampaignLocations(campaignId);
  const { npcs: availableNpcs } = useCampaignNpcs(campaignId);
  const { edges, refetch: refetchEdges } = useCampaignEdges(campaignId);
  const { notes: notesIndex } = useCampaignNotesIndex(campaignId);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<CampaignFaction | null>(
    null,
  );
  const [viewingFaction, setViewingFaction] = useState<CampaignFaction | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<CampaignFaction | null>(
    null,
  );

  const filteredFactions = factions.filter((f) => {
    if (filter === "all") return true;
    return f.alignment === filter;
  });

  const factionSedeMap = useMemo<Map<string, string | null>>(() => {
    const map = new Map<string, string | null>();
    for (const f of factions) {
      const [locationId] = selectCounterpartyIds(
        edges,
        { type: "faction", id: f.id },
        {
          direction: "outgoing",
          counterpartyType: "location",
          relationship: "headquarters_of",
        },
      );
      map.set(f.id, locationId ?? null);
    }
    return map;
  }, [edges, factions]);

  const factionMembersMap = useMemo<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>();
    for (const f of factions) {
      const npcIds = selectCounterpartyIds(
        edges,
        { type: "faction", id: f.id },
        {
          direction: "incoming",
          counterpartyType: "npc",
          relationship: "member_of",
        },
      );
      map.set(f.id, npcIds);
    }
    return map;
  }, [edges, factions]);

  const factionRelatedNotesMap = useMemo<Map<string, Array<{ id: string; title: string }>>>(() => {
    const noteById = new Map(notesIndex.map((n) => [n.id, n]));
    const map = new Map<string, Array<{ id: string; title: string }>>();
    for (const f of factions) {
      const ids = selectCounterpartyIds(
        edges,
        { type: "faction", id: f.id },
        {
          direction: "incoming",
          counterpartyType: "note",
          relationship: "mentions",
        },
      );
      map.set(
        f.id,
        ids
          .map((id) => noteById.get(id))
          .filter((n): n is NonNullable<typeof n> => !!n)
          .map((n) => ({ id: n.id, title: n.title })),
      );
    }
    return map;
  }, [edges, notesIndex, factions]);

  /**
   * Reconciles the headquarters_of + member_of edges for a faction against
   * the form's extras. Idempotent via upsertEntityLink.
   */
  const syncFactionEdges = useCallback(
    async (
      factionId: string,
      _previousMembers: string[],
      extras: FactionFormExtras,
    ) => {
      // Reconcile against a FRESH read of this faction's edges, not the
      // cached `edges` snapshot. See NpcList.syncNpcEdges for rationale.
      void _previousMembers;

      let currentEdges: Awaited<ReturnType<typeof listEntityLinks>> = [];
      try {
        currentEdges = await listEntityLinks(campaignId, {
          type: "faction",
          id: factionId,
        });
      } catch (err) {
        captureError(err, {
          component: "FactionList",
          action: "syncFactionEdges.fetchFresh",
          category: "network",
        });
        return;
      }

      const tasks: Promise<unknown>[] = [];

      // ----- Sede (headquarters_of → location) -----
      const existingSede = selectCounterpartyIds(
        currentEdges,
        { type: "faction", id: factionId },
        {
          direction: "outgoing",
          counterpartyType: "location",
          relationship: "headquarters_of",
        },
      )[0] ?? null;

      if (extras.sedeLocationId !== existingSede) {
        if (extras.sedeLocationId) {
          tasks.push(
            upsertEntityLink(
              campaignId,
              { type: "faction", id: factionId },
              { type: "location", id: extras.sedeLocationId },
              "headquarters_of",
            ),
          );
        }
        if (existingSede) {
          const staleId = findEdgeId(
            currentEdges,
            { type: "faction", id: factionId },
            { type: "location", id: existingSede },
            "headquarters_of",
          );
          if (staleId) tasks.push(unlinkEntities(staleId));
        }
      }

      // ----- Membros (member_of incoming) -----
      // Edges are npc→faction with relationship=member_of. From faction's
      // perspective these are incoming. Upsert uses the npc as source.
      const currentMemberIds = selectCounterpartyIds(
        currentEdges,
        { type: "faction", id: factionId },
        {
          direction: "incoming",
          counterpartyType: "npc",
          relationship: "member_of",
        },
      );
      const targetMembers = new Set(extras.memberNpcIds);
      const currentMembers = new Set(currentMemberIds);

      for (const npcId of targetMembers) {
        if (!currentMembers.has(npcId)) {
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
      for (const npcId of currentMembers) {
        if (!targetMembers.has(npcId)) {
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
        const results = await Promise.allSettled(tasks);
        for (const r of results) {
          if (r.status === "rejected") {
            captureError(r.reason, {
              component: "FactionList",
              action: "syncFactionEdges.taskFailed",
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
    async (data: FactionFormData, extras: FactionFormExtras) => {
      const { data: created, error } = await addFaction(data);
      if (!error && created?.id) {
        try {
          await syncFactionEdges(created.id, [], extras);
        } catch (err) {
          captureError(err, {
            component: "FactionList",
            action: "syncFactionEdges.create",
            category: "network",
          });
        }
      }
    },
    [addFaction, syncFactionEdges],
  );

  const handleEdit = useCallback(
    async (data: FactionFormData, extras: FactionFormExtras) => {
      if (!editingFaction) return;
      const previousMembers = factionMembersMap.get(editingFaction.id) ?? [];
      await updateFaction(editingFaction.id, {
        name: data.name,
        description: data.description ?? "",
        alignment: data.alignment,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      try {
        await syncFactionEdges(editingFaction.id, previousMembers, extras);
      } catch (err) {
        captureError(err, {
          component: "FactionList",
          action: "syncFactionEdges.edit",
          category: "network",
        });
      }
      setEditingFaction(null);
    },
    [editingFaction, updateFaction, factionMembersMap, syncFactionEdges],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteFaction(deleteTarget.id);
    } catch (err) {
      captureError(err, {
        component: "FactionList",
        action: "deleteFaction",
        category: "network",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteFaction]);

  const handleToggleVisibility = useCallback(
    async (faction: CampaignFaction) => {
      try {
        await updateFaction(faction.id, {
          is_visible_to_players: !faction.is_visible_to_players,
        });
      } catch (err) {
        captureError(err, {
          component: "FactionList",
          action: "toggleVisibility",
          category: "network",
        });
      }
    },
    [updateFaction],
  );

  const openEditForm = useCallback((faction: CampaignFaction) => {
    setEditingFaction(faction);
    setFormOpen(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingFaction(null);
    setFormOpen(true);
  }, []);

  const handleViewSave = useCallback(
    async (data: FactionFormData, extras: FactionFormExtras) => {
      if (!viewingFaction) return;
      const previousMembers = factionMembersMap.get(viewingFaction.id) ?? [];
      await updateFaction(viewingFaction.id, {
        name: data.name,
        description: data.description ?? "",
        alignment: data.alignment,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      try {
        await syncFactionEdges(viewingFaction.id, previousMembers, extras);
      } catch (err) {
        captureError(err, {
          component: "FactionList",
          action: "syncFactionEdges.view",
          category: "network",
        });
      }
      setViewingFaction(null);
    },
    [viewingFaction, updateFaction, factionMembersMap, syncFactionEdges],
  );

  // Chip-navigate receiver. See NpcList for the handled-ref-on-searchParams
  // pattern that makes repeat chip clicks still refocus the same card.
  const focusedFactionHandledRef = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    if (!focusedFactionId || !searchParams) return;
    if (focusedFactionHandledRef.current === searchParams) return;
    if (!factions.some((f) => f.id === focusedFactionId)) return;
    focusedFactionHandledRef.current = searchParams;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-testid="faction-card-${CSS.escape(focusedFactionId)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }, [focusedFactionId, factions, searchParams]);

  if (loading) {
    return <FactionCardSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
            {FILTER_OPTIONS.map(({ key, i18nKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`faction-filter-${key}`}
              >
                {t(i18nKey)}
              </button>
            ))}
          </div>
        </div>

        {isEditable && (
          <Button
            variant="goldOutline"
            size="sm"
            onClick={openCreateForm}
            className="gap-1.5"
            data-testid="faction-add-button"
          >
            <Plus className="w-4 h-4" />
            {t("add_faction")}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {factions.length === 0 && (
        <div
          className="rounded-lg border border-white/[0.04] bg-card p-8 text-center"
          data-testid="faction-empty-state"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <Flag className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            {t("empty_cta")}
          </p>
          {isEditable && (
            <Button
              variant="goldOutline"
              size="sm"
              onClick={openCreateForm}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t("add_faction")}
            </Button>
          )}
        </div>
      )}

      {/* Faction Grid */}
      {filteredFactions.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          data-testid="faction-container"
        >
          {filteredFactions.map((faction) => {
            const sedeId = factionSedeMap.get(faction.id) ?? null;
            const sede = sedeId
              ? availableLocations.find((l) => l.id === sedeId)
              : null;
            const memberIds = factionMembersMap.get(faction.id) ?? [];
            const members = memberIds
              .map((id) => availableNpcs.find((n) => n.id === id))
              .filter((n): n is NonNullable<typeof n> => !!n)
              .map((n) => ({ id: n.id, name: n.name }));
            return (
              <FactionCard
                key={faction.id}
                faction={faction}
                isEditable={isEditable}
                sede={sede ? { id: sede.id, name: sede.name } : null}
                members={members}
                relatedNotes={factionRelatedNotesMap.get(faction.id) ?? []}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
                onToggleVisibility={handleToggleVisibility}
                onCardClick={setViewingFaction}
                onOpenInMap={openInMap}
                focusToken={
                  faction.id === focusedFactionId ? searchParams : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Filtered empty (factions exist but none match filter) */}
      {factions.length > 0 && filteredFactions.length === 0 && (
        <div className="rounded-lg border border-white/[0.04] bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      )}

      {/* Create/Edit form dialog */}
      <FactionForm
        key={editingFaction?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingFaction(null);
        }}
        campaignId={campaignId}
        faction={editingFaction}
        availableLocations={availableLocations}
        availableNpcs={availableNpcs}
        initialSedeLocationId={
          editingFaction ? factionSedeMap.get(editingFaction.id) ?? null : null
        }
        initialMemberNpcIds={
          editingFaction ? factionMembersMap.get(editingFaction.id) ?? [] : []
        }
        onSave={editingFaction ? handleEdit : handleCreate}
      />

      {/* Read-only view (card body click) */}
      {viewingFaction && (
        <FactionForm
          key={`view-${viewingFaction.id}`}
          open={!!viewingFaction}
          onOpenChange={(open) => {
            if (!open) setViewingFaction(null);
          }}
          campaignId={campaignId}
          faction={viewingFaction}
          availableLocations={availableLocations}
          availableNpcs={availableNpcs}
          initialSedeLocationId={factionSedeMap.get(viewingFaction.id) ?? null}
          initialMemberNpcIds={factionMembersMap.get(viewingFaction.id) ?? []}
          readOnly
          canEdit={isEditable}
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
            <AlertDialogTitle>{t("delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? t("delete_description", { name: deleteTarget.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
