"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { searchMonsters } from "@/lib/srd/srd-search";
import { VersionBadge } from "@/components/combat-session/RulesetSelector";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
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
  const t = useTranslations("oracle");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SrdMonster[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

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
      setSelectedIndex(-1);
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
        const monster = results[selectedIndex];
        const rowKey = `${monster.id}:${monster.ruleset_version}`;
        toggleExpand(rowKey);
      } else if (e.key === "Escape") {
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
      }
    },
    [results, selectedIndex, toggleExpand],
  );

  return (
    <div className="space-y-3" data-testid="monster-search">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("monster_search_placeholder")}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-gold"
        aria-label={t("monster_search_label")}
        aria-autocomplete="list"
        aria-controls="monster-search-listbox"
        aria-activedescendant={
          selectedIndex >= 0 ? `monster-option-${selectedIndex}` : undefined
        }
        data-testid="monster-search-input"
      />

      {results.length > 0 && (
        <ul
          ref={listRef}
          id="monster-search-listbox"
          className="space-y-1"
          role="listbox"
          aria-label={t("monster_results_aria")}
          data-testid="monster-search-results"
        >
          {results.map((monster, idx) => {
            const rowKey = `${monster.id}:${monster.ruleset_version}`;
            const isExpanded = expandedIds.has(rowKey);
            const isSelected = idx === selectedIndex;
            return (
              <li
                key={rowKey}
                id={`monster-option-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`bg-card border border-border rounded-md overflow-hidden${isSelected ? " bg-gold/10" : ""}`}
              >
                {/* Result row */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(rowKey)}
                    className="flex-1 flex items-center gap-2 text-left hover:text-gold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
                    aria-expanded={isExpanded}
                    aria-controls={`stat-block-${rowKey}`}
                    data-testid={`monster-row-${monster.id}`}
                  >
                    <span className="text-foreground text-sm font-medium flex-1">
                      {monster.name}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                      CR {monster.cr}
                    </span>
                    <span className="text-muted-foreground text-xs capitalize">
                      {monster.type}
                    </span>
                    <VersionBadge version={monster.ruleset_version} />
                    <span
                      className="text-muted-foreground text-xs ml-1"
                      aria-hidden="true"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Pin button — always available for monsters */}
                  <button
                    type="button"
                    onClick={() => pinCard("monster", monster.id, monster.ruleset_version)}
                    className="px-2 py-1 text-xs text-muted-foreground border border-border rounded hover:text-foreground hover:border-gold/40 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Pin ${monster.name} card`}
                    data-testid={`pin-monster-${monster.id}`}
                    title="Pin stat block"
                  >
                    📌
                  </button>

                  {onAddToCombat && (
                    <button
                      type="button"
                      onClick={() => onAddToCombat(monster)}
                      className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs text-gold border border-gold/40 rounded hover:bg-gold/10 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 min-h-[44px] min-w-[44px]"
                      aria-label={t("add_to_combat_aria", { name: monster.name })}
                      data-testid={`add-monster-${monster.id}`}
                      title={t("add_to_combat")}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Inline stat block expansion */}
                {isExpanded && (
                  <div
                    id={`stat-block-${rowKey}`}
                    className="border-t border-border p-3"
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
        <p className="text-muted-foreground text-sm text-center py-2" data-testid="monster-search-empty">
          No monsters found for &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
