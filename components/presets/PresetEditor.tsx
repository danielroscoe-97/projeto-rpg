"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonsterSearchPanel } from "@/components/combat/MonsterSearchPanel";
import { RulesetSelector } from "@/components/combat-session/RulesetSelector";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { RulesetVersion, MonsterPresetEntry } from "@/lib/types/database";
import type { PresetRow } from "@/lib/supabase/presets";

interface PresetEditorProps {
  preset?: PresetRow;
  onSave: (name: string, monsters: MonsterPresetEntry[], rulesetVersion: string) => Promise<void>;
  onCancel: () => void;
}

export function PresetEditor({ preset, onSave, onCancel }: PresetEditorProps) {
  const t = useTranslations("presets");
  const [name, setName] = useState(preset?.name ?? "");
  const [monsters, setMonsters] = useState<MonsterPresetEntry[]>(preset?.monsters ?? []);
  const [rulesetVersion, setRulesetVersion] = useState<RulesetVersion>(
    (preset?.ruleset_version as RulesetVersion) ?? "2014"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMonster = useCallback((monster: SrdMonster) => {
    setMonsters((prev) => {
      const existing = prev.find((m) => m.monster_id === monster.id);
      if (existing) {
        return prev.map((m) =>
          m.monster_id === monster.id ? { ...m, quantity: m.quantity + 1 } : m
        );
      }
      return [
        ...prev,
        {
          monster_id: monster.id,
          name: monster.name,
          quantity: 1,
          hp: monster.hit_points,
          ac: monster.armor_class,
        },
      ];
    });
  }, []);

  const handleRemoveMonster = useCallback((index: number) => {
    setMonsters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleQuantityChange = useCallback((index: number, qty: number) => {
    if (qty < 1) return;
    setMonsters((prev) => prev.map((m, i) => (i === index ? { ...m, quantity: qty } : m)));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("error_name_required"));
      return;
    }
    if (monsters.length === 0) {
      setError(t("error_no_monsters"));
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(name.trim(), monsters, rulesetVersion);
    } catch {
      setError(t("error_save"));
    } finally {
      setIsSaving(false);
    }
  };

  const totalCreatures = monsters.reduce((sum, m) => sum + m.quantity, 0);

  const inputClass =
    "bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring min-h-[40px]";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Back button */}
      <Button
        variant="link"
        size="sm"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground p-0 h-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back_to_list")}
      </Button>

      <h2 className="text-xl font-semibold text-foreground">
        {preset ? t("edit_title") : t("create_title")}
      </h2>

      {/* Name + Ruleset */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1">{t("name_label")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("name_placeholder")}
            maxLength={100}
            className={`${inputClass} w-full`}
          />
        </div>
        <RulesetSelector value={rulesetVersion} onChange={setRulesetVersion} />
      </div>

      {/* Monster Search */}
      <MonsterSearchPanel
        rulesetVersion={rulesetVersion}
        onRulesetChange={setRulesetVersion}
        keepOpenAfterAdd
        onSelectMonster={handleSelectMonster}
      />

      {/* Selected monsters table */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">
          {t("selected_monsters")} ({totalCreatures})
        </h3>

        {monsters.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground/60 text-sm border border-dashed border-border rounded-lg">
            {t("no_monsters_hint")}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Column headers */}
            <div className="flex items-center gap-2 px-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              <span className="flex-1">{t("col_name")}</span>
              <span className="w-16 text-center">{t("col_qty")}</span>
              <span className="w-14 text-center">HP</span>
              <span className="w-14 text-center">AC</span>
              <span className="w-8" />
            </div>

            {monsters.map((m, index) => (
              <div
                key={`${m.monster_id}-${index}`}
                className="flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5"
              >
                <span className="flex-1 text-sm text-foreground truncate">{m.name}</span>
                <input
                  type="number"
                  value={m.quantity}
                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10) || 1)}
                  min={1}
                  max={20}
                  className="w-16 text-center bg-transparent border border-border rounded px-1 py-1 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="w-14 text-center text-xs text-muted-foreground font-mono">{m.hp}</span>
                <span className="w-14 text-center text-xs text-muted-foreground font-mono">{m.ac}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMonster(index)}
                  className="w-8 h-8 text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm" role="alert">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground min-h-[40px]"
        >
          {t("cancel")}
        </Button>
        <Button
          variant="gold"
          onClick={handleSubmit}
          disabled={isSaving}
          className="min-h-[44px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              {t("saving")}
            </>
          ) : (
            preset ? t("save_changes") : t("create_preset_btn")
          )}
        </Button>
      </div>
    </div>
  );
}
