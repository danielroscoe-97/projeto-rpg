"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CompendiumSearchInput } from "@/components/public/shared/CompendiumSearchInput";
import { CollapseSection } from "@/components/public/shared/CollapseSection";

/* ── Types ── */

interface BackgroundEntry {
  id: string;
  name: string;
  skill_proficiencies: string[];
  tool_proficiencies: string[];
  languages: string[];
  feature_name: string | null;
  source: string;
  ruleset_version: string;
}

type Locale = "en" | "pt-BR";

/* ── Labels ── */

const LABELS = {
  en: {
    search: "Search backgrounds by name or skill...",
    filters: "Filters",
    backgrounds: "backgrounds",
    all: "All",
    noResults: "No backgrounds match your filters",
    clearFilters: "Clear all filters",
    skills: "Skills",
    tools: "Tools",
    languages: "Languages",
    feature: "Feature",
    version2014: "2014",
    version2024: "2024",
    versionLabel: "Version:",
  },
  "pt-BR": {
    search: "Buscar antecedentes por nome ou perícia...",
    filters: "Filtros",
    backgrounds: "antecedentes",
    all: "Todos",
    noResults: "Nenhum antecedente corresponde aos filtros",
    clearFilters: "Limpar todos os filtros",
    skills: "Perícias",
    tools: "Ferramentas",
    languages: "Idiomas",
    feature: "Característica",
    version2014: "2014",
    version2024: "2024",
    versionLabel: "Versão:",
  },
};

/* ── Component ── */

export function PublicBackgroundGrid({
  backgrounds,
  locale = "en",
}: {
  backgrounds: BackgroundEntry[];
  locale?: Locale;
}) {
  const l = LABELS[locale];

  const [query, setQuery] = useState("");
  const [versionFilter, setVersionFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = backgrounds;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.skill_proficiencies.some((s) => s.toLowerCase().includes(q))
      );
    }
    if (versionFilter) result = result.filter((b) => b.ruleset_version === versionFilter);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [backgrounds, query, versionFilter]);

  const activeFilterCount = versionFilter ? 1 : 0;
  const detailBase = locale === "pt-BR" ? "/antecedentes" : "/backgrounds";

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
                {l.versionLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[null, "2014", "2024"].map((v) => {
                  const label = v === null ? l.all : v;
                  return (
                    <button
                      key={v ?? "all"}
                      type="button"
                      aria-pressed={versionFilter === v}
                      onClick={() => setVersionFilter(v)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        versionFilter === v
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
            {filtered.length} {l.backgrounds}
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
              setVersionFilter(null);
            }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            {l.clearFilters}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((bg) => (
            <Link
              key={bg.id}
              href={`${detailBase}/${bg.id}`}
              className="group rounded-xl bg-card/80 border border-white/[0.06] p-4 hover:border-gold/20 hover:bg-gold/[0.03] transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-foreground font-[family-name:var(--font-cinzel)] text-sm group-hover:text-gold transition-colors">
                  {bg.name}
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400 shrink-0">
                  {bg.source} {bg.ruleset_version}
                </span>
              </div>

              {/* Skills */}
              {bg.skill_proficiencies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {bg.skill_proficiencies.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-medium bg-blue-900/30 text-blue-400 rounded px-1.5 py-0.5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Feature name */}
              {bg.feature_name && (
                <p className="text-xs text-gray-400">
                  <span className="text-gray-500">{l.feature}:</span> {bg.feature_name}
                </p>
              )}

              {/* Tool + Language hints */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {bg.tool_proficiencies.length > 0 && (
                  <span className="text-[9px] text-gray-500">
                    {l.tools}: {bg.tool_proficiencies.join(", ")}
                  </span>
                )}
                {bg.languages.length > 0 && (
                  <span className="text-[9px] text-gray-500">
                    {l.languages}: {bg.languages.join(", ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
