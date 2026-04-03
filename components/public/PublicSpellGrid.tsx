"use client";

import { useState, useMemo } from "react";
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

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

const SPELL_CLASSES = [
  "Bard", "Cleric", "Druid", "Paladin",
  "Ranger", "Sorcerer", "Warlock", "Wizard",
];

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
  level: number;
  school: string;
  classes: string[];
  concentration: boolean;
  ritual: boolean;
  slug?: string;
}

interface PublicSpellGridProps {
  spells: SpellEntry[];
  basePath?: string;
  labels?: {
    searchPlaceholder?: string;
    levelLabel?: string;
    schoolLabel?: string;
    classLabel?: string;
    concentrationLabel?: string;
    ritualLabel?: string;
    of?: string;
    spells?: string;
    clearAll?: string;
    noResults?: string;
  };
}

export function PublicSpellGrid({ spells, basePath = "/spells", labels = {} }: PublicSpellGridProps) {
  const {
    searchPlaceholder = "Search spells by name...",
    levelLabel = "Level:",
    schoolLabel = "School:",
    classLabel = "Class:",
    concentrationLabel = "© Concentration",
    ritualLabel = "® Ritual",
    of = "of",
    spells: spellsLabel = "spells",
    clearAll = "Clear all",
    noResults = "No spells match your filters.",
  } = labels;
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [concFilter, setConcFilter] = useState(false);
  const [ritualFilter, setRitualFilter] = useState(false);

  const filtered = useMemo(() => {
    let result = spells;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (levelFilter !== null) result = result.filter((s) => s.level === levelFilter);
    if (schoolFilter) result = result.filter((s) => s.school === schoolFilter);
    if (classFilter) result = result.filter((s) => s.classes.includes(classFilter));
    if (concFilter) result = result.filter((s) => s.concentration);
    if (ritualFilter) result = result.filter((s) => s.ritual);
    return result;
  }, [spells, query, levelFilter, schoolFilter, classFilter, concFilter, ritualFilter]);

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
  const hasFilters = !!(query || levelFilter !== null || schoolFilter || classFilter || concFilter || ritualFilter);

  function clearAllFilters() {
    setQuery(""); setLevelFilter(null); setSchoolFilter(null);
    setClassFilter(null); setConcFilter(false); setRitualFilter(false);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 mb-8 space-y-3">
        {/* Search */}
        <div className="relative">
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

        {/* Level chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 font-medium mr-1">{levelLabel}</span>
          {SPELL_LEVELS.map((l) => (
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
              {s}
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
              {c}
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

        {/* Count + clear */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {hasFilters ? `${filtered.length} ${of} ${spells.length} ${spellsLabel}` : `${spells.length} ${spellsLabel}`}
          </span>
          {hasFilters && (
            <button type="button" onClick={clearAllFilters} className="text-xs text-[#D4A853] hover:underline">
              {clearAll}
            </button>
          )}
        </div>
      </div>

      {/* Level navigation (no filters) */}
      {!hasFilters && (
        <div className="flex flex-wrap gap-2 mb-8">
          {levelKeys.map((level) => (
            <a key={level} href={`#level-${level}`}
              className="px-3 py-1 rounded-md bg-gray-800/60 text-gray-300 text-sm font-medium hover:bg-[#D4A853]/90 hover:text-white transition-colors"
            >
              {level === 0 ? "Cantrips" : `Level ${level}`}
            </a>
          ))}
        </div>
      )}

      {/* Spell grid by level */}
      {levelKeys.map((level) => (
        <section key={level} id={`level-${level}`} className="mb-8">
          <h2 className="text-xl font-bold text-[#D4A853] border-b border-white/[0.06] pb-1 mb-3 font-[family-name:var(--font-cinzel)]">
            {level === 0 ? "Cantrips" : `${level}${["st","nd","rd"][level-1]||"th"}-Level Spells`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {byLevel.get(level)!.map((s) => (
              <Link key={s.name} href={`${basePath}/${s.slug ?? toSlug(s.name)}`}
                className="flex items-center gap-2 rounded-lg bg-gray-800/40 border border-white/[0.04] px-3 py-2.5 hover:bg-gray-700/50 hover:border-[#D4A853]/20 transition-all group"
              >
                <span className="flex-1 min-w-0">
                  <span className="text-gray-200 group-hover:text-white text-sm font-medium block truncate">
                    {s.name}
                  </span>
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {s.concentration && <span className="text-amber-400/60 text-xs" title="Concentration">©</span>}
                  {s.ritual && <span className="text-emerald-400/60 text-xs" title="Ritual">®</span>}
                  <span className={`text-xs ${SCHOOL_COLORS[s.school] ?? "text-gray-500"}`}>
                    {s.school.slice(0, 4)}
                  </span>
                </div>
              </Link>
            ))}
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
