"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const PAGE_SIZE = 20;

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

export function MonsterBrowser() {
  const t = useTranslations("compendium");
  const monsters = useSrdStore((s) => s.monsters);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [crRanges, setCrRanges] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [sizes, setSizes] = useState<Set<string>>(new Set());
  const [versionFilter, setVersionFilter] = useState<RulesetVersion | "all">("all");

  // Pagination & expansion
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    let result = monsters;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (versionFilter !== "all") {
      result = result.filter((m) => m.ruleset_version === versionFilter);
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
        // Extract base type before any parenthetical subtypes (e.g. "humanoid (any race)" → "Humanoid")
        const baseType = m.type.split("(")[0].trim();
        const normalized = baseType.charAt(0).toUpperCase() + baseType.slice(1).toLowerCase();
        return types.has(normalized);
      });
    }

    if (sizes.size > 0) {
      result = result.filter((m) => m.size && sizes.has(m.size));
    }

    // Sort by name (spread to avoid mutating the store array)
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [monsters, nameFilter, versionFilter, crRanges, types, sizes]);

  const visible = filtered.slice(0, visibleCount);
  const rowKey = (m: SrdMonster) => `${m.id}:${m.ruleset_version}`;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="sticky top-[72px] z-10 bg-[#13131e]/95 backdrop-blur-sm border-b border-white/[0.08] -mx-6 px-6 py-3 space-y-3">
        {/* Search */}
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setVisibleCount(PAGE_SIZE); }}
          placeholder={t("search_placeholder")}
          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {/* Version toggle */}
          <FilterGroup label={t("filter_version")}>
            {(["all", "2014", "2024"] as const).map((v) => (
              <Chip key={v} active={versionFilter === v} onClick={() => { setVersionFilter(v); setVisibleCount(PAGE_SIZE); }}>
                {v === "all" ? t("filter_version_all") : v}
              </Chip>
            ))}
          </FilterGroup>

          {/* CR ranges */}
          <FilterGroup label={t("filter_cr")}>
            {CR_RANGES.map((r) => (
              <Chip key={r.label} active={crRanges.has(r.label)} onClick={() => toggleSet(crRanges, r.label, setCrRanges)}>
                {r.label}
              </Chip>
            ))}
          </FilterGroup>

          {/* Type */}
          <FilterGroup label={t("filter_type")}>
            {CREATURE_TYPES.map((type) => (
              <Chip key={type} active={types.has(type)} onClick={() => toggleSet(types, type, setTypes)}>
                {type}
              </Chip>
            ))}
          </FilterGroup>

          {/* Size */}
          <FilterGroup label={t("filter_size")}>
            {SIZES.map((s) => (
              <Chip key={s} active={sizes.has(s)} onClick={() => toggleSet(sizes, s, setSizes)}>
                {s}
              </Chip>
            ))}
          </FilterGroup>
        </div>

        {/* Result count */}
        <div className="text-xs text-muted-foreground">
          {t("showing_results", { count: visible.length, total: filtered.length })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
      ) : (
        <div className="space-y-1">
          {visible.map((m) => {
            const key = rowKey(m);
            const isOpen = expandedId === key;
            return (
              <div key={key} className="rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                {/* Row header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px]"
                >
                  <span className="font-medium text-sm text-foreground flex-1 min-w-0 truncate">
                    {m.name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("cr_label")} {formatCR(m.cr)}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                    {m.type}{m.size ? ` · ${m.size}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("hp_label")} {m.hit_points}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("ac_label")} {m.armor_class}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    m.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                  }`}>
                    {m.ruleset_version}
                  </span>
                </button>

                {/* Expanded stat block */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => pinCard("monster", m.id, m.ruleset_version)}
                        className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
                      >
                        📌 {t("pin_card")}
                      </button>
                    </div>
                    <MonsterStatBlock monster={m} variant="inline" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More */}
          {visibleCount < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 text-sm text-gold hover:text-gold/80 transition-colors"
            >
              {t("load_more")} ({filtered.length - visibleCount} {t("tab_monsters").toLowerCase()})
            </button>
          )}
        </div>
      )}
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
