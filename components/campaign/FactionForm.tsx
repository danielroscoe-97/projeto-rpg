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
import type { CampaignFaction, CampaignLocation, FactionAlignment } from "@/lib/types/mind-map";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";
import { FACTION_ALIGNMENTS } from "@/lib/types/mind-map";
import type { FactionFormData } from "@/lib/hooks/use-campaign-factions";
import { EntityTagSelector } from "./EntityTagSelector";
import { EntityMentionEditor } from "@/components/ui/EntityMentionEditor";

/**
 * Side-channel data emitted alongside the faction payload on save. Parent
 * reconciles campaign_mind_map_edges based on deltas. See SPEC §2 Fase 3d.
 */
export interface FactionFormExtras {
  /** Location id where this faction is headquartered; null clears the link. */
  sedeLocationId: string | null;
  /** NPC ids that are members of this faction (member_of). */
  memberNpcIds: string[];
}

const ALIGNMENT_DOT_COLOR: Record<FactionAlignment, string> = {
  ally: "bg-emerald-400",
  neutral: "bg-zinc-400",
  hostile: "bg-red-400",
};

interface FactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  faction?: CampaignFaction | null;
  /** Locations to choose from for the "Sede" selector. Omit to hide. */
  availableLocations?: CampaignLocation[];
  /** NPCs to choose from for the "Membros" selector. Omit to hide. */
  availableNpcs?: CampaignNpc[];
  /** Initial HQ (edge headquarters_of target). Null/undefined = none. */
  initialSedeLocationId?: string | null;
  /** Initial members (edge member_of sources). Empty by default. */
  initialMemberNpcIds?: string[];
  onSave: (data: FactionFormData, extras: FactionFormExtras) => Promise<void>;
  /** When true, dialog opens in read-only mode (inputs disabled, Save hidden). */
  readOnly?: boolean;
  /** When true + `readOnly`, show an "Edit" button that flips into edit mode. */
  canEdit?: boolean;
}

