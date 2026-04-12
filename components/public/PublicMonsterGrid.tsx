"use client";

import { useState, useMemo, type MouseEvent } from "react";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import Link from "next/link";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { LanguageToggle } from "@/components/public/shared/LanguageToggle";
import { FilterChips } from "@/components/public/shared/FilterChips";
import { CompendiumSearchInput } from "@/components/public/shared/CompendiumSearchInput";
import { CollapseSection } from "@/components/public/shared/CollapseSection";
import { ALL_CR_VALUES, CREATURE_TYPES, parseCR, toSlug, cleanDisplayName, baseFirstLetter } from "@/lib/utils/monster";

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

export interface MonsterEntry {
  name: string;
  nameEn?: string;
  namePt?: string;
  cr: string;
  type: string;
  isMAD?: boolean;
  slug?: string;
  tokenUrl?: string;
  fallbackTokenUrl?: string;
  /** SRD entity ID for pinning floating cards (e.g. "goblin-mm") */
  entityId?: string;
  /** Ruleset version for floating card resolution */
  rulesetVersion?: string;
  /** Whether this monster has a dedicated detail page (SRD/MAD = true) */
  hasPage?: boolean;
}

interface PublicMonsterGridProps {
  monsters: MonsterEntry[];
  basePath?: string;
  locale?: "en" | "pt-BR";
  /** When provided, clicking a monster opens a floating card instead of navigating */
  onMonsterClick?: (monster: MonsterEntry) => void;
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

export function PublicMonsterGrid({ monsters, basePath = "/monsters", locale = "en", onMonsterClick, labels = {} }: PublicMonsterGridProps) {
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
  const [descLang, setDescLang] = useLocalePreference(locale);
  const isPt = descLang === "pt-BR";
  const displayName = (m: MonsterEntry) => cleanDisplayName(isPt ? (m.namePt ?? m.name) : (m.nameEn ?? m.name));
  const subtitleName = (m: MonsterEntry) => {
    if (!m.nameEn || !m.namePt || m.nameEn.toLowerCase() === m.namePt.toLowerCase()) return null;
    return cleanDisplayName(isPt ? m.nameEn : m.namePt);
  };
  const [query, setQuery] = useState("");
  const [crMin, setCrMin] = useState<string>("");
  const [crMax, setCrMax] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasCrFilter = crMin !== "" || crMax !== "";
  const activeFilterCount = (hasCrFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  const filtered = useMemo(() => {
    let result = monsters;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.nameEn && m.nameEn.toLowerCase().includes(q)) ||
        (m.namePt && m.namePt.toLowerCase().includes(q))
      );
    }

    if (hasCrFilter) {
      const minVal = crMin !== "" ? parseCR(crMin) : -Infinity;
      const maxVal = crMax !== "" ? parseCR(crMax) : Infinity;
      result = result.filter((m) => {
        const cr = parseCR(m.cr);
        return cr >= minVal && cr <= maxVal;
      });
    }

    if (typeFilter) {
      result = result.filter((m) => {
        const baseType = m.type.split("(")[0].trim();
        return baseType.toLowerCase() === typeFilter.toLowerCase();
      });
    }

    return result;
  }, [monsters, query, crMin, crMax, hasCrFilter, typeFilter]);

  // Group by first letter (of display name), normalizing accents (Á→A, Í→I)
  const grouped = useMemo(() => {
    const map = new Map<string, MonsterEntry[]>();
    for (const m of filtered) {
      const dn = cleanDisplayName(isPt ? (m.namePt ?? m.name) : (m.nameEn ?? m.name));
      const letter = /^[a-zA-Z\u00C0-\u024F]/.test(dn[0] ?? "") ? baseFirstLetter(dn) : "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(m);
    }
    // Sort entries within each letter by display name
    for (const [, group] of map) {
      group.sort((a, b) => {
        const an = cleanDisplayName(isPt ? (a.namePt ?? a.name) : (a.nameEn ?? a.name));
        const bn = cleanDisplayName(isPt ? (b.namePt ?? b.name) : (b.nameEn ?? b.name));
        return an.localeCompare(bn);
      });
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [filtered, isPt]);

  const hasFilters = !!(query || hasCrFilter || typeFilter);

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-4 mb-8 space-y-3">
        {/* Search input */}
        <CompendiumSearchInput
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
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
          {filtersLabel}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-gray-950 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Collapsible CR + Type filters */}
        <CollapseSection open={filtersOpen}>
          <div className="space-y-3 pt-1">
            {/* CR range selects */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">{crLabel}</span>
              <select
                value={crMin}
                onChange={(e) => {
                  const v = e.target.value;
                  setCrMin(v);
                  if (v && crMax && parseCR(v) > parseCR(crMax)) setCrMax(v);
                }}
                className="bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold/50 min-w-[4.5rem]"
              >
                <option value="">Min</option>
                {ALL_CR_VALUES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">—</span>
              <select
                value={crMax}
                onChange={(e) => {
                  const v = e.target.value;
                  setCrMax(v);
                  if (v && crMin && parseCR(v) < parseCR(crMin)) setCrMin(v);
                }}
                className="bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold/50 min-w-[4.5rem]"
              >
                <option value="">Max</option>
                {ALL_CR_VALUES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {hasCrFilter && (
                <button
                  type="button"
                  onClick={() => { setCrMin(""); setCrMax(""); }}
                  className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                  title="Clear CR filter"
                >
                  ✕
                </button>
              )}
            </div>
            <FilterChips
              label={typeLabel}
              options={CREATURE_TYPES.map((t) => ({ label: t, value: t, icon: TYPE_EMOJI[t.toLowerCase()] ?? "" }))}
              selected={typeFilter}
              onSelect={(v) => setTypeFilter(v)}
            />
          </div>
        </CollapseSection>

        {/* Result count + language toggle — always visible */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400" role="status" aria-live="polite">
            {hasFilters
              ? `${filtered.length} ${of} ${monsters.length} ${monstersLabel}`
              : `${monsters.length} ${monstersLabel}`}
          </span>
          <LanguageToggle locale={descLang} onToggle={setDescLang} />
        </div>
      </div>

      {/* Letter navigation (only without search) */}
      {!hasFilters && (
        <div className="flex flex-wrap gap-1 mb-8">
          {Array.from(grouped.keys()).map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800/60 text-gray-300 text-sm font-medium hover:bg-gold/90 hover:text-white transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Monster grid by letter */}
      {Array.from(grouped.entries()).map(([letter, group], idx) => (
        <section key={letter} id={`letter-${letter}`} className="mb-8">
          {idx > 0 && <div className="gold-divider mb-6" />}
          <h2 className="text-xl font-bold text-gold border-b border-white/[0.06] pb-1 mb-3 font-[family-name:var(--font-cinzel)] tracking-wide">
            {letter}
          </h2>
          <div className="compendium-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {group.map((m) => {
              const baseType = m.type.split("(")[0].trim();
              const cardContent = (
                <>
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
                      {displayName(m)}
                    </span>
                    {subtitleName(m) && (
                      <span className="text-[11px] text-gray-400 italic block truncate">
                        {subtitleName(m)}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-xs font-mono tabular-nums whitespace-nowrap">
                    CR {m.cr}
                  </span>
                  {m.isMAD && (
                    <span className="text-[8px] font-bold bg-gold text-gray-950 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0" title="Monster a Day">
                      r/
                    </span>
                  )}
                </>
              );

              const cardClass = "compendium-card flex items-center gap-2.5 rounded-xl bg-card border border-white/[0.04] px-3 py-2.5 hover:bg-gray-700/50 transition-all group";

              // When onMonsterClick is provided, intercept clicks to open floating cards
              if (onMonsterClick) {
                const href = `${basePath}/${m.slug ?? toSlug(m.name)}`;
                // SRD/MAD: keep <a> for SEO but intercept click
                if (m.hasPage !== false) {
                  return (
                    <Link
                      key={m.entityId ?? m.nameEn ?? m.name}
                      href={href}
                      onClick={(e: MouseEvent) => { e.preventDefault(); onMonsterClick(m); }}
                      className={cardClass}
                    >
                      {cardContent}
                    </Link>
                  );
                }
                // Non-SRD: no link (no page exists), just button
                return (
                  <button
                    key={m.entityId ?? m.nameEn ?? m.name}
                    type="button"
                    onClick={() => onMonsterClick(m)}
                    className={`${cardClass} w-full text-left cursor-pointer`}
                  >
                    {cardContent}
                  </button>
                );
              }

              // Default: navigate to detail page (original behavior)
              return (
                <Link
                  key={m.nameEn ?? m.name}
                  href={`${basePath}/${m.slug ?? toSlug(m.name)}`}
                  className={cardClass}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 && hasFilters && (
        <div className="compendium-empty">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="text-gray-400 text-lg">{noResults}</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setCrMin(""); setCrMax(""); setTypeFilter(null); }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            {clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
