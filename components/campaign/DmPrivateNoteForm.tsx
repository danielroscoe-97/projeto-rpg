"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createDmPrivateNote } from "@/lib/supabase/player-notes-visibility";
import { captureError } from "@/lib/errors/capture";

/**
 * DM creates a private note addressed to a specific player character
 * (Wave 4 / migration 149 — spec §4.3).
 *
 * Visibility is forced server-side (and here) to `dm_private_to_player` and
 * `target_character_id` is required (CHECK constraint at DB + client guard).
 *
 * Writes go to `campaign_notes` (author = DM via `user_id = auth.uid()`),
 * never to `player_journal_entries` (those are authored by the player).
 */

export interface PlayerTarget {
  character_id: string;
  name: string;
}

interface DmPrivateNoteFormProps {
  campaignId: string;
  dmUserId: string;
  players: PlayerTarget[];
  /** Pre-select this character when opening (e.g. opened from a player row). */
  defaultTargetCharacterId?: string;
  /** Called after a successful save so the parent list can refetch. */
  onSaved?: () => void;
  /** Called when the DM cancels — parent may close the form. */
  onCancel?: () => void;
}

export function DmPrivateNoteForm({
  campaignId,
  dmUserId,
  players,
  defaultTargetCharacterId,
  onSaved,
  onCancel,
}: DmPrivateNoteFormProps) {
  const t = useTranslations("campaign.players");
  const tCommon = useTranslations("common");

  const [targetCharacterId, setTargetCharacterId] = useState<string>(
    defaultTargetCharacterId ?? players[0]?.character_id ?? "",
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [targetError, setTargetError] = useState(false);
  const [contentError, setContentError] = useState(false);

  // Keep the selected target valid if the players list changes
  useEffect(() => {
    if (!targetCharacterId) return;
    const stillValid = players.some((p) => p.character_id === targetCharacterId);
    if (!stillValid) {
      setTargetCharacterId(players[0]?.character_id ?? "");
    }
  }, [players, targetCharacterId]);

  const targetName =
    players.find((p) => p.character_id === targetCharacterId)?.name ?? "";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      const hasTarget = targetCharacterId.trim().length > 0;
      const hasContent = trimmedContent.length > 0;

      setTargetError(!hasTarget);
      setContentError(!hasContent);

      if (!hasTarget || !hasContent) return;

      setSaving(true);
      try {
        await createDmPrivateNote({
          campaignId,
          dmUserId,
          targetCharacterId,
          title: trimmedTitle,
          content: trimmedContent,
        });
        toast.success(t("dm_private_note_saved", { playerName: targetName }));
        setTitle("");
        setContent("");
        onSaved?.();
      } catch (err) {
        captureError(err, {
          component: "DmPrivateNoteForm",
          action: "create",
          category: "network",
        });
        toast.error(tCommon("error_generic"));
      } finally {
        setSaving(false);
      }
    },
    [
      title,
      content,
      targetCharacterId,
      targetName,
      campaignId,
      dmUserId,
      onSaved,
      t,
      tCommon,
    ],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-amber-400/20 bg-amber-400/[0.03] p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-foreground">
          {targetName
            ? t("dm_private_note_cta", { playerName: targetName })
            : t("dm_private_note_title")}
        </h3>
      </div>

      {/* Target player dropdown */}
      <div className="space-y-1">
        <Label
          htmlFor="dm-private-note-target"
          className="text-xs text-muted-foreground"
        >
          {t("dm_private_note_target_label")}
        </Label>
        <select
          id="dm-private-note-target"
          value={targetCharacterId}
          onChange={(e) => {
            setTargetCharacterId(e.target.value);
            setTargetError(false);
          }}
          disabled={saving || players.length === 0}
          required
          className={`w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${
            targetError ? "border-red-500" : "border-input"
          }`}
        >
          {players.length === 0 ? (
            <option value="">{t("dm_private_note_no_players")}</option>
          ) : (
            players.map((p) => (
              <option key={p.character_id} value={p.character_id}>
                {p.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label
          htmlFor="dm-private-note-title"
          className="text-xs text-muted-foreground"
        >
          {t("dm_private_note_title_label")}
        </Label>
        <Input
          id="dm-private-note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={saving}
          placeholder={t("dm_private_note_title_placeholder")}
        />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <Label
          htmlFor="dm-private-note-content"
          className="text-xs text-muted-foreground"
        >
          {t("dm_private_note_content_label")}
        </Label>
        <textarea
          id="dm-private-note-content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (contentError && e.target.value.trim().length > 0) {
              setContentError(false);
            }
          }}
          maxLength={4000}
          rows={5}
          disabled={saving}
          placeholder={t("dm_private_note_content_placeholder")}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-y ${
            contentError ? "border-red-500" : "border-input"
          }`}
          required
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="w-3.5 h-3.5" />
            {t("dm_private_note_cancel")}
          </Button>
        )}
        <Button
          type="submit"
          variant="gold"
          size="sm"
          disabled={saving || players.length === 0}
        >
          <Send className="w-3.5 h-3.5" />
          {saving ? tCommon("saving") : t("dm_private_note_save")}
        </Button>
      </div>
    </form>
  );
}
