"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { SrdClass } from "@/lib/types/srd-class";
import { SrdClassIcon } from "./SrdIcons";

// ── Role colors ──────────────────────────────────────────────────
const ROLE_STYLES: Record<SrdClass["role"], { border: string; badge: string; label: string; labelPt: string }> = {
  martial:     { border: "border-red-900/40",    badge: "bg-red-900/30 text-red-300 border-red-500/30",       label: "Martial",     labelPt: "Marcial" },
  caster:      { border: "border-blue-900/40",   badge: "bg-blue-900/30 text-blue-300 border-blue-500/30",    label: "Full Caster", labelPt: "Conjurador" },
  "half-caster": { border: "border-purple-900/40", badge: "bg-purple-900/30 text-purple-300 border-purple-500/30", label: "Half-Caster", labelPt: "Semi-Conjurador" },
  support:     { border: "border-green-900/40",  badge: "bg-green-900/30 text-green-300 border-green-500/30", label: "Support",     labelPt: "Suporte" },
};

type RoleFilter = "all" | SrdClass["role"];

const LABELS = {
  en: {
    title: "D&D 5e Classes",
    subtitle: "All 12 SRD classes with hit dice, proficiencies, and subclasses",
    searchPlaceholder: "Search by class name...",
    filters: "Filters",
    all: "All",
    martial: "Martial",
    caster: "Caster",
    halfCaster: "Half-Caster",
    support: "Support",
    roleLabel: "Role:",
    hitDie: "Hit Die",
    primaryAbility: "Primary",
    savingThrows: "Saves",
    srdSubclass: "SRD Subclass",
    spellcasting: "Spellcasting",
    viewDetails: "View details",
    classes: "classes",
    of: "of",
    noResults: "No classes match your filters.",
    clearAll: "Clear all filters",
  },
  "pt-BR": {
    title: "Classes D&D 5e",
    subtitle: "Todas as 12 classes SRD com dados de vida, proficiências e subclasses",
    searchPlaceholder: "Buscar por nome da classe...",
    filters: "Filtros",
    all: "Todas",
    martial: "Marcial",
    caster: "Conjurador",
    halfCaster: "Semi-Conjurador",
    support: "Suporte",
    roleLabel: "Papel:",
    hitDie: "Dado de Vida",
    primaryAbility: "Primário",
    savingThrows: "Salvaguardas",
    srdSubclass: "Subclasse SRD",
    spellcasting: "Conjuração",
    viewDetails: "Ver detalhes",
    classes: "classes",
    of: "de",
    noResults: "Nenhuma classe corresponde aos filtros.",
    clearAll: "Limpar todos os filtros",
  },
} as const;

interface PublicClassesIndexProps {
  classes: SrdClass[];
  locale?: "en" | "pt-BR";
  linkPrefix?: string;
}

export function PublicClassesIndex({ classes, locale = "en", linkPrefix = "/classes" }: PublicClassesIndexProps) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  const [descLang, setDescLang] = useState<"en" | "pt-BR">(locale);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filtersHeight, setFiltersHeight] = useState(0);

  const isPt = descLang === "pt-BR";
  const L = LABELS[descLang];

  useEffect(() => {
    if (filtersRef.current) {
      setFiltersHeight(filtersRef.current.scrollHeight);
    }
  }, [filtersOpen]);

  const filtered = useMemo(() => {
    let result = classes;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.name_pt.toLowerCase().includes(q)
      );
    }

    if (filter !== "all") {
      result = result.filter((c) => c.role === filter);
    }

    return result;
  }, [classes, query, filter]);

  const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "martial", label: L.martial },
    { key: "caster", label: L.caster },
    { key: "half-caster", label: L.halfCaster },
    { key: "support", label: L.support },
  ];

  const hasFilters = !!(query || filter !== "all");
  const activeFilterCount = filter !== "all" ? 1 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 text-lg mt-1">{L.subtitle}</p>
      </div>

      {/* Search + filter container */}
      <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 space-y-3">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L.searchPlaceholder}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-[#D4A853]/40 transition-colors"
          />
        </div>

        {/* Filter toggle */}
        <button
          type="button"
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
          {L.filters}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4A853] text-gray-950 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Collapsible role chips */}
        <div
          ref={filtersRef}
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ maxHeight: filtersOpen ? filtersHeight : 0, opacity: filtersOpen ? 1 : 0 }}
        >
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-medium mr-1">{L.roleLabel}</span>
              {roleFilters.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === key
                      ? "bg-[#D4A853] text-gray-950 shadow-sm"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count + language toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {hasFilters
              ? `${filtered.length} ${L.of} ${classes.length} ${L.classes}`
              : `${classes.length} ${L.classes}`}
          </span>
          <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => setDescLang("en")}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${descLang === "en" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setDescLang("pt-BR")}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${descLang === "pt-BR" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
            >
              PT
            </button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cls) => {
          const roleStyle = ROLE_STYLES[cls.role];
          const displayName = isPt ? cls.name_pt : cls.name;
          const description = isPt ? cls.description_pt : cls.description_en;
          const subclass = isPt ? cls.srd_subclass_pt : cls.srd_subclass;
          const roleLabel = isPt ? roleStyle.labelPt : roleStyle.label;

          return (
            <Link
              key={cls.id}
              href={`${linkPrefix}/${cls.id}`}
              className={`group block rounded-xl border ${roleStyle.border} bg-card hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)] transition-all p-5`}
            >
              {/* Icon + Name row */}
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 text-[#D4A853]" aria-hidden="true">
                  <SrdClassIcon iconName={cls.icon} className="w-8 h-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-gray-100 font-[family-name:var(--font-cinzel)] text-lg leading-tight">
                    {displayName}
                  </h2>
                  {isPt && (
                    <p className="text-xs text-gray-500 italic">{cls.name}</p>
                  )}
                  {!isPt && cls.name_pt && cls.name_pt.toLowerCase() !== cls.name.toLowerCase() && (
                    <p className="text-xs text-gray-500 italic">{cls.name_pt}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{description}</p>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Hit Die badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-xs font-mono text-[#D4A853]">
                  {cls.hit_die}
                </span>

                {/* Primary ability */}
                <span className="text-xs text-gray-500">
                  {L.primaryAbility}: <span className="text-gray-300">{cls.primary_ability}</span>
                </span>

                {/* Saving throws */}
                <span className="text-xs text-gray-500">
                  {L.savingThrows}: <span className="text-gray-300">{cls.saving_throws.join("/")}</span>
                </span>
              </div>

              {/* Bottom row: role badge + subclass + spellcasting */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleStyle.badge}`}>
                  {roleLabel}
                </span>
                <span className="text-xs text-gray-500 truncate" title={subclass}>
                  {subclass}
                </span>
                {cls.spellcaster && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-900/30 border border-indigo-500/20 text-[10px] text-indigo-300">
                    {L.spellcasting}: {cls.spellcasting_ability}
                  </span>
                )}
              </div>

              {/* Hover hint */}
              <p className="text-xs text-[#D4A853] mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {L.viewDetails} &rarr;
              </p>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && hasFilters && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">{L.noResults}</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setFilter("all"); }}
            className="mt-3 text-[#D4A853] text-sm hover:underline"
          >
            {L.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
