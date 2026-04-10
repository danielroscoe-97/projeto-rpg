"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SrdInitialCircle, SrdIconRuler, SrdIconBoot } from "./SrdIcons";
import { LanguageToggle } from "@/components/public/shared/LanguageToggle";
import { FilterChips } from "@/components/public/shared/FilterChips";
import { CompendiumSearchInput } from "@/components/public/shared/CompendiumSearchInput";
import { CollapseSection } from "@/components/public/shared/CollapseSection";

// ── Types ─────────────────────────────────────────────────────────
interface RaceSummary {
  slug: string;
  nameEn: string;
  namePt: string;
  icon: string;
  abilityBonuses: { ability: string; bonus: string }[];
  size: "Small" | "Medium";
  speed: number;
  keyTrait: string;
  keyTraitPt: string;
}

type AbilityFilter = "all" | "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

interface PublicRacesIndexProps {
  locale?: "en" | "pt-BR";
  linkPrefix?: string;
}

// ── Ability score pill colors ─────────────────────────────────────
const ABILITY_COLORS: Record<string, string> = {
  STR: "bg-red-900/40 text-red-300 border-red-800/50",
  DEX: "bg-green-900/40 text-green-300 border-green-800/50",
  CON: "bg-orange-900/40 text-orange-300 border-orange-800/50",
  INT: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  WIS: "bg-purple-900/40 text-purple-300 border-purple-800/50",
  CHA: "bg-yellow-900/30 text-gold border-yellow-800/50",
  ALL: "bg-gray-800/50 text-gray-200 border-gray-700/50",
};

// ── Race accent colors ───────────────────────────────────────────
const RACE_ACCENT: Record<string, string> = {
  dwarf: "#DD6B20",
  elf: "#38A169",
  halfling: "#D69E2E",
  human: "#A0AEC0",
  dragonborn: "#E53E3E",
  gnome: "#3182CE",
  "half-elf": "#805AD5",
  "half-orc": "#C53030",
  tiefling: "#9F7AEA",
};

