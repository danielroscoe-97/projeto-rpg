"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const PAGE_SIZE = 25;

const SPELL_LEVELS = [
  { value: 0, label: "Cantrip" },
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "5th" },
  { value: 6, label: "6th" },
  { value: 7, label: "7th" },
  { value: 8, label: "8th" },
  { value: 9, label: "9th" },
];

const SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

const CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin",
  "Ranger", "Sorcerer", "Warlock", "Wizard",
];

/** Localized spell level label — resolved inside component via `t()` callback */
function formatSpellLevel(level: number, t: ReturnType<typeof import("next-intl").useTranslations>): string {
  if (level === 0) return t("cantrip");
  return t("spell_level_format", { level });
}

/** Color intensity by spell level for left accent border */
function levelBorderColor(level: number): string {
  if (level === 0) return "border-l-gray-500";
  if (level <= 3) return "border-l-blue-500";
  if (level <= 6) return "border-l-purple-500";
  return "border-l-gold";
}

export function SpellBrowser() {
  const t = useTranslations("compendium");
  const spells = useSrdStore((s) => s.spells);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [levels, setLevels] = useState<Set<number>>(new Set());
  const [schools, setSchools] = useState<Set<string>>(new Set());
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [ritualOnly, setRitualOnly] = useState(false);
  const [concentrationOnly, setConcentrationOnly] = useState(false);
  const [versionFilter, setVersionFilter] = useState<RulesetVersion | "all">("all");

  // Sort
  const [sortBy, setSortBy] = useState<"name" | "level">("name");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Detail modal
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);

  const toggleNumSet = useCallback((set: Set<number>, value: number, setter: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const toggleStrSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    let result = spells;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    if (versionFilter !== "all") {
      result = result.filter((s) => s.ruleset_version === versionFilter);
    }

    if (levels.size > 0) {
      result = result.filter((s) => levels.has(s.level));
    }

    if (schools.size > 0) {
      result = result.filter((s) => schools.has(s.school));
    }

    if (classes.size > 0) {
      result = result.filter((s) =>
        s.classes.some((c) => classes.has(c)),
      );
    }

    if (ritualOnly) result = result.filter((s) => s.ritual);
    if (concentrationOnly) result = result.filter((s) => s.concentration);

    // Sort
    if (sortBy === "level") {
      return [...result].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [spells, nameFilter, versionFilter, levels, schools, classes, ritualOnly, concentrationOnly, sortBy]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="sticky top-[72px] z-10 bg-[#13131e]/95 backdrop-blur-sm border-b border-white/[0.08] -mx-6 px-6 py-3 space-y-3">
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setVisibleCount(PAGE_SIZE); }}
          placeholder={t("search_placeholder")}
          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />

        <div className="flex flex-wrap gap-2">
          {/* Version */}
          <FilterGroup label={t("filter_version")}>
            {(["all", "2014", "2024"] as const).map((v) => (
              <Chip key={v} active={versionFilter === v} onClick={() => { setVersionFilter(v); setVisibleCount(PAGE_SIZE); }}>
                {v === "all" ? t("filter_version_all") : v}
              </Chip>
            ))}
          </FilterGroup>

          {/* Level */}
          <FilterGroup label={t("filter_level")}>
            {SPELL_LEVELS.map((l) => (
              <Chip key={l.value} active={levels.has(l.value)} onClick={() => toggleNumSet(levels, l.value, setLevels)}>
                {l.label}
              </Chip>
            ))}
          </FilterGroup>

          {/* School */}
          <FilterGroup label={t("filter_school")}>
            {SCHOOLS.map((s) => (
              <Chip key={s} active={schools.has(s)} onClick={() => toggleStrSet(schools, s, setSchools)}>
                {s}
              </Chip>
            ))}
          </FilterGroup>

          {/* Class */}
          <FilterGroup label={t("filter_class")}>
            {CLASSES.map((c) => (
              <Chip key={c} active={classes.has(c)} onClick={() => toggleStrSet(classes, c, setClasses)}>
                {c}
              </Chip>
            ))}
          </FilterGroup>

          {/* Toggles */}
          <FilterGroup label="">
            <Chip active={ritualOnly} onClick={() => { setRitualOnly(!ritualOnly); setVisibleCount(PAGE_SIZE); }}>
              ® {t("filter_ritual")}
            </Chip>
            <Chip active={concentrationOnly} onClick={() => { setConcentrationOnly(!concentrationOnly); setVisibleCount(PAGE_SIZE); }}>
              ◉ {t("filter_concentration")}
            </Chip>
          </FilterGroup>
        </div>

        {/* Sort & count */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("showing_results", { count: visible.length, total: filtered.length })}
          </span>
          <div className="flex items-center gap-1">
            <Chip active={sortBy === "name"} onClick={() => setSortBy("name")}>{t("sort_name")}</Chip>
            <Chip active={sortBy === "level"} onClick={() => setSortBy("level")}>{t("sort_level")}</Chip>
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
      ) : (
        <div className="space-y-1">
          {visible.map((spell) => (
            <div
              key={`${spell.id}:${spell.ruleset_version}`}
              className={`rounded-lg border border-white/[0.06] hover:border-white/[0.12] border-l-2 ${levelBorderColor(spell.level)} transition-colors`}
            >
              <button
                type="button"
                onClick={() => setSelectedSpell(spell)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[52px]"
              >
                <span className="font-medium text-sm text-foreground flex-1 min-w-0 truncate">
                  {spell.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatSpellLevel(spell.level, t)} · {spell.school}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
                  {spell.casting_time}
                </span>
                {spell.concentration && (
                  <span className="text-xs text-amber-400" title="Concentration">◉</span>
                )}
                {spell.ritual && (
                  <span className="text-xs text-teal-400" title="Ritual">®</span>
                )}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  spell.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                }`}>
                  {spell.ruleset_version}
                </span>
              </button>
            </div>
          ))}

          {visibleCount < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-3 text-sm text-gold hover:text-gold/80 transition-colors"
            >
              {t("load_more")} ({filtered.length - visibleCount} {t("tab_spells").toLowerCase()})
            </button>
          )}
        </div>
      )}

      {/* Spell detail modal */}
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
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
