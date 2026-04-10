"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";

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

const SPELL_LEVELS_PT = [
  { value: 0, label: "Truque" },
  { value: 1, label: "1º" },
  { value: 2, label: "2º" },
  { value: 3, label: "3º" },
  { value: 4, label: "4º" },
  { value: 5, label: "5º" },
  { value: 6, label: "6º" },
  { value: 7, label: "7º" },
  { value: 8, label: "8º" },
  { value: 9, label: "9º" },
];

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

const SPELL_SCHOOLS_PT: Record<string, string> = {
  Abjuration: "Abjuração",
  Conjuration: "Conjuração",
  Divination: "Adivinhação",
  Enchantment: "Encantamento",
  Evocation: "Evocação",
  Illusion: "Ilusão",
  Necromancy: "Necromancia",
  Transmutation: "Transmutação",
};

const SPELL_CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin",
  "Ranger", "Sorcerer", "Warlock", "Wizard",
];

const SPELL_CLASSES_PT: Record<string, string> = {
  Bard: "Bardo",
  Cleric: "Clérigo",
  Druid: "Druida",
  Paladin: "Paladino",
  Ranger: "Patrulheiro",
  Sorcerer: "Feiticeiro",
  Warlock: "Bruxo",
  Wizard: "Mago",
};

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: "text-blue-400",
  Conjuration: "text-yellow-400",
  Divination: "text-purple-400",
  Enchantment: "text-pink-400",
  Evocation: "text-red-400",
  Illusion: "text-indigo-400",
  Necromancy: "text-green-400",
  Transmutation: "text-[#D4A853]",
};