// ── SRD Race Data ─────────────────────────────────────────────────
const RACES: RaceSummary[] = [
  {
    slug: "dwarf",
    nameEn: "Dwarf",
    namePt: "Anao",
    icon: "D",
    abilityBonuses: [{ ability: "CON", bonus: "+2" }],
    size: "Medium",
    speed: 25,
    keyTrait: "Dwarven Resilience",
    keyTraitPt: "Resiliencia Ana",
  },
  {
    slug: "elf",
    nameEn: "Elf",
    namePt: "Elfo",
    icon: "E",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Medium",
    speed: 30,
    keyTrait: "Fey Ancestry",
    keyTraitPt: "Ancestralidade Ferica",
  },
  {
    slug: "halfling",
    nameEn: "Halfling",
    namePt: "Halfling",
    icon: "H",
    abilityBonuses: [{ ability: "DEX", bonus: "+2" }],
    size: "Small",
    speed: 25,
    keyTrait: "Lucky",
    keyTraitPt: "Sortudo",
  },
  {
    slug: "human",
    nameEn: "Human",
    namePt: "Humano",
    icon: "H",
    abilityBonuses: [{ ability: "ALL", bonus: "+1" }],
    size: "Medium",
    speed: 30,
    keyTrait: "+1 to All Abilities",
    keyTraitPt: "+1 em Todos os Atributos",
  },
  {
    slug: "dragonborn",
    nameEn: "Dragonborn",
    namePt: "Draconato",
    icon: "D",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CHA", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Breath Weapon",
    keyTraitPt: "Arma de Sopro",
  },
  {
    slug: "gnome",
    nameEn: "Gnome",
    namePt: "Gnomo",
    icon: "G",
    abilityBonuses: [{ ability: "INT", bonus: "+2" }],
    size: "Small",
    speed: 25,
    keyTrait: "Gnome Cunning",
    keyTraitPt: "Esperteza Gnomida",
  },
  {
    slug: "half-elf",
    nameEn: "Half-Elf",
    namePt: "Meio-Elfo",
    icon: "HE",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "ALL", bonus: "+1 x2" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Skill Versatility",
    keyTraitPt: "Versatilidade em Pericias",
  },
  {
    slug: "half-orc",
    nameEn: "Half-Orc",
    namePt: "Meio-Orc",
    icon: "HO",
    abilityBonuses: [
      { ability: "STR", bonus: "+2" },
      { ability: "CON", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Relentless Endurance",
    keyTraitPt: "Resistencia Incansavel",
  },
  {
    slug: "tiefling",
    nameEn: "Tiefling",
    namePt: "Tiefling",
    icon: "T",
    abilityBonuses: [
      { ability: "CHA", bonus: "+2" },
      { ability: "INT", bonus: "+1" },
    ],
    size: "Medium",
    speed: 30,
    keyTrait: "Infernal Legacy",
    keyTraitPt: "Legado Infernal",
  },
];

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Races",
    subtitle:
      "All 9 SRD player character races with ability scores, traits, and subraces",
    searchPlaceholder: "Search by race name...",
    filters: "Filters",
    all: "All",
    filterLabel: "Ability:",
    speed: "Speed",
    ft: "ft",
    sizeLabel: "Size",
    small: "Small",
    medium: "Medium",
    races: "races",
    of: "of",
    noResults: "No races match your filters.",
    clearAll: "Clear all filters",
    viewDetails: "View details",
  },
  "pt-BR": {
    title: "Racas D&D 5e",
    subtitle:
      "Todas as 9 racas SRD de personagem com atributos, tracos e sub-racas",
    searchPlaceholder: "Buscar por nome da raca...",
    filters: "Filtros",
    all: "Todas",
    filterLabel: "Atributo:",
    speed: "Velocidade",
    ft: "ft",
    sizeLabel: "Tamanho",
    small: "Pequeno",
    medium: "Medio",
    races: "racas",
    of: "de",
    noResults: "Nenhuma raca corresponde aos filtros.",
    clearAll: "Limpar todos os filtros",
    viewDetails: "Ver detalhes",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────
export function PublicRacesIndex({ locale = "en", linkPrefix }: PublicRacesIndexProps) {
  const [filter, setFilter] = useState<AbilityFilter>("all");
  const [query, setQuery] = useState("");
  const [descLang, setDescLang] = useState<"en" | "pt-BR">(locale);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isPt = descLang === "pt-BR";
  const L = LABELS[descLang];
  const basePath = linkPrefix ?? (isPt ? "/racas" : "/races");

  const abilities: { key: AbilityFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "STR", label: "STR" },
    { key: "DEX", label: "DEX" },
    { key: "CON", label: "CON" },
    { key: "INT", label: "INT" },
    { key: "WIS", label: "WIS" },
    { key: "CHA", label: "CHA" },
  ];

  const filtered = useMemo(() => {
    let result: RaceSummary[] = RACES;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (r) =>
          r.nameEn.toLowerCase().includes(q) ||
          r.namePt.toLowerCase().includes(q)
      );
    }

    if (filter !== "all") {
      result = result.filter((r) =>
        r.abilityBonuses.some(
          (b) => b.ability === filter || b.ability === "ALL"
        )
      );
    }

    return result;
  }, [query, filter]);

  const hasFilters = !!(query || filter !== "all");
  const activeFilterCount = filter !== "all" ? 1 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 mt-1 text-lg">{L.subtitle}</p>
      </div>

      {/* Search + filter container */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-4 space-y-3">
        <CompendiumSearchInput
          value={query}
          onChange={setQuery}
          placeholder={L.searchPlaceholder}
        />

        {/* Filter toggle */}
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
          {L.filters}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-gray-950 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Collapsible ability chips */}
        <CollapseSection open={filtersOpen}>
          <div className="space-y-3 pt-1">
            <FilterChips
              label={L.filterLabel}
              options={abilities.map(({ key, label }) => ({ label, value: key }))}
              selected={filter === "all" ? null : filter}
              onSelect={(v) => setFilter((v as AbilityFilter) ?? "all")}
            />
          </div>
        </CollapseSection>

        {/* Result count + language toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400" role="status" aria-live="polite">
            {hasFilters
              ? `${filtered.length} ${L.of} ${RACES.length} ${L.races}`
              : `${RACES.length} ${L.races}`}
          </span>
          <LanguageToggle locale={descLang} onToggle={setDescLang} />
        </div>
      </div>

      {/* Race cards grid */}
      <div className="compendium-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((race) => {
          const displayName = isPt ? race.namePt : race.nameEn;
          const secondaryName = isPt ? race.nameEn : race.namePt;
          const traitHighlight = isPt ? race.keyTraitPt : race.keyTrait;

          return (
            <Link
              key={race.slug}
              href={`${basePath}/${race.slug}`}
              className="compendium-card group rounded-xl border border-white/[0.04] bg-card transition-all p-5 block"
            >
              {/* Icon + Name */}
              <div className="flex items-start gap-3 mb-3">
                <SrdInitialCircle
                  letter={race.icon}
                  color={RACE_ACCENT[race.slug]}
                  className="w-10 h-10 text-base shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-200 font-[family-name:var(--font-cinzel)] text-lg leading-tight group-hover:text-white transition-colors">
                    {displayName}
                  </h2>
                  <p className="text-xs text-gray-500 italic">
                    {secondaryName}
                  </p>
                </div>
              </div>

              {/* Ability bonus pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {race.abilityBonuses.map((b) => (
                  <span
                    key={b.ability + b.bonus}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold font-mono tabular-nums border ${
                      ABILITY_COLORS[b.ability] ?? ABILITY_COLORS.ALL
                    }`}
                  >
                    {b.ability} {b.bonus}
                  </span>
                ))}
              </div>

              {/* Size + Speed row */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <SrdIconRuler className="w-3.5 h-3.5 text-gray-500" />
                  {race.size === "Small" ? L.small : L.medium}
                </span>
                <span className="flex items-center gap-1">
                  <SrdIconBoot className="w-3.5 h-3.5 text-gray-500" />
                  {race.speed} {L.ft}
                </span>
              </div>

              {/* Key trait highlight */}
              <div className="text-sm text-gold/80 font-medium">
                {traitHighlight}
              </div>

              {/* Hover hint */}
              <p className="text-xs text-gold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {L.viewDetails} &rarr;
              </p>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && hasFilters && (
        <div className="compendium-empty">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="text-gray-400 text-lg">{L.noResults}</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setFilter("all"); }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            {L.clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
