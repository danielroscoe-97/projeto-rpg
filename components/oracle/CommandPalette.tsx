"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { Command } from "cmdk";
import { searchMonsters, searchSpells, getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdStore } from "@/lib/stores/srd-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";
import type { SrdCondition } from "@/lib/srd/srd-loader";
import { Skull, Sparkles, HeartPulse, X } from "lucide-react";
import { MonsterToken } from "@/components/srd/MonsterToken";

const MAX_RESULTS_PER_GROUP = 5;
const DEBOUNCE_MS = 150;

type SearchFilter = "all" | "monster" | "spell" | "condition";

export function CommandPalette() {
  const t = useTranslations("command_palette");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state for detail views
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<SrdCondition | null>(null);

  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const isLoading = useSrdStore((s) => s.is_loading);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Search results (filtered by category)
  const showMonsters = filter === "all" || filter === "monster";
  const showSpells = filter === "all" || filter === "spell";
  const showConditions = filter === "all" || filter === "condition";

  const monsterResults = debouncedQuery && showMonsters
    ? searchMonsters(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const spellResults = debouncedQuery && showSpells
    ? searchSpells(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const conditionResults = debouncedQuery && showConditions
    ? getAllConditions().filter((c) =>
        c.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      ).slice(0, MAX_RESULTS_PER_GROUP)
    : [];

  const totalResults = monsterResults.length + spellResults.length + conditionResults.length;
  const hasResults = totalResults > 0;

  // Track search queries (debounced — fires once per final query, not per keystroke)
  const lastTrackedQuery = useRef("");
  useEffect(() => {
    if (debouncedQuery && debouncedQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = debouncedQuery;
      trackEvent("oracle:search", {
        query_length: debouncedQuery.length,
        filter,
        result_count: totalResults,
      });
    }
  }, [debouncedQuery, filter, totalResults]);

  // ESC = full close (clears query + filter)
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setFilter("all");
  }, []);

  // Backdrop click = soft dismiss (preserves query + filter for reopen)
  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  // Global keyboard shortcuts (Ctrl+K to toggle, ESC to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  const handlePinMonster = useCallback((monster: SrdMonster) => {
    pinCard("monster", monster.id, monster.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const _handlePinSpell = useCallback((spell: SrdSpell) => {
    pinCard("spell", spell.id, spell.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewSpell = useCallback((spell: SrdSpell) => {
    setSelectedSpell(spell);
    handleClose();
  }, [handleClose]);

  const _handlePinCondition = useCallback((condition: SrdCondition) => {
    pinCard("condition", condition.id, "2014");
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewCondition = useCallback((condition: SrdCondition) => {
    setSelectedCondition(condition);
    handleClose();
  }, [handleClose]);

  function formatCR(cr: string) {
    return cr === "0.125" ? "1/8" : cr === "0.25" ? "1/4" : cr === "0.5" ? "1/2" : cr;
  }

  function formatSpellLevel(level: number) {
    if (level === 0) return t("cantrip");
    return t("level_n", { level });
  }

  if (!open) return (
    <>
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4 pointer-events-none">
        <Command
          className="w-full max-w-[640px] rounded-xl border border-white/10 bg-[#1a1a28] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150 pointer-events-auto"
          label={t("label")}
          shouldFilter={false}
          onKeyDown={(e) => {
            // Guard against cmdk calling .closest() on non-Element targets (BUG-4)
            if (e.target && !(e.target instanceof HTMLElement)) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex items-center border-b border-white/[0.08] px-4">
            <svg
              className="w-4 h-4 text-muted-foreground shrink-0 mr-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("placeholder")}
              className="flex-1 h-12 bg-transparent text-foreground text-base placeholder:text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("hint_close")}
            >
              ESC
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("hint_close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.08]">
            {([
              { key: "all" as SearchFilter, label: t("filter_all"), icon: null },
              { key: "monster" as SearchFilter, label: t("group_monsters"), icon: <Skull className="w-3 h-3" /> },
              { key: "spell" as SearchFilter, label: t("group_spells"), icon: <Sparkles className="w-3 h-3" /> },
              { key: "condition" as SearchFilter, label: t("group_conditions"), icon: <HeartPulse className="w-3 h-3" /> },
            ]).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === f.key
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-transparent"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-2">
            {isLoading && (
              <Command.Loading>
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </div>
              </Command.Loading>
            )}

            {!isLoading && debouncedQuery && !hasResults && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("no_results")}
              </Command.Empty>
            )}

            {!debouncedQuery && !isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("hint")}
              </div>
            )}

            {/* Monsters */}
            {monsterResults.length > 0 && (
              <Command.Group heading={t("group_monsters")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Skull className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_monsters")}
                </div>
                {monsterResults.map((r) => (
                  <Command.Item
                    key={`m:${r.item.id}:${r.item.ruleset_version}`}
                    value={`monster:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handlePinMonster(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <MonsterToken
                      tokenUrl={r.item.token_url}
                      fallbackTokenUrl={r.item.fallback_token_url}
                      creatureType={r.item.type}
                      name={r.item.name}
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        CR {formatCR(r.item.cr)} · {r.item.type}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      r.item.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                    }`}>
                      {r.item.ruleset_version}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Spells */}
            {spellResults.length > 0 && (
              <Command.Group heading={t("group_spells")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Sparkles className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_spells")}
                </div>
                {spellResults.map((r) => (
                  <Command.Item
                    key={`s:${r.item.id}:${r.item.ruleset_version}`}
                    value={`spell:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handleViewSpell(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatSpellLevel(r.item.level)} · {r.item.school}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.item.concentration && (
                        <span className="text-[10px] text-amber-400" title="Concentration">◉</span>
                      )}
                      {r.item.ritual && (
                        <span className="text-[10px] text-teal-400" title="Ritual">®</span>
                      )}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        r.item.ruleset_version === "2024" ? "bg-blue-900/40 text-blue-400" : "bg-white/[0.06] text-muted-foreground"
                      }`}>
                        {r.item.ruleset_version}
                      </span>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Conditions */}
            {conditionResults.length > 0 && (
              <Command.Group heading={t("group_conditions")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <HeartPulse className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_conditions")}
                </div>
                {conditionResults.map((c) => (
                  <Command.Item
                    key={`c:${c.id}`}
                    value={`condition:${c.id}`}
                    onSelect={() => handleViewCondition(c)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {c.description.split("\n")[0].slice(0, 60)}…
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hints */}
          <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↑↓</kbd>
              {t("hint_navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↵</kbd>
              {t("hint_select")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">esc</kbd>
              {t("hint_close")}
            </span>
          </div>
        </Command>
      </div>

      {/* Detail modals (rendered when palette is open too, in case user navigates back) */}
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );
}
