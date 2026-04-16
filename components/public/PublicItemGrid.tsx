"use client";

import { useState, useMemo, useCallback } from "react";
import { LanguageToggle } from "@/components/public/shared/LanguageToggle";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import { CompendiumSearchInput } from "@/components/public/shared/CompendiumSearchInput";
import { CollapseSection } from "@/components/public/shared/CollapseSection";

/* ── Constants ── */

const TYPE_GROUPS = {
  weapons: ["melee-weapon", "ranged-weapon", "ammunition"],
  armor: ["light-armor", "medium-armor", "heavy-armor", "shield"],
  magicItems: ["wand", "rod", "ring", "scroll", "potion", "wondrous"],
  equipment: ["adventuring-gear", "artisan-tools", "tool", "gaming-set", "instrument", "spellcasting-focus"],
  other: ["vehicle", "mount", "trade-good", "food-drink", "other"],
} as const;

const ALL_TYPE_GROUP_KEYS = Object.keys(TYPE_GROUPS) as (keyof typeof TYPE_GROUPS)[];

const RARITY_ORDER: Record<string, number> = {
  none: 0, common: 1, uncommon: 2, rare: 3, "very rare": 4, legendary: 5, artifact: 6,
};

const RARITY_ROW_BORDER: Record<string, string> = {
  none: "border-l-gray-600",
  common: "border-l-gray-400",
  uncommon: "border-l-green-500",
  rare: "border-l-blue-500",
  "very rare": "border-l-purple-500",
  legendary: "border-l-gold",
  artifact: "border-l-red-500",
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-gray-800/60 text-gray-400",
  uncommon: "bg-green-900/40 text-green-400",
  rare: "bg-blue-900/40 text-blue-400",
  "very rare": "bg-purple-900/40 text-purple-400",
  legendary: "bg-amber-900/40 text-gold",
  artifact: "bg-red-900/40 text-red-400",
};

const PAGE_SIZE = 60;

/* ── Labels ── */

const LABELS = {
  en: {
    search: "Search items by name...",
    filters: "Filters",
    items: "items",
    all: "All",
    magic: "Magic",
    mundane: "Mundane",
    clearFilters: "Clear all filters",
    noResults: "No items match your filters",
    weapons: "Weapons", armor: "Armor", magicItems: "Magic Items",
    equipment: "Equipment", other: "Other",
    type: "Type:",
    rarity: "Rarity:",
    name: "Name",
    sortName: "Name", sortValue: "Value", sortRarity: "Rarity",
    selectItem: "Select an item to view details",
    showMore: "Show more",
    attunement: "Attunement",
    reqAttune: "Requires Attunement",
    cost: "Cost",
    weight: "Weight",
    damage: "Damage",
    properties: "Properties",
    ac: "AC",
    charges: "Charges",
    recharge: "Recharge",
    bonusWeapon: "Weapon Bonus",
    bonusAc: "AC Bonus",
    cursed: "Cursed",
    sentient: "Sentient",
  },
  "pt-BR": {
    search: "Buscar itens pelo nome...",
    filters: "Filtros",
    items: "itens",
    all: "Todos",
    magic: "Mágicos",
    mundane: "Mundanos",
    clearFilters: "Limpar todos os filtros",
    noResults: "Nenhum item corresponde aos filtros",
    weapons: "Armas", armor: "Armaduras", magicItems: "Itens Mágicos",
    equipment: "Equipamento", other: "Outros",
    type: "Tipo:",
    rarity: "Raridade:",
    name: "Nome",
    sortName: "Nome", sortValue: "Valor", sortRarity: "Raridade",
    selectItem: "Selecione um item para ver detalhes",
    showMore: "Mostrar mais",
    attunement: "Sintonização",
    reqAttune: "Requer Sintonização",
    cost: "Custo",
    weight: "Peso",
    damage: "Dano",
    properties: "Propriedades",
    ac: "CA",
    charges: "Cargas",
    recharge: "Recarga",
    bonusWeapon: "Bônus de Arma",
    bonusAc: "Bônus de CA",
    cursed: "Amaldiçoado",
    sentient: "Senciente",
  },
};

