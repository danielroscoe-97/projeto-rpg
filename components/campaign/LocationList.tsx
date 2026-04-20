"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, MapPin, ChevronDown, ChevronRight } from "lucide-react";
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
import { LocationCard } from "./LocationCard";
import { LocationForm } from "./LocationForm";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import { useCampaignNpcs } from "@/lib/hooks/use-campaign-npcs";
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { useCampaignEdges } from "@/lib/hooks/useCampaignEdges";
import { useCampaignNotesIndex } from "@/lib/hooks/useCampaignNotesIndex";
import { useListViewPreference } from "@/lib/hooks/useListViewPreference";
import { selectCounterpartyIds } from "@/lib/types/entity-links";
import { LOCATION_TYPES } from "@/lib/types/mind-map";
import { captureError } from "@/lib/errors/capture";
import type { CampaignLocation } from "@/lib/types/mind-map";
import type { LocationFormData } from "@/lib/hooks/use-campaign-locations";

type FilterMode = "all" | "discovered" | "hidden";
type ViewMode = "tree" | "flat" | "by_type";

interface TreeEntry {
  location: CampaignLocation;
  depth: number;
  hasChildren: boolean;
}

/**
 * DFS-walk the campaign_locations flat list into a rendering order that
 * reflects the parent/child hierarchy. Siblings sorted by name.
 * Entries whose ancestor chain contains a collapsed id are skipped.
 */
function buildTreeEntries(
  locations: CampaignLocation[],
  collapsed: Set<string>,
): TreeEntry[] {
  const byParent = new Map<string | null, CampaignLocation[]>();
  for (const loc of locations) {
    const key = loc.parent_location_id ?? null;
    const bucket = byParent.get(key) ?? [];
    bucket.push(loc);
    byParent.set(key, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }

  const entries: TreeEntry[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      const grandChildren = byParent.get(child.id) ?? [];
      entries.push({
        location: child,
        depth,
        hasChildren: grandChildren.length > 0,
      });
      if (!collapsed.has(child.id)) {
        walk(child.id, depth + 1);
      }
    }
  };
  walk(null, 0);
  return entries;
}

interface LocationListProps {
  campaignId: string;
  isEditable?: boolean;
}

