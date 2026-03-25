"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Pencil, Copy } from "lucide-react";
import { PresetEditor } from "@/components/presets/PresetEditor";
import { createPreset, updatePreset, deletePreset } from "@/lib/supabase/presets";
import type { PresetRow } from "@/lib/supabase/presets";
import type { MonsterPresetEntry } from "@/lib/types/database";

interface PresetsManagerProps {
  initialPresets: PresetRow[];
  userId: string;
}

export function PresetsManager({ initialPresets, userId }: PresetsManagerProps) {
  const t = useTranslations("presets");
  const [presets, setPresets] = useState<PresetRow[]>(initialPresets);
  const [editingPreset, setEditingPreset] = useState<PresetRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async (name: string, monsters: MonsterPresetEntry[], rulesetVersion: string) => {
    try {
      setError(null);
      const preset = await createPreset(userId, name, monsters, rulesetVersion);
      setPresets((prev) => [preset, ...prev]);
      setIsCreating(false);
    } catch {
      setError(t("error_create"));
    }
  }, [userId, t]);

  const handleUpdate = useCallback(async (presetId: string, name: string, monsters: MonsterPresetEntry[], rulesetVersion: string) => {
    try {
      setError(null);
      const updated = await updatePreset(presetId, { name, monsters, ruleset_version: rulesetVersion });
      setPresets((prev) => prev.map((p) => (p.id === presetId ? updated : p)));
      setEditingPreset(null);
    } catch {
      setError(t("error_update"));
    }
  }, [t]);

  const handleDelete = useCallback(async (presetId: string) => {
    try {
      setError(null);
      await deletePreset(presetId);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
      setDeleteConfirmId(null);
    } catch {
      setError(t("error_delete"));
    }
  }, [t]);

  const handleDuplicate = useCallback(async (preset: PresetRow) => {
    try {
      setError(null);
      const duplicated = await createPreset(
        userId,
        `${preset.name} (${t("copy_suffix")})`,
        preset.monsters,
        preset.ruleset_version
      );
      setPresets((prev) => [duplicated, ...prev]);
    } catch {
      setError(t("error_create"));
    }
  }, [userId, t]);

  // Show editor for creating or editing
  if (isCreating) {
    return (
      <PresetEditor
        onSave={(name, monsters, version) => handleCreate(name, monsters, version)}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  if (editingPreset) {
    return (
      <PresetEditor
        preset={editingPreset}
        onSave={(name, monsters, version) => handleUpdate(editingPreset.id, name, monsters, version)}
        onCancel={() => setEditingPreset(null)}
      />
    );
  }

  const totalMonsters = (monsters: MonsterPresetEntry[]) =>
    monsters.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Create button */}
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        className="inline-flex items-center gap-2 bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm shadow-card hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        {t("new_preset")}
      </button>

      {error && (
        <p className="text-red-400 text-sm" role="alert">{error}</p>
      )}

      {/* Preset cards */}
      {presets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3 transition-colors hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-foreground font-medium text-sm truncate">{preset.name}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {totalMonsters(preset.monsters)} {t("creatures_label")} · {preset.ruleset_version}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingPreset(preset)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                    title={t("edit")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(preset)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                    title={t("duplicate")}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(preset.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded"
                    title={t("delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Monster list preview */}
              <ul className="space-y-1">
                {preset.monsters.slice(0, 5).map((m, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80 truncate">
                      {m.quantity > 1 ? `${m.quantity}x ` : ""}{m.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      HP {m.hp} · AC {m.ac}
                    </span>
                  </li>
                ))}
                {preset.monsters.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    +{preset.monsters.length - 5} {t("more")}
                  </li>
                )}
              </ul>

              {/* Delete confirmation */}
              {deleteConfirmId === preset.id && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-red-400 flex-1">{t("delete_confirm")}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset.id)}
                    className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                  >
                    {t("delete_yes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2.5 py-1 text-xs font-medium bg-white/10 text-foreground rounded hover:bg-white/15 transition-colors"
                  >
                    {t("delete_no")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
