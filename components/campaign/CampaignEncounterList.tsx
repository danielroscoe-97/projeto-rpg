"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, Pencil, Calendar, Swords, Play } from "lucide-react";
import type { EncounterPreset } from "@/lib/types/encounter-preset";
import { deleteEncounterPreset } from "@/lib/supabase/encounter-presets";

interface Props {
  campaignId: string;
  presets: EncounterPreset[];
  onEdit: (preset: EncounterPreset) => void;
  onDeleted: (presetId: string) => void;
}

const DIFF_BADGE: Record<string, string> = {
  trivial: "text-gray-400 bg-gray-500/10 border-gray-700",
  easy: "text-green-400 bg-green-500/10 border-green-700",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-700",
  hard: "text-orange-400 bg-orange-500/10 border-orange-700",
  deadly: "text-red-400 bg-red-500/10 border-red-700",
};

export function CampaignEncounterList({ campaignId, presets, onEdit, onDeleted }: Props) {
  const t = useTranslations("encounter_builder");
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleStartCombat(presetId: string) {
    router.push(`/app/session/new?campaign=${campaignId}&preset=${presetId}`);
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteEncounterPreset(id);
      onDeleted(id);
    } catch {
      setDeleteError(id);
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  }

  if (presets.length === 0) {
    return (
      <div className="text-center py-8">
        <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">{t("no_presets")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {presets.map((preset) => {
        const creatureSummary = preset.creatures
          .map((c) => `${c.quantity}x ${c.name}`)
          .join(", ");

        return (
          <div
            key={preset.id}
            className="rounded-lg border border-white/[0.04] bg-card p-3 space-y-2"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{preset.name}</h3>
                  {preset.difficulty && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${
                        DIFF_BADGE[preset.difficulty] ?? DIFF_BADGE.easy
                      }`}
                    >
                      {t(`diff_${preset.difficulty}`)}
                    </span>
                  )}
                </div>
                {creatureSummary && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{creatureSummary}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartCombat(preset.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                  title={t("start_combat")}
                >
                  <Play className="w-3 h-3" />
                  {t("start_combat")}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(preset)}
                  className="p-1.5 rounded hover:bg-gray-800 transition-colors text-muted-foreground hover:text-foreground"
                  title={t("edit")}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {deletingId === preset.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(preset.id)}
                      disabled={deleteLoading}
                      className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {t("confirm_delete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(preset.id)}
                    className="p-1.5 rounded hover:bg-gray-800 transition-colors text-muted-foreground hover:text-red-400"
                    title={t("delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {preset.selected_members.length > 0 && (
                <span>
                  {preset.selected_members.length} {t("players")}
                </span>
              )}
              {preset.used_count > 0 && (
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3" />
                  {preset.used_count}x {t("used")}
                </span>
              )}
              {preset.used_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(preset.used_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Notes */}
            {preset.notes && (
              <p className="text-xs text-muted-foreground italic truncate">{preset.notes}</p>
            )}
            {/* Delete error */}
            {deleteError === preset.id && (
              <p className="text-xs text-red-400">{t("error_delete")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
