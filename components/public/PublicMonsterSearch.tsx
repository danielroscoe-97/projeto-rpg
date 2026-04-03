"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SrdMonster } from "@/lib/srd/srd-loader";

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

function parseCR(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface PublicMonsterSearchProps {
  /** Minimal monster data for search (name, cr, type) */
  monsters: Pick<SrdMonster, "name" | "cr" | "type">[];
}

export function PublicMonsterSearch({ monsters }: PublicMonsterSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [crFilter, setCrFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = monsters;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    if (crFilter) {
      const range = CR_RANGES.find((r) => r.label === crFilter);
      if (range) {
        result = result.filter((m) => {
          const cr = parseCR(m.cr);
          return cr >= range.min && cr <= range.max;
        });
      }
    }

    if (typeFilter) {
      result = result.filter((m) => {
        const baseType = m.type.split("(")[0].trim();
        return baseType.toLowerCase() === typeFilter.toLowerCase();
      });
    }

    return result.slice(0, 20);
  }, [monsters, query, crFilter, typeFilter]);

  const hasFilters = query || crFilter || typeFilter;

  const handleSelect = useCallback(
    (name: string) => {
      router.push(`/monsters/${toSlug(name)}`);
      setIsOpen(false);
      setQuery("");
    },
    [router],
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
        Search more monsters
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl bg-gray-800/50 border border-white/[0.06] p-4 space-y-3">
          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
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

          {/* CR chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 mr-1 self-center">CR:</span>
            {CR_RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setCrFilter(crFilter === r.label ? null : r.label)}
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                  crFilter === r.label
                    ? "bg-orange-600 text-white"
                    : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500 mr-1 self-center">Type:</span>
            {CREATURE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                  typeFilter === t
                    ? "bg-orange-600 text-white"
                    : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Results */}
          {hasFilters && (
            <div className="border-t border-white/[0.06] pt-3">
              <p className="text-xs text-gray-500 mb-2">{filtered.length} results</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filtered.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleSelect(m.name)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="text-gray-200 text-sm">{m.name}</span>
                    <span className="text-gray-500 text-xs">
                      CR {m.cr} · {m.type.split("(")[0].trim()}
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
