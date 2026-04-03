"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
];

interface SpellEntry {
  name: string;
  level: number;
  school: string;
  classes: string[];
  concentration: boolean;
  ritual: boolean;
  slug?: string;
}

interface PublicSpellSearchProps {
  spells: SpellEntry[];
  basePath?: string;
  buttonLabel?: string;
}

export function PublicSpellSearch({ spells, basePath = "/spells", buttonLabel = "Search more spells" }: PublicSpellSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = spells;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (schoolFilter) result = result.filter((s) => s.school === schoolFilter);
    return result.slice(0, 20);
  }, [spells, query, schoolFilter]);

  const hasFilters = !!(query || schoolFilter);

  const handleSelect = useCallback(
    (s: SpellEntry) => {
      router.push(`${basePath}/${s.slug ?? toSlug(s.name)}`);
      setIsOpen(false);
      setQuery("");
    },
    [router, basePath],
  );

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-orange-500/40 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 mr-1 self-center">School:</span>
            {SPELL_SCHOOLS.map((s) => (
              <button key={s} type="button"
                onClick={() => setSchoolFilter(schoolFilter === s ? null : s)}
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${schoolFilter === s ? "bg-orange-600 text-white" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {hasFilters && (
            <div className="border-t border-white/[0.06] pt-3">
              <p className="text-xs text-gray-500 mb-2">{filtered.length} results</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filtered.map((s) => (
                  <button key={s.name} type="button"
                    onClick={() => handleSelect(s)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="text-gray-200 text-sm">{s.name}</span>
                    <span className="text-gray-500 text-xs">
                      {s.level === 0 ? "Cantrip" : `Lvl ${s.level}`} · {s.school.slice(0, 4)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
