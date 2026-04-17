"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdContentFilter } from "@/lib/hooks/use-srd-content-filter";
import { useContentAccess } from "@/lib/hooks/use-content-access";
import { ExternalContentGate } from "@/components/import/ExternalContentGate";
import { SpellCard } from "@/components/oracle/SpellCard";
import { VersionBadge } from "@/components/ui/VersionBadge";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";
import { loadSpellNamesPt, getNamePt } from "@/lib/srd/translation-loader";
import { SCHOOL_PT, CLASS_PT } from "@/lib/i18n/spell-labels";
import { toast } from "sonner";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const MOBILE_PAGE_SIZE = 50;

const SPELL_LEVELS = [
  { value: 0, label: "Cantrip", labelPt: "Truque" },
  { value: 1, label: "1st", labelPt: "1\u00ba" },
  { value: 2, label: "2nd", labelPt: "2\u00ba" },
  { value: 3, label: "3rd", labelPt: "3\u00ba" },
  { value: 4, label: "4th", labelPt: "4\u00ba" },
  { value: 5, label: "5th", labelPt: "5\u00ba" },
  { value: 6, label: "6th", labelPt: "6\u00ba" },
  { value: 7, label: "7th", labelPt: "7\u00ba" },
  { value: 8, label: "8th", labelPt: "8\u00ba" },
  { value: 9, label: "9th", labelPt: "9\u00ba" },
];

const SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

const CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin",
  "Ranger", "Sorcerer", "Warlock", "Wizard",
];

/** Localized spell level label */
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

const rowKey = (s: SrdSpell) => `${s.id}:${s.ruleset_version}`;

