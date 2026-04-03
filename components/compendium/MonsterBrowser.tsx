"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { List as VirtualList, type RowComponentProps } from "react-window";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { MonsterADayBadge } from "@/components/compendium/MonsterADayBadge";
import { useContentAccess } from "@/lib/hooks/use-content-access";
import { ExternalContentGate } from "@/components/import/ExternalContentGate";
import { toast } from "sonner";
import type { SrdMonster } from "@/lib/srd/srd-loader";

type SourceFilter = "all" | "srd" | "complete" | "mad";

const ROW_HEIGHT = 48;

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

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

function parseCR(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

function formatCR(cr: string): string {
  const n = parseFloat(cr);
  if (n === 0.125) return "1/8";
  if (n === 0.25) return "1/4";
  if (n === 0.5) return "1/2";
  return cr;
}

const rowKey = (m: SrdMonster) => `${m.id}:${m.ruleset_version}`;

/* ---- Row props passed via VirtualList rowProps ---- */
interface MonsterRowProps {
  items: SrdMonster[];
  selectedKey: string | null;
  onSelect: (m: SrdMonster) => void;
}

/* ---- Virtualized row component (react-window v2 API) ---- */
function MonsterRow(props: RowComponentProps<MonsterRowProps>) {
  const { index, style, items, selectedKey, onSelect, ariaAttributes } = props;
  const m = items[index];
  if (!m) return null;
  const key = rowKey(m);
  const isSelected = key === selectedKey;

  return (
    <button
      type="button"
      style={style}
      {...ariaAttributes}
      onClick={() => onSelect(m)}
      className={`w-full flex items-center gap-2 px-3 text-left transition-colors duration-150 border-b border-white/[0.04] ${
        isSelected
          ? "bg-gold/10 text-gold"
          : "text-foreground hover:bg-white/[0.06]"
      }`}
    >
      <MonsterToken
        tokenUrl={m.token_url}
        fallbackTokenUrl={m.fallback_token_url}
        creatureType={m.type}
        name={m.name}
        size={36}
        isMonsterADay={!!m.monster_a_day_url}
      />
      <span className="font-medium text-sm flex-1 min-w-0 truncate">
        {m.name}
      </span>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden lg:inline">
        {m.type.split("(")[0].trim()}
      </span>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums w-8 text-right">
        {formatCR(m.cr)}
      </span>
      {m.monster_a_day_url ? (
        <MonsterADayBadge url={m.monster_a_day_url} />
      ) : (
        <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${
          m.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
        }`}>
          {m.ruleset_version}
        </span>
      )}
    </button>
  );
}

/* ---- Main component ---- */

export function MonsterBrowser() {
  const t = useTranslations("compendium");
  const allMonsters = useSrdStore((s) => s.monsters);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const { canAccess, isAuthenticated } = useContentAccess();
  const [gateOpen, setGateOpen] = useState(false);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [crRanges, setCrRanges] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [sizes, setSizes] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Selection (split-panel)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Mobile: show detail view (only used on mobile screens)
  const [mobileDetail, setMobileDetail] = useState(false);

  // List container sizing — read initial height synchronously to avoid 600px flash
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(() => {
    // SSR-safe default; will be corrected by ResizeObserver on mount
    return typeof window !== "undefined" ? window.innerHeight - 300 : 600;
  });

  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    // Read initial height immediately, before any resize events
    setListHeight(el.getBoundingClientRect().height || window.innerHeight - 300);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }, []);

  const isMad = (m: SrdMonster) => !!m.monster_a_day_url;

  const sourceFiltered = useMemo(() => {
    if (sourceFilter === "srd") return allMonsters.filter((m) => m.is_srd === true && !isMad(m));
    if (sourceFilter === "complete") return allMonsters.filter((m) => !isMad(m));
    if (sourceFilter === "mad") return allMonsters.filter((m) => isMad(m));
    // "all" = SRD + MAD (hides non-SRD 5e.tools content by default)
    return allMonsters.filter((m) => m.is_srd !== false || isMad(m));
  }, [allMonsters, sourceFilter]);

  const filtered = useMemo(() => {
    let result = sourceFiltered;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (crRanges.size > 0) {
      const ranges = Array.from(crRanges).map((label) => CR_RANGES.find((r) => r.label === label)!);
      result = result.filter((m) => {
        const cr = parseCR(m.cr);
        return ranges.some((r) => cr >= r.min && cr <= r.max);
      });
    }

    if (types.size > 0) {
      result = result.filter((m) => {
        const baseType = m.type.split("(")[0].trim();
        const normalized = baseType.charAt(0).toUpperCase() + baseType.slice(1).toLowerCase();
        return types.has(normalized);
      });
    }

    if (sizes.size > 0) {
      result = result.filter((m) => m.size && sizes.has(m.size));
    }

    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceFiltered, nameFilter, crRanges, types, sizes]);

  // Derive selected monster; clear selectedKey if filtered out
  const selectedMonster = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((m) => rowKey(m) === selectedKey) ?? null;
  }, [filtered, selectedKey]);

  // F5: Clear selectedKey when monster is filtered out of the list
  useEffect(() => {
    if (selectedKey && !selectedMonster) {
      setSelectedKey(null);
      setMobileDetail(false);
    }
  }, [selectedKey, selectedMonster]);

  // Keyboard navigation (desktop list panel)
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const idx = selectedKey ? filtered.findIndex((m) => rowKey(m) === selectedKey) : -1;
      const next = Math.min(idx + 1, filtered.length - 1);
      if (filtered[next]) setSelectedKey(rowKey(filtered[next]));
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      // F2: was `: 1`, must be `: -1` to match ArrowDown symmetry
      const idx = selectedKey ? filtered.findIndex((m) => rowKey(m) === selectedKey) : -1;
      const prev = Math.max(idx - 1, 0);
      if (filtered[prev]) setSelectedKey(rowKey(filtered[prev]));
    }
  }, [filtered, selectedKey]);

  // F1: Separate handlers — desktop never sets mobileDetail
  const handleDesktopSelect = useCallback((m: SrdMonster) => {
    setSelectedKey(rowKey(m));
  }, []);

  const handleMobileSelect = useCallback((m: SrdMonster) => {
    setSelectedKey(rowKey(m));
    setMobileDetail(true);
  }, []);

  // Stable rowProps for desktop and mobile (separate to avoid cross-contamination)
  const desktopRowProps = useMemo<MonsterRowProps>(() => ({
    items: filtered,
    selectedKey,
    onSelect: handleDesktopSelect,
  }), [filtered, selectedKey, handleDesktopSelect]);

  const mobileRowProps = useMemo<MonsterRowProps>(() => ({
    items: filtered,
    selectedKey,
    onSelect: handleMobileSelect,
  }), [filtered, selectedKey, handleMobileSelect]);

  // ---- Filter bar ----
  const filterBar = (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* Toggle filters — F4: use i18n key */}
      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {t("filters")}
        {(crRanges.size > 0 || types.size > 0 || sizes.size > 0 || sourceFilter !== "all") && (
          <span className="w-1.5 h-1.5 rounded-full bg-gold" />
        )}
      </button>

      {filtersOpen && (
        <div className="space-y-2 pl-1">
          <FilterGroup label={t("filter_source")}>
            {(["all", "srd", "complete", "mad"] as const).map((s) => (
              <Chip
                key={s}
                active={sourceFilter === s}
                onClick={() => {
                  if (s === "complete" && !canAccess) {
                    if (!isAuthenticated) {
                      toast.info(t("login_required_complete"));
                    } else {
                      setGateOpen(true);
                    }
                    return;
                  }
                  setSourceFilter(s);
                }}
              >
                {t(`filter_source_${s}`)}
                {s === "complete" && !canAccess && (
                  <svg className="w-3 h-3 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                )}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_cr")}>
            {CR_RANGES.map((r) => (
              <Chip key={r.label} active={crRanges.has(r.label)} onClick={() => toggleSet(crRanges, r.label, setCrRanges)}>
                {r.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_type")}>
            {CREATURE_TYPES.map((type) => (
              <Chip key={type} active={types.has(type)} onClick={() => toggleSet(types, type, setTypes)}>
                {type}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_size")}>
            {SIZES.map((s) => (
              <Chip key={s} active={sizes.has(s)} onClick={() => toggleSet(sizes, s, setSizes)}>
                {s}
              </Chip>
            ))}
          </FilterGroup>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        {t("showing_results", { count: filtered.length, total: sourceFiltered.length })}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {t("monsters_found_aria", { count: filtered.length })}
      </div>
    </div>
  );

  // ---- MOBILE: detail view (only rendered on mobile screens) ----
  // F1: This early-return is only shown on mobile (<md). Desktop always falls through to the split-panel below.
  if (mobileDetail && selectedMonster) {
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
            onClick={() => pinCard("monster", selectedMonster.id, selectedMonster.ruleset_version)}
            className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 inline-block mr-1"><path d="M8.5 1.5a.5.5 0 0 0-1 0v4.396L4.12 7.673a.5.5 0 0 0-.27.444v1.266a.5.5 0 0 0 .63.484L7.5 9.18V13l-1.354 1.354a.5.5 0 0 0 .354.854h3a.5.5 0 0 0 .354-.854L8.5 13V9.18l3.02.687a.5.5 0 0 0 .63-.484V8.117a.5.5 0 0 0-.27-.444L8.5 5.896V1.5z"/></svg>{t("pin_card")}
          </button>
        </div>
        <MonsterStatBlock monster={selectedMonster} variant="inline" />
      </div>
    );
  }

  // ---- MAIN LAYOUT ----
  return (
    <div>
      {/* Mobile: list view */}
      <div className="md:hidden">
        {filterBar}
        <div className="mt-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
          ) : (
            <VirtualList
              rowComponent={MonsterRow}
              rowCount={filtered.length}
              rowHeight={ROW_HEIGHT}
              rowProps={mobileRowProps}
              style={{ height: Math.min(filtered.length * ROW_HEIGHT, 500) }}
            />
          )}
        </div>
      </div>

      {/* Desktop: split panel (always visible on md+, mobileDetail state is irrelevant here) */}
      <div className="hidden md:grid md:grid-cols-[minmax(320px,2fr)_3fr] gap-0 h-[calc(100vh-180px)] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* LEFT: List panel */}
        <div className="flex flex-col border-r border-white/[0.06] bg-surface-primary/60">
          <div className="p-3 border-b border-white/[0.06] bg-surface-primary/95 backdrop-blur-sm">
            {filterBar}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-white/[0.04] bg-white/[0.02]">
            <span className="flex-1">{t("sort_name")}</span>
            <span className="hidden lg:inline w-20">{t("filter_type")}</span>
            <span className="w-8 text-right">{t("cr_label")}</span>
            <span className="w-10" />
          </div>

          <div ref={listContainerRef} className="flex-1 min-h-0" onKeyDown={handleListKeyDown} tabIndex={0} role="listbox" aria-label={t("tab_monsters")}>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
            ) : (
              <VirtualList
                rowComponent={MonsterRow}
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
          {selectedMonster ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => pinCard("monster", selectedMonster.id, selectedMonster.ruleset_version)}
                  className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 inline-block mr-1"><path d="M8.5 1.5a.5.5 0 0 0-1 0v4.396L4.12 7.673a.5.5 0 0 0-.27.444v1.266a.5.5 0 0 0 .63.484L7.5 9.18V13l-1.354 1.354a.5.5 0 0 0 .354.854h3a.5.5 0 0 0 .354-.854L8.5 13V9.18l3.02.687a.5.5 0 0 0 .63-.484V8.117a.5.5 0 0 0-.27-.444L8.5 5.896V1.5z"/></svg>{t("pin_card")}
                </button>
              </div>
              <MonsterStatBlock monster={selectedMonster} variant="inline" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center space-y-3">
                <svg className="w-12 h-12 mx-auto text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                <p>{t("select_monster")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExternalContentGate open={gateOpen} onOpenChange={setGateOpen} />
    </div>
  );
}

/* ---- Helper components ---- */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">{label}:</span>
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
