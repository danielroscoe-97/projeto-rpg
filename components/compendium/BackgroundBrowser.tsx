"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { Search, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import { loadBackgroundNamesPt, getNamePt } from "@/lib/srd/translation-loader";

export function BackgroundBrowser() {
  const t = useTranslations("compendium");
  const backgrounds = useSrdStore((s) => s.backgrounds);
  const [nameFilter, setNameFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── PT-BR translation support ──────────────────────────────────────
  const [descLang, setDescLang] = useLocalePreference("pt-BR");
  const [bgNamesPt, setBgNamesPt] = useState<Record<string, string> | null>(null);
  const isPt = descLang === "pt-BR";

  useEffect(() => {
    if (isPt) loadBackgroundNamesPt().then(setBgNamesPt);
  }, [isPt]);

  const filtered = useMemo(() => {
    let result = backgrounds;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(lower) ||
          (bgNamesPt && getNamePt(bgNamesPt, b.id, "").toLowerCase().includes(lower)) ||
          b.skill_proficiencies.some((sp) => sp.toLowerCase().includes(lower))
      );
    }
    const dn = (b: typeof result[number]) => isPt ? getNamePt(bgNamesPt, b.id, b.name) : b.name;
    return [...result].sort((a, b) => dn(a).localeCompare(dn(b)));
  }, [backgrounds, nameFilter, bgNamesPt, isPt]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("backgrounds_search_placeholder")}
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
          aria-label={t("backgrounds_search_placeholder")}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t("backgrounds_count", { count: filtered.length })}
        </p>
        <LanguageToggle locale={descLang} onToggle={setDescLang} size="sm" />
      </div>

      <div className="space-y-2">
        {filtered.map((bg) => (
          <div
            key={bg.id}
            className="border border-white/[0.08] rounded-lg bg-white/[0.02] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === bg.id ? null : bg.id)}
              aria-expanded={expanded === bg.id}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors min-h-[44px]"
            >
              {expanded === bg.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span id={`background-${bg.id}`} className="font-medium text-foreground text-sm">{isPt ? getNamePt(bgNamesPt, bg.id, bg.name) : bg.name}</span>
              {bg.skill_proficiencies.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {bg.skill_proficiencies.join(", ")}
                </span>
              )}
            </button>

            {expanded === bg.id && (
              <div
                className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3"
                role="region"
                aria-labelledby={`background-${bg.id}`}
              >
                {bg.description && (
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {bg.description}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {bg.skill_proficiencies.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        {t("backgrounds_skill_profs")}:{" "}
                      </span>
                      <span className="text-foreground/80">
                        {bg.skill_proficiencies.join(", ")}
                      </span>
                    </div>
                  )}

                  {bg.tool_proficiencies.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        {t("backgrounds_tool_profs")}:{" "}
                      </span>
                      <span className="text-foreground/80">
                        {bg.tool_proficiencies.join(", ")}
                      </span>
                    </div>
                  )}

                  {bg.languages.length > 0 && (
                    <div>
                      <span className="text-muted-foreground font-medium">
                        {t("backgrounds_languages")}:{" "}
                      </span>
                      <span className="text-foreground/80">
                        {bg.languages.join(", ")}
                      </span>
                    </div>
                  )}

                  {bg.equipment && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground font-medium">
                        {t("backgrounds_equipment")}:{" "}
                      </span>
                      <span className="text-foreground/80">{bg.equipment}</span>
                    </div>
                  )}
                </div>

                {bg.feature_name && (
                  <div className="pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span className="text-xs font-semibold text-gold">
                        {t("backgrounds_feature")}: {bg.feature_name}
                      </span>
                    </div>
                    {bg.feature_description && (
                      <p className="text-xs text-foreground/70 leading-relaxed">
                        {bg.feature_description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {backgrounds.length === 0 ? "Loading..." : t("backgrounds_empty")}
          </p>
        )}
      </div>
    </div>
  );
}
