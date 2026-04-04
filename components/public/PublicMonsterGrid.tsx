"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { MonsterToken } from "@/components/srd/MonsterToken";

const CR_RANGES = [
  { label: "0–1", min: 0, max: 1 },
  { label: "2–4", min: 2, max: 4 },
  { label: "5–8", min: 5, max: 8 },
  { label: "9–12", min: 9, max: 12 },
  { label: "13–16", min: 13, max: 16 },
  { label: "17–20", min: 17, max: 20 },
  { label: "21+", min: 21, max: 99 },
];

const CREATURE_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon",
  "Elemental", "Fey", "Fiend", "Giant", "Humanoid",
  "Monstrosity", "Ooze", "Plant", "Undead",
];

const TYPE_EMOJI: Record<string, string> = {
  aberration: "\u{1F441}",
  beast: "\u{1F43A}",
  celestial: "\u2726",
  construct: "\u2699",
  dragon: "\u{1F409}",
  elemental: "\u{1F30A}",
  fey: "\u{1F319}",
  fiend: "\u{1F47F}",
  giant: "\u{1F5FF}",
  humanoid: "\u{1F464}",
  monstrosity: "\u{1F991}",
  ooze: "\u{1F4A7}",
  plant: "\u{1F33F}",
  undead: "\u{1F480}",
};

function parseCR(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface MonsterEntry {
  name: string;
  cr: string;
  type: string;
  isMAD?: boolean;
  slug?: string;
  tokenUrl?: string;
  fallbackTokenUrl?: string;
}

interface PublicMonsterGridProps {
  monsters: MonsterEntry[];
  basePath?: string;
  labels?: {
    searchPlaceholder?: string;
    crLabel?: string;
    typeLabel?: string;
    noResults?: string;
    clearAll?: string;
    of?: string;
    monsters?: string;
    filters?: string;
  };
}

export function PublicMonsterGrid({ monsters, basePath = "/monsters", labels = {} }: PublicMonsterGridProps) {
  const {
    searchPlaceholder = "Search monsters by name...",
    crLabel = "CR:",
    typeLabel = "Type:",
    noResults = "No monsters match your filters.",
    clearAll = "Clear all filters",
    of = "of",
    monsters: monstersLabel = "monsters",
    filters: filtersLabel = "Filters",
  } = labels;
  const [query, setQuery] = useState("");
  const [crFilter, setCrFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filtersHeight, setFiltersHeight] = useState(0);

  useEffect(() => {
    if (filtersRef.current) {
      setFiltersHeight(filtersRef.current.scrollHeight);
    }
  }, [filtersOpen]);

  const activeFilterCount = (crFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  const filtered = useMemo(() => {
    let result = monsters;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (crFilter) {
      const range = CR_RANGES.find((r) => r.label === crFilter);
      if (range) {
        result = result.filter((m) => {
          const cr = parseCR(m.cr);
          return cr >= range.min && cr <= range.max;
        });
      }
    }

    if (typeFilter) {
      result = result.filter((m) => {
        const baseType = m.type.split("(")[0].trim();
        return baseType.toLowerCase() === typeFilter.toLowerCase();
      });
    }

    return result;
  }, [monsters, query, crFilter, typeFilter]);

  // Group by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, MonsterEntry[]>();
    for (const m of filtered) {
      const letter = m.name[0]?.toUpperCase() || "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(m);
    }
    return map;
  }, [filtered]);

  const hasFilters = !!(query || crFilter || typeFilter);

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 mb-8 space-y-3">
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
            placeholder={searchPlaceholder}
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
          {filtersLabel}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4A853] text-gray-950 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Collapsible CR + Type chips */}
        <div
          ref={filtersRef}
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ maxHeight: filtersOpen ? filtersHeight : 0, opacity: filtersOpen ? 1 : 0 }}
        >
          <div className="space-y-3 pt-1">
            {/* CR chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-medium mr-1">{crLabel}</span>
              {CR_RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setCrFilter(crFilter === r.label ? null : r.label)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    crFilter === r.label
                      ? "bg-[#D4A853] text-gray-950 shadow-sm"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Type chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500 font-medium mr-1">{typeLabel}</span>
              {CREATURE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    typeFilter === t
                      ? "bg-[#D4A853] text-gray-950 shadow-sm"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"
                  }`}
                >
                  <span className="text-[10px]">{TYPE_EMOJI[t.toLowerCase()] ?? ""}</span>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count — always visible */}
        <div className="text-xs text-gray-500">
          {hasFilters
            ? `${filtered.length} ${of} ${monsters.length} ${monstersLabel}`
            : `${monsters.length} ${monstersLabel}`}
        </div>
      </div>

      {/* Letter navigation (only without search) */}
      {!hasFilters && (
        <div className="flex flex-wrap gap-1 mb-8">
          {Array.from(grouped.keys()).map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800/60 text-gray-300 text-sm font-medium hover:bg-[#D4A853]/90 hover:text-white transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Monster grid by letter */}
      {Array.from(grouped.entries()).map(([letter, group]) => (
        <section key={letter} id={`letter-${letter}`} className="mb-8">
          <h2 className="text-xl font-bold text-[#D4A853] border-b border-white/[0.06] pb-1 mb-3 font-[family-name:var(--font-cinzel)]">
            {letter}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {group.map((m) => {
              const baseType = m.type.split("(")[0].trim();
              return (
                <Link
                  key={m.name}
                  href={`${basePath}/${m.slug ?? toSlug(m.name)}`}
                  className="flex items-center gap-2.5 rounded-lg bg-gray-800/40 border border-white/[0.04] px-3 py-2.5 hover:bg-gray-700/50 hover:border-[#D4A853]/20 transition-all group"
                >
                  <span className="relative inline-flex shrink-0 transition-transform duration-200 group-hover:scale-[1.8] group-hover:z-10">
                    <MonsterToken
                      tokenUrl={m.tokenUrl}
                      fallbackTokenUrl={m.fallbackTokenUrl}
                      creatureType={baseType}
                      name={m.name}
                      size={28}
                      isMonsterADay={m.isMAD}
                    />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-gray-200 group-hover:text-white text-sm font-medium block truncate">
                      {m.name}
                    </span>
                  </span>
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    CR {m.cr}
                  </span>
                  {m.isMAD && (
                    <span className="text-[8px] font-bold bg-[#D4A853] text-gray-950 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0" title="Monster a Day">
                      r/
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 && hasFilters && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">{noResults}</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setCrFilter(null); setTypeFilter(null); }}
            className="mt-3 text-[#D4A853] text-sm hover:underline"
          >
            {clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
