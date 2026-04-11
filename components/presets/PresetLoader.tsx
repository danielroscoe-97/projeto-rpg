"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { Package } from "lucide-react";
import { fetchPresets } from "@/lib/supabase/presets";
import type { PresetRow } from "@/lib/supabase/presets";
import type { MonsterPresetEntry } from "@/lib/types/database";

interface PresetLoaderProps {
  onLoad: (monsters: MonsterPresetEntry[]) => void;
}

export function PresetLoader({ onLoad }: PresetLoaderProps) {
  const t = useTranslations("presets");
  const [isOpen, setIsOpen] = useState(false);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const loadPresets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPresets();
      setPresets(data);
      hasFetched.current = true;
    } catch {
      setError(t("error_load"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen && !hasFetched.current && !isLoading) {
      loadPresets();
    }
  }, [isOpen, isLoading, loadPresets]);

  const handleSelect = (preset: PresetRow) => {
    trackEvent("preset:loaded", { preset_id: preset.id });
    onLoad(preset.monsters);
    setIsOpen(false);
  };

  const totalMonsters = (monsters: MonsterPresetEntry[]) =>
    monsters.reduce((sum, m) => sum + m.quantity, 0);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground bg-white/[0.06] border border-border rounded-lg hover:bg-white/10 transition-colors min-h-[40px]"
      >
        <Package className="w-4 h-4" />
        {t("load_preset")}
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{t("load_preset_title")}</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("cancel")}
        </button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground py-4 text-center">{t("loading_presets")}</p>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}

      {!isLoading && presets.length === 0 && !error && (
        <div className="text-center py-12">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm mb-4">{t("no_presets")}</p>
        </div>
      )}

      {!isLoading && presets.length > 0 && (
        <ul className="space-y-2 max-h-[240px] overflow-y-auto">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => handleSelect(preset)}
                className="w-full text-left bg-white/[0.03] border border-border rounded-md px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{preset.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {totalMonsters(preset.monsters)} {t("creatures_label")} · {preset.ruleset_version}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {preset.monsters.map((m) => m.quantity > 1 ? `${m.quantity}x ${m.name}` : m.name).join(", ")}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