export function FactionForm({
  open,
  onOpenChange,
  campaignId,
  faction,
  availableLocations,
  availableNpcs,
  initialSedeLocationId,
  initialMemberNpcIds,
  onSave,
  readOnly = false,
  canEdit = true,
}: FactionFormProps) {
  // campaignId feeds the @-mention popover so it can preload the campaign's
  // NPCs / locations / factions / quests for fuzzy search. Parent still
  // reconciles the explicit member/HQ edges emitted via extras.
  const t = useTranslations("factions");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(faction?.name ?? "");
  const [alignment, setAlignment] = useState<FactionAlignment>(
    faction?.alignment ?? "neutral",
  );
  const [description, setDescription] = useState(faction?.description ?? "");
  const [imageUrl, setImageUrl] = useState(faction?.image_url ?? "");
  const [visibleToPlayers, setVisibleToPlayers] = useState(
    faction?.is_visible_to_players ?? true,
  );
  const [sedeLocationId, setSedeLocationId] = useState<string | null>(
    initialSedeLocationId ?? null,
  );
  const [memberNpcIds, setMemberNpcIds] = useState<string[]>(
    initialMemberNpcIds ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(readOnly);

  useEffect(() => {
    setViewOnly(readOnly);
  }, [readOnly, open]);

  const initialSedeKey = initialSedeLocationId ?? null;
  const initialMembersKey = useMemo(
    () => (initialMemberNpcIds ?? []).slice().sort().join("|"),
    [initialMemberNpcIds],
  );

  const isDirty = useMemo(() => {
    const sedeDirty = sedeLocationId !== initialSedeKey;
    const membersDirty =
      memberNpcIds.slice().sort().join("|") !== initialMembersKey;

    const init = faction;
    if (!init) {
      return !!(
        name ||
        description ||
        alignment !== "neutral" ||
        imageUrl ||
        !visibleToPlayers ||
        sedeDirty ||
        membersDirty
      );
    }
    return (
      name !== (init.name ?? "") ||
      description !== (init.description ?? "") ||
      alignment !== (init.alignment ?? "neutral") ||
      imageUrl !== (init.image_url ?? "") ||
      visibleToPlayers !== (init.is_visible_to_players ?? true) ||
      sedeDirty ||
      membersDirty
    );
  }, [
    faction,
    name,
    description,
    alignment,
    imageUrl,
    visibleToPlayers,
    sedeLocationId,
    memberNpcIds,
    initialSedeKey,
    initialMembersKey,
  ]);

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

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(true);
        return;
      }

      const data: FactionFormData = {
        name: trimmedName,
        description: description.trim() || undefined,
        alignment,
        image_url: imageUrl.trim() || null,
        is_visible_to_players: visibleToPlayers,
      };

      setSaving(true);
      setSaveError(false);
      try {
        await onSave(data, { sedeLocationId, memberNpcIds });
        onOpenChange(false);
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    },
    [
      name,
      description,
      alignment,
      imageUrl,
      visibleToPlayers,
      sedeLocationId,
      memberNpcIds,
      onSave,
      onOpenChange,
    ],
  );

  const isEdit = !!faction;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("form_title_edit") : t("form_title_new")}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            data-testid="faction-form"
          >
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="faction-name">{t("field_name")} *</Label>
              <Input
                id="faction-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(false);
                }}
                placeholder={t("field_name")}
                data-testid="faction-name-input"
                aria-invalid={nameError}
                disabled={viewOnly}
                readOnly={viewOnly}
              />
              {nameError && (
                <p
                  className="text-xs text-red-400"
                  data-testid="faction-name-error"
                >
                  {t("name_required")}
                </p>
              )}
            </div>

            {/* Alignment */}
            <div className="space-y-1.5">
              <Label htmlFor="faction-alignment">{t("field_alignment")}</Label>
              <Select
                value={alignment}
                onValueChange={(v) => setAlignment(v as FactionAlignment)}
                disabled={viewOnly}
              >
                <SelectTrigger
                  className="w-full"
                  data-testid="faction-alignment-trigger"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTION_ALIGNMENTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${ALIGNMENT_DOT_COLOR[a]}`}
                        />
                        {t(`alignment_${a}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sede (HQ location) — Fase 3d */}
            {availableLocations && availableLocations.length > 0 && (
              <EntityTagSelector
                type="location"
                availableItems={availableLocations.map((l) => ({
                  id: l.id,
                  name: l.name,
                }))}
                selectedIds={sedeLocationId ? [sedeLocationId] : []}
                onChange={(ids) => setSedeLocationId(ids[0] ?? null)}
                singleSelect
                label={t("sede_label")}
                helpText={t("sede_placeholder")}
                noneLabel={t("sede_none")}
                testIdPrefix="faction-sede"
                disabled={viewOnly}
              />
            )}

            {/* Membros (NPC multi-select) — Fase 3d */}
            {availableNpcs && availableNpcs.length > 0 && (
              <EntityTagSelector
                type="npc"
                availableItems={availableNpcs.map((n) => ({
                  id: n.id,
                  name: n.name,
                }))}
                selectedIds={memberNpcIds}
                onChange={setMemberNpcIds}
                label={t("membros_label")}
                testIdPrefix="faction-membros"
                disabled={viewOnly}
              />
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="faction-description">
                {t("field_description")}
              </Label>
              <EntityMentionEditor
                value={description}
                onChange={setDescription}
                placeholder={t("description_placeholder")}
                campaignId={campaignId}
                disabled={viewOnly}
                rows={3}
                data-testid="faction-description-input"
              />
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="faction-image">{t("field_image")}</Label>
              <Input
                id="faction-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                data-testid="faction-image-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="faction-visible" className="cursor-pointer">
                {t("field_visibility")}
              </Label>
              <button
                id="faction-visible"
                type="button"
                role="switch"
                aria-checked={visibleToPlayers}
                onClick={() => !viewOnly && setVisibleToPlayers((v) => !v)}
                disabled={viewOnly}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
                  visibleToPlayers ? "bg-emerald-500" : "bg-muted"
                }`}
                data-testid="faction-visible-toggle"
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
              <p
                className="text-xs text-red-400"
                data-testid="faction-save-error"
              >
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
                      data-testid="faction-edit-toggle"
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
                  <Button
                    type="submit"
                    variant="gold"
                    disabled={saving}
                    data-testid="faction-submit"
                  >
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
            <AlertDialogDescription>
              {tCommon("discard_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("discard_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardOpen(false);
                // Reset fields to initial values so stale state doesn't persist
                setName(faction?.name ?? "");
                setAlignment(faction?.alignment ?? "neutral");
                setDescription(faction?.description ?? "");
                setImageUrl(faction?.image_url ?? "");
                setVisibleToPlayers(faction?.is_visible_to_players ?? true);
                setSedeLocationId(initialSedeLocationId ?? null);
                setMemberNpcIds(initialMemberNpcIds ?? []);
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
