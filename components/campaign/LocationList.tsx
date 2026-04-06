"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, MapPin } from "lucide-react";
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
import { captureError } from "@/lib/errors/capture";
import type { CampaignLocation } from "@/lib/types/mind-map";
import type { LocationFormData } from "@/lib/hooks/use-campaign-locations";

type FilterMode = "all" | "discovered" | "hidden";

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

  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CampaignLocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignLocation | null>(null);

  const filteredLocations = locations.filter((loc) => {
    if (filter === "discovered") return loc.is_discovered;
    if (filter === "hidden") return !loc.is_discovered;
    return true;
  });

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

  // Loading state — skeleton cards
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border/30 rounded-xl overflow-hidden animate-pulse"
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
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-border/30 overflow-hidden">
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
        <div className="rounded-lg border border-border/30 bg-card p-8 text-center" data-testid="location-empty-state">
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

      {/* Location Grid */}
      {filteredLocations.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          data-testid="location-container"
        >
          {filteredLocations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              isEditable={isEditable}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}

      {/* Filtered empty (locations exist but none match filter) */}
      {locations.length > 0 && filteredLocations.length === 0 && (
        <div className="rounded-lg border border-border/30 bg-card p-6 text-center">
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
        onSave={editingLocation ? handleEdit : handleCreate}
      />

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
