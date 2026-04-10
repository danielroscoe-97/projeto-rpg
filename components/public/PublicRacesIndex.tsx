"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { SrdInitialCircle, SrdIconRuler, SrdIconBoot } from "./SrdIcons";

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
  CHA: "bg-yellow-900/30 text-[#D4A853] border-yellow-800/50",
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
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filtersHeight, setFiltersHeight] = useState(0);

  const isPt = descLang === "pt-BR";
  const L = LABELS[descLang];
  const basePath = linkPrefix ?? (isPt ? "/racas" : "/races");

  useEffect(() => {
    if (filtersRef.current) {
      setFiltersHeight(filtersRef.current.scrollHeight);
    }
  }, [filtersOpen]);

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

        {/* Collapsible ability chips */}
        <div
          ref={filtersRef}
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ maxHeight: filtersOpen ? filtersHeight : 0, opacity: filtersOpen ? 1 : 0 }}
        >
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-medium mr-1">{L.filterLabel}</span>
              {abilities.map(({ key, label }) => (
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
              ? `${filtered.length} ${L.of} ${RACES.length} ${L.races}`
              : `${RACES.length} ${L.races}`}
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

      {/* Race cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((race) => {
          const displayName = isPt ? race.namePt : race.nameEn;
          const secondaryName = isPt ? race.nameEn : race.namePt;
          const traitHighlight = isPt ? race.keyTraitPt : race.keyTrait;

          return (
            <Link
              key={race.slug}
              href={`${basePath}/${race.slug}`}
              className="group rounded-xl border border-gray-700/50 bg-gray-900/50 hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)] hover:bg-gray-900/80 transition-all p-5 block"
            >
              {/* Icon + Name */}
              <div className="flex items-start gap-3 mb-3">
                <SrdInitialCircle
                  letter={race.icon}
                  color={RACE_ACCENT[race.slug]}
                  className="w-10 h-10 text-base shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-lg leading-tight group-hover:text-[#D4A853] transition-colors">
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
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
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
              <div className="text-sm text-[#D4A853]/80 font-medium">
                {traitHighlight}
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
