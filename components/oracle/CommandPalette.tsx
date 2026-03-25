"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import { searchMonsters, searchSpells, getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdStore } from "@/lib/stores/srd-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";
import type { SrdCondition } from "@/lib/srd/srd-loader";

const MAX_RESULTS_PER_GROUP = 5;
const DEBOUNCE_MS = 150;

export function CommandPalette() {
  const t = useTranslations("command_palette");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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

  // Search results
  const monsterResults = debouncedQuery
    ? searchMonsters(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const spellResults = debouncedQuery
    ? searchSpells(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const conditionResults = debouncedQuery
    ? getAllConditions().filter((c) =>
        c.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      ).slice(0, MAX_RESULTS_PER_GROUP)
    : [];

  const hasResults = monsterResults.length > 0 || spellResults.length > 0 || conditionResults.length > 0;

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const handlePinMonster = useCallback((monster: SrdMonster) => {
    pinCard("monster", monster.id, monster.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handlePinSpell = useCallback((spell: SrdSpell) => {
    pinCard("spell", spell.id, spell.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewSpell = useCallback((spell: SrdSpell) => {
    setSelectedSpell(spell);
    handleClose();
  }, [handleClose]);

  const handlePinCondition = useCallback((condition: SrdCondition) => {
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
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4">
        <Command
          className="w-full max-w-[640px] rounded-xl border border-white/10 bg-[#1a1a28] shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150"
          label={t("label")}
          shouldFilter={false}
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
            <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08]">
              ESC
            </kbd>
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
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  🐉 {t("group_monsters")}
                </div>
                {monsterResults.map((r) => (
                  <Command.Item
                    key={`m:${r.item.id}:${r.item.ruleset_version}`}
                    value={`monster:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handlePinMonster(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
                  >
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
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ✨ {t("group_spells")}
                </div>
                {spellResults.map((r) => (
                  <Command.Item
                    key={`s:${r.item.id}:${r.item.ruleset_version}`}
                    value={`spell:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handleViewSpell(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
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
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ⚡ {t("group_conditions")}
                </div>
                {conditionResults.map((c) => (
                  <Command.Item
                    key={`c:${c.id}`}
                    value={`condition:${c.id}`}
                    onSelect={() => handleViewCondition(c)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-white/[0.06] aria-selected:bg-white/[0.10] transition-colors min-h-[44px]"
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
              <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">↑↓</kbd>
              {t("hint_navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">↵</kbd>
              {t("hint_select")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white/[0.06] rounded text-[10px] font-mono">esc</kbd>
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
