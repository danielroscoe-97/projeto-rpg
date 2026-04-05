"use client";

import { useState, useCallback } from "react";
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
import { useCampaignFactions } from "@/lib/hooks/use-campaign-factions";
import { captureError } from "@/lib/errors/capture";
import type { CampaignFaction, FactionAlignment } from "@/lib/types/mind-map";
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
          className="animate-pulse bg-card border border-border rounded-xl p-4 space-y-3 border-l-4 border-l-zinc-700"
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
  const { factions, loading, addFaction, updateFaction, deleteFaction } =
    useCampaignFactions(campaignId);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<CampaignFaction | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<CampaignFaction | null>(
    null,
  );

  const filteredFactions = factions.filter((f) => {
    if (filter === "all") return true;
    return f.alignment === filter;
  });

  const handleCreate = useCallback(
    async (data: FactionFormData) => {
      await addFaction(data);
    },
    [addFaction],
  );

  const handleEdit = useCallback(
    async (data: FactionFormData) => {
      if (!editingFaction) return;
      await updateFaction(editingFaction.id, {
        name: data.name,
        description: data.description ?? "",
        alignment: data.alignment,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setEditingFaction(null);
    },
    [editingFaction, updateFaction],
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

  if (loading) {
    return <FactionCardSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
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
          className="rounded-lg border border-border bg-card p-8 text-center"
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
          {filteredFactions.map((faction) => (
            <FactionCard
              key={faction.id}
              faction={faction}
              isEditable={isEditable}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onToggleVisibility={handleToggleVisibility}
            />
          ))}
        </div>
      )}

      {/* Filtered empty (factions exist but none match filter) */}
      {factions.length > 0 && filteredFactions.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
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
        onSave={editingFaction ? handleEdit : handleCreate}
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