export function LocationList({ campaignId, isEditable = true }: LocationListProps) {
  const t = useTranslations("locations");
  const {
    locations,
    loading,
    fetchError,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useCampaignLocations(campaignId);
  const { npcs } = useCampaignNpcs(campaignId);
  const { factions } = useCampaignFactions(campaignId);
  const { edges } = useCampaignEdges(campaignId);
  const { notes: notesIndex } = useCampaignNotesIndex(campaignId);

  // Per-location relations derived from edges: inhabitants (npcs with
  // outgoing lives_in → location) + hqFactions (factions with outgoing
  // headquarters_of → location). Computed once per edges/npcs/factions change.
  const locationInhabitantsMap = useMemo<Map<string, Array<{ id: string; name: string }>>>(() => {
    const npcById = new Map(npcs.map((n) => [n.id, n]));
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const loc of locations) {
      const npcIds = selectCounterpartyIds(
        edges,
        { type: "location", id: loc.id },
        {
          direction: "incoming",
          counterpartyType: "npc",
          relationship: "lives_in",
        },
      );
      map.set(
        loc.id,
        npcIds
          .map((id) => npcById.get(id))
          .filter((n): n is NonNullable<typeof n> => !!n)
          .map((n) => ({ id: n.id, name: n.name })),
      );
    }
    return map;
  }, [edges, npcs, locations]);

  const locationRelatedNotesMap = useMemo<Map<string, Array<{ id: string; title: string }>>>(() => {
    const noteById = new Map(notesIndex.map((n) => [n.id, n]));
    const map = new Map<string, Array<{ id: string; title: string }>>();
    for (const loc of locations) {
      const ids = selectCounterpartyIds(
        edges,
        { type: "location", id: loc.id },
        {
          direction: "incoming",
          counterpartyType: "note",
          relationship: "mentions",
        },
      );
      map.set(
        loc.id,
        ids
          .map((id) => noteById.get(id))
          .filter((n): n is NonNullable<typeof n> => !!n)
          .map((n) => ({ id: n.id, title: n.title })),
      );
    }
    return map;
  }, [edges, notesIndex, locations]);

  const locationHqFactionsMap = useMemo<Map<string, Array<{ id: string; name: string }>>>(() => {
    const factionById = new Map(factions.map((f) => [f.id, f]));
    const map = new Map<string, Array<{ id: string; name: string }>>();
    for (const loc of locations) {
      const factionIds = selectCounterpartyIds(
        edges,
        { type: "location", id: loc.id },
        {
          direction: "incoming",
          counterpartyType: "faction",
          relationship: "headquarters_of",
        },
      );
      map.set(
        loc.id,
        factionIds
          .map((id) => factionById.get(id))
          .filter((f): f is NonNullable<typeof f> => !!f)
          .map((f) => ({ id: f.id, name: f.name })),
      );
    }
    return map;
  }, [edges, factions, locations]);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useListViewPreference<ViewMode>(
    campaignId,
    "locations",
    "tree",
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampaignLocation | null>(null);
  // Opened in read-only (view) mode when user clicks the card body.
  const [viewingLocation, setViewingLocation] = useState<CampaignLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignLocation | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const filteredLocations = locations.filter((loc) => {
    if (filter === "discovered") return loc.is_discovered;
    if (filter === "hidden") return !loc.is_discovered;
    return true;
  });

  const treeEntries = useMemo<TreeEntry[]>(
    () => buildTreeEntries(locations, collapsedIds),
    [locations, collapsedIds],
  );

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreate = useCallback(
    async (data: LocationFormData) => {
      await addLocation(data);
    },
    [addLocation],
  );

  const handleEdit = useCallback(
    async (data: LocationFormData) => {
      if (!editingLocation) return;
      await updateLocation(editingLocation.id, {
        name: data.name,
        description: data.description ?? "",
        location_type: data.location_type,
        parent_location_id: data.parent_location_id ?? null,
        is_discovered: data.is_discovered,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setEditingLocation(null);
    },
    [editingLocation, updateLocation],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteLocation(deleteTarget.id);
    } catch (err) {
      captureError(err, {
        component: "LocationList",
        action: "deleteLocation",
        category: "network",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteLocation]);

  const handleToggleVisibility = useCallback(
    async (loc: CampaignLocation) => {
      try {
        await updateLocation(loc.id, {
          is_visible_to_players: !loc.is_visible_to_players,
        });
      } catch (err) {
        captureError(err, {
          component: "LocationList",
          action: "toggleVisibility",
          category: "network",
        });
      }
    },
    [updateLocation],
  );

  const openEditForm = useCallback((loc: CampaignLocation) => {
    setEditingLocation(loc);
    setFormOpen(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingLocation(null);
    setFormOpen(true);
  }, []);

  // Save handler for the read-only view — used if the user flips to edit mode
  // via the "Edit" button in the form footer.
  const handleViewSave = useCallback(
    async (data: LocationFormData) => {
      if (!viewingLocation) return;
      await updateLocation(viewingLocation.id, {
        name: data.name,
        description: data.description ?? "",
        location_type: data.location_type,
        parent_location_id: data.parent_location_id ?? null,
        is_discovered: data.is_discovered,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setViewingLocation(null);
    },
    [viewingLocation, updateLocation],
  );

  // Loading state — skeleton cards
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-white/[0.04] rounded-xl overflow-hidden animate-pulse"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 rounded-md bg-muted" />
                      <div className="h-5 w-20 rounded-md bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="text-sm text-red-400 py-4 text-center">
        {t("load_error")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
            {(["all", "discovered", "hidden"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`location-filter-${f}`}
              >
                {t(`filter_${f}`)}
              </button>
            ))}
          </div>

          {/* View mode switch */}
          <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
            {(["tree", "flat", "by_type"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === v
                    ? "bg-amber-400/15 text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`location-view-${v}`}
              >
                {t(`${v}_view` as "tree_view" | "flat_view" | "by_type_view")}
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
            data-testid="location-add-button"
          >
            <Plus className="w-4 h-4" />
            {t("add_location")}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="rounded-lg border border-white/[0.04] bg-card p-8 text-center" data-testid="location-empty-state">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <MapPin className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
          <p className="text-muted-foreground/60 text-xs mt-1">{t("empty_cta")}</p>
          {isEditable && (
            <Button
              variant="goldOutline"
              size="sm"
              onClick={openCreateForm}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t("add_location")}
            </Button>
          )}
        </div>
      )}

      {/* Location Grid — tree view falls back to flat when a filter is on. */}
      {viewMode === "tree" && filter === "all" && treeEntries.length > 0 && (
        <div
          className="flex flex-col gap-2"
          data-testid="location-container"
        >
          {treeEntries.map(({ location: loc, depth, hasChildren }) => {
            const collapsed = collapsedIds.has(loc.id);
            return (
              <div
                key={loc.id}
                className="flex items-start gap-2"
                style={{ paddingLeft: depth > 0 ? `${depth * 20}px` : undefined }}
                data-testid={`location-tree-row-${loc.id}`}
                data-depth={depth}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleCollapse(loc.id)}
                    className="mt-4 shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
                    aria-label={collapsed ? t("expand_all") : t("collapse_all")}
                    aria-expanded={!collapsed}
                    data-testid={`location-tree-toggle-${loc.id}`}
                  >
                    {collapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <div className="w-4 shrink-0" aria-hidden />
                )}
                <div className="flex-1 min-w-0">
                  <LocationCard
                    location={loc}
                    isEditable={isEditable}
                    inhabitantNpcs={locationInhabitantsMap.get(loc.id) ?? []}
                    hqFactions={locationHqFactionsMap.get(loc.id) ?? []}
                    relatedNotes={locationRelatedNotesMap.get(loc.id) ?? []}
                    onEdit={openEditForm}
                    onDelete={setDeleteTarget}
                    onToggleVisibility={handleToggleVisibility}
                    onCardClick={setViewingLocation}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(viewMode === "flat" || (viewMode === "tree" && filter !== "all")) &&
        filteredLocations.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            data-testid="location-container"
          >
            {filteredLocations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                isEditable={isEditable}
                inhabitantNpcs={locationInhabitantsMap.get(loc.id) ?? []}
                hqFactions={locationHqFactionsMap.get(loc.id) ?? []}
                relatedNotes={locationRelatedNotesMap.get(loc.id) ?? []}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
                onToggleVisibility={handleToggleVisibility}
                onCardClick={setViewingLocation}
              />
            ))}
          </div>
        )}

      {viewMode === "by_type" && filteredLocations.length > 0 && (
        <div className="space-y-4" data-testid="location-container">
          {LOCATION_TYPES.map((typeKey) => {
            const bucket = filteredLocations.filter(
              (l) => l.location_type === typeKey,
            );
            if (bucket.length === 0) return null;
            return (
              <section
                key={typeKey}
                aria-labelledby={`location-group-${typeKey}`}
              >
                <h3
                  id={`location-group-${typeKey}`}
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-2"
                >
                  {t(`type_${typeKey}`)}{" "}
                  <span className="text-muted-foreground/50 ml-1">
                    ({bucket.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bucket.map((loc) => (
                    <LocationCard
                      key={loc.id}
                      location={loc}
                      isEditable={isEditable}
                      inhabitantNpcs={locationInhabitantsMap.get(loc.id) ?? []}
                      hqFactions={locationHqFactionsMap.get(loc.id) ?? []}
                      relatedNotes={locationRelatedNotesMap.get(loc.id) ?? []}
                      onEdit={openEditForm}
                      onDelete={setDeleteTarget}
                      onToggleVisibility={handleToggleVisibility}
                      onCardClick={setViewingLocation}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Filtered empty (locations exist but none match filter) */}
      {locations.length > 0 && filteredLocations.length === 0 && (
        <div className="rounded-lg border border-white/[0.04] bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      )}

      {/* Create/Edit form dialog */}
      <LocationForm
        key={editingLocation?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLocation(null);
        }}
        campaignId={campaignId}
        location={editingLocation}
        availableLocations={locations}
        onSave={editingLocation ? handleEdit : handleCreate}
      />

      {/* Read-only view (card body click) — DM can flip to edit via button */}
      {viewingLocation && (
        <LocationForm
          key={`view-${viewingLocation.id}`}
          open={!!viewingLocation}
          onOpenChange={(open) => {
            if (!open) setViewingLocation(null);
          }}
          campaignId={campaignId}
          location={viewingLocation}
          availableLocations={locations}
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
              {deleteTarget && (() => {
                const childCount = locations.filter(
                  (l) => l.parent_location_id === deleteTarget.id,
                ).length;
                if (childCount === 0) return null;
                return (
                  <span
                    className="block mt-2 text-amber-400"
                    data-testid="location-delete-children-warning"
                  >
                    {t("delete_has_children_warning", { count: childCount })}
                  </span>
                );
              })()}
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
