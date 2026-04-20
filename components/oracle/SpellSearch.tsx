"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { searchSpells } from "@/lib/srd/srd-search";
import { VersionBadge } from "@/components/combat-session/RulesetSelector";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 10;

interface SpellSearchProps {
  defaultVersion?: RulesetVersion;
}

export function SpellSearch({ defaultVersion }: SpellSearchProps) {
  const t = useTranslations("oracle");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdSpell[]>([]);
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

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
      setSelectedIndex(-1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, defaultVersion]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        setSelectedSpell(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      }
    },
    [results, selectedIndex],
  );

  return (
    <div className="space-y-3" data-testid="spell-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("spell_search_placeholder")}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-gold"
        aria-label={t("spell_search_label")}
        aria-autocomplete="list"
        aria-controls="spell-search-listbox"
        aria-activedescendant={
          selectedIndex >= 0 ? `spell-option-${selectedIndex}` : undefined
        }
        data-testid="spell-search-input"
      />

      {results.length > 0 && (
        <ul
          ref={listRef}
          id="spell-search-listbox"
          className="space-y-1"
          role="listbox"
          aria-label={t("spell_results_aria")}
          data-testid="spell-search-results"
        >
          {results.map((spell, idx) => {
            const rowKey = `${spell.id}:${spell.ruleset_version}`;
            const isSelected = idx === selectedIndex;
            return (
              <li
                key={rowKey}
                id={`spell-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`bg-card border border-border rounded-md overflow-hidden flex items-center${isSelected ? " bg-gold/10" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedSpell(spell)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-left hover:text-gold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
                  aria-label={t("spell_view_aria", { name: spell.name })}
                  data-testid={`spell-row-${spell.id}`}
                >
                  <span className="text-foreground text-sm font-medium flex-1">
                    {spell.name}
                  </span>
                  <span className="text-muted-foreground text-xs font-mono">
                    {spell.level === 0 ? t("spell_cantrip") : t("spell_level", { level: spell.level })}
                  </span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {spell.school}
                  </span>
                  <VersionBadge version={spell.ruleset_version} />
                </button>
                <button
                  type="button"
                  onClick={() => pinCard("spell", spell.id, spell.ruleset_version)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 min-h-[44px] min-w-[36px] flex items-center justify-center"
                  aria-label={`Pin ${spell.name} card`}
                  data-testid={`pin-spell-${spell.id}`}
                  title="Pin spell card"
                >
                  📌
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
        onPin={
          selectedSpell
            ? () => {
                pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
                setSelectedSpell(null);
              }
            : undefined
        }
      />
    </div>
  );
}
