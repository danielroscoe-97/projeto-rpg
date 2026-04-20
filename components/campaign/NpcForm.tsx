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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignNpc, CampaignNpcInsert, NpcStats } from "@/lib/types/campaign-npcs";
import type { CampaignLocation, CampaignFaction } from "@/lib/types/mind-map";
import { EntityTagSelector } from "./EntityTagSelector";
import { EntityMentionEditor } from "@/components/ui/EntityMentionEditor";

/**
 * Side-channel data emitted alongside the NPC payload on save. Parent is
 * responsible for syncing campaign_mind_map_edges based on the delta
 * between the initial values and these. See SPEC §2 Fase 3c + 3d.
 */
export interface NpcFormExtras {
  /** Location id where the NPC lives; null clears any existing link. */
  moradaLocationId: string | null;
  /** Faction ids the NPC belongs to (member_of). */
  factionIds: string[];
}

interface NpcFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string | null;
  npc?: CampaignNpc | null;
  /** Flat list of campaign locations for the "Morada" selector. Omit to hide. */
  availableLocations?: CampaignLocation[];
  /** Flat list of campaign factions for the "Facções" selector (Fase 3d). Omit to hide. */
  availableFactions?: CampaignFaction[];
  /** Initial morada (edge lives_in target). Null/undefined = none. */
  initialMoradaLocationId?: string | null;
  /** Initial factions the NPC belongs to (Fase 3d). */
  initialFactionIds?: string[];
  onSave: (data: CampaignNpcInsert, extras: NpcFormExtras) => Promise<void>;
  /** When true, dialog opens in read-only mode (inputs disabled, Save hidden). */
  readOnly?: boolean;
  /** When true + `readOnly`, show an "Edit" button that flips into edit mode. */
  canEdit?: boolean;
}