export function SpellBrowser() {
  const t = useTranslations("compendium");
  const allSpells = useSrdStore((s) => s.spells);
  const { filtered: spells, showNonSrd } = useSrdContentFilter(allSpells);
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const { canAccess, isAuthenticated, onGateCompleted } = useContentAccess();
  const [gateOpen, setGateOpen] = useState(false);

  // ── PT-BR translation support ──────────────────────────────────────
  const [descLang, setDescLang] = useLocalePreference("pt-BR");
  const [spellNamesPt, setSpellNamesPt] = useState<Record<string, string> | null>(null);
  const isPt = descLang === "pt-BR";

  useEffect(() => {
    if (isPt) loadSpellNamesPt().then(setSpellNamesPt);
  }, [isPt]);

  // Count hidden non-SRD spells for the gating banner
  const hiddenSpellCount = !showNonSrd ? allSpells.filter((s) => s.is_srd === false).length : 0;

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [levels, setLevels] = useState<Set<number>>(new Set());
  const [schools, setSchools] = useState<Set<string>>(new Set());
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [ritualOnly, setRitualOnly] = useState(false);
  const [concentrationOnly, setConcentrationOnly] = useState(false);
  const [versionFilter, setVersionFilter] = useState<RulesetVersion | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<"name" | "level">("name");

  // Selection (split-panel)
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  // Mobile pagination
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_PAGE_SIZE);

  const toggleNumSet = useCallback((set: Set<number>, value: number, setter: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setMobileVisibleCount(MOBILE_PAGE_SIZE);
  }, []);

  const toggleStrSet = useCallback((set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setMobileVisibleCount(MOBILE_PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    let result = spells;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (spellNamesPt && getNamePt(spellNamesPt, s.id, "").toLowerCase().includes(q))
      );
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

    const dn = (s: SrdSpell) => isPt ? getNamePt(spellNamesPt, s.id, s.name) : s.name;
    if (sortBy === "level") {
      return [...result].sort((a, b) => a.level - b.level || dn(a).localeCompare(dn(b)));
    }
    return [...result].sort((a, b) => dn(a).localeCompare(dn(b)));
  }, [spells, nameFilter, versionFilter, levels, schools, classes, ritualOnly, concentrationOnly, sortBy, spellNamesPt, isPt]);

  // Derive selected spell; clear when filtered out
  const selectedSpell = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((s) => rowKey(s) === selectedKey) ?? null;
  }, [filtered, selectedKey]);

  // Keyboard navigation
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const idx = selectedKey ? filtered.findIndex((s) => rowKey(s) === selectedKey) : -1;
      const next = Math.min(idx + 1, filtered.length - 1);
      if (filtered[next]) setSelectedKey(rowKey(filtered[next]));
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const idx = selectedKey ? filtered.findIndex((s) => rowKey(s) === selectedKey) : -1;
      const prev = Math.max(idx - 1, 0);
      if (filtered[prev]) setSelectedKey(rowKey(filtered[prev]));
    }
  }, [filtered, selectedKey]);

  const handleDesktopSelect = useCallback((s: SrdSpell) => {
    setSelectedKey(rowKey(s));
  }, []);

  const handleMobileSelect = useCallback((s: SrdSpell) => {
    setSelectedKey(rowKey(s));
    setMobileDetail(true);
  }, []);

  const hasActiveFilters = levels.size > 0 || schools.size > 0 || classes.size > 0 || ritualOnly || concentrationOnly || versionFilter !== "all";

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
            {(["all", "2014", "2024"] as const).map((v) => (
              <Chip key={v} active={versionFilter === v} onClick={() => { setVersionFilter(v); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}>
                {v === "all" ? t("filter_version_all") : v}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_level")}>
            {SPELL_LEVELS.map((l) => (
              <Chip key={l.value} active={levels.has(l.value)} onClick={() => toggleNumSet(levels, l.value, setLevels)}>
                {isPt ? l.labelPt : l.label}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_school")}>
            {SCHOOLS.map((s) => (
              <Chip key={s} active={schools.has(s)} onClick={() => toggleStrSet(schools, s, setSchools)}>
                {isPt ? (SCHOOL_PT[s] ?? s) : s}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label={t("filter_class")}>
            {CLASSES.map((c) => (
              <Chip key={c} active={classes.has(c)} onClick={() => toggleStrSet(classes, c, setClasses)}>
                {isPt ? (CLASS_PT[c] ?? c) : c}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="">
            <Chip active={ritualOnly} onClick={() => { setRitualOnly(!ritualOnly); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}>
              ® {t("filter_ritual")}
            </Chip>
            <Chip active={concentrationOnly} onClick={() => { setConcentrationOnly(!concentrationOnly); setMobileVisibleCount(MOBILE_PAGE_SIZE); }}>
              ◉ {t("filter_concentration")}
            </Chip>
          </FilterGroup>
        </div>
      )}

      {/* Sort & count */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {t("showing_results", { count: filtered.length, total: spells.length })}
        </span>
        <div className="sr-only" role="status" aria-live="polite">
          {t("spells_found_aria", { count: filtered.length })}
        </div>
        <div className="flex items-center gap-1.5">
          <Chip active={sortBy === "name"} onClick={() => setSortBy("name")}>{t("sort_name")}</Chip>
          <Chip active={sortBy === "level"} onClick={() => setSortBy("level")}>{t("sort_level")}</Chip>
          <LanguageToggle locale={descLang} onToggle={setDescLang} size="sm" />
        </div>
      </div>

      {/* Gating banner: show when non-SRD spells are hidden */}
      {hiddenSpellCount > 0 && !canAccess && (
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              toast.info(t("login_required_complete"));
            } else {
              setGateOpen(true);
            }
          }}
          className="w-full mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-gold/80 bg-gold/[0.06] border border-gold/10 hover:bg-gold/[0.1] transition-colors"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          {t("spells_unlock_more", { count: hiddenSpellCount })}
        </button>
      )}
    </div>
  );

  // ---- Spell row ----
  const renderSpellRow = (spell: SrdSpell, onSelect: (s: SrdSpell) => void) => {
    const key = rowKey(spell);
    const isSelected = key === selectedKey;

    return (
      <button
        key={key}
        type="button"
        onClick={() => onSelect(spell)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 border-b border-white/[0.04] border-l-2 ${levelBorderColor(spell.level)} ${
          isSelected
            ? "bg-gold/10 text-gold"
            : "text-foreground hover:bg-white/[0.06]"
        }`}
      >
        <span className="font-medium text-sm flex-1 min-w-0 truncate">
          {isPt ? getNamePt(spellNamesPt, spell.id, spell.name) : spell.name}
        </span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden lg:inline">
          {formatSpellLevel(spell.level, t)} · {isPt ? (SCHOOL_PT[spell.school] ?? spell.school) : spell.school}
        </span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap lg:hidden">
          {spell.level === 0 ? "C" : spell.level}
        </span>
        {spell.concentration && (
          <span className="text-[10px] text-amber-400" title="Concentration">◉</span>
        )}
        {spell.ritual && (
          <span className="text-[10px] text-teal-400" title="Ritual">®</span>
        )}
        <VersionBadge version={spell.ruleset_version} isSrd={spell.is_srd} />
      </button>
    );
  };

  const mobileVisible = filtered.slice(0, mobileVisibleCount);

  // ---- MAIN LAYOUT ----
  return (
    <div>
      {/* Mobile: detail view OR list view */}
      <div className="md:hidden">
        {mobileDetail && selectedSpell ? (
          <>
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
                onClick={() => pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version)}
                className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
              >
                📌 {t("pin_card")}
              </button>
            </div>
            <SpellCard spell={selectedSpell} variant="inline" locale={descLang} />
          </>
        ) : (
          <>
            {filterBar}
            <div className="mt-3">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  {mobileVisible.map((spell) => renderSpellRow(spell, handleMobileSelect))}
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
          </>
        )}
      </div>

      {/* Desktop: split panel */}
      <div className="hidden md:grid md:grid-cols-[minmax(320px,2fr)_3fr] gap-0 h-[calc(100vh-180px)] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* LEFT: List panel */}
        <div className="flex flex-col min-h-0 border-r border-white/[0.06] bg-surface-primary/60">
          <div className="p-3 border-b border-white/[0.06] bg-surface-primary/95 backdrop-blur-sm">
            {filterBar}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-white/[0.04] bg-white/[0.02]">
            <span className="flex-1">{t("sort_name")}</span>
            <span className="hidden lg:inline w-28 text-right">{t("sort_level")} · {t("filter_school")}</span>
            <span className="w-10" />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto" onKeyDown={handleListKeyDown} tabIndex={0} role="listbox" aria-label={t("tab_spells")}>
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
            ) : (
              filtered.map((spell) => renderSpellRow(spell, handleDesktopSelect))
            )}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="overflow-y-auto bg-surface-deep/80">
          {selectedSpell ? (
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version)}
                  className="px-2 py-1 text-xs rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[32px]"
                >
                  📌 {t("pin_card")}
                </button>
              </div>
              <SpellCard spell={selectedSpell} variant="inline" locale={descLang} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <div className="text-center space-y-3">
                <svg className="w-12 h-12 mx-auto text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                <p>{t("select_spell")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExternalContentGate open={gateOpen} onOpenChange={setGateOpen} onAccepted={onGateCompleted} />
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
