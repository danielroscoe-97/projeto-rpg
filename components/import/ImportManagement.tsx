"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useExtendedCompendium } from "@/lib/hooks/use-extended-compendium";
import {
  getImportedSources,
  clearImportedBySource,
  clearAllImported,
  type ImportedSourceInfo,
} from "@/lib/import/import-cache";
import { toast } from "sonner";

export function ImportManagement() {
  const t = useTranslations("import");
  const tCommon = useTranslations("common");
  const { isActive, activate, deactivate } = useExtendedCompendium();
  const [sources, setSources] = useState<ImportedSourceInfo[]>([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const loadSources = useCallback(async () => {
    const s = await getImportedSources();
    setSources(s);
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleRemoveSource = async (label: string) => {
    await clearImportedBySource(label);
    await loadSources();
    toast.success(tCommon("done"));
  };

  const handleClearAll = async () => {
    await clearAllImported();
    setSources([]);
    setConfirmClearAll(false);
    toast.success(tCommon("done"));
  };

  return (
    <section className="bg-card rounded-lg border border-border p-5">
      <h2 className="text-foreground font-semibold mb-1">{t("management_title")}</h2>

      {/* Toggle */}
      <div className="flex items-center justify-between mt-4 mb-4">
        <span className="text-sm text-foreground/80">{t("management_toggle_label")}</span>
        <button
          type="button"
          onClick={isActive ? deactivate : activate}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isActive ? "bg-gold" : "bg-white/[0.12]"
          }`}
          role="switch"
          aria-checked={isActive}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Imported sources list */}
      {sources.length === 0 ? (
        <p className="text-xs text-muted-foreground/50 py-2">
          {t("management_no_imports")}
        </p>
      ) : (
        <div className="space-y-2">
          {sources.map((src) => (
            <div
              key={src.label}
              className="flex items-center justify-between bg-white/[0.03] rounded-md px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{src.label}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  {t("management_monsters", { count: src.count })}
                  {" · "}
                  {t("management_imported_at", {
                    date: new Date(src.date).toLocaleDateString(),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSource(src.label)}
                className="text-xs text-muted-foreground/50 hover:text-red-400 transition-colors ml-2 shrink-0"
              >
                {t("management_remove")}
              </button>
            </div>
          ))}

          {/* Clear all */}
          <div className="pt-2 border-t border-white/[0.04]">
            {confirmClearAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70">
                  {t("management_clear_confirm")}
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {tCommon("confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="text-xs text-muted-foreground/50 hover:text-red-400 transition-colors"
              >
                {t("management_clear_all")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