type Locale = "en" | "pt-BR";
type SortKey = "name" | "value" | "rarity";

/* ── Helpers ── */

function formatTypeName(type: string): string {
  return type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const RARITY_PT: Record<string, string> = {
  none: "Comum", common: "Comum", uncommon: "Incomum", rare: "Raro",
  "very rare": "Muito Raro", legendary: "Lendário", artifact: "Artefato",
};

function translateRarity(rarity: string, locale: Locale, short?: boolean): string {
  if (locale === "pt-BR") return short && rarity === "very rare" ? "M.Raro" : (RARITY_PT[rarity] ?? rarity);
  if (short && rarity === "very rare") return "V.Rare";
  return rarity === "very rare" ? "Very Rare" : rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function formatGp(cp?: number): string {
  if (!cp) return "—";
  if (cp >= 100) return `${(cp / 100).toLocaleString()} gp`;
  if (cp >= 10) return `${(cp / 10).toLocaleString()} sp`;
  return `${cp} cp`;
}

/* ── Item type ── */

interface ItemEntry {
  id: string;
  name: string;
  namePt?: string;
  type: string;
  rarity: string;
  isMagic: boolean;
  value?: number;
  weight?: number;
  entries: string[];
  reqAttune?: boolean | string;
  edition?: string;
  ac?: number;
  dmg1?: string;
  dmgType?: string;
  property?: string[];
  range?: string;
  weaponCategory?: string;
  charges?: number;
  recharge?: string;
  bonusWeapon?: string;
  bonusAc?: string;
  curse?: boolean;
  sentient?: boolean;
}

interface PublicItemGridProps {
  items: ItemEntry[];
  locale?: Locale;
}

/* ── Component ── */

export function PublicItemGrid({ items, locale = "en" }: PublicItemGridProps) {
  const [descLang, setDescLang] = useLocalePreference(locale);
  const isPt = descLang === "pt-BR";
  const l = LABELS[descLang];

  /** Display name for an item based on current locale */
  const dn = useCallback((item: ItemEntry) => isPt ? (item.namePt ?? item.name) : item.name, [isPt]);

  const [query, setQuery] = useState("");
  const [magicFilter, setMagicFilter] = useState<"all" | "magic" | "mundane">("all");
  const [typeGroupFilter, setTypeGroupFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const activeFilterCount =
    (magicFilter !== "all" ? 1 : 0) + (typeGroupFilter ? 1 : 0) + (rarityFilter ? 1 : 0);

  /* ── Filtering + sorting ── */
  const filtered = useMemo(() => {
    let result = items;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.namePt && i.namePt.toLowerCase().includes(q)));
    }
    if (magicFilter === "magic") result = result.filter((i) => i.isMagic);
    else if (magicFilter === "mundane") result = result.filter((i) => !i.isMagic);

    if (typeGroupFilter) {
      const types = TYPE_GROUPS[typeGroupFilter as keyof typeof TYPE_GROUPS];
      if (types) result = result.filter((i) => (types as readonly string[]).includes(i.type));
    }
    if (rarityFilter) result = result.filter((i) => i.rarity === rarityFilter);

    const sorted = [...result];
    if (sortBy === "value") sorted.sort((a, b) => (a.value ?? 0) - (b.value ?? 0) || dn(a).localeCompare(dn(b)));
    else if (sortBy === "rarity") sorted.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0) || dn(a).localeCompare(dn(b)));
    else sorted.sort((a, b) => dn(a).localeCompare(dn(b)));
    return sorted;
  }, [items, query, magicFilter, typeGroupFilter, rarityFilter, sortBy, dn]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return filtered.find((i) => i.id === selectedId) ?? items.find((i) => i.id === selectedId) ?? null;
  }, [filtered, items, selectedId]);

  const hasFilters = !!(query || magicFilter !== "all" || typeGroupFilter || rarityFilter);

  const clearAll = useCallback(() => {
    setQuery(""); setMagicFilter("all"); setTypeGroupFilter(null); setRarityFilter(null);
    setVisibleCount(PAGE_SIZE);
  }, []);

  /* ── Keyboard navigation ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      const idx = selectedId ? filtered.findIndex((i) => i.id === selectedId) : -1;
      const next = Math.min(idx + 1, filtered.length - 1);
      if (filtered[next]) setSelectedId(filtered[next].id);
    } else if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      const idx = selectedId ? filtered.findIndex((i) => i.id === selectedId) : -1;
      const prev = Math.max(idx - 1, 0);
      if (filtered[prev]) setSelectedId(filtered[prev].id);
    }
  }, [filtered, selectedId]);

  const visible = filtered.slice(0, visibleCount);

  /* ── Type group chips ── */
  const typeGroupChips = ALL_TYPE_GROUP_KEYS.map((key) => (
    <button
      key={key}
      type="button"
      aria-pressed={typeGroupFilter === key}
      onClick={() => { setTypeGroupFilter(typeGroupFilter === key ? null : key); setVisibleCount(PAGE_SIZE); }}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        typeGroupFilter === key
          ? "bg-gold text-gray-950"
          : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200"
      }`}
    >
      {l[key]}
    </button>
  ));

  /* ── Rarity chips ── */
  const rarityChips = Object.keys(RARITY_ORDER).filter((r) => r !== "none").map((r) => {
    const label = r === "very rare" ? (descLang === "pt-BR" ? "Muito Raro" : "Very Rare") :
      r.charAt(0).toUpperCase() + r.slice(1);
    const ptLabels: Record<string, string> = {
      common: "Comum", uncommon: "Incomum", rare: "Raro",
      legendary: "Lendário", artifact: "Artefato",
    };
    const displayLabel = descLang === "pt-BR" ? (ptLabels[r] ?? label) : label;
    return (
      <button
        key={r}
        type="button"
        aria-pressed={rarityFilter === r}
        onClick={() => { setRarityFilter(rarityFilter === r ? null : r); setVisibleCount(PAGE_SIZE); }}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          rarityFilter === r
            ? "bg-gold text-gray-950"
            : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200"
        }`}
      >
        {displayLabel}
      </button>
    );
  });

  /* ── Sort buttons ── */
  const sortButtons = (["name", "value", "rarity"] as const).map((key) => {
    const label = key === "name" ? l.sortName : key === "value" ? l.sortValue : l.sortRarity;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={sortBy === key}
        onClick={() => setSortBy(key)}
        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
          sortBy === key
            ? "bg-gold/20 text-gold border border-gold/30"
            : "bg-white/[0.04] text-gray-400 border border-transparent hover:bg-white/[0.08]"
        }`}
      >
        {label}
      </button>
    );
  });

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-4 mb-6 space-y-3">
        <CompendiumSearchInput value={query} onChange={(v) => { setQuery(v); setVisibleCount(PAGE_SIZE); }} placeholder={l.search} />

        {/* Magic / Mundane toggle */}
        <div className="flex items-center gap-1.5">
          {(["all", "magic", "mundane"] as const).map((opt) => {
            const label = opt === "all" ? l.all : opt === "magic" ? l.magic : l.mundane;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={magicFilter === opt}
                onClick={() => { setMagicFilter(opt); setVisibleCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  magicFilter === opt
                    ? opt === "magic" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : opt === "mundane" ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                      : "bg-gold/20 text-gold border border-gold/30"
                    : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">{l.type}</span>
              <div className="flex flex-wrap gap-1.5">{typeGroupChips}</div>
            </div>
            {magicFilter !== "mundane" && (
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">{l.rarity}</span>
                <div className="flex flex-wrap gap-1.5">{rarityChips}</div>
              </div>
            )}
          </div>
        </CollapseSection>

        {/* Count + sort + language */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-400" role="status" aria-live="polite">
            {filtered.length} {l.items}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">{sortButtons}</div>
            <LanguageToggle locale={descLang} onToggle={setDescLang} size="sm" />
          </div>
        </div>
      </div>

      {/* ── Split panel (desktop) ── */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(380px,2fr)_3fr] gap-0 border border-white/[0.06] rounded-xl overflow-hidden" style={{ height: "calc(100vh - 300px)", minHeight: 500 }}>
        {/* LEFT: Item list */}
        <div className="flex flex-col border-r border-white/[0.06] bg-surface-primary/60">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-gray-400 uppercase tracking-wider border-b border-white/[0.04] bg-white/[0.02]">
            <span className="flex-1">{l.name}</span>
            <span className="w-28 text-right">{l.type.replace(":", "")}</span>
            <span className="w-20 text-right">{l.rarity.replace(":", "")}</span>
          </div>

          {/* Scrollable list */}
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="listbox"
            aria-label={descLang === "pt-BR" ? "Lista de itens" : "Items list"}
          >
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">{l.noResults}</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors duration-100 border-b border-white/[0.04] border-l-2 ${RARITY_ROW_BORDER[item.rarity] ?? "border-l-gray-600"} ${
                    selectedId === item.id
                      ? "bg-gold/10 text-gold"
                      : "text-foreground hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">
                    {item.isMagic && <span className="text-gold mr-1">&#10022;</span>}
                    {dn(item)}
                  </span>
                  {isPt && item.namePt && item.namePt !== item.name && (
                    <span className="text-[10px] text-gray-500 italic hidden xl:inline truncate max-w-[120px]">{item.name}</span>
                  )}
                  <span className="text-[11px] text-gray-400 w-28 text-right truncate hidden xl:inline">
                    {formatTypeName(item.type)}
                  </span>
                  {item.rarity !== "none" && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded w-20 text-center ${RARITY_BADGE[item.rarity] ?? "bg-white/[0.06] text-gray-400"}`}>
                      {translateRarity(item.rarity, descLang)}
                    </span>
                  )}
                  {!item.rarity || item.rarity === "none" ? <span className="w-20" /> : null}
                  {item.reqAttune && <span className="text-[10px] text-amber-400" title={l.reqAttune}>&#9672;</span>}
                  {item.edition === "one" && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/40 text-blue-400">2024</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="overflow-y-auto bg-surface-deep/80">
          {selectedItem ? (
            <ItemDetailPanel item={selectedItem} l={l} locale={descLang} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <div className="text-center space-y-3">
                <svg className="w-16 h-16 mx-auto text-gold/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <p>{l.selectItem}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile list ── */}
      <div className="lg:hidden">
        {filtered.length === 0 && hasFilters ? (
          <div className="compendium-empty">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-gray-400 text-lg">{l.noResults}</p>
            <button type="button" onClick={clearAll} className="mt-3 text-gold text-sm hover:underline">{l.clearFilters}</button>
          </div>
        ) : (
          <>
            {/* Mobile list rows */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                  className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${RARITY_ROW_BORDER[item.rarity] ?? "border-l-gray-600"} ${
                    selectedId === item.id ? "bg-gold/10" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground flex-1 min-w-0 truncate">
                      {item.isMagic && <span className="text-gold mr-1">&#10022;</span>}
                      {dn(item)}
                    </span>
                    {item.rarity !== "none" && (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${RARITY_BADGE[item.rarity] ?? ""}`}>
                        {translateRarity(item.rarity, descLang, true)}
                      </span>
                    )}
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${selectedId === item.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-400">{formatTypeName(item.type)}</span>
                    {item.reqAttune && <span className="text-[10px] text-amber-400">&#9672; {l.attunement}</span>}
                  </div>
                  {/* Inline detail on mobile */}
                  {selectedId === item.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
                      <ItemDetailPanel item={item} l={l} locale={descLang} compact />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {visibleCount < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full mt-4 py-3 text-sm text-gold hover:text-gold/80 transition-colors rounded-xl border border-white/[0.06] bg-card/50"
              >
                {l.showMore} ({filtered.length - visibleCount} {l.items})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Item Detail Panel ── */

function ItemDetailPanel({ item, l, locale = "en", compact }: { item: ItemEntry; l: typeof LABELS["en"]; locale?: Locale; compact?: boolean }) {
  const titleSize = compact ? "text-lg" : "text-xl";
  const isPt = locale === "pt-BR";
  const displayName = isPt ? (item.namePt ?? item.name) : item.name;
  const secondaryName = isPt ? item.name : (item.namePt && item.namePt !== item.name ? item.namePt : null);

  return (
    <div className={compact ? "" : "p-5"}>
      {/* Name + badges */}
      <h3 className={`${titleSize} font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-1`}>
        {item.isMagic && <span className="text-gold mr-1.5">&#10022;</span>}
        {displayName}
      </h3>
      {secondaryName && (
        <p className="text-xs text-gray-500 italic mb-2">{secondaryName}</p>
      )}
      {!secondaryName && <div className="mb-2" />}

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[10px] font-medium bg-white/[0.06] text-gray-300 rounded px-2 py-0.5">
          {formatTypeName(item.type)}
          {item.weaponCategory && ` (${item.weaponCategory})`}
        </span>
        {item.rarity !== "none" && (
          <span className={`text-[10px] font-medium rounded px-2 py-0.5 ${RARITY_BADGE[item.rarity] ?? "bg-white/[0.06] text-gray-400"}`}>
            {translateRarity(item.rarity, locale)}
          </span>
        )}
        {item.edition === "one" && (
          <span className="text-[10px] font-medium bg-blue-900/40 text-blue-400 rounded px-2 py-0.5">2024</span>
        )}
        {item.reqAttune && (
          <span className="text-[10px] font-medium bg-purple-900/30 text-purple-300 rounded px-2 py-0.5">
            &#9672; {typeof item.reqAttune === "string" ? item.reqAttune : l.reqAttune}
          </span>
        )}
        {item.curse && (
          <span className="text-[10px] font-medium bg-red-900/40 text-red-400 rounded px-2 py-0.5">{l.cursed}</span>
        )}
        {item.sentient && (
          <span className="text-[10px] font-medium bg-amber-900/40 text-amber-400 rounded px-2 py-0.5">{l.sentient}</span>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm">
        {item.ac != null && <StatRow label={l.ac} value={`${item.ac}`} />}
        {item.dmg1 && <StatRow label={l.damage} value={`${item.dmg1}${item.dmgType ? ` ${item.dmgType}` : ""}`} />}
        {item.range && <StatRow label="Range" value={item.range} />}
        {item.property && item.property.length > 0 && (
          <StatRow label={l.properties} value={item.property.join(", ")} />
        )}
        {item.value != null && item.value > 0 && <StatRow label={l.cost} value={formatGp(item.value)} />}
        {item.weight != null && item.weight > 0 && <StatRow label={l.weight} value={`${item.weight} lb.`} />}
        {item.bonusWeapon && <StatRow label={l.bonusWeapon} value={item.bonusWeapon} />}
        {item.bonusAc && <StatRow label={l.bonusAc} value={item.bonusAc} />}
        {item.charges != null && <StatRow label={l.charges} value={`${item.charges}`} />}
        {item.recharge && <StatRow label={l.recharge} value={item.recharge} />}
      </div>

      {/* Description */}
      {item.entries.length > 0 && (
        <div className="space-y-2">
          <div className="gold-divider" />
          <div className="text-sm text-gray-300 leading-relaxed space-y-2 mt-3">
            {item.entries.map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-1 flex items-baseline gap-1.5">
      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}:</span>
      <span className="text-sm text-foreground font-mono">{value}</span>
    </div>
  );
}
