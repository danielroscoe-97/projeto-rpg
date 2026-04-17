"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useTourStore } from "@/lib/stores/tour-store";
import Fuse from "fuse.js";
import { mergeImportedMonsters, getCrossVersionMonsterId, getMonsterById } from "@/lib/srd/srd-search";
import { loadMonsters, loadMadMonsters } from "@/lib/srd/srd-loader";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { MonsterToken, CREATURE_ICONS } from "@/components/srd/MonsterToken";
import { VersionBadge, RulesetSelector } from "@/components/session/RulesetSelector";
import { useExtendedCompendium } from "@/lib/hooks/use-extended-compendium";
import { ExternalContentGate } from "@/components/import/ExternalContentGate";
import { ImportContentModal } from "@/components/import/ImportContentModal";
import { getImportedSources } from "@/lib/import/import-cache";
import type { RulesetVersion } from "@/lib/types/database";
import { isFullDataMode } from "@/lib/srd/srd-mode";
import type { CombatantRole } from "@/lib/types/combat";
import { COMBATANT_ROLE_CYCLE } from "@/lib/types/combat";
import { User, UserCircle, Sparkles, Skull, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MANUAL_ROLE_CONFIG: Record<CombatantRole, { icon: typeof User; color: string; bg: string }> = {
  player: { icon: User, color: "text-blue-400", bg: "border-blue-400/30 hover:border-blue-400/50" },
  npc: { icon: UserCircle, color: "text-gold", bg: "border-gold/30 hover:border-gold/50" },
  summon: { icon: Sparkles, color: "text-purple-400", bg: "border-purple-400/30 hover:border-purple-400/50" },
  monster: { icon: Skull, color: "text-red-400", bg: "border-red-400/30 hover:border-red-400/50" },
};

type SourceFilter = "all" | "srd" | "complete" | "mad";

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

export interface CampaignPlayer {
  id: string;
  name: string;
  hp: number;
  ac: number;
  spell_save_dc?: number | null;
}

interface MonsterSearchPanelProps {
  rulesetVersion: RulesetVersion;
  onSelectMonster: (monster: SrdMonster, options?: { isHidden?: boolean }) => void;
  /** Fired after a monster is selected — parent uses this to trigger glow */
  onMonsterAdded?: () => void;
  /** Called when quantity > 1 to add a monster group */
  onSelectMonsterGroup?: (monster: SrdMonster, quantity: number, options?: { isHidden?: boolean }) => void;
  /** Campaign players available for search — shown below monsters */
  campaignPlayers?: CampaignPlayer[];
  /** Called when a campaign player is selected */
  onSelectPlayer?: (player: CampaignPlayer) => void;
  /** Show manual add button and form */
  showManualAdd?: boolean;
  /** Start with manual add form expanded (default: false) */
  defaultManualOpen?: boolean;
  /** Called for manual add */
  onManualAdd?: (data: { name: string; hp?: number; ac?: number; initiative?: number; role?: CombatantRole }) => void;
  /** Placeholder override */
  placeholder?: string;
  /** Keep results open after adding a monster (setup mode) — default: false (combat mode clears) */
  keepOpenAfterAdd?: boolean;
  /** Called when the DM changes the ruleset version from within the search filter panel */
  onRulesetChange?: (version: RulesetVersion) => void;
}

const DEBOUNCE_MS = 200;

// ─── Component ──────────────────────────────────────────────────────────────

export function MonsterSearchPanel({
  rulesetVersion,
  onSelectMonster,
  onMonsterAdded,
  onSelectMonsterGroup,
  campaignPlayers,
  onSelectPlayer,
  showManualAdd,
  defaultManualOpen = false,
  onManualAdd,
  placeholder,
  keepOpenAfterAdd = false,
  onRulesetChange,
}: MonsterSearchPanelProps) {
  const t = useTranslations("combat");
  const tCompendium = useTranslations("compendium");
  const tImport = useTranslations("import");
  const locale = useLocale();
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const { isActive: extendedActive } = useExtendedCompendium();

  const [query, setQuery] = useState("");
  const [allMonsters, setAllMonsters] = useState<SrdMonster[]>([]);
  const [results, setResults] = useState<SrdMonster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const sourceManuallyChanged = useRef(false);

  // Auto-switch to "complete" for admin/beta testers (full data mode = all content available)
  useEffect(() => {
    if (!sourceManuallyChanged.current && isFullDataMode()) {
      setSourceFilter("complete");
    }
  }, []);
  const [crMin, setCrMin] = useState("");
  const [crMax, setCrMax] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [madMonsters, setMadMonsters] = useState<SrdMonster[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const [rowQuantities, setRowQuantities] = useState<Record<string, number>>({});
  const [manualOpen, setManualOpen] = useState(defaultManualOpen);
  const [manualName, setManualName] = useState("");
  const [manualHp, setManualHp] = useState("");
  const [manualAc, setManualAc] = useState("");
  const [manualInit, setManualInit] = useState("");
  const [manualRole, setManualRole] = useState<CombatantRole>("monster");

  const [activeIndex, setActiveIndex] = useState(-1);
  const [gateOpen, setGateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const madMonstersRef = useRef<SrdMonster[]>([]);
  const fuseRef = useRef<Fuse<SrdMonster> | null>(null);

  const hasFilters = crMin !== "" || crMax !== "" || selectedTypes.size > 0 || sourceFilter !== "all";
  const shouldShowResults = query.trim() !== "" || hasFilters;

  // Click outside to close results (disabled during tour and setup keepOpen mode)
  useEffect(() => {
    if (!shouldShowResults || results.length === 0 || keepOpenAfterAdd) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (useTourStore.getState().isActive) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shouldShowResults, results.length, keepOpenAfterAdd]);

  // Check if user has imported content
  useEffect(() => {
    getImportedSources().then((s) => setHasImported(s.length > 0));
  }, [importOpen]);

  // Load MAD monsters once (non-critical) — also merge into global monsterMap
  // so getMonsterById() can resolve them for pinned card ("Ver Ficha")
  useEffect(() => {
    loadMadMonsters()
      .then((monsters) => {
        madMonstersRef.current = monsters;
        setMadMonsters(monsters);
        if (monsters.length > 0) {
          mergeImportedMonsters(monsters);
        }
      })
      .catch(() => {});
  }, []);

  // Load monster list when ruleset changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    loadMonsters(rulesetVersion)
      .then((monsters) => {
        if (!cancelled) {
          // Build a LOCAL Fuse instance so the SRD store's global index
          // rebuild (Phase 1 → 2024 only) doesn't overwrite our data.
          fuseRef.current = new Fuse(monsters, {
            keys: [
              { name: "name", weight: 0.5 },
              { name: "type", weight: 0.3 },
              { name: "cr", weight: 0.2 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
            includeScore: true,
            minMatchCharLength: 2,
          });
          // Still merge into global map so getMonsterById() works for pinned cards
          mergeImportedMonsters(monsters);
          if (madMonstersRef.current.length > 0) {
            mergeImportedMonsters(madMonstersRef.current);
          }
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
  }, [rulesetVersion, t]);

  // S3.6 telemetry — fire `compendium:search_missed` when a non-trivial query
  // returns zero results (monsters AND campaign players), to measure the i18n
  // injector-fix's impact post-deploy.
  //
  // Wave-1 review #5: progressive typing ("v" → "ve" → "vel" → "velo") used to
  // inflate the missed-search dashboards by firing one event per 600ms-debounced
  // keystroke. We now only fire after the user has actually stopped typing —
  // either 2s idle OR on blur — and dedupe by exact query string so a single
  // "final" query fires at most once.
  const lastEmittedQueryRef = useRef<string>("");
  const idleTimerRef = useRef<number | null>(null);

  const maybeEmitSearchMissed = useCallback(() => {
    const q = query.trim();
    if (q.length < 2 || isLoading) return;
    const playerMatch =
      campaignPlayers?.some((p) => p.name.toLowerCase().includes(q.toLowerCase())) ?? false;
    if (results.length !== 0 || playerMatch) return;
    if (lastEmittedQueryRef.current === q) return;
    lastEmittedQueryRef.current = q;
    trackEvent("compendium:search_missed", {
      query_length: q.length,
      language: locale,
      result_count_zero: true,
      surface: "monster_search_panel",
    });
  }, [query, results, isLoading, locale, campaignPlayers]);

  // Trigger A — 2s idle after last query change.
  useEffect(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(maybeEmitSearchMissed, 2_000);
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [query, maybeEmitSearchMissed]);

  // Trigger B — input blur. Wired below on the search input's onBlur.
  const handleSearchBlur = useCallback(() => {
    maybeEmitSearchMissed();
  }, [maybeEmitSearchMissed]);

  // Filter + search with debounce
  useEffect(() => {
    if (isLoading) return;

    if (!shouldShowResults) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase();

      let base: SrdMonster[];

      if (sourceFilter === "mad") {
        // MAD-only: simple name search (no Fuse)
        base = q ? madMonsters.filter((m) => m.name.toLowerCase().includes(q)) : madMonsters;
      } else {
        // 5e.tools sources: use local Fuse when there's a query
        base = q && fuseRef.current
          ? fuseRef.current.search(query).map((r) => r.item)
          : allMonsters;

        if (sourceFilter === "srd") {
          base = base.filter((m) => m.is_srd === true);
        } else if (sourceFilter === "complete") {
          // all 5e.tools — no extra filter
        } else {
          // "all" = SRD + MAD
          base = base.filter((m) => m.is_srd !== false);
          const madMatches = q
            ? madMonsters.filter((m) => m.name.toLowerCase().includes(q))
            : madMonsters;
          base = [...base, ...madMatches];
        }
      }

      // Apply CR filter
      const min = crMin !== "" ? crToNum(crMin) : -Infinity;
      const max = crMax !== "" ? crToNum(crMax) : Infinity;
      if (crMin !== "" || crMax !== "") {
        base = base.filter((m) => { const n = crToNum(m.cr); return n >= min && n <= max; });
      }

      // Apply type filter
      if (selectedTypes.size > 0) {
        base = base.filter((m) => {
          const typ = m.type?.split(" ")[0].toLowerCase();
          return typ && selectedTypes.has(typ);
        });
      }

      setResults(base.slice(0, q ? 8 : 20));
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, rulesetVersion, allMonsters, madMonsters, sourceFilter, isLoading, crMin, crMax, selectedTypes, shouldShowResults]);

  const handleSelect = useCallback(
    (monster: SrdMonster) => {
      const opts = isHidden ? { isHidden: true } : undefined;
      onSelectMonster(monster, opts);
      onMonsterAdded?.();
      if (keepOpenAfterAdd) {
        setRowQuantities((prev) => ({ ...prev, [monster.id]: 1 }));
        toast.success(t("monster_added_toast", { name: monster.name }));
      } else {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
        setRowQuantities({});
        setIsHidden(false);
      }
    },
    [onSelectMonster, onMonsterAdded, isHidden, keepOpenAfterAdd, t]
  );

  const handleSelectGroup = useCallback(
    (monster: SrdMonster, qty: number) => {
      if (!onSelectMonsterGroup) return;
      const opts = isHidden ? { isHidden: true } : undefined;
      onSelectMonsterGroup(monster, qty, opts);
      onMonsterAdded?.();
      if (keepOpenAfterAdd) {
        setRowQuantities((prev) => ({ ...prev, [monster.id]: 1 }));
        toast.success(t("monster_added_toast_group", { name: monster.name, qty: String(qty) }));
      } else {
        setQuery("");
        setResults([]);
        setActiveIndex(-1);
        setRowQuantities({});
        setIsHidden(false);
      }
    },
    [onSelectMonsterGroup, onMonsterAdded, isHidden, keepOpenAfterAdd, t]
  );

  // Toggle a single monster result to its cross-version equivalent (2014↔2024)
  const isTogglingRef = useRef(false);
  const handleVersionToggle = useCallback(async (monster: SrdMonster, idx: number) => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    try {
      const crossrefId = getCrossVersionMonsterId(monster.id);
      if (!crossrefId) {
        toast.info(t("no_alternate_version"));
        return;
      }
      const altVersion: RulesetVersion = monster.ruleset_version === "2014" ? "2024" : "2014";
      let altMonster = getMonsterById(crossrefId, altVersion);
      if (!altMonster) {
        // Lazy-load the alternate version data and merge into global map
        const altMonsters = await loadMonsters(altVersion);
        mergeImportedMonsters(altMonsters);
        altMonster = getMonsterById(crossrefId, altVersion);
      }
      if (!altMonster) {
        toast.info(t("no_alternate_version"));
        return;
      }
      // F-01: Migrate rowQuantities to the new monster id
      setRowQuantities(prev => {
        const qty = prev[monster.id];
        if (!qty || qty <= 1) return prev;
        const next = { ...prev };
        delete next[monster.id];
        next[altMonster!.id] = qty;
        return next;
      });
      setResults(prev => prev.map((m) => m.id === monster.id ? altMonster! : m));
    } finally {
      isTogglingRef.current = false;
    }
  }, [t]);

  // Filter campaign players by query
  const matchedPlayers = query.trim() && campaignPlayers
    ? campaignPlayers.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const handleManualSubmit = () => {
    const name = manualName.trim();
    if (!name || !onManualAdd) return;
    const hp = manualHp !== "" ? parseInt(manualHp, 10) : undefined;
    const ac = manualAc !== "" ? parseInt(manualAc, 10) : undefined;
    const init = manualInit !== "" ? parseInt(manualInit, 10) : undefined;
    onManualAdd({ name, hp: hp !== undefined && !isNaN(hp) ? hp : undefined, ac: ac !== undefined && !isNaN(ac) ? ac : undefined, initiative: init !== undefined && !isNaN(init) ? init : undefined, role: manualRole });
    setManualName("");
    setManualHp("");
    setManualAc("");
    setManualInit("");
    setManualRole("monster");
    setManualOpen(false);
  };

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
      const monster = results[activeIndex];
      const qty = rowQuantities[monster.id] ?? 1;
      if (qty > 1 && onSelectMonsterGroup) {
        handleSelectGroup(monster, qty);
      } else {
        handleSelect(monster);
      }
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
    <div ref={panelRef} className="space-y-1">
      {/* Label + filter toggle + manual add */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-foreground text-sm font-semibold block">
          {t("search_monsters")}
        </label>
        <div className="flex items-center gap-2">
          {showManualAdd && onManualAdd && (
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors ${
                manualOpen ? "text-gold border-gold/50 bg-gold/10" : "text-foreground/70 border-border hover:text-gold hover:border-gold/40 hover:bg-gold/5"
              }`}
              data-tour-id="add-row"
            >
              <span className="text-sm">+</span>
              {t("omnibar_manual_add")}
            </button>
          )}
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
                {(crMin !== "" || crMax !== "" ? 1 : 0) + selectedTypes.size + (sourceFilter !== "all" ? 1 : 0)}
              </span>
            )}
            <span className="text-[10px]">{filtersOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSearchBlur}
          placeholder={placeholder ?? t("search_monsters_placeholder")}
          className="w-full bg-card border border-gold/30 rounded px-3 py-2 text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 focus:border-gold/60 transition-colors"
          autoFocus
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
          {/* Version filter (2014 / 2024) */}
          {onRulesetChange && (
            <div>
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                {t("search_filter_version")}
              </p>
              <RulesetSelector value={rulesetVersion} onChange={onRulesetChange} label="" />
            </div>
          )}
          {/* Source filter */}
          <div>
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider mb-1.5">
              {tCompendium("filter_source")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "srd", "complete", "mad"] as const).map((s) => {
                const isLocked = s === "complete" && !extendedActive;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        toast.info(tCompendium("complete_beta_only"));
                        return;
                      }
                      sourceManuallyChanged.current = true;
                      setSourceFilter(s);
                    }}
                    className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all border inline-flex items-center gap-1 ${
                      isLocked
                        ? "bg-white/[0.02] text-muted-foreground/40 border-white/[0.04] cursor-not-allowed"
                        : sourceFilter === s
                          ? "bg-gold/20 text-gold border-gold/40"
                          : "bg-white/[0.04] text-muted-foreground border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    {isLocked && <Lock className="w-3 h-3" />}
                    {tCompendium(`filter_source_${s}`)}
                  </button>
                );
              })}
            </div>
          </div>

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

      {/* Hidden checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isHidden}
          onChange={(e) => setIsHidden(e.target.checked)}
          className="w-4 h-4 rounded border-border bg-white/[0.06] accent-gold"
          data-testid="add-hidden-checkbox"
        />
        <span className="text-xs text-muted-foreground">{t("add_as_hidden")}</span>
      </label>

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
            const rowQty = rowQuantities[monster.id] ?? 1;
            return (
              <li
                key={monster.id}
                id={`monster-result-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
                className={`px-3 py-2 transition-colors ${
                  idx === activeIndex
                    ? "bg-white/[0.10]"
                    : "hover:bg-white/[0.04]"
                }`}
                data-testid={`srd-result-${monster.id}`}
                {...(idx === 0 ? { "data-tour-id": "monster-result" } : {})}
              >
                {/* Single inline row: token + info + ficha + stepper + add */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Token — clickable to open stat card */}
                  <button
                    type="button"
                    onClick={() => { if (useTourStore.getState().isActive) return; pinCard("monster", monster.id, monster.ruleset_version); }}
                    className="shrink-0 rounded-full hover:ring-2 hover:ring-gold/40 transition-all cursor-pointer"
                    aria-label={t("setup_view_card_aria", { name: monster.name })}
                    title={t("setup_view_card_aria", { name: monster.name })}
                  >
                    <MonsterToken
                      tokenUrl={monster.token_url}
                      fallbackTokenUrl={monster.fallback_token_url}
                      creatureType={monster.type}
                      name={monster.name}
                      size={36}
                    />
                  </button>
                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-foreground text-sm font-medium">
                        {monster.name}
                      </span>
                      <CrBadge cr={monster.cr} />
                      {getCrossVersionMonsterId(monster.id) ? (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleVersionToggle(monster, idx); }}
                                className="cursor-pointer hover:ring-1 hover:ring-gold/40 rounded transition-all"
                              >
                                <VersionBadge version={monster.ruleset_version} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {t("switch_version_tooltip", { version: monster.ruleset_version === "2014" ? "2024" : "2014" })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default opacity-60">
                                <VersionBadge version={monster.ruleset_version} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {t("no_alternate_version")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {monster.is_srd === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                          {tImport("badge_external")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/70">
                      <span className="capitalize">{typePrimary}</span>
                      <span>·</span>
                      <span>HP {monster.hit_points}</span>
                      <span>·</span>
                      <span>AC {monster.armor_class}</span>
                    </div>
                  </div>
                  {/* Ver Ficha — icon-only with tooltip */}
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => { if (useTourStore.getState().isActive) return; pinCard("monster", monster.id, monster.ruleset_version); }}
                          className="shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 rounded transition-all border border-transparent hover:border-gold/30"
                          aria-label={t("setup_view_card_aria", { name: monster.name })}
                          data-testid={`ver-ficha-${monster.id}`}
                        >
                          <span aria-hidden>📖</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{t("ver_ficha")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Quantity stepper — always visible when group add is supported */}
                  {onSelectMonsterGroup && (
                    <div className="flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.03] p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRowQuantities((prev) => ({ ...prev, [monster.id]: Math.max(1, rowQty - 1) }))}
                        disabled={rowQty <= 1}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-white/[0.06] text-muted-foreground hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-semibold text-foreground select-none">{rowQty}</span>
                      <button
                        type="button"
                        onClick={() => setRowQuantities((prev) => ({ ...prev, [monster.id]: Math.min(20, (rowQty > 0 ? rowQty : 1) + 1) }))}
                        disabled={rowQty >= 20}
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-white/[0.06] text-muted-foreground hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                  {/* Add button — adaptive label */}
                  <button
                    type="button"
                    onClick={() => {
                      const qty = rowQty > 1 ? rowQty : 1;
                      if (qty === 1 || !onSelectMonsterGroup) {
                        handleSelect(monster);
                      } else {
                        handleSelectGroup(monster, qty);
                      }
                    }}
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      rowQty > 1
                        ? "bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_8px_rgba(147,51,234,0.3)]"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    }`}
                    data-testid={rowQty > 1 ? `add-group-${monster.id}` : `add-one-${monster.id}`}
                    {...(idx === 0 ? { "data-tour-id": "add-monster-btn" } : {})}
                  >
                    {rowQty > 1
                      ? `+${rowQty} ${t("monster_quantity_group_btn")}`
                      : t("setup_add")
                    }
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Campaign player results */}
      {matchedPlayers.length > 0 && onSelectPlayer && (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider px-1">{t("omnibar_players_section")}</p>
          <ul className="bg-card border border-border rounded-md overflow-hidden divide-y divide-white/[0.04]">
            {matchedPlayers.map((player) => (
              <li key={player.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.04] transition-colors">
                <span className="text-lg">⚔</span>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground text-sm font-medium">{player.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                    <span>HP {player.hp}</span>
                    <span>·</span>
                    <span>AC {player.ac}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onSelectPlayer(player); setQuery(""); }}
                  className="px-3 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  {t("setup_add")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty results hint */}
      {query.trim() && results.length === 0 && matchedPlayers.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground/50 text-center py-2">
          {t("search_no_results", { query })}
        </p>
      )}

      {/* Manual add form */}
      {manualOpen && onManualAdd && (
        <div className="p-3 bg-white/[0.04] rounded-md space-y-2 border border-dashed border-border" data-testid="add-row" data-tour-id="add-row" onKeyDown={(e) => { if (e.key === "Enter" && manualName.trim()) handleManualSubmit(); }}>
          <p className="text-xs font-medium text-foreground/80">{t("omnibar_manual_title")}</p>
          <div className="grid grid-cols-5 gap-2">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder={t("add_name_placeholder")}
              className="col-span-5 bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[32px]"
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
              data-testid="add-row-name"
            />
            <input
              type="number"
              value={manualInit}
              onChange={(e) => setManualInit(e.target.value)}
              placeholder={t("setup_col_init")}
              className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm font-mono text-center placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="add-row-init"
            />
            <input
              type="number"
              value={manualHp}
              onChange={(e) => setManualHp(e.target.value)}
              placeholder="HP"
              min={1}
              className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm font-mono text-center placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="add-row-hp"
            />
            <input
              type="number"
              value={manualAc}
              onChange={(e) => setManualAc(e.target.value)}
              placeholder="AC"
              min={0}
              className="bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm font-mono text-center placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/60 min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-testid="add-row-ac"
            />
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = COMBATANT_ROLE_CYCLE.indexOf(manualRole);
                      setManualRole(COMBATANT_ROLE_CYCLE[(idx + 1) % COMBATANT_ROLE_CYCLE.length]);
                    }}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded border transition-all shrink-0 min-h-[32px] ${MANUAL_ROLE_CONFIG[manualRole].color} ${MANUAL_ROLE_CONFIG[manualRole].bg}`}
                    data-testid="add-row-role"
                  >
                    {(() => { const Icon = MANUAL_ROLE_CONFIG[manualRole].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                    {t(`setup_role_${manualRole}`)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t("setup_role_tooltip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={!manualName.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[32px]"
              data-testid="add-row-btn"
            >
              {t("setup_add")}
            </button>
          </div>
        </div>
      )}

      {/* Import CTA footer */}
      {!extendedActive && (
        <button
          type="button"
          onClick={() => setGateOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground/60 hover:text-gold hover:bg-gold/5 rounded transition-colors border-t border-white/[0.04]"
          data-tour-id="import-content"
        >
          <span>📥</span>
          {tImport("cta_discover")}
        </button>
      )}
      {extendedActive && !hasImported && (
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground/60 hover:text-gold hover:bg-gold/5 rounded transition-colors border-t border-white/[0.04]"
          data-tour-id="import-content"
        >
          <span>📥</span>
          {tImport("cta_import_more")}
        </button>
      )}

      {/* Modals */}
      <ExternalContentGate open={gateOpen} onOpenChange={setGateOpen} />
      <ImportContentModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
