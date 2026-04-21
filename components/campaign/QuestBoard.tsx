"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ScrollText } from "lucide-react";
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
import { QuestCard } from "./QuestCard";
import { QuestForm } from "./QuestForm";
import { useCampaignQuests } from "@/lib/hooks/use-campaign-quests";
import { captureError } from "@/lib/errors/capture";
import type { CampaignQuest, QuestFormData, QuestStatus } from "@/lib/types/quest";

type FilterMode = "all" | "active" | "available" | "completed" | "failed" | "cancelled";

interface QuestBoardProps {
  campaignId: string;
  isEditable: boolean;
}

/* ── Skeleton loader ───────────────────────────────────────────────────────── */

function QuestCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse bg-card border border-white/[0.04] rounded-xl p-4 space-y-3 border-l-4 border-l-muted-foreground/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-white/[0.06] rounded" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 bg-white/[0.06] rounded-md" />
                <div className="h-5 w-14 bg-white/[0.06] rounded-md" />
              </div>
            </div>
          </div>
          <div className="h-3 w-full bg-white/[0.06] rounded" />
        </div>
      ))}
    </div>
  );
}

/* ── QuestBoard ────────────────────────────────────────────────────────────── */

export function QuestBoard({ campaignId, isEditable }: QuestBoardProps) {
  const t = useTranslations("campaign.quests");
  const searchParams = useSearchParams();
  const focusedQuestId = searchParams?.get("questId") ?? null;
  const { quests, loading, createQuest, updateQuest, deleteQuest } =
    useCampaignQuests(campaignId);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<CampaignQuest | null>(null);
  const [viewingQuest, setViewingQuest] = useState<CampaignQuest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignQuest | null>(null);

  /* ── Filtering ───────────────────────────────────────────────────────────── */

  const filteredQuests = useMemo(() => {
    if (filter === "all") return quests;
    return quests.filter((q) => q.status === filter);
  }, [quests, filter]);

  // Chip-navigate receiver. If the focused quest is filtered out by the
  // current status filter, fall back to "all" so the card is actually on
  // screen before we scroll. See NpcList for the handled-ref-on-searchParams
  // pattern that lets repeat chip clicks still refocus.
  const focusedQuestHandledRef = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    if (!focusedQuestId || !searchParams) return;
    if (focusedQuestHandledRef.current === searchParams) return;
    const target = quests.find((q) => q.id === focusedQuestId);
    if (!target) return;
    focusedQuestHandledRef.current = searchParams;
    if (filter !== "all" && target.status !== filter) {
      setFilter("all");
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(
          `[data-testid="quest-card-${CSS.escape(focusedQuestId)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }, [focusedQuestId, quests, searchParams, filter]);

  /* ── Handlers ────────────────────────────────────────────────────────────── */

  const handleCreate = useCallback(
    async (data: QuestFormData) => {
      await createQuest(data);
    },
    [createQuest],
  );

  const handleEdit = useCallback(
    async (data: QuestFormData) => {
      if (!editingQuest) return;
      await updateQuest(editingQuest.id, {
        title: data.title,
        quest_type: data.quest_type,
        status: data.status,
        context: data.context,
        objective: data.objective,
        reward: data.reward,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setEditingQuest(null);
    },
    [editingQuest, updateQuest],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuest(deleteTarget.id);
    } catch (err) {
      captureError(err, {
        component: "QuestBoard",
        action: "deleteQuest",
        category: "network",
      });
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteQuest]);

  const handleToggleVisibility = useCallback(
    async (quest: CampaignQuest) => {
      try {
        await updateQuest(quest.id, {
          is_visible_to_players: !quest.is_visible_to_players,
        });
      } catch (err) {
        captureError(err, {
          component: "QuestBoard",
          action: "toggleVisibility",
          category: "network",
        });
      }
    },
    [updateQuest],
  );

  const openEditForm = useCallback((quest: CampaignQuest) => {
    setEditingQuest(quest);
    setFormOpen(true);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingQuest(null);
    setFormOpen(true);
  }, []);

  const handleViewSave = useCallback(
    async (data: QuestFormData) => {
      if (!viewingQuest) return;
      await updateQuest(viewingQuest.id, {
        title: data.title,
        quest_type: data.quest_type,
        status: data.status,
        context: data.context,
        objective: data.objective,
        reward: data.reward,
        image_url: data.image_url,
        is_visible_to_players: data.is_visible_to_players,
      });
      setViewingQuest(null);
    },
    [viewingQuest, updateQuest],
  );

  /* ── Filter config ───────────────────────────────────────────────────────── */

  const filters: { key: FilterMode; label: string }[] = [
    { key: "all", label: t("filter_all") },
    { key: "active", label: t("filter_active") },
    { key: "available", label: t("filter_available") },
    { key: "completed", label: t("filter_completed") },
    { key: "failed", label: t("filter_failed") },
    { key: "cancelled", label: t("filter_cancelled") },
  ];

  /* ── Loading state ───────────────────────────────────────────────────────── */

  if (loading) {
    return <QuestCardSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Filter buttons */}
        <div className="flex items-center rounded-lg border border-white/[0.04] overflow-hidden">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-amber-400/15 text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`quest-filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add button (DM only) */}
        {isEditable && (
          <Button
            variant="goldOutline"
            size="sm"
            onClick={openCreateForm}
            className="gap-1.5"
            data-testid="quest-add-button"
          >
            <Plus className="w-4 h-4" />
            {t("quest_form_title_new")}
          </Button>
        )}
      </div>

      {/* Empty state */}
      {quests.length === 0 && (
        <div
          className="rounded-lg border border-white/[0.04] bg-card p-8 text-center"
          data-testid="quest-empty-state"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
            <ScrollText className="w-6 h-6 text-amber-400/60" />
          </div>
          <p className="text-muted-foreground text-sm">{t("quest_empty")}</p>
          <p className="text-muted-foreground/60 text-xs mt-1">{t("quest_empty_cta")}</p>
          {isEditable && (
            <Button
              variant="goldOutline"
              size="sm"
              onClick={openCreateForm}
              className="mt-4 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t("quest_form_title_new")}
            </Button>
          )}
        </div>
      )}

      {/* Quest grid */}
      {filteredQuests.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          data-testid="quest-container"
        >
          {filteredQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              isEditable={isEditable}
              onEdit={openEditForm}
              onDelete={setDeleteTarget}
              onToggleVisibility={handleToggleVisibility}
              onCardClick={setViewingQuest}
              focusToken={
                quest.id === focusedQuestId ? searchParams : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Filtered empty (quests exist but none match filter) */}
      {quests.length > 0 && filteredQuests.length === 0 && (
        <div className="rounded-lg border border-white/[0.04] bg-card p-6 text-center">
          <p className="text-muted-foreground text-sm">{t("quest_empty")}</p>
        </div>
      )}

      {/* Create/Edit form dialog */}
      <QuestForm
        key={editingQuest?.id ?? "new"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingQuest(null);
        }}
        campaignId={campaignId}
        quest={editingQuest}
        onSave={editingQuest ? handleEdit : handleCreate}
      />

      {/* Read-only view (card body click) */}
      {viewingQuest && (
        <QuestForm
          key={`view-${viewingQuest.id}`}
          open={!!viewingQuest}
          onOpenChange={(open) => {
            if (!open) setViewingQuest(null);
          }}
          campaignId={campaignId}
          quest={viewingQuest}
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
            <AlertDialogTitle>{t("delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
