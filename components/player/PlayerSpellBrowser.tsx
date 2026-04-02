"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Search, X, ArrowLeft, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { SpellCard } from "@/components/oracle/SpellCard";
import { useSrdStore } from "@/lib/stores/srd-store";
import { useSrdContentFilter } from "@/lib/hooks/use-srd-content-filter";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PAGE_SIZE = 50;

const SRD_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter",
  "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer",
  "Warlock", "Wizard",
];

interface PlayerSpellBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select class filter if player class is known */
  playerClass?: string;
  /** Ruleset version for default filter */
  rulesetVersion?: RulesetVersion;
}

export function PlayerSpellBrowser({
  open,
  onOpenChange,
  playerClass,
  rulesetVersion,
}: PlayerSpellBrowserProps) {
  const t = useTranslations("combat");
  const allSpells = useSrdStore((s) => s.spells);
  const isStoreLoading = useSrdStore((s) => s.is_loading);
  const { filtered: spells } = useSrdContentFilter(allSpells);
  const storeEmpty = allSpells.length === 0;

  const [nameFilter, setNameFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(
    playerClass?.trim() || null
  );
  const [versionFilter, setVersionFilter] = useState<"all" | "2014" | "2024">(
    rulesetVersion ?? "all"
  );
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setNameFilter("");
        setSelectedLevel(null);
        setSelectedClass(playerClass?.trim() || null);
        setVersionFilter(rulesetVersion ?? "all");
        setSelectedSpell(null);
        setDisplayCount(PAGE_SIZE);
        setClassDropdownOpen(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, playerClass, rulesetVersion]
  );

  const filtered = useMemo(() => {
    let result = spells;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(lower));
    }
    if (versionFilter !== "all") {
      result = result.filter((s) => s.ruleset_version === versionFilter);
    }
    if (selectedLevel !== null) {
      result = result.filter((s) => s.level === selectedLevel);
    }
    if (selectedClass) {
      const lower = selectedClass.toLowerCase();
      result = result.filter((s) =>
        s.classes.some((c) => c.toLowerCase() === lower)
      );
    }
    return result.sort(
      (a, b) => a.level - b.level || a.name.localeCompare(b.name)
    );
  }, [spells, nameFilter, versionFilter, selectedLevel, selectedClass]);

  const displayed = filtered.slice(0, displayCount);
  const totalCount = spells.length;
  const filteredCount = filtered.length;
  const hasMore = filteredCount > displayCount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          // Desktop: centered modal
          "max-w-2xl max-h-[85vh] overflow-hidden !p-0 !bg-surface-secondary !border-white/[0.08]",
          // Mobile: full-screen override
          "max-[768px]:!max-w-none max-[768px]:!w-screen max-[768px]:!h-[100dvh] max-[768px]:!max-h-none max-[768px]:!rounded-none max-[768px]:!top-0 max-[768px]:!left-0 max-[768px]:!translate-x-0 max-[768px]:!translate-y-0"
        )}
      >
        <VisuallyHidden.Root>
          <DialogTitle>{t("spell_browser_title")}</DialogTitle>
        </VisuallyHidden.Root>

        {selectedSpell ? (
          /* ── Detail View ── */
          <div className="flex flex-col h-full max-h-[85vh] max-[768px]:max-h-[100dvh]">
            <div className="flex items-center gap-2 p-3 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSpell(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("spell_back")}
              </button>
              <span className="text-foreground font-semibold text-sm truncate flex-1">
                {selectedSpell.name}
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <SpellCard spell={selectedSpell} variant="inline" />
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div className="flex flex-col h-full max-h-[85vh] max-[768px]:max-h-[100dvh]">
            {/* Filters — fixed header */}
            <div className="p-3 space-y-2 border-b border-white/10 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => {
                    setNameFilter(e.target.value);
                    setDisplayCount(PAGE_SIZE);
                  }}
                  placeholder={t("spell_search_placeholder")}
                  className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                />
                {nameFilter && (
                  <button
                    type="button"
                    onClick={() => setNameFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Level chips */}
              <div className="flex gap-1 flex-wrap">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setSelectedLevel(selectedLevel === lvl ? null : lvl);
                      setDisplayCount(PAGE_SIZE);
                    }}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full border transition-colors",
                      selectedLevel === lvl
                        ? "bg-gold/20 border-gold/50 text-gold"
                        : "border-white/10 text-muted-foreground hover:border-white/20"
                    )}
                  >
                    {lvl === 0 ? "C" : lvl}
                  </button>
                ))}
              </div>

              {/* Class filter + version toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Pre-selected class chip */}
                {selectedClass && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gold/20 border border-gold/50 text-gold">
                    ✨ {selectedClass}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClass(null);
                        setDisplayCount(PAGE_SIZE);
                      }}
                      className="hover:text-white ml-0.5"
                      aria-label={t("spell_clear_class")}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Class dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs border border-white/10 rounded-full text-muted-foreground hover:border-white/20 transition-colors"
                  >
                    {selectedClass ? t("spell_change_class") : t("spell_all_classes")}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {classDropdownOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setClassDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 z-20 bg-surface-overlay border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px] max-h-[200px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClass(null);
                            setClassDropdownOpen(false);
                            setDisplayCount(PAGE_SIZE);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs hover:bg-white/5",
                            !selectedClass
                              ? "text-gold"
                              : "text-muted-foreground"
                          )}
                        >
                          {t("spell_all_classes")}
                        </button>
                        {SRD_CLASSES.map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => {
                              setSelectedClass(cls);
                              setClassDropdownOpen(false);
                              setDisplayCount(PAGE_SIZE);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs hover:bg-white/5",
                              selectedClass === cls
                                ? "text-gold"
                                : "text-muted-foreground"
                            )}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Version toggle */}
                <div className="flex items-center gap-1 ml-auto">
                  {(["all", "2024", "2014"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setVersionFilter(v);
                        setDisplayCount(PAGE_SIZE);
                      }}
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] rounded border transition-colors",
                        versionFilter === v
                          ? "bg-white/10 border-white/20 text-foreground"
                          : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                      )}
                    >
                      {v === "all" ? t("spell_version_all") : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <p className="text-[10px] text-muted-foreground/60">
                {filteredCount === totalCount
                  ? t("spell_count_all", { count: totalCount })
                  : t("spell_count_filtered", {
                      filtered: filteredCount,
                      total: totalCount,
                    })}
              </p>
            </div>

            {/* Spell list — scrollable */}
            <div className="overflow-y-auto flex-1">
              {(isStoreLoading || storeEmpty) ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                  <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  {t("spell_loading")}
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  {t("spell_no_results")}
                </div>
              ) : (
                <>
                  {displayed.map((spell) => (
                    <button
                      key={spell.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                      onClick={() => setSelectedSpell(spell)}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {spell.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          <span>
                            {spell.level === 0
                              ? t("spell_cantrip")
                              : t("spell_level", { level: spell.level })}
                          </span>
                          <span>·</span>
                          <span>{spell.school}</span>
                          {spell.concentration && (
                            <>
                              <span>·</span>
                              <span className="text-purple-400">Conc.</span>
                            </>
                          )}
                          {spell.ritual && (
                            <>
                              <span>·</span>
                              <span className="text-blue-400">Ritual</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {spell.casting_time}
                      </span>
                    </button>
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                      className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                    >
                      {t("spell_load_more", {
                        remaining: filteredCount - displayCount,
                      })}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
