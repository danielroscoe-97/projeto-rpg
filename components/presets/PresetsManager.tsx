"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Pencil, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="gold"
        onClick={() => setIsCreating(true)}
        className="min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        {t("new_preset")}
      </Button>

      {error && (
        <p className="text-red-400 text-sm" role="alert">{error}</p>
      )}

      {/* Preset cards */}
      {presets.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm mb-4">{t("empty")}</p>
          <Button variant="gold" size="sm" onClick={() => setIsCreating(true)}>
            {t("new_preset")}
          </Button>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPreset(preset)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title={t("edit")}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(preset)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title={t("duplicate")}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(preset.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-red-400"
                    title={t("delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(preset.id)}
                  >
                    {t("delete_yes")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    {t("delete_no")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
