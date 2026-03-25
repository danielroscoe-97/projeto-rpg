"use client";

import { useState, useEffect } from "react";
import { searchSpells } from "@/lib/srd/srd-search";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 10;

interface SpellSearchProps {
  defaultVersion?: RulesetVersion;
}

function levelLabel(level: number): string {
  if (level === 0) return "Cantrip";
  return `Lvl ${level}`;
}

export function SpellSearch({ defaultVersion }: SpellSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdSpell[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      // Search all versions, then sort default version first (FR20 / Story 4-5)
      const found = searchSpells(query)
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
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, defaultVersion]);

  return (
    <div className="space-y-3" data-testid="spell-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search spells by name, class, or school..."
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-gold"
        aria-label="Spell search"
        data-testid="spell-search-input"
      />

      {results.length > 0 && (
        <ul
          className="space-y-1"
          role="list"
          aria-label="Spell search results"
          data-testid="spell-search-results"
        >
          {results.map((spell) => {
            const rowKey = `${spell.id}:${spell.ruleset_version}`;
            return (
              <li
                key={rowKey}
                className="bg-card border border-border rounded-md overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setSelectedSpell(spell)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:text-gold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
                  aria-label={`View ${spell.name} details`}
                  data-testid={`spell-row-${spell.id}`}
                >
                  <span className="text-foreground text-sm font-medium flex-1">
                    {spell.name}
                  </span>
                  <span className="text-muted-foreground text-xs font-mono">
                    {levelLabel(spell.level)}
                  </span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {spell.school}
                  </span>
                  <VersionBadge version={spell.ruleset_version} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim() && results.length === 0 && (
        <p
          className="text-muted-foreground text-sm text-center py-2"
          data-testid="spell-search-empty"
        >
          No spells found for &quot;{query}&quot;
        </p>
      )}

      <SpellDescriptionModal
        spell={selectedSpell}
        open={selectedSpell !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSpell(null);
        }}
      />
    </div>
  );
}
