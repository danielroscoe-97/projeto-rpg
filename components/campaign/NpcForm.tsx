"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignNpc, CampaignNpcInsert, NpcStats } from "@/lib/types/campaign-npcs";

interface NpcFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  npc?: CampaignNpc | null;
  onSave: (data: CampaignNpcInsert) => Promise<void>;
}

export function NpcForm({ open, onOpenChange, campaignId, npc, onSave }: NpcFormProps) {
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
  const [visibleToPlayers, setVisibleToPlayers] = useState(npc?.is_visible_to_players ?? false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(true);
        return;
      }

      const stats: NpcStats = {};
      if (hp) stats.hp = parseInt(hp, 10);
      if (ac) stats.ac = parseInt(ac, 10);
      if (initiativeMod) stats.initiative_mod = parseInt(initiativeMod, 10);
      if (cr.trim()) stats.cr = cr.trim();
      if (notes.trim()) stats.notes = notes.trim();

      const data: CampaignNpcInsert = {
        campaign_id: campaignId,
        name: trimmedName,
        description: description.trim() || null,
        stats,
        avatar_url: avatarUrl.trim() || null,
        is_visible_to_players: visibleToPlayers,
      };

      setSaving(true);
      try {
        await onSave(data);
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
    },
    [name, description, hp, ac, initiativeMod, cr, notes, avatarUrl, visibleToPlayers, campaignId, onSave, onOpenChange]
  );

  const isEdit = !!npc;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            />
            {nameError && (
              <p className="text-xs text-red-400" data-testid="npc-name-error">
                {t("name")} is required
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="npc-description">{t("description")}</Label>
            <textarea
              id="npc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description")}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm"
              data-testid="npc-description-input"
            />
          </div>

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
              className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm"
              data-testid="npc-notes-input"
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
              onClick={() => setVisibleToPlayers((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={saving} data-testid="npc-submit">
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
