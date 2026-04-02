"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { List as VirtualList, type RowComponentProps } from "react-window";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { ItemCard } from "@/components/oracle/ItemCard";
import type { SrdItem, ItemType, ItemRarity } from "@/lib/srd/srd-loader";

const MOBILE_PAGE_SIZE = 50;
const ROW_HEIGHT = 48;

// ── Filter constants ────────────────────────────────────────────────

type MagicFilter = "all" | "mundane" | "magic";

const ITEM_TYPES: { value: ItemType; i18nKey: string }[] = [
  { value: "melee-weapon", i18nKey: "item_type_melee_weapon" },
  { value: "ranged-weapon", i18nKey: "item_type_ranged_weapon" },
  { value: "light-armor", i18nKey: "item_type_light_armor" },
  { value: "medium-armor", i18nKey: "item_type_medium_armor" },
  { value: "heavy-armor", i18nKey: "item_type_heavy_armor" },
  { value: "shield", i18nKey: "item_type_shield" },
  { value: "potion", i18nKey: "item_type_potion" },
  { value: "scroll", i18nKey: "item_type_scroll" },
  { value: "ring", i18nKey: "item_type_ring" },
  { value: "wand", i18nKey: "item_type_wand" },
  { value: "rod", i18nKey: "item_type_rod" },
  { value: "staff", i18nKey: "item_type_staff" },
  { value: "wondrous", i18nKey: "item_type_wondrous" },
  { value: "adventuring-gear", i18nKey: "item_type_adventuring_gear" },
  { value: "tool", i18nKey: "item_type_tool" },
  { value: "instrument", i18nKey: "item_type_instrument" },
  { value: "ammunition", i18nKey: "item_type_ammunition" },
];

const RARITIES: { value: ItemRarity; i18nKey: string }[] = [
  { value: "common", i18nKey: "item_rarity_common" },
  { value: "uncommon", i18nKey: "item_rarity_uncommon" },
  { value: "rare", i18nKey: "item_rarity_rare" },
  { value: "very rare", i18nKey: "item_rarity_very_rare" },
  { value: "legendary", i18nKey: "item_rarity_legendary" },
  { value: "artifact", i18nKey: "item_rarity_artifact" },
];

// ── Rarity helpers ──────────────────────────────────────────────────

function rarityBorderColor(rarity: ItemRarity): string {
  switch (rarity) {
    case "none": return "border-l-gray-600";
    case "common": return "border-l-gray-400";
    case "uncommon": return "border-l-green-500";
    case "rare": return "border-l-blue-500";
    case "very rare": return "border-l-purple-500";
    case "legendary": return "border-l-[#d4a853]";
    case "artifact": return "border-l-red-500";
    default: return "border-l-gray-600";
  }
}

function rarityBadgeClass(rarity: ItemRarity): string {
  switch (rarity) {
    case "common": return "bg-gray-800/60 text-gray-400";
    case "uncommon": return "bg-green-900/40 text-green-400";
    case "rare": return "bg-blue-900/40 text-blue-400";
    case "very rare": return "bg-purple-900/40 text-purple-400";
    case "legendary": return "bg-amber-900/40 text-gold";
    case "artifact": return "bg-red-900/40 text-red-400";
    default: return "bg-white/[0.06] text-muted-foreground";
  }
}

const RARITY_ORDER: Record<string, number> = {
  none: 0, common: 1, uncommon: 2, rare: 3,
  "very rare": 4, legendary: 5, artifact: 6, varies: 7, unknown: 8,
};

const rowKey = (item: SrdItem) => item.id;

/* ---- Row props passed via VirtualList rowProps ---- */
interface ItemRowProps {
  items: SrdItem[];
  selectedKey: string | null;
  onSelect: (item: SrdItem) => void;
  t: ReturnType<typeof import("next-intl").useTranslations>;
}

