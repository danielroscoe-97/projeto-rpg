"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { trackEvent } from "@/lib/analytics/track";
import {
  searchMonsters,
  searchSpells,
  searchItems,
  searchFeats,
  searchBackgrounds,
  getAllConditions,
} from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdStore } from "@/lib/stores/srd-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { toSlug } from "@/lib/utils/monster";
import { isFullDataMode } from "@/lib/srd/srd-mode";
import type { SrdMonster, SrdSpell, SrdCondition } from "@/lib/srd/srd-loader";
import { Skull, Sparkles, HeartPulse, X, Sword, Star, ScrollText } from "lucide-react";

const MAX_RESULTS_PER_GROUP = 5;
const DEBOUNCE_MS = 150;

type SearchFilter = "all" | "monster" | "spell" | "condition" | "item" | "feat" | "background";

// ── Bilingual labels ───────────────────────────────────────────────
const LABELS = {
  en: {
    label: "Search compendium",
    placeholder: "Search monsters, spells, items, feats...",
    loading: "Loading SRD data...",
    no_results: "No results found.",
    hint: "Start typing to search the compendium",
    hint_navigate: "navigate",
    hint_select: "select",
    hint_close: "close",
    filter_all: "All",
    group_monsters: "Monsters",
    group_spells: "Spells",
    group_conditions: "Conditions",
    group_items: "Items",
    group_feats: "Feats",
    group_backgrounds: "Backgrounds",
    cantrip: "Cantrip",
    level_n: (n: number) => `Level ${n}`,
  },
  "pt-BR": {
    label: "Buscar compêndio",
    placeholder: "Buscar monstros, magias, itens, talentos...",
    loading: "Carregando dados SRD...",
    no_results: "Nenhum resultado encontrado.",
    hint: "Digite para buscar no compêndio",
    hint_navigate: "navegar",
    hint_select: "selecionar",
    hint_close: "fechar",
    filter_all: "Todos",
    group_monsters: "Monstros",
    group_spells: "Magias",
    group_conditions: "Condições",
    group_items: "Itens",
    group_feats: "Talentos",
    group_backgrounds: "Antecedentes",
    cantrip: "Truque",
    level_n: (n: number) => `Nível ${n}`,
  },
} as const;

// ── Public URL resolver ────────────────────────────────────────────

interface SrdCheckable {
  is_srd?: boolean;
  srd?: boolean;
  basicRules?: boolean;
}

function isSrdContent(item: SrdCheckable): boolean {
  // P3: In public mode (SRD-only data loaded from /srd/*.json), all items
  // are SRD by definition — the whitelist filter already excluded non-SRD.
  // Only check explicit flags when in full data mode (beta testers).
  if (!isFullDataMode()) return true;
  return !!(item.is_srd || item.srd || item.basicRules);
}

function getPublicUrl(
  type: string,
  item: { id: string; name: string } & SrdCheckable,
  locale: "en" | "pt-BR",
): string | null {
  if (!isSrdContent(item)) return null; // non-SRD → modal/floating card
  const isPt = locale === "pt-BR";
  switch (type) {
    case "monster":
      return isPt ? `/monstros/${toSlug(item.name)}` : `/monsters/${toSlug(item.name)}`;
    case "spell":
      return isPt ? `/magias/${toSlug(item.name)}` : `/spells/${toSlug(item.name)}`;
    case "item":
      return isPt ? `/itens/${item.id}` : `/items/${item.id}`;
    case "feat":
      return isPt ? `/talentos/${item.id}` : `/feats/${item.id}`;
    case "background":
      return isPt ? `/antecedentes/${item.id}` : `/backgrounds/${item.id}`;
    default:
      return null;
  }
}

// ── Component ──────────────────────────────────────────────────────

interface PublicCommandPaletteProps {
  locale: "en" | "pt-BR";
}

