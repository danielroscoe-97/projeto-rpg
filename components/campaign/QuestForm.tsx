"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignQuest, QuestFormData, QuestStatus, QuestType } from "@/lib/types/quest";

interface QuestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  quest?: CampaignQuest | null;
  onSave: (data: QuestFormData) => Promise<void>;
  /** When true, dialog opens in read-only mode (inputs disabled, Save hidden). */
  readOnly?: boolean;
  /** When true + `readOnly`, show an "Edit" button that flips into edit mode. */
  canEdit?: boolean;
}

export function QuestForm({
  open,
  onOpenChange,
  quest,
  onSave,
  readOnly = false,
  canEdit = true,
}: QuestFormProps) {
  const t = useTranslations("campaign.quests");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState(quest?.title ?? "");
  const [questType, setQuestType] = useState<QuestType>(quest?.quest_type ?? "side");
  const [status, setStatus] = useState<QuestStatus>(quest?.status ?? "available");
  const [context, setContext] = useState(quest?.context ?? "");
  const [objective, setObjective] = useState(quest?.objective ?? "");
  const [reward, setReward] = useState(quest?.reward ?? "");
  const [imageUrl, setImageUrl] = useState(quest?.image_url ?? "");
  const [visibleToPlayers, setVisibleToPlayers] = useState(quest?.is_visible_to_players ?? true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(readOnly);

  useEffect(() => {
    setViewOnly(readOnly);
  }, [readOnly, open]);

  const isDirty = useMemo(() => {
    const init = quest;
    if (!init) {
      return !!(title || context || objective || reward || imageUrl || questType !== "side" || status !== "available" || !visibleToPlayers);
    }
    return (
      title !== (init.title ?? "") ||
      questType !== (init.quest_type ?? "side") ||
      status !== (init.status ?? "available") ||
      context !== (init.context ?? "") ||
      objective !== (init.objective ?? "") ||
      reward !== (init.reward ?? "") ||
      imageUrl !== (init.image_url ?? "") ||
      visibleToPlayers !== (init.is_visible_to_players ?? true)
    );
  }, [quest, title, questType, status, context, objective, reward, imageUrl, visibleToPlayers]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isDirty) {
        setDiscardOpen(true);
        return;
      }
      onOpenChange(nextOpen);
    },
    [isDirty, onOpenChange],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setNameError(true);
        return;
      }

      const data: QuestFormData = {
        title: trimmedTitle,
        quest_type: questType,
        status,
        context: context.trim(),
        objective: objective.trim(),
        reward: reward.trim(),
        image_url: imageUrl.trim() || null,
        is_visible_to_players: visibleToPlayers,
      };

      setSaving(true);
      setSaveError(false);
      try {
        await onSave(data);
        onOpenChange(false);
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    },
    [title, questType, status, context, objective, reward, imageUrl, visibleToPlayers, onSave, onOpenChange],
  );

  const isEdit = !!quest;

  const textareaClass =
    "flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("quest_form_title_edit") : t("quest_form_title_new")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="quest-form">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="quest-name">{t("quest_field_name")} *</Label>
              <Input
                id="quest-name"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (nameError) setNameError(false);
                }}
                placeholder={t("quest_field_name")}
                data-testid="quest-name-input"
                aria-invalid={nameError}
                disabled={viewOnly}
                readOnly={viewOnly}
              />
              {nameError && (
                <p className="text-xs text-red-400" data-testid="quest-name-error">
                  {t("name_required")}
                </p>
              )}
            </div>

            {/* Type + Status row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Type */}
              <div className="space-y-1.5">
                <Label>{t("quest_field_type")}</Label>
                <Select
                  value={questType}
                  onValueChange={(v) => setQuestType(v as QuestType)}
                  disabled={viewOnly}
                >
                  <SelectTrigger className="w-full" data-testid="quest-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">{t("quest_type_main")}</SelectItem>
                    <SelectItem value="side">{t("quest_type_side")}</SelectItem>
                    <SelectItem value="bounty">{t("quest_type_bounty")}</SelectItem>
                    <SelectItem value="escort">{t("quest_type_escort")}</SelectItem>
                    <SelectItem value="fetch">{t("quest_type_fetch")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>{t("quest_field_status")}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as QuestStatus)}
                  disabled={viewOnly}
                >
                  <SelectTrigger className="w-full" data-testid="quest-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t("quest_status_available")}</SelectItem>
                    <SelectItem value="active">{t("quest_status_active")}</SelectItem>
                    <SelectItem value="completed">{t("quest_status_completed")}</SelectItem>
                    <SelectItem value="failed">{t("quest_status_failed")}</SelectItem>
                    <SelectItem value="cancelled">{t("quest_status_cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Context */}
            <div className="space-y-1.5">
              <Label htmlFor="quest-context">{t("quest_field_context")}</Label>
              <textarea
                id="quest-context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t("quest_field_context_placeholder")}
                rows={3}
                className={textareaClass}
                data-testid="quest-context-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            </div>

            {/* Objective */}
            <div className="space-y-1.5">
              <Label htmlFor="quest-objective">{t("quest_field_objective")}</Label>
              <textarea
                id="quest-objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={t("quest_field_objective_placeholder")}
                rows={2}
                className={textareaClass}
                data-testid="quest-objective-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            </div>

            {/* Reward */}
            <div className="space-y-1.5">
              <Label htmlFor="quest-reward">{t("quest_field_reward")}</Label>
              <textarea
                id="quest-reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder={t("quest_field_reward_placeholder")}
                rows={2}
                className={textareaClass}
                data-testid="quest-reward-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="quest-image">{t("quest_field_image")}</Label>
              <Input
                id="quest-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                data-testid="quest-image-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="quest-visible" className="cursor-pointer">
                {visibleToPlayers ? t("visibility_show") : t("visibility_hide")}
              </Label>
              <button
                id="quest-visible"
                type="button"
                role="switch"
                aria-checked={visibleToPlayers}
                onClick={() => !viewOnly && setVisibleToPlayers((v) => !v)}
                disabled={viewOnly}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
                  visibleToPlayers ? "bg-emerald-500" : "bg-muted"
                }`}
                data-testid="quest-visible-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                    visibleToPlayers ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Save error */}
            {saveError && (
              <p className="text-xs text-red-400" data-testid="quest-save-error">
                {t("save_error")}
              </p>
            )}

            {/* Submit / View actions */}
            <div className="flex justify-end gap-2 pt-2">
              {viewOnly ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                  >
                    {tCommon("close")}
                  </Button>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="gold"
                      onClick={() => setViewOnly(false)}
                      data-testid="quest-edit-toggle"
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      {tCommon("edit")}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenChange(false)}
                    disabled={saving}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" variant="gold" disabled={saving} data-testid="quest-submit">
                    {saving ? tCommon("saving") : tCommon("save")}
                  </Button>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("discard_title")}</AlertDialogTitle>
            <AlertDialogDescription>{tCommon("discard_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("discard_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                setTitle(quest?.title ?? "");
                setQuestType(quest?.quest_type ?? "side");
                setStatus(quest?.status ?? "available");
                setContext(quest?.context ?? "");
                setObjective(quest?.objective ?? "");
                setReward(quest?.reward ?? "");
                setImageUrl(quest?.image_url ?? "");
                setVisibleToPlayers(quest?.is_visible_to_players ?? true);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon("discard_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