/* ---- Virtualized row component (react-window v2 API) ---- */
function ItemRow(props: RowComponentProps<ItemRowProps>) {
  const { index, style, items, selectedKey, onSelect, t, ariaAttributes } = props;
  const item = items[index];
  if (!item) return null;
  const key = rowKey(item);
  const isSelected = key === selectedKey;

  return (
    <button
      type="button"
      style={style}
      {...ariaAttributes}
      onClick={() => onSelect(item)}
      className={`w-full flex items-center gap-2 px-3 text-left transition-colors duration-150 border-b border-white/[0.04] border-l-2 ${rarityBorderColor(item.rarity)} ${
        isSelected
          ? "bg-gold/10 text-gold"
          : "text-foreground hover:bg-white/[0.06]"
      }`}
    >
      <span className="font-medium text-sm flex-1 min-w-0 truncate">
        {item.name}
      </span>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden lg:inline">
        {t(`item_type_${item.type.replace(/-/g, "_")}`)}
      </span>
      {item.isMagic && item.rarity !== "none" && (
        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${rarityBadgeClass(item.rarity)}`}>
          {t(`item_rarity_${item.rarity.replace(/\s+/g, "_")}`)}
        </span>
      )}
      {item.reqAttune && (
        <span className="text-[10px] text-amber-400" title={t("item_requires_attunement")}>◈</span>
      )}
      {item.edition === "one" && (
        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/40 text-blue-400">
          2024
        </span>
      )}
    </button>
  );
}

// ── Component ───────────────────────────────────────────────────────

export function ItemBrowser() {
  const t = useTranslations("compendium");
  const items = useSrdStore((s) => s.items);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [magicFilter, setMagicFilter] = useState<MagicFilter>("all");
  const [types, setTypes] = useState<Set<ItemType>>(new Set());
  const [rarities, setRarities] = useState<Set<ItemRarity>>(new Set());
  const [attuneOnly, setAttuneOnly] = useState(false);
  const [editionFilter, setEditionFilter] = useState<"all" | "classic" | "one">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<"name" | "value" | "rarity">("name");

  // Selection (split-panel)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  // Mobile pagination
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_PAGE_SIZE);

  // Desktop list height
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setListHeight(entry.contentRect.height);
    });
    observer.observe(el);
    setListHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const toggleSet = useCallback(<T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setMobileVisibleCount(MOBILE_PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    let result = items;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (magicFilter === "mundane") result = result.filter((i) => !i.isMagic);
    else if (magicFilter === "magic") result = result.filter((i) => i.isMagic);
    if (types.size > 0) result = result.filter((i) => types.has(i.type));
    if (rarities.size > 0) result = result.filter((i) => rarities.has(i.rarity));
    if (attuneOnly) result = result.filter((i) => i.reqAttune != null);
    if (editionFilter !== "all") result = result.filter((i) => i.edition === editionFilter);

    const sorted = [...result];
    if (sortBy === "value") sorted.sort((a, b) => (a.value ?? 0) - (b.value ?? 0) || a.name.localeCompare(b.name));
    else if (sortBy === "rarity") sorted.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0) || a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [items, nameFilter, magicFilter, types, rarities, attuneOnly, editionFilter, sortBy]);

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((i) => rowKey(i) === selectedKey) ?? null;
  }, [filtered, selectedKey]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const idx = selectedKey ? filtered.findIndex((i) => rowKey(i) === selectedKey) : -1;
      const next = Math.min(idx + 1, filtered.length - 1);
      if (filtered[next]) setSelectedKey(rowKey(filtered[next]));
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = selectedKey ? filtered.findIndex((i) => rowKey(i) === selectedKey) : -1;
      const prev = Math.max(idx - 1, 0);
      if (filtered[prev]) setSelectedKey(rowKey(filtered[prev]));
    }
  }, [filtered, selectedKey]);

  const handleDesktopSelect = useCallback((item: SrdItem) => {
    setSelectedKey(rowKey(item));
  }, []);

  const handleMobileSelect = useCallback((item: SrdItem) => {
    setSelectedKey(rowKey(item));
    setMobileDetail(true);
  }, []);

  const hasActiveFilters = types.size > 0 || rarities.size > 0 || attuneOnly || editionFilter !== "all";
  const showMagicFilters = magicFilter !== "mundane";

  // Row props for virtual list
  const desktopRowProps = useMemo<ItemRowProps>(() => ({
    items: filtered, selectedKey, onSelect: handleDesktopSelect, t,
  }), [filtered, selectedKey, handleDesktopSelect, t]);

  // ── Filter bar ────────────────────────────────────────────────────
  const filterBar = (
    <div className="space-y-2">
      {/* Magic toggle */}
      <div className="flex items-center gap-1">
        {(["all", "mundane", "magic"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => { setMagicFilter(v); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all min-h-[36px] ${
              magicFilter === v
                ? v === "magic"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : v === "mundane"
                    ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                    : "bg-gold/20 text-gold border border-gold/30"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            {t(`filter_${v}`)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}
          placeholder={t("search_placeholder")}
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* Toggle filters */}
      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {t("filters")}
        {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
      </button>

      {filtersOpen && (
        <div className="space-y-2 pl-1">
          <FilterGroup label={t("filter_version")}>
            {(["all", "classic", "one"] as const).map((v) => (
              <Chip key={v} active={editionFilter === v} onClick={() => { setEditionFilter(v); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}>
                {v === "all" ? t("filter_version_all") : v === "classic" ? "2014" : "2024"}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_type")}>
            {ITEM_TYPES.map((it) => (
              <Chip key={it.value} active={types.has(it.value)} onClick={() => toggleSet(types, it.value, setTypes)}>
                {t(it.i18nKey)}
              </Chip>
            ))}
          </FilterGroup>

          {showMagicFilters && (
            <FilterGroup label={t("filter_rarity")}>
              {RARITIES.map((r) => (
                <Chip key={r.value} active={rarities.has(r.value)} onClick={() => toggleSet(rarities, r.value, setRarities)}>
                  {t(r.i18nKey)}
                </Chip>
              ))}
            </FilterGroup>
          )}

          {showMagicFilters && (
            <FilterGroup label="">
              <Chip active={attuneOnly} onClick={() => { setAttuneOnly(!attuneOnly); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}>
                ◈ {t("filter_attunement")}
              </Chip>
            </FilterGroup>
          )}
        </div>
      )}

      {/* Sort & count */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {t("showing_results", { count: filtered.length, total: items.length })}
        </span>
        <div className="sr-only" role="status" aria-live="polite">
          {t("items_found_aria", { count: filtered.length })}
        </div>
        <div className="flex items-center gap-1">
          <Chip active={sortBy === "name"} onClick={() => setSortBy("name")}>{t("sort_name")}</Chip>
          <Chip active={sortBy === "value"} onClick={() => setSortBy("value")}>{t("sort_value")}</Chip>
          <Chip active={sortBy === "rarity"} onClick={() => setSortBy("rarity")}>{t("sort_rarity")}</Chip>
        </div>
      </div>
    </div>
  );

  // ── Non-virtual item row (for mobile) ─────────────────────────────
  const renderItemRow = (item: SrdItem, onSelect: (i: SrdItem) => void) => {
    const key = rowKey(item);
    const isSelected = key === selectedKey;

    return (
      <button
        key={key}
        type="button"
        onClick={() => onSelect(item)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 border-b border-white/[0.04] border-l-2 ${rarityBorderColor(item.rarity)} ${
          isSelected
            ? "bg-gold/10 text-gold"
            : "text-foreground hover:bg-white/[0.06]"
        }`}
      >
        <span className="font-medium text-sm flex-1 min-w-0 truncate">
          {item.name}
        </span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden lg:inline">
          {t(`item_type_${item.type.replace(/-/g, "_")}`)}
        </span>
        {item.isMagic && item.rarity !== "none" && (
          <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${rarityBadgeClass(item.rarity)}`}>
            {t(`item_rarity_${item.rarity.replace(/\s+/g, "_")}`)}
          </span>
        )}
        {item.reqAttune && (
          <span className="text-[10px] text-amber-400" title={t("item_requires_attunement")}>◈</span>
        )}
        {item.edition === "one" && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-900/40 text-blue-400">
            2024
          </span>
        )}
      </button>
    );
  };

  const mobileVisible = filtered.slice(0, mobileVisibleCount);

  // ── Mobile detail view ────────────────────────────────────────────
  if (mobileDetail && selectedItem) {
    return (
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileDetail(false)}
          className="flex items-center gap-1.5 text-sm text-gold mb-4 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {t("back_to_list")}
        </button>
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => pinCard("item", selectedItem.id, selectedItem.edition === "one" ? "2024" : "2014")}
            className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
          >
            📌 {t("pin_card")}
          </button>
        </div>
        <ItemCard item={selectedItem} variant="inline" />
      </div>
    );
  }

  // ── MAIN LAYOUT ───────────────────────────────────────────────────
  return (
    <div>
      {/* Mobile: list view */}
      <div className="md:hidden">
        {filterBar}
        <div className="mt-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {mobileVisible.map((item) => renderItemRow(item, handleMobileSelect))}
              {mobileVisibleCount < filtered.length && (
                <button
                  type="button"
                  onClick={() => setMobileVisibleCount((c) => c + MOBILE_PAGE_SIZE)}
                  className="w-full py-3 text-sm text-gold hover:text-gold/80 transition-colors"
                >
                  {t("load_more")} ({filtered.length - mobileVisibleCount})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: split panel */}
      <div className="hidden md:grid md:grid-cols-[minmax(320px,2fr)_3fr] gap-0 h-[calc(100vh-180px)] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* LEFT: List panel */}
        <div className="flex flex-col border-r border-white/[0.06] bg-surface-primary/60">
          <div className="p-3 border-b border-white/[0.06] bg-surface-primary/95 backdrop-blur-sm">
            {filterBar}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-white/[0.04] bg-white/[0.02]">
            <span className="flex-1">{t("sort_name")}</span>
            <span className="hidden lg:inline w-24 text-right">{t("filter_type")}</span>
            <span className="w-16 text-right">{t("filter_rarity")}</span>
          </div>

          <div ref={listContainerRef} className="flex-1 min-h-0" onKeyDown={handleListKeyDown} tabIndex={0} role="listbox" aria-label={t("tab_items")}>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
            ) : (
              <VirtualList
                rowComponent={ItemRow}
                rowCount={filtered.length}
                rowHeight={ROW_HEIGHT}
                rowProps={desktopRowProps}
                style={{ height: listHeight }}
              />
            )}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="overflow-y-auto bg-surface-deep/80">
          {selectedItem ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => pinCard("item", selectedItem.id, selectedItem.edition === "one" ? "2024" : "2014")}
                  className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
                >
                  📌 {t("pin_card")}
                </button>
              </div>
              <ItemCard item={selectedItem} variant="inline" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center space-y-3">
                <svg className="w-12 h-12 mx-auto text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <p>{t("select_item")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Helper components ---- */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">{label}:</span>}
      {children}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all min-h-[28px] ${
        active
          ? "bg-gold/20 text-gold border border-gold/30"
          : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}
