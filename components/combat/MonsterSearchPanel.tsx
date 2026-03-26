"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { buildMonsterIndex, searchMonsters } from "@/lib/srd/srd-search";
import { loadMonsters } from "@/lib/srd/srd-loader";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { VersionBadge } from "@/components/session/RulesetSelector";
import type { RulesetVersion } from "@/lib/types/database";

// ─── Creature type icons ────────────────────────────────────────────────────

const CREATURE_ICONS: Record<string, string> = {
  aberration: "👁",
  beast: "🐺",
  celestial: "✦",
  construct: "⚙",
  dragon: "🐉",
  elemental: "🌊",
  fey: "🌙",
  fiend: "👿",
  giant: "🗿",
  humanoid: "👤",
  monstrosity: "🦑",
  ooze: "💧",
  plant: "🌿",
  undead: "💀",
};

const CREATURE_COLORS: Record<string, string> = {
  aberration: "bg-purple-900/40 text-purple-300",
  beast: "bg-green-900/40 text-green-300",
  celestial: "bg-yellow-900/40 text-yellow-200",
  construct: "bg-slate-800/60 text-slate-300",
  dragon: "bg-red-900/40 text-red-300",
  elemental: "bg-blue-900/40 text-blue-300",
  fey: "bg-emerald-900/40 text-emerald-300",
  fiend: "bg-rose-900/50 text-rose-300",
  giant: "bg-stone-800/50 text-stone-300",
  humanoid: "bg-zinc-800/50 text-zinc-300",
  monstrosity: "bg-orange-900/40 text-orange-300",
  ooze: "bg-lime-900/40 text-lime-300",
  plant: "bg-teal-900/40 text-teal-300",
  undead: "bg-neutral-900/60 text-neutral-400",
};

function getCreatureIcon(type: string): { icon: string; color: string } {
  const key = type.toLowerCase();
  return {
    icon: CREATURE_ICONS[key] ?? "⚔",
    color: CREATURE_COLORS[key] ?? "bg-zinc-800/50 text-zinc-400",
  };
}

// ─── CR badge ───────────────────────────────────────────────────────────────