export function NpcForm({
  open,
  onOpenChange,
  campaignId,
  npc,
  availableLocations,
  availableFactions,
  initialMoradaLocationId,
  initialFactionIds,
  onSave,
  readOnly = false,
  canEdit = true,
}: NpcFormProps) {
  const t = useTranslations("npcs");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(npc?.name ?? "");
  const [description, setDescription] = useState(npc?.description ?? "");
  const [hp, setHp] = useState(npc?.stats.hp?.toString() ?? "");
  const [ac, setAc] = useState(npc?.stats.ac?.toString() ?? "");
  const [initiativeMod, setInitiativeMod] = useState(npc?.stats.initiative_mod?.toString() ?? "");
  const [cr, setCr] = useState(npc?.stats.cr ?? "");
  const [notes, setNotes] = useState(npc?.stats.notes ?? "");
  const [avatarUrl, setAvatarUrl] = useState(npc?.avatar_url ?? "");
  const [visibleToPlayers, setVisibleToPlayers] = useState(npc?.is_visible_to_players ?? true);
  const [moradaLocationId, setMoradaLocationId] = useState<string | null>(
    initialMoradaLocationId ?? null,
  );
  const [factionIds, setFactionIds] = useState<string[]>(initialFactionIds ?? []);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(readOnly);

  useEffect(() => {
    setViewOnly(readOnly);
  }, [readOnly, open]);

  const initialMoradaKey = initialMoradaLocationId ?? null;
  const initialFactionsKey = useMemo(
    () => (initialFactionIds ?? []).slice().sort().join("|"),
    [initialFactionIds],
  );

  const isDirty = useMemo(() => {
    const init = npc;
    const moradaDirty = moradaLocationId !== initialMoradaKey;
    const factionsDirty = factionIds.slice().sort().join("|") !== initialFactionsKey;

    if (!init) {
      return !!(
        name ||
        description ||
        hp ||
        ac ||
        initiativeMod ||
        cr ||
        notes ||
        avatarUrl ||
        !visibleToPlayers ||
        moradaDirty ||
        factionsDirty
      );
    }
    return (
      name !== (init.name ?? "") ||
      description !== (init.description ?? "") ||
      hp !== (init.stats.hp?.toString() ?? "") ||
      ac !== (init.stats.ac?.toString() ?? "") ||
      initiativeMod !== (init.stats.initiative_mod?.toString() ?? "") ||
      cr !== (init.stats.cr ?? "") ||
      notes !== (init.stats.notes ?? "") ||
      avatarUrl !== (init.avatar_url ?? "") ||
      visibleToPlayers !== (init.is_visible_to_players ?? true) ||
      moradaDirty ||
      factionsDirty
    );
  }, [
    npc,
    name,
    description,
    hp,
    ac,
    initiativeMod,
    cr,
    notes,
    avatarUrl,
    visibleToPlayers,
    moradaLocationId,
    factionIds,
    initialMoradaKey,
    initialFactionsKey,
  ]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }, [isDirty, onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(true);
        return;
      }

      const stats: NpcStats = {};
      if (hp !== "") { const v = parseInt(hp, 10); if (!isNaN(v)) stats.hp = v; }
      if (ac !== "") { const v = parseInt(ac, 10); if (!isNaN(v)) stats.ac = v; }
      if (initiativeMod !== "") { const v = parseInt(initiativeMod, 10); if (!isNaN(v)) stats.initiative_mod = v; }
      if (cr.trim()) stats.cr = cr.trim();
      if (notes.trim()) stats.notes = notes.trim();

      const data: CampaignNpcInsert = {
        campaign_id: campaignId ?? null,
        name: trimmedName,
        description: description.trim() || null,
        stats,
        avatar_url: avatarUrl.trim() || null,
        is_visible_to_players: visibleToPlayers,
      };

      setSaving(true);
      setSaveError(false);
      try {
        await onSave(data, { moradaLocationId, factionIds });
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
      hp,
      ac,
      initiativeMod,
      cr,
      notes,
      avatarUrl,
      visibleToPlayers,
      campaignId,
      moradaLocationId,
      factionIds,
      onSave,
      onOpenChange,
    ],
  );

  const isEdit = !!npc;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit_npc") : t("add_npc")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="npc-form">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="npc-name">{t("name")} *</Label>
            <Input
              id="npc-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(false);
              }}
              placeholder={t("name")}
              data-testid="npc-name-input"
              aria-invalid={nameError}
              disabled={viewOnly}
              readOnly={viewOnly}
            />
            {nameError && (
              <p className="text-xs text-red-400" data-testid="npc-name-error">
                {t("name_required")}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="npc-description">{t("description")}</Label>
            {campaignId ? (
              <EntityMentionEditor
                value={description}
                onChange={setDescription}
                placeholder={t("description")}
                campaignId={campaignId}
                disabled={viewOnly}
                rows={3}
                data-testid="npc-description-input"
              />
            ) : (
              <textarea
                id="npc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description")}
                rows={3}
                className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm disabled:cursor-not-allowed disabled:opacity-70"
                data-testid="npc-description-input"
                disabled={viewOnly}
                readOnly={viewOnly}
              />
            )}
          </div>

          {/* Morada (Fase 3c) — only when the form has location context */}
          {campaignId && availableLocations && availableLocations.length > 0 && (
            <EntityTagSelector
              type="location"
              availableItems={availableLocations.map((l) => ({ id: l.id, name: l.name }))}
              selectedIds={moradaLocationId ? [moradaLocationId] : []}
              onChange={(ids) => setMoradaLocationId(ids[0] ?? null)}
              singleSelect
              label={t("morada_label")}
              helpText={t("morada_placeholder")}
              noneLabel={t("morada_none")}
              testIdPrefix="npc-morada"
              disabled={viewOnly}
            />
          )}

          {/* Facções (Fase 3d) — only when faction context is supplied */}
          {campaignId && availableFactions && availableFactions.length > 0 && (
            <EntityTagSelector
              type="faction"
              availableItems={availableFactions.map((f) => ({ id: f.id, name: f.name }))}
              selectedIds={factionIds}
              onChange={setFactionIds}
              label={t("facoes_label")}
              testIdPrefix="npc-facoes"
              disabled={viewOnly}
            />
          )}

          {/* Stats row */}
          <div className="space-y-1.5">
            <Label>{t("stats")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="npc-hp" className="text-xs text-muted-foreground">
                  {t("hp")}
                </Label>
                <Input
                  id="npc-hp"
                  type="number"
                  min={0}
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  placeholder="0"
                  data-testid="npc-hp-input"
                  disabled={viewOnly}
                  readOnly={viewOnly}
                />
              </div>
              <div>
                <Label htmlFor="npc-ac" className="text-xs text-muted-foreground">
                  {t("ac")}
                </Label>
                <Input
                  id="npc-ac"
                  type="number"
                  min={0}
                  value={ac}
                  onChange={(e) => setAc(e.target.value)}
                  placeholder="0"
                  data-testid="npc-ac-input"
                  disabled={viewOnly}
                  readOnly={viewOnly}
                />
              </div>
              <div>
                <Label htmlFor="npc-init" className="text-xs text-muted-foreground">
                  {t("initiative_mod")}
                </Label>
                <Input
                  id="npc-init"
                  type="number"
                  value={initiativeMod}
                  onChange={(e) => setInitiativeMod(e.target.value)}
                  placeholder="0"
                  data-testid="npc-init-input"
                  disabled={viewOnly}
                  readOnly={viewOnly}
                />
              </div>
              <div>
                <Label htmlFor="npc-cr" className="text-xs text-muted-foreground">
                  {t("cr")}
                </Label>
                <Input
                  id="npc-cr"
                  value={cr}
                  onChange={(e) => setCr(e.target.value)}
                  placeholder="1/4"
                  data-testid="npc-cr-input"
                  disabled={viewOnly}
                  readOnly={viewOnly}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="npc-notes">{t("notes")}</Label>
            <textarea
              id="npc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notes")}
              rows={2}
              className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm disabled:cursor-not-allowed disabled:opacity-70"
              data-testid="npc-notes-input"
              disabled={viewOnly}
              readOnly={viewOnly}
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label htmlFor="npc-avatar">{t("avatar_url")}</Label>
            <Input
              id="npc-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              data-testid="npc-avatar-input"
              disabled={viewOnly}
              readOnly={viewOnly}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="npc-visible" className="cursor-pointer">
              {t("visible_to_players")}
            </Label>
            <button
              id="npc-visible"
              type="button"
              role="switch"
              aria-checked={visibleToPlayers}
              onClick={() => !viewOnly && setVisibleToPlayers((v) => !v)}
              disabled={viewOnly}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
                visibleToPlayers ? "bg-emerald-500" : "bg-muted"
              }`}
              data-testid="npc-visible-toggle"
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
            <p className="text-xs text-red-400" data-testid="npc-save-error">
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
                    data-testid="npc-edit-toggle"
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
                <Button type="submit" variant="gold" disabled={saving} data-testid="npc-submit">
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
              // Reset fields to initial values so stale state doesn't persist
              setName(npc?.name ?? "");
              setDescription(npc?.description ?? "");
              setHp(npc?.stats.hp?.toString() ?? "");
              setAc(npc?.stats.ac?.toString() ?? "");
              setInitiativeMod(npc?.stats.initiative_mod?.toString() ?? "");
              setCr(npc?.stats.cr ?? "");
              setNotes(npc?.stats.notes ?? "");
              setAvatarUrl(npc?.avatar_url ?? "");
              setVisibleToPlayers(npc?.is_visible_to_players ?? true);
              setMoradaLocationId(initialMoradaLocationId ?? null);
              setFactionIds(initialFactionIds ?? []);
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