export function PublicCommandPalette({ locale }: PublicCommandPaletteProps) {
  const l = LABELS[locale];
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state for detail views (non-SRD content shown inline)
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<SrdCondition | null>(null);

  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const isLoading = useSrdStore((s) => s.is_loading);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // P7: Memoize search results — avoid re-running 6 Fuse.js queries on unrelated state changes
  const {
    monsterResults,
    spellResults,
    conditionResults,
    itemResults,
    featResults,
    backgroundResults,
  } = useMemo(() => {
    const showMonsters = filter === "all" || filter === "monster";
    const showSpells = filter === "all" || filter === "spell";
    const showConditions = filter === "all" || filter === "condition";
    const showItems = filter === "all" || filter === "item";
    const showFeats = filter === "all" || filter === "feat";
    const showBackgrounds = filter === "all" || filter === "background";

    return {
      monsterResults: debouncedQuery && showMonsters
        ? searchMonsters(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
        : [],
      spellResults: debouncedQuery && showSpells
        ? searchSpells(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
        : [],
      conditionResults: debouncedQuery && showConditions
        ? getAllConditions()
            .filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
            .slice(0, MAX_RESULTS_PER_GROUP)
        : [],
      itemResults: debouncedQuery && showItems
        ? searchItems(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
        : [],
      featResults: debouncedQuery && showFeats
        ? searchFeats(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
        : [],
      // P1: Filter out non-SRD backgrounds — "background" is not a supported
      // PinnedCard type, so there's no inline fallback. Non-SRD backgrounds
      // would be a dead-end click with no action.
      backgroundResults: debouncedQuery && showBackgrounds
        ? searchBackgrounds(debouncedQuery)
            .filter((r) => isSrdContent(r.item))
            .slice(0, MAX_RESULTS_PER_GROUP)
        : [],
    };
  }, [debouncedQuery, filter]);

  const totalResults =
    monsterResults.length +
    spellResults.length +
    conditionResults.length +
    itemResults.length +
    featResults.length +
    backgroundResults.length;
  const hasResults = totalResults > 0;

  // Track search queries (fires once per final debounced query)
  const lastTrackedQuery = useRef("");
  useEffect(() => {
    if (debouncedQuery && debouncedQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = debouncedQuery;
      trackEvent("public:omnisearch", {
        query_length: debouncedQuery.length,
        filter,
        result_count: totalResults,
      });
    }
  }, [debouncedQuery, filter, totalResults]);

  // ESC = full close
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setFilter("all");
  }, []);

  // Backdrop click = soft dismiss (preserves query for reopen)
  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  // Global keyboard shortcuts (Ctrl+K to toggle, ESC to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        // P8: Stop propagation so FloatingCardContainer's ESC handler
        // doesn't also fire and close a pinned card simultaneously
        e.stopImmediatePropagation();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Programmatic open via custom event
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      if (detail?.query) {
        setQuery(detail.query);
        setDebouncedQuery(detail.query);
      }
      setOpen(true);
    }
    window.addEventListener("command-palette:open", handleOpenEvent);
    return () => window.removeEventListener("command-palette:open", handleOpenEvent);
  }, []);

  // ── Select handlers ────────────────────────────────────────────
  const handleSelectMonster = useCallback(
    (monster: SrdMonster) => {
      const url = getPublicUrl("monster", monster, locale);
      if (url) {
        router.push(url);
      } else {
        pinCard("monster", monster.id, monster.ruleset_version);
      }
      handleClose();
    },
    [router, pinCard, handleClose, locale],
  );

  const handleSelectSpell = useCallback(
    (spell: SrdSpell) => {
      const url = getPublicUrl("spell", spell, locale);
      if (url) {
        router.push(url);
      } else {
        setSelectedSpell(spell);
      }
      handleClose();
    },
    [router, handleClose, locale],
  );

  const handleSelectCondition = useCallback(
    (condition: SrdCondition) => {
      setSelectedCondition(condition);
      handleClose();
    },
    [handleClose],
  );

  const handleSelectItem = useCallback(
    (id: string, item: { id: string; name: string; srd?: boolean; basicRules?: boolean }) => {
      const url = getPublicUrl("item", item, locale);
      if (url) {
        router.push(url);
      } else {
        pinCard("item", id, "2014");
      }
      handleClose();
    },
    [router, pinCard, handleClose, locale],
  );

  const handleSelectFeat = useCallback(
    (id: string, item: { id: string; name: string; srd?: boolean; basicRules?: boolean; ruleset_version?: string }) => {
      const url = getPublicUrl("feat", item, locale);
      if (url) {
        router.push(url);
      } else {
        pinCard("feat", id, (item.ruleset_version ?? "2014") as "2014" | "2024");
      }
      handleClose();
    },
    [router, pinCard, handleClose, locale],
  );

  const handleSelectBackground = useCallback(
    (item: { id: string; name: string; srd?: boolean; basicRules?: boolean }) => {
      const url = getPublicUrl("background", item, locale);
      if (url) {
        router.push(url);
      }
      handleClose();
    },
    [router, handleClose, locale],
  );

  // ── Formatting helpers ─────────────────────────────────────────
  function formatCR(cr: string) {
    return cr === "0.125" ? "1/8" : cr === "0.25" ? "1/4" : cr === "0.5" ? "1/2" : cr;
  }

  function formatSpellLevel(level: number) {
    if (level === 0) return l.cantrip;
    return l.level_n(level);
  }

  if (!open)
    return (
      <>
        <SpellDescriptionModal
          spell={selectedSpell}
          open={!!selectedSpell}
          onOpenChange={(v) => !v && setSelectedSpell(null)}
          onPin={
            selectedSpell
              ? () => {
                  pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
                  setSelectedSpell(null);
                }
              : undefined
          }
        />
        <ConditionRulesModal
          condition={selectedCondition}
          open={!!selectedCondition}
          onOpenChange={(v) => !v && setSelectedCondition(null)}
        />
      </>
    );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10060] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-[10061] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4 pointer-events-none">
        <Command
          className="w-full max-w-[640px] rounded-xl border border-white/10 bg-surface-secondary shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150 pointer-events-auto"
          label={l.label}
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.target && !(e.target instanceof HTMLElement)) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex items-center border-b border-white/[0.08] px-4">
            <svg
              className="w-4 h-4 text-muted-foreground shrink-0 mr-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={l.placeholder}
              className="flex-1 h-12 bg-transparent text-foreground text-base placeholder:text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={handleClose}
              className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors cursor-pointer"
              aria-label={l.hint_close}
            >
              ESC
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={l.hint_close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.08] overflow-x-auto scrollbar-hide">
            {([
              { key: "all" as SearchFilter, label: l.filter_all, icon: null },
              { key: "monster" as SearchFilter, label: l.group_monsters, icon: <Skull className="w-3 h-3" /> },
              { key: "spell" as SearchFilter, label: l.group_spells, icon: <Sparkles className="w-3 h-3" /> },
              { key: "item" as SearchFilter, label: l.group_items, icon: <Sword className="w-3 h-3" /> },
              { key: "feat" as SearchFilter, label: l.group_feats, icon: <Star className="w-3 h-3" /> },
              { key: "background" as SearchFilter, label: l.group_backgrounds, icon: <ScrollText className="w-3 h-3" /> },
              { key: "condition" as SearchFilter, label: l.group_conditions, icon: <HeartPulse className="w-3 h-3" /> },
            ]).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === f.key
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-transparent"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-2">
            {isLoading && (
              <Command.Loading>
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {l.loading}
                </div>
              </Command.Loading>
            )}

            {!isLoading && debouncedQuery && !hasResults && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                {l.no_results}
              </Command.Empty>
            )}

            {!debouncedQuery && !isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {l.hint}
              </div>
            )}

            {/* Monsters */}
            {monsterResults.length > 0 && (
              <Command.Group heading={l.group_monsters}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Skull className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_monsters}
                </div>
                {monsterResults.map((r) => (
                  <Command.Item
                    key={`m:${r.item.id}:${r.item.ruleset_version}`}
                    value={`monster:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handleSelectMonster(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <MonsterToken
                      tokenUrl={r.item.token_url}
                      fallbackTokenUrl={r.item.fallback_token_url}
                      creatureType={r.item.type}
                      name={r.item.name}
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        CR {formatCR(r.item.cr)} · {r.item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isSrdContent(r.item) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          Beta
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          r.item.ruleset_version === "2024"
                            ? "bg-blue-900/40 text-blue-400"
                            : "bg-white/[0.06] text-muted-foreground"
                        }`}
                      >
                        {r.item.ruleset_version}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Spells */}
            {spellResults.length > 0 && (
              <Command.Group heading={l.group_spells}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Sparkles className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_spells}
                </div>
                {spellResults.map((r) => (
                  <Command.Item
                    key={`s:${r.item.id}:${r.item.ruleset_version}`}
                    value={`spell:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handleSelectSpell(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatSpellLevel(r.item.level)} · {r.item.school}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.item.concentration && (
                        <span className="text-[10px] text-amber-400" title="Concentration">
                          ◉
                        </span>
                      )}
                      {r.item.ritual && (
                        <span className="text-[10px] text-teal-400" title="Ritual">
                          ®
                        </span>
                      )}
                      {!isSrdContent(r.item) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          Beta
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          r.item.ruleset_version === "2024"
                            ? "bg-blue-900/40 text-blue-400"
                            : "bg-white/[0.06] text-muted-foreground"
                        }`}
                      >
                        {r.item.ruleset_version}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Conditions */}
            {conditionResults.length > 0 && (
              <Command.Group heading={l.group_conditions}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <HeartPulse className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_conditions}
                </div>
                {conditionResults.map((c) => (
                  <Command.Item
                    key={`c:${c.id}`}
                    value={`condition:${c.id}`}
                    onSelect={() => handleSelectCondition(c)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {c.description.split("\n")[0].slice(0, 60)}...
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Items */}
            {itemResults.length > 0 && (
              <Command.Group heading={l.group_items}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Sword className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_items}
                </div>
                {itemResults.map((r) => (
                  <Command.Item
                    key={`i:${r.item.id}`}
                    value={`item:${r.item.id}`}
                    onSelect={() => handleSelectItem(r.item.id, r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.item.type}
                        {r.item.rarity ? ` · ${r.item.rarity}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.item.reqAttune && (
                        <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">
                          ATT
                        </span>
                      )}
                      {!isSrdContent(r.item) && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          Beta
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Feats */}
            {featResults.length > 0 && (
              <Command.Group heading={l.group_feats}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Star className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_feats}
                </div>
                {featResults.map((r) => (
                  <Command.Item
                    key={`f:${r.item.id}`}
                    value={`feat:${r.item.id}`}
                    onSelect={() => handleSelectFeat(r.item.id, r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      {r.item.prerequisite && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.item.prerequisite}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isSrdContent(r.item) ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                          SRD
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          Beta
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Backgrounds */}
            {backgroundResults.length > 0 && (
              <Command.Group heading={l.group_backgrounds}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <ScrollText className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {l.group_backgrounds}
                </div>
                {backgroundResults.map((r) => (
                  <Command.Item
                    key={`bg:${r.item.id}`}
                    value={`background:${r.item.id}`}
                    onSelect={() => handleSelectBackground(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.item.skill_proficiencies.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isSrdContent(r.item) ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                          SRD
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                          Beta
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hints */}
          <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↑↓</kbd>
              {l.hint_navigate}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↵</kbd>
              {l.hint_select}
            </span>
            <span className="hidden lg:flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">esc</kbd>
              {l.hint_close}
            </span>
          </div>
        </Command>
      </div>

      {/* Detail modals (rendered when palette is open too) */}
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={
          selectedSpell
            ? () => {
                pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
                setSelectedSpell(null);
              }
            : undefined
        }
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );
}