function crToNum(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

function CrBadge({ cr }: { cr: string }) {
  const n = crToNum(cr);
  const color =
    n === 0
      ? "text-zinc-400 bg-zinc-700/50"
      : n <= 1
      ? "text-green-400 bg-green-900/40"
      : n <= 5
      ? "text-yellow-400 bg-yellow-900/40"
      : n <= 10
      ? "text-orange-400 bg-orange-900/40"
      : n <= 15
      ? "text-red-400 bg-red-900/40"
      : "text-purple-400 bg-purple-900/40";
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${color}`}>
      CR {cr}
    </span>
  );
}

// ─── All unique creature types from a monster list ──────────────────────────

function getTypes(monsters: SrdMonster[]): string[] {
  const set = new Set<string>();
  monsters.forEach((m) => {
    const t = m.type?.split(" ")[0].toLowerCase();
    if (t) set.add(t);
  });
  return Array.from(set).sort();
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface MonsterSearchPanelProps {
  rulesetVersion: RulesetVersion;
  onSelectMonster: (monster: SrdMonster) => void;
  /** Fired after a monster is selected — parent uses this to trigger glow */
  onMonsterAdded?: () => void;
}

const DEBOUNCE_MS = 200;

// ─── Component ──────────────────────────────────────────────────────────────

export function MonsterSearchPanel({
  rulesetVersion,
  onSelectMonster,
  onMonsterAdded,
}: MonsterSearchPanelProps) {
  const t = useTranslations("combat");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

  const [query, setQuery] = useState("");
  const [allMonsters, setAllMonsters] = useState<SrdMonster[]>([]);
  const [results, setResults] = useState<SrdMonster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [crMin, setCrMin] = useState("");
  const [crMax, setCrMax] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFilters = crMin !== "" || crMax !== "" || selectedTypes.size > 0;
  const shouldShowResults = query.trim() !== "" || hasFilters;

  // Load monster list when ruleset changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    loadMonsters(rulesetVersion)
      .then((monsters) => {
        if (!cancelled) {
          buildMonsterIndex(monsters);
          setAllMonsters(monsters);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
          setLoadError(t("search_monsters_error"));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetVersion]);

  // Filter + search with debounce
  useEffect(() => {
    if (isLoading) return;

    // P2 fix: don't show results unless user typed or has active filters
    if (!shouldShowResults) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      let base: SrdMonster[] = query.trim()
        ? searchMonsters(query, rulesetVersion).map((r) => r.item)
        : allMonsters;

      // Apply CR filter
      const min = crMin !== "" ? crToNum(crMin) : -Infinity;
      const max = crMax !== "" ? crToNum(crMax) : Infinity;
      if (crMin !== "" || crMax !== "") {
        base = base.filter((m) => {
          const n = crToNum(m.cr);
          return n >= min && n <= max;
        });
      }

      // Apply type filter
      if (selectedTypes.size > 0) {
        base = base.filter((m) => {
          const typ = m.type?.split(" ")[0].toLowerCase();
          return typ && selectedTypes.has(typ);
        });
      }

      setResults(base.slice(0, query.trim() ? 8 : 20));
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, rulesetVersion, allMonsters, isLoading, crMin, crMax, selectedTypes, shouldShowResults]);

  const handleSelect = useCallback(
    (monster: SrdMonster) => {
      onSelectMonster(monster);
      onMonsterAdded?.();
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    },
    [onSelectMonster, onMonsterAdded]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setQuery("");
      setResults([]);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const availableTypes = getTypes(allMonsters);

  return (
    <div className="space-y-1">
      {/* Label + filter toggle */}
      <div className="flex items-center justify-between">
        <label className="text-foreground/80 text-xs font-medium block">
          {t("search_monsters")}
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
            hasFilters
              ? "text-gold bg-gold/10 hover:bg-gold/20"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          aria-expanded={filtersOpen}
        >
          <span>⚙</span>
          {t("search_filters")}
          {hasFilters && (
            <span className="bg-gold text-surface-primary text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {(crMin !== "" || crMax !== "" ? 1 : 0) + selectedTypes.size}
            </span>
          )}
          <span className="text-[10px]">{filtersOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("search_monsters_placeholder")}
          className="w-full bg-card border border-border rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 focus:border-gold/60 transition-colors"
          data-testid="srd-search-input"
          aria-autocomplete="list"
          aria-controls="monster-search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `monster-result-${activeIndex}` : undefined
          }
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">
            …
          </span>
        )}
      </div>

      {loadError && (
        <p className="text-red-400 text-xs" role="alert">
          {loadError}
        </p>
      )}

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-card/50 border border-border/50 rounded-md p-3 space-y-3">
          {/* CR range */}
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider mb-1.5">
              {t("search_filter_cr")}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={crMin}
                onChange={(e) => setCrMin(e.target.value)}
                placeholder={t("search_filter_min")}
                min={0}
                max={30}
                step={1}
                className="w-16 bg-card border border-border rounded px-2 py-1 text-foreground text-xs text-center focus:outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground/50 text-xs">—</span>
              <input
                type="number"
                value={crMax}
                onChange={(e) => setCrMax(e.target.value)}
                placeholder={t("search_filter_max")}
                min={0}
                max={30}
                step={1}
                className="w-16 bg-card border border-border rounded px-2 py-1 text-foreground text-xs text-center focus:outline-none focus:border-gold/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {(crMin !== "" || crMax !== "") && (
                <button
                  type="button"
                  onClick={() => { setCrMin(""); setCrMax(""); }}
                  className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {t("search_filter_clear")}
                </button>
              )}
            </div>
          </div>

          {/* Type checkboxes */}
          {availableTypes.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                {t("search_filter_type")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map((type) => {
                  const { icon, color } = getCreatureIcon(type);
                  const active = selectedTypes.has(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] capitalize transition-all border ${
                        active
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : `border-transparent ${color} hover:border-border`
                      }`}
                    >
                      <span>{icon}</span>
                      {type}
                    </button>
                  );
                })}
                {selectedTypes.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTypes(new Set())}
                    className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1"
                  >
                    {t("search_filter_clear")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul
          id="monster-search-results"
          ref={listRef}
          role="listbox"
          aria-label={t("search_monsters")}
          className="bg-card border border-border rounded-md overflow-hidden divide-y divide-white/[0.04] max-h-80 overflow-y-auto"
          data-testid="srd-results"
        >
          {results.map((monster, idx) => {
            const typePrimary = monster.type?.split(" ")[0] ?? "";
            return (
              <li
                key={monster.id}
                id={`monster-result-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer ${
                  idx === activeIndex
                    ? "bg-white/[0.10]"
                    : "hover:bg-white/[0.04]"
                }`}
                data-testid={`srd-result-${monster.id}`}
              >
                {/* Monster token thumbnail */}
                <MonsterToken
                  tokenUrl={monster.token_url}
                  creatureType={monster.type}
                  name={monster.name}
                  size={36}
                />

                {/* Info — clickable to select */}
                <button
                  type="button"
                  onClick={() => handleSelect(monster)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground text-sm font-medium">
                      {monster.name}
                    </span>
                    <CrBadge cr={monster.cr} />
                    <VersionBadge version={monster.ruleset_version} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/70">
                    <span className="capitalize">{typePrimary}</span>
                    <span>·</span>
                    <span>HP {monster.hit_points}</span>
                    <span>·</span>
                    <span>AC {monster.armor_class}</span>
                  </div>
                </button>

                {/* Ver Ficha button */}
                <button
                  type="button"
                  onClick={() =>
                    pinCard("monster", monster.id, monster.ruleset_version)
                  }
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-gold hover:bg-gold/10 rounded transition-all shrink-0 border border-transparent hover:border-gold/30"
                  aria-label={`Ver ficha de ${monster.name}`}
                  title={`Ver ficha de ${monster.name}`}
                  data-testid={`ver-ficha-${monster.id}`}
                >
                  <span aria-hidden>📖</span>
                  <span>Ver Ficha</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty results hint */}
      {query.trim() && results.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground/50 text-center py-2">
          {t("search_no_results", { query })}
        </p>
      )}
    </div>
  );
}
