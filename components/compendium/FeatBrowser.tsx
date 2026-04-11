"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { Search, Pin, ChevronDown, ChevronRight } from "lucide-react";
import { LinkedText } from "@/components/oracle/LinkedText";

type PrereqFilter = "all" | "has_prereq" | "no_prereq";

export function FeatBrowser() {
  const t = useTranslations("compendium");
  const feats = useSrdStore((s) => s.feats);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [nameFilter, setNameFilter] = useState("");
  const [prereqFilter, setPrereqFilter] = useState<PrereqFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = feats;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }
    if (prereqFilter === "has_prereq") {
      result = result.filter((f) => f.prerequisite != null);
    } else if (prereqFilter === "no_prereq") {
      result = result.filter((f) => f.prerequisite == null);
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [feats, nameFilter, prereqFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("feats_search_placeholder")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
            aria-label={t("feats_search_placeholder")}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04]">
          {(["all", "has_prereq", "no_prereq"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPrereqFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                prereqFilter === key
                  ? "bg-white/[0.1] text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t(`feats_filter_${key}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("feats_count", { count: filtered.length })}
      </p>

      <div className="space-y-2">
        {filtered.map((feat) => (
          <div
            key={feat.id}
            className="border border-white/[0.08] rounded-lg bg-white/[0.02] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpanded(expanded === feat.id ? null : feat.id)}
              aria-expanded={expanded === feat.id}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              {expanded === feat.id ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium text-foreground text-sm">{feat.name}</span>
              {feat.prerequisite && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  {t("feats_prerequisite")}
                </span>
              )}
            </button>

            {expanded === feat.id && (
              <div
                className="px-4 pb-4 pt-1 border-t border-white/[0.06]"
                role="region"
                aria-labelledby={`feat-${feat.id}`}
              >
                {feat.prerequisite && (
                  <p className="text-xs text-amber-400 mb-2 font-medium">
                    {t("feats_prerequisite")}: {feat.prerequisite}
                  </p>
                )}
                <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                  <LinkedText text={feat.description} rulesetVersion="2014" />
                </div>
                <button
                  type="button"
                  onClick={() => pinCard("feat", feat.id, "2014")}
                  className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors"
                  aria-label={`${t("feats_pin")} ${feat.name}`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  {t("feats_pin")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
