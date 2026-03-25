"use client";

import { useState, useEffect, useCallback } from "react";
import { searchMonsters } from "@/lib/srd/srd-search";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 10;

interface MonsterSearchProps {
  defaultVersion?: RulesetVersion;
  onAddToCombat?: (monster: SrdMonster) => void;
}

export function MonsterSearch({
  defaultVersion,
  onAddToCombat,
}: MonsterSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdMonster[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Debounced search — resets expanded state on every new search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setExpandedIds(new Set());
      return;
    }
    const timer = setTimeout(() => {
      // Search all versions, then sort default version first (FR20 / Story 4-5)
      const found = searchMonsters(query)
        .map((r) => r.item)
        .sort((a, b) => {
          if (defaultVersion) {
            const aMatch = a.ruleset_version === defaultVersion ? 0 : 1;
            const bMatch = b.ruleset_version === defaultVersion ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
          }
          return 0;
        })
        .slice(0, MAX_RESULTS);
      setResults(found);
      setExpandedIds(new Set());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, defaultVersion]);

  // Key: id:version — avoids collision when 2014 and 2024 variants appear together
  const toggleExpand = useCallback((rowKey: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-3" data-testid="monster-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search monsters by name, CR, or type…"
        className="w-full bg-[#1a1a2e] border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#e94560]"
        aria-label="Monster search"
        data-testid="monster-search-input"
      />

      {results.length > 0 && (
        <ul
          className="space-y-1"
          role="list"
          aria-label="Monster search results"
          data-testid="monster-search-results"
        >
          {results.map((monster) => {
            const rowKey = `${monster.id}:${monster.ruleset_version}`;
            const isExpanded = expandedIds.has(rowKey);
            return (
              <li key={rowKey} className="bg-[#16213e] border border-white/10 rounded-md overflow-hidden">
                {/* Result row */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(rowKey)}
                    className="flex-1 flex items-center gap-2 text-left hover:text-[#e94560] transition-colors min-h-[44px]"
                    aria-expanded={isExpanded}
                    aria-controls={`stat-block-${rowKey}`}
                    data-testid={`monster-row-${monster.id}`}
                  >
                    <span className="text-white text-sm font-medium flex-1">
                      {monster.name}
                    </span>
                    <span className="text-white/50 text-xs font-mono">
                      CR {monster.cr}
                    </span>
                    <span className="text-white/50 text-xs capitalize">
                      {monster.type}
                    </span>
                    <VersionBadge version={monster.ruleset_version} />
                    <span
                      className="text-white/40 text-xs ml-1"
                      aria-hidden="true"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {onAddToCombat && (
                    <button
                      type="button"
                      onClick={() => onAddToCombat(monster)}
                      className="px-2 py-1 text-xs text-[#e94560] border border-[#e94560]/40 rounded hover:bg-[#e94560]/10 transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`Add ${monster.name} to combat`}
                      data-testid={`add-monster-${monster.id}`}
                    >
                      + Add
                    </button>
                  )}
                </div>

                {/* Inline stat block expansion */}
                {isExpanded && (
                  <div
                    id={`stat-block-${rowKey}`}
                    className="border-t border-white/10 p-3"
                    data-testid={`stat-block-${monster.id}`}
                  >
                    <MonsterStatBlock monster={monster} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {query.trim() && results.length === 0 && (
        <p className="text-white/40 text-sm text-center py-2" data-testid="monster-search-empty">
          No monsters found for &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