function toSlug(name: string): string {
  return name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface SpellEntry {
  name: string;
  nameEn?: string;
  namePt?: string;
  level: number;
  school: string;
  classes: string[];
  concentration: boolean;
  ritual: boolean;
  slug?: string;
  slugEn?: string;
  slugPt?: string;
  ruleset_version?: string;
  casting_time?: string;
  range?: string;
  components?: string;
  duration?: string;
  description?: string;
  descriptionEn?: string;
  descriptionPt?: string;
}

interface PublicSpellGridProps {
  spells: SpellEntry[];
  basePath?: string;
  locale?: "en" | "pt-BR";
  labels?: {
    searchPlaceholder?: string;
    levelLabel?: string;
    schoolLabel?: string;
    classLabel?: string;
    concentrationLabel?: string;
    ritualLabel?: string;
    filtersLabel?: string;
    of?: string;
    spells?: string;
    clearAll?: string;
    noResults?: string;
    langEn?: string;
    langPt?: string;
    editionAll?: string;
  };
}

export function PublicSpellGrid({ spells, basePath = "/spells", locale = "en", labels = {} }: PublicSpellGridProps) {
  const {
    searchPlaceholder = "Search spells by name...",
    levelLabel = "Level:",
    schoolLabel = "School:",
    classLabel = "Class:",
    concentrationLabel = "© Concentration",
    ritualLabel = "® Ritual",
    filtersLabel = "Filters",
    of = "of",
    spells: spellsLabel = "spells",
    clearAll = "Clear all",
    noResults = "No spells match your filters.",
    langEn = "English",
    langPt = "Português",
    editionAll = "Both",
  } = labels;
  const [descLang, setDescLang] = useState<"en" | "pt-BR">(locale);
  const [editionFilter, setEditionFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [concFilter, setConcFilter] = useState(false);
  const [ritualFilter, setRitualFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isPt = descLang === "pt-BR";
  const levelOptions = isPt ? SPELL_LEVELS_PT : SPELL_LEVELS;
  const schoolDisplay = (s: string) => isPt ? (SPELL_SCHOOLS_PT[s] ?? s) : s;
  const classDisplay = (c: string) => isPt ? (SPELL_CLASSES_PT[c] ?? c) : c;
  const schoolAbbr = (s: string) => isPt ? (SPELL_SCHOOLS_PT[s] ?? s).slice(0, 4) : s.slice(0, 4);
  const displayName = (s: SpellEntry) => isPt ? (s.namePt ?? s.name) : (s.nameEn ?? s.name);
  const displayDesc = (s: SpellEntry) => isPt ? (s.descriptionPt ?? s.description) : (s.descriptionEn ?? s.description);
  const levelHeading = (level: number) => {
    if (isPt) return level === 0 ? "Truques" : `Magias de ${level}º Nível`;
    return level === 0 ? "Cantrips" : `${level}${["st","nd","rd"][level-1]||"th"}-Level Spells`;
  };
  const levelNavLabel = (level: number) => {
    if (isPt) return level === 0 ? "Truques" : `Nível ${level}`;
    return level === 0 ? "Cantrips" : `Level ${level}`;
  };

  const filtered = useMemo(() => {
    let result = spells;
    if (editionFilter) result = result.filter((s) => s.ruleset_version === editionFilter);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.namePt && s.namePt.toLowerCase().includes(q))
      );
    }
    if (levelFilter !== null) result = result.filter((s) => s.level === levelFilter);
    if (schoolFilter) result = result.filter((s) => s.school === schoolFilter);
    if (classFilter) result = result.filter((s) => s.classes.includes(classFilter));
    if (concFilter) result = result.filter((s) => s.concentration);
    if (ritualFilter) result = result.filter((s) => s.ritual);
    return result;
  }, [spells, editionFilter, query, levelFilter, schoolFilter, classFilter, concFilter, ritualFilter]);

  // Detect duplicate names (e.g. Acid Splash 2014 + 2024) for version badge
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of spells) {
      const dn = isPt ? (s.namePt ?? s.name) : (s.nameEn ?? s.name);
      counts.set(dn, (counts.get(dn) ?? 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, c]) => c > 1).map(([n]) => n));
  }, [spells, isPt]);

  // Group by level
  const byLevel = useMemo(() => {
    const map = new Map<number, SpellEntry[]>();
    for (const s of filtered) {
      if (!map.has(s.level)) map.set(s.level, []);
      map.get(s.level)!.push(s);
    }
    return map;
  }, [filtered]);

  const levelKeys = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const hasFilters = !!(query || editionFilter || levelFilter !== null || schoolFilter || classFilter || concFilter || ritualFilter);
  const activeFilterCount = (editionFilter ? 1 : 0) + (levelFilter !== null ? 1 : 0) + (schoolFilter ? 1 : 0) + (classFilter ? 1 : 0) + (concFilter ? 1 : 0) + (ritualFilter ? 1 : 0);
  const hasChipFilters = activeFilterCount > 0;

  // Smart hover positioning — flip popover above when near bottom of viewport
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flipUp, setFlipUp] = useState(false);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFlipUp(rect.bottom > window.innerHeight * 0.55);
    setHoveredId(id);
  }, []);
  const handleMouseLeave = useCallback(() => setHoveredId(null), []);

  function clearAllFilters() {
    setQuery(""); setEditionFilter(null); setLevelFilter(null); setSchoolFilter(null);
    setClassFilter(null); setConcFilter(false); setRitualFilter(false);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 mb-8 space-y-3">
        {/* Search + Filters toggle — always visible */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-[#D4A853]/40 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`relative flex items-center gap-1.5 h-11 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0 ${filtersOpen ? "bg-[#D4A853]/10 border-[#D4A853]/40 text-[#D4A853]" : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-gray-300 hover:border-white/[0.15]"}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            {filtersLabel}
            {hasChipFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4A853] text-gray-950 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filter chips */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{ gridTemplateRows: filtersOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 pt-1">
              {/* Level chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 font-medium mr-1">{levelLabel}</span>
                {levelOptions.map((l) => (
                  <button key={l.value} type="button"
                    onClick={() => setLevelFilter(levelFilter === l.value ? null : l.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${levelFilter === l.value ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* School chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 font-medium mr-1">{schoolLabel}</span>
                {SPELL_SCHOOLS.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setSchoolFilter(schoolFilter === s ? null : s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${schoolFilter === s ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"}`}
                  >
                    {schoolDisplay(s)}
                  </button>
                ))}
              </div>

              {/* Class chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 font-medium mr-1">{classLabel}</span>
                {SPELL_CLASSES.map((c) => (
                  <button key={c} type="button"
                    onClick={() => setClassFilter(classFilter === c ? null : c)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${classFilter === c ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"}`}
                  >
                    {classDisplay(c)}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={() => setConcFilter((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${concFilter ? "bg-amber-600/20 text-amber-300 border-amber-500/40" : "bg-white/[0.04] text-gray-500 border-white/[0.06] hover:text-gray-300"}`}
                >
                  {concentrationLabel}
                </button>
                <button type="button" onClick={() => setRitualFilter((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${ritualFilter ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" : "bg-white/[0.04] text-gray-500 border-white/[0.06] hover:text-gray-300"}`}
                >
                  {ritualLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Count + clear + language toggle — always visible */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {hasFilters ? `${filtered.length} ${of} ${spells.length} ${spellsLabel}` : `${spells.length} ${spellsLabel}`}
          </span>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button type="button" onClick={clearAllFilters} className="text-xs text-[#D4A853] hover:underline">
                {clearAll}
              </button>
            )}
            <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
              <button
                type="button"
                onClick={() => setEditionFilter(null)}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${editionFilter === null ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
              >
                {editionAll}
              </button>
              <button
                type="button"
                onClick={() => setEditionFilter(editionFilter === "2014" ? null : "2014")}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${editionFilter === "2014" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
              >
                2014
              </button>
              <button
                type="button"
                onClick={() => setEditionFilter(editionFilter === "2024" ? null : "2024")}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${editionFilter === "2024" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
              >
                2024
              </button>
            </div>
            <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
              <button
                type="button"
                onClick={() => setDescLang("en")}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${descLang === "en" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setDescLang("pt-BR")}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${descLang === "pt-BR" ? "bg-[#D4A853] text-gray-950" : "bg-white/[0.04] text-gray-500 hover:text-gray-300"}`}
              >
                PT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Level navigation (no filters) */}
      {!hasFilters && (
        <div className="flex flex-wrap gap-2 mb-8">
          {levelKeys.map((level) => (
            <a key={level} href={`#level-${level}`}
              className="px-3 py-1 rounded-md bg-gray-800/60 text-gray-300 text-sm font-medium hover:bg-[#D4A853]/90 hover:text-white transition-colors"
            >
              {levelNavLabel(level)}
            </a>
          ))}
        </div>
      )}

      {/* Spell grid by level */}
      {levelKeys.map((level) => (
        <section key={level} id={`level-${level}`} className="mb-8">
          <h2 className="text-xl font-bold text-[#D4A853] border-b border-white/[0.06] pb-1 mb-3 font-[family-name:var(--font-cinzel)]">
            {levelHeading(level)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {byLevel.get(level)!.map((s) => {
              const spellId = `${s.slug ?? toSlug(s.name)}-${s.ruleset_version ?? ""}`;
              const isHovered = hoveredId === spellId;
              return (
              <div
                key={spellId}
                className="relative"
                onMouseEnter={(e) => s.description ? handleMouseEnter(e, spellId) : undefined}
                onMouseLeave={handleMouseLeave}
              >
                <Link href={`${basePath}/${s.slug ?? toSlug(s.name)}`}
                  className="flex items-center gap-2 rounded-lg bg-gray-800/40 border border-white/[0.04] px-3 py-2.5 hover:bg-gray-700/50 hover:border-amber-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.15)] transition-all group"
                >
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-200 group-hover:text-white text-sm font-medium truncate">
                        {displayName(s)}
                      </span>
                      {s.ruleset_version && duplicateNames.has(displayName(s)) && (
                        <span className="inline-flex items-center rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-gray-400 shrink-0">
                          {s.ruleset_version}
                        </span>
                      )}
                    </span>
                    {s.nameEn && s.namePt && s.nameEn.toLowerCase() !== s.namePt.toLowerCase() && (
                      <span className="text-[11px] text-gray-500 italic truncate">
                        {isPt ? s.nameEn : s.namePt}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.concentration && <span className="text-amber-400/60 text-xs" title="Concentration">©</span>}
                    {s.ritual && <span className="text-emerald-400/60 text-xs" title="Ritual">®</span>}
                    <span className={`text-xs ${SCHOOL_COLORS[s.school] ?? "text-gray-500"}`}>
                      {schoolAbbr(s.school)}
                    </span>
                  </div>
                </Link>
                {/* Hover card — desktop only, smart positioning */}
                {s.description && (
                  <div className={`hidden lg:block absolute left-0 z-50 w-96 rounded-lg border border-[#D4A853]/20 bg-gray-900 shadow-xl shadow-black/40 p-4 transition-opacity duration-150 ${isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} ${flipUp ? "bottom-full mb-1" : "top-full mt-1"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)]">{displayName(s)}</span>
                      <span className={`text-xs ${SCHOOL_COLORS[s.school] ?? "text-gray-500"}`}>{schoolDisplay(s.school)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400 mb-2">
                      {s.casting_time && <span>{isPt ? "Tempo" : "Cast"}: {s.casting_time}</span>}
                      {s.range && <span>{isPt ? "Alcance" : "Range"}: {s.range}</span>}
                      {s.duration && <span>{isPt ? "Duração" : "Duration"}: {s.duration}</span>}
                      {s.components && <span>{isPt ? "Componentes" : "Components"}: {s.components}</span>}
                    </div>
                    <div className="text-xs text-gray-300 space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                      {(displayDesc(s) ?? "").split("\n").filter(Boolean).map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                    {s.classes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/[0.06]">
                        {s.classes.map((c) => (
                          <span key={c} className="text-[10px] bg-white/[0.06] text-gray-400 rounded px-1.5 py-0.5">{classDisplay(c)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 && hasFilters && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">{noResults}</p>
          <button type="button" onClick={clearAllFilters} className="mt-3 text-[#D4A853] text-sm hover:underline">
            {clearAll}
          </button>
        </div>
      )}
    </div>
  );
}
