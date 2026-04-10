"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import { CR_RANGES, CREATURE_TYPES, parseCR, toSlug } from "@/lib/utils/monster";

interface MonsterSearchEntry extends Pick<SrdMonster, "name" | "cr" | "type"> {
  slug?: string;
}

interface PublicMonsterSearchProps {
  monsters: MonsterSearchEntry[];
  basePath?: string;
  buttonLabel?: string;
}

export function PublicMonsterSearch({ monsters, basePath = "/monsters", buttonLabel = "Search more monsters" }: PublicMonsterSearchProps) {
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
    (m: MonsterSearchEntry) => {
      router.push(`${basePath}/${m.slug ?? toSlug(m.name)}`);
      setIsOpen(false);
      setQuery("");
    },
    [router, basePath],
  );

  return (
    <div className="mb-6">
      <button
        type="button"
        aria-expanded={isOpen}
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
              aria-label="Search monsters"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-gold/40 transition-colors"
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
                    ? "bg-gold text-gray-950"
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
                    ? "bg-gold text-gray-950"
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
              <p className="text-xs text-gray-400" role="status" aria-live="polite">{filtered.length} results</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filtered.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleSelect(m)}
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
