"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CompendiumSearchInput } from "@/components/public/shared/CompendiumSearchInput";
import { CollapseSection } from "@/components/public/shared/CollapseSection";

/* ── Types ── */

interface FeatEntry {
  id: string;
  name: string;
  description: string;
  prerequisite: string | null;
  source: string;
  ruleset_version: string;
}

type Locale = "en" | "pt-BR";
type PrereqFilter = "all" | "has_prereq" | "no_prereq";

/* ── Labels ── */

const LABELS = {
  en: {
    search: "Search feats by name...",
    filters: "Filters",
    feats: "feats",
    all: "All",
    hasPrereq: "Has Prerequisite",
    noPrereq: "No Prerequisite",
    prereq: "Prerequisite",
    noResults: "No feats match your filters",
    clearFilters: "Clear all filters",
    source: "Source",
    version: "Version",
    viewDetails: "View details",
    indexHref: "/feats",
  },
  "pt-BR": {
    search: "Buscar talentos pelo nome...",
    filters: "Filtros",
    feats: "talentos",
    all: "Todos",
    hasPrereq: "Com Pré-requisito",
    noPrereq: "Sem Pré-requisito",
    prereq: "Pré-requisito",
    noResults: "Nenhum talento corresponde aos filtros",
    clearFilters: "Limpar todos os filtros",
    source: "Fonte",
    version: "Versão",
    viewDetails: "Ver detalhes",
    indexHref: "/talentos",
  },
};

/* ── Component ── */

export function PublicFeatGrid({
  feats,
  locale = "en",
}: {
  feats: FeatEntry[];
  locale?: Locale;
}) {
  const l = LABELS[locale];

  const [query, setQuery] = useState("");
  const [prereqFilter, setPrereqFilter] = useState<PrereqFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = feats;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (prereqFilter === "has_prereq") result = result.filter((f) => f.prerequisite);
    else if (prereqFilter === "no_prereq") result = result.filter((f) => !f.prerequisite);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [feats, query, prereqFilter]);

  const activeFilterCount = prereqFilter !== "all" ? 1 : 0;
  const detailBase = locale === "pt-BR" ? "/talentos" : "/feats";

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-4 mb-6 space-y-3">
        <CompendiumSearchInput
          value={query}
          onChange={setQuery}
          placeholder={l.search}
        />

        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          {l.filters}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-gray-950 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <CollapseSection open={filtersOpen}>
          <div className="space-y-3 pt-1">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">
                {l.prereq}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "has_prereq", "no_prereq"] as const).map((opt) => {
                  const label =
                    opt === "all" ? l.all : opt === "has_prereq" ? l.hasPrereq : l.noPrereq;
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={prereqFilter === opt}
                      onClick={() => setPrereqFilter(opt)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        prereqFilter === opt
                          ? "bg-gold text-gray-950"
                          : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapseSection>

        {/* Count */}
        <div className="flex items-center">
          <span className="text-xs text-gray-400" role="status" aria-live="polite">
            {filtered.length} {l.feats}
          </span>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-lg">{l.noResults}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPrereqFilter("all");
            }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            {l.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((feat) => (
            <Link
              key={feat.id}
              href={`${detailBase}/${feat.id}`}
              className="group rounded-xl bg-card/80 border border-white/[0.06] p-4 hover:border-gold/20 hover:bg-gold/[0.03] transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-foreground font-[family-name:var(--font-cinzel)] text-sm group-hover:text-gold transition-colors">
                  {feat.name}
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 shrink-0">
                  {feat.source} {feat.ruleset_version}
                </span>
              </div>

              {feat.prerequisite && (
                <div className="mb-2">
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-900/30 rounded px-1.5 py-0.5">
                    {l.prereq}: {feat.prerequisite}
                  </span>
                </div>
              )}

              <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                {feat.description.slice(0, 150)}
                {feat.description.length > 150 ? "…" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
