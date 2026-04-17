"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, X, ArrowLeft, ChevronDown, Sparkles, HeartPulse, Skull, Globe, Sword, Star, Zap, ScrollText, Users } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { SpellCard } from "@/components/oracle/SpellCard";
import { MonsterStatBlock } from "@/components/oracle/MonsterStatBlock";
import { ItemCard } from "@/components/oracle/ItemCard";
import { useSrdStore } from "@/lib/stores/srd-store";
import { useSrdContentFilter } from "@/lib/hooks/use-srd-content-filter";
import { getCoreConditions, getAllFeats } from "@/lib/srd/srd-search";
import type { SrdSpell, SrdMonster, SrdCondition, SrdItem, SrdRace, SrdBackground } from "@/lib/srd/srd-loader";
import type { SrdFeatEntry } from "@/lib/srd/srd-search";
import { SRD_ABILITIES, type SrdAbility } from "@/lib/data/srd-abilities";
import type { RulesetVersion } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { CompendiumLoginNudge, type CompendiumNudgeMode } from "@/components/player/CompendiumLoginNudge";

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PAGE_SIZE = 50;

const SRD_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter",
  "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer",
  "Warlock", "Wizard",
];

type CompendiumTab = "all" | "spells" | "conditions" | "monsters" | "items" | "feats" | "abilities" | "races" | "backgrounds";

type GlobalResult =
  | { kind: "spell"; item: SrdSpell }
  | { kind: "monster"; item: SrdMonster }
  | { kind: "condition"; item: SrdCondition }
  | { kind: "item"; item: SrdItem }
  | { kind: "feat"; item: SrdFeatEntry }
  | { kind: "ability"; item: SrdAbility }
  | { kind: "race"; item: SrdRace }
  | { kind: "background"; item: SrdBackground };

interface PlayerCompendiumBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select class filter if player class is known */
  playerClass?: string;
  /** Ruleset version for default filter */
  rulesetVersion?: RulesetVersion;
  /**
   * Auth-mode context for the S4.4 login nudge banner.
   * - "guest" → no Supabase user at all (guest combat)
   * - "anonymous" → signed in as Supabase anon user (is_anonymous: true)
   * - "authenticated" → real auth user (banner suppressed)
   * Defaults to "authenticated" so callers that don't opt-in never show a nudge.
   */
  mode?: CompendiumNudgeMode;
  /** Internal path to return to after login/signup. Sanitized before use. */
  returnUrl?: string;
}

export function PlayerCompendiumBrowser({
  open,
  onOpenChange,
  playerClass,
  rulesetVersion,
  mode = "authenticated",
  returnUrl,
}: PlayerCompendiumBrowserProps) {
  const t = useTranslations("combat");
  const locale = useLocale();

  // Tab state
  const [activeTab, setActiveTab] = useState<CompendiumTab>("all");

  // Spells data
  const allSpells = useSrdStore((s) => s.spells);
  const isStoreLoading = useSrdStore((s) => s.is_loading);
  const { filtered: spells } = useSrdContentFilter(allSpells);
  const storeEmpty = allSpells.length === 0;

  // Monsters data
  const allMonsters = useSrdStore((s) => s.monsters);
  const { filtered: monsters } = useSrdContentFilter(allMonsters);

  // Conditions data
  const conditions = useMemo(() => getCoreConditions(), []);

  // Items data — no content filter needed; items are loaded from the
  // appropriate SRD source by SrdInitializer (already filtered by mode)
  const items = useSrdStore((s) => s.items);

  // Feats data — re-compute when store finishes deferred Phase 2b load
  const storeFeats = useSrdStore((s) => s.feats);
  const feats = useMemo(() => getAllFeats(), [storeFeats]);

  // Abilities data — SRD_ABILITIES is a module-level let replaced by setSrdAbilities()
  // in srd-store Phase 2b, which runs BEFORE set({ feats }). Using storeFeats as a
  // proxy trigger ensures this memo re-evaluates when Phase 2b completes.
  const abilities = useMemo(() => [...SRD_ABILITIES], [storeFeats]);

  // Races data
  const races = useSrdStore((s) => s.races);

  // Backgrounds data
  const backgrounds = useSrdStore((s) => s.backgrounds);

  // Spell filters
  const [nameFilter, setNameFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(
    playerClass?.trim() || null
  );
  const [versionFilter, setVersionFilter] = useState<"all" | "2014" | "2024">(
    rulesetVersion ?? "all"
  );
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Monster filters
  const [monsterNameFilter, setMonsterNameFilter] = useState("");
  const [monsterDisplayCount, setMonsterDisplayCount] = useState(PAGE_SIZE);

  // Condition filter
  const [conditionFilter, setConditionFilter] = useState("");

  // Item filters
  const [itemNameFilter, setItemNameFilter] = useState("");
  const [itemDisplayCount, setItemDisplayCount] = useState(PAGE_SIZE);

  // Feat filters
  const [featNameFilter, setFeatNameFilter] = useState("");
  const [featDisplayCount, setFeatDisplayCount] = useState(PAGE_SIZE);

  // Ability filters
  const [abilityNameFilter, setAbilityNameFilter] = useState("");
  const [abilityDisplayCount, setAbilityDisplayCount] = useState(PAGE_SIZE);

  // Race filters
  const [raceNameFilter, setRaceNameFilter] = useState("");
  const [raceDisplayCount, setRaceDisplayCount] = useState(PAGE_SIZE);

  // Background filters
  const [backgroundNameFilter, setBackgroundNameFilter] = useState("");
  const [backgroundDisplayCount, setBackgroundDisplayCount] = useState(PAGE_SIZE);

  // Global search
  const [globalFilter, setGlobalFilter] = useState("");
  const [globalDisplayCount, setGlobalDisplayCount] = useState(PAGE_SIZE);

  // Detail views
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<SrdMonster | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<SrdCondition | null>(null);
  const [selectedItem, setSelectedItem] = useState<SrdItem | null>(null);
  const [selectedFeat, setSelectedFeat] = useState<SrdFeatEntry | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<SrdAbility | null>(null);
  const [selectedRace, setSelectedRace] = useState<SrdRace | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<SrdBackground | null>(null);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setNameFilter("");
        setSelectedLevel(null);
        setSelectedClass(playerClass?.trim() || null);
        setVersionFilter(rulesetVersion ?? "all");
        setSelectedSpell(null);
        setSelectedMonster(null);
        setSelectedCondition(null);
        setSelectedItem(null);
        setSelectedFeat(null);
        setSelectedAbility(null);
        setSelectedRace(null);
        setSelectedBackground(null);
        setActiveTab("all");
        setDisplayCount(PAGE_SIZE);
        setMonsterDisplayCount(PAGE_SIZE);
        setMonsterNameFilter("");
        setConditionFilter("");
        setItemNameFilter("");
        setItemDisplayCount(PAGE_SIZE);
        setFeatNameFilter("");
        setFeatDisplayCount(PAGE_SIZE);
        setAbilityNameFilter("");
        setAbilityDisplayCount(PAGE_SIZE);
        setRaceNameFilter("");
        setRaceDisplayCount(PAGE_SIZE);
        setBackgroundNameFilter("");
        setBackgroundDisplayCount(PAGE_SIZE);
        setGlobalFilter("");
        setGlobalDisplayCount(PAGE_SIZE);
        setClassDropdownOpen(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, playerClass, rulesetVersion]
  );

  // Spell filtering
  const filteredSpells = useMemo(() => {
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

  // Monster filtering
  const filteredMonsters = useMemo(() => {
    let result = monsters;
    if (monsterNameFilter) {
      const lower = monsterNameFilter.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(lower));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [monsters, monsterNameFilter]);

  // Condition filtering
  const filteredConditions = useMemo(() => {
    if (!conditionFilter) return conditions;
    const lower = conditionFilter.toLowerCase();
    return conditions.filter((c) => c.name.toLowerCase().includes(lower));
  }, [conditions, conditionFilter]);

  // Item filtering
  const filteredItems = useMemo(() => {
    let result = items;
    if (itemNameFilter) {
      const lower = itemNameFilter.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(lower));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, itemNameFilter]);

  // Feat filtering
  const filteredFeats = useMemo(() => {
    let result = feats;
    if (featNameFilter) {
      const lower = featNameFilter.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [feats, featNameFilter]);

  // Ability filtering
  const filteredAbilities = useMemo(() => {
    let result = abilities;
    if (abilityNameFilter) {
      const lower = abilityNameFilter.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(lower) || a.name_pt.toLowerCase().includes(lower)
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [abilities, abilityNameFilter]);

  // Race filtering
  const filteredRaces = useMemo(() => {
    let result = [...races];
    if (raceNameFilter) {
      const lower = raceNameFilter.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(lower));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [races, raceNameFilter]);

  // Background filtering
  const filteredBackgrounds = useMemo(() => {
    let result = [...backgrounds];
    if (backgroundNameFilter) {
      const lower = backgroundNameFilter.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(lower));
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [backgrounds, backgroundNameFilter]);

  // Global search — unified results across all types
  const globalResults = useMemo((): GlobalResult[] => {
    if (!globalFilter || globalFilter.length < 2) return [];
    const lower = globalFilter.toLowerCase();
    const results: GlobalResult[] = [];
    for (const s of spells) {
      if (s.name.toLowerCase().includes(lower)) results.push({ kind: "spell", item: s });
    }
    for (const m of monsters) {
      if (m.name.toLowerCase().includes(lower)) results.push({ kind: "monster", item: m });
    }
    for (const c of conditions) {
      if (c.name.toLowerCase().includes(lower)) results.push({ kind: "condition", item: c });
    }
    for (const i of items) {
      if (i.name.toLowerCase().includes(lower)) results.push({ kind: "item", item: i });
    }
    for (const f of feats) {
      if (f.name.toLowerCase().includes(lower)) results.push({ kind: "feat", item: f });
    }
    for (const a of abilities) {
      if (a.name.toLowerCase().includes(lower) || a.name_pt.toLowerCase().includes(lower))
        results.push({ kind: "ability", item: a });
    }
    for (const r of races) {
      if (r.name.toLowerCase().includes(lower)) results.push({ kind: "race", item: r });
    }
    for (const b of backgrounds) {
      if (b.name.toLowerCase().includes(lower)) results.push({ kind: "background", item: b });
    }
    return results.sort((a, b) => a.item.name.localeCompare(b.item.name));
  }, [spells, monsters, conditions, items, feats, abilities, races, backgrounds, globalFilter]);

  // S3.6 telemetry — fire `compendium:search_missed` when a non-trivial query
  // returns zero results, to measure the injector-fix's impact post-deploy.
  //
  // Wave-1 review #5: progressive typing ("v" → "ve" → "vel" → "velo") used to
  // inflate the missed-search dashboards by firing one event per 600ms-debounced
  // keystroke. We now only fire after the user has actually stopped typing —
  // either 2s idle OR on blur — and dedupe by exact query string so a single
  // "final" query fires at most once.
  const lastEmittedQueryRef = useRef<string>("");
  const idleTimerRef = useRef<number | null>(null);

  const maybeEmitSearchMissed = useCallback(() => {
    const q = globalFilter.trim();
    if (q.length < 2) return;
    if (globalResults.length !== 0) return;
    if (lastEmittedQueryRef.current === q) return;
    lastEmittedQueryRef.current = q;
    trackEvent("compendium:search_missed", {
      query_length: q.length,
      language: locale,
      result_count_zero: true,
      surface: "player_compendium",
    });
  }, [globalFilter, globalResults.length, locale]);

  // Trigger A — 2s idle after last query change.
  useEffect(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(maybeEmitSearchMissed, 2_000);
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [globalFilter, maybeEmitSearchMissed]);

  // Trigger B — input blur. Wired below on the global-search input's onBlur.
  const handleSearchBlur = useCallback(() => {
    maybeEmitSearchMissed();
  }, [maybeEmitSearchMissed]);

  const displayedSpells = filteredSpells.slice(0, displayCount);
  const spellTotalCount = spells.length;
  const spellFilteredCount = filteredSpells.length;
  const hasMoreSpells = spellFilteredCount > displayCount;

  const displayedMonsters = filteredMonsters.slice(0, monsterDisplayCount);
  const hasMoreMonsters = filteredMonsters.length > monsterDisplayCount;

  const displayedItems = filteredItems.slice(0, itemDisplayCount);
  const hasMoreItems = filteredItems.length > itemDisplayCount;

  const displayedFeats = filteredFeats.slice(0, featDisplayCount);
  const hasMoreFeats = filteredFeats.length > featDisplayCount;

  const displayedAbilities = filteredAbilities.slice(0, abilityDisplayCount);
  const hasMoreAbilities = filteredAbilities.length > abilityDisplayCount;

  const displayedRaces = filteredRaces.slice(0, raceDisplayCount);
  const hasMoreRaces = filteredRaces.length > raceDisplayCount;

  const displayedBackgrounds = filteredBackgrounds.slice(0, backgroundDisplayCount);
  const hasMoreBackgrounds = filteredBackgrounds.length > backgroundDisplayCount;

  const displayedGlobal = globalResults.slice(0, globalDisplayCount);
  const hasMoreGlobal = globalResults.length > globalDisplayCount;

  // Check if we're in a detail view
  const inDetail = selectedSpell || selectedMonster || selectedCondition || selectedItem || selectedFeat || selectedAbility || selectedRace || selectedBackground;

  const handleBack = () => {
    setSelectedSpell(null);
    setSelectedMonster(null);
    setSelectedCondition(null);
    setSelectedItem(null);
    setSelectedFeat(null);
    setSelectedAbility(null);
    setSelectedRace(null);
    setSelectedBackground(null);
  };

  const detailTitle = selectedSpell?.name ?? selectedMonster?.name ?? selectedCondition?.name ?? selectedItem?.name ?? selectedFeat?.name ?? selectedAbility?.name ?? selectedRace?.name ?? selectedBackground?.name ?? "";

  const tabItems: { key: CompendiumTab; icon: React.ReactNode; label: string }[] = [
    { key: "all", icon: <Globe className="w-3.5 h-3.5" />, label: t("compendium_tab_all") },
    { key: "spells", icon: <Sparkles className="w-3.5 h-3.5" />, label: t("compendium_tab_spells") },
    { key: "conditions", icon: <HeartPulse className="w-3.5 h-3.5" />, label: t("compendium_tab_conditions") },
    { key: "monsters", icon: <Skull className="w-3.5 h-3.5" />, label: t("compendium_tab_monsters") },
    { key: "items", icon: <Sword className="w-3.5 h-3.5" />, label: t("compendium_tab_items") },
    { key: "feats", icon: <Star className="w-3.5 h-3.5" />, label: t("compendium_tab_feats") },
    { key: "abilities", icon: <Zap className="w-3.5 h-3.5" />, label: t("compendium_tab_abilities") },
    { key: "races", icon: <Users className="w-3.5 h-3.5" />, label: t("compendium_tab_races") },
    { key: "backgrounds", icon: <ScrollText className="w-3.5 h-3.5" />, label: t("compendium_tab_backgrounds") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl max-h-[85vh] overflow-hidden !p-0 !bg-surface-secondary !border-white/[0.08]",
          "max-[768px]:!max-w-none max-[768px]:!w-screen max-[768px]:!h-[100dvh] max-[768px]:!max-h-none max-[768px]:!rounded-none max-[768px]:!top-0 max-[768px]:!left-0 max-[768px]:!translate-x-0 max-[768px]:!translate-y-0"
        )}
      >
        <VisuallyHidden.Root>
          <DialogTitle>{t("compendium_title")}</DialogTitle>
        </VisuallyHidden.Root>

        {/* S4.4 — Login nudge for guest/anon users. Suppressed for auth. */}
        {!inDetail && mode !== "authenticated" ? (
          <CompendiumLoginNudge mode={mode} returnUrl={returnUrl} />
        ) : null}

        {inDetail ? (
          /* ── Detail View ── */
          <div className="flex flex-col h-full max-h-[85vh] max-[768px]:max-h-[100dvh]">
            <div className="flex items-center gap-2 p-3 border-b border-white/10 shrink-0">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("spell_back")}
              </button>
              <span className="text-foreground font-semibold text-sm truncate flex-1">
                {detailTitle}
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {selectedSpell && <SpellCard spell={selectedSpell} variant="inline" />}
              {selectedMonster && <MonsterStatBlock monster={selectedMonster} variant="inline" />}
              {selectedCondition && (
                <p className="text-sm text-white/90 whitespace-pre-line">
                  {selectedCondition.description}
                </p>
              )}
              {selectedItem && <ItemCard item={selectedItem} variant="inline" />}
              {selectedFeat && (
                <div className="space-y-3">
                  {selectedFeat.prerequisite && (
                    <p className="text-sm text-amber-400">
                      {t("compendium_feat_prerequisite")}: {selectedFeat.prerequisite}
                    </p>
                  )}
                  <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed">
                    {selectedFeat.description}
                  </p>
                </div>
              )}
              {selectedAbility && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      selectedAbility.ability_type === "class_feature" ? "bg-amber-400/10 text-amber-400"
                      : selectedAbility.ability_type === "racial_trait" ? "bg-emerald-400/10 text-emerald-400"
                      : selectedAbility.ability_type === "subclass_feature" ? "bg-cyan-400/10 text-cyan-400"
                      : "bg-purple-400/10 text-purple-400"
                    }`}>
                      {selectedAbility.ability_type === "class_feature" ? "Class Feature"
                      : selectedAbility.ability_type === "racial_trait" ? "Racial Trait"
                      : selectedAbility.ability_type === "subclass_feature" ? "Subclass Feature"
                      : "Feat"}
                    </span>
                    {(selectedAbility.source_class || selectedAbility.source_race) && (
                      <span className="text-xs text-muted-foreground">
                        {selectedAbility.source_class || selectedAbility.source_race}
                      </span>
                    )}
                    {selectedAbility.level_acquired != null && (
                      <span className="text-xs text-muted-foreground">
                        Lv {selectedAbility.level_acquired}
                      </span>
                    )}
                    {selectedAbility.reset_type && (
                      <span className="text-xs text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded">
                        {selectedAbility.reset_type.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed">
                    {selectedAbility.description}
                  </p>
                </div>
              )}
              {selectedRace && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    {selectedRace.size.length > 0 && (
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">Size: {selectedRace.size.join("/")}</span>
                    )}
                    {selectedRace.speed?.walk != null && (
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">Speed: {selectedRace.speed.walk} ft</span>
                    )}
                    {selectedRace.darkvision != null && selectedRace.darkvision > 0 && (
                      <span className="bg-white/5 px-1.5 py-0.5 rounded">Darkvision: {selectedRace.darkvision} ft</span>
                    )}
                  </div>
                  {selectedRace.ability_bonuses && (
                    <p className="text-sm text-amber-400">{selectedRace.ability_bonuses}</p>
                  )}
                  {selectedRace.languages && (
                    <p className="text-xs text-muted-foreground">Languages: {selectedRace.languages}</p>
                  )}
                  {selectedRace.traits.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {selectedRace.traits.map((trait) => (
                        <div key={trait.name}>
                          <h4 className="text-sm font-semibold text-foreground">{trait.name}</h4>
                          <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed mt-0.5">
                            {trait.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedBackground && (
                <div className="space-y-3">
                  {selectedBackground.skill_proficiencies?.length > 0 && (
                    <p className="text-sm text-amber-400">
                      Skills: {selectedBackground.skill_proficiencies.join(", ")}
                    </p>
                  )}
                  {selectedBackground.tool_proficiencies?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tools: {selectedBackground.tool_proficiencies.join(", ")}
                    </p>
                  )}
                  {selectedBackground.languages?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Languages: {selectedBackground.languages.join(", ")}
                    </p>
                  )}
                  {selectedBackground.equipment && (
                    <p className="text-xs text-muted-foreground">
                      Equipment: {selectedBackground.equipment}
                    </p>
                  )}
                  {selectedBackground.feature_name && (
                    <div className="pt-1">
                      <h4 className="text-sm font-semibold text-foreground">{selectedBackground.feature_name}</h4>
                      {selectedBackground.feature_description && (
                        <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed mt-0.5">
                          {selectedBackground.feature_description}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedBackground.description && (
                    <p className="text-sm text-white/90 whitespace-pre-line leading-relaxed">
                      {selectedBackground.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div className="flex flex-col h-full max-h-[85vh] max-[768px]:max-h-[100dvh]">
            {/* Tab bar — scrollable on narrow screens */}
            <div className="flex border-b border-white/10 shrink-0 overflow-x-auto scrollbar-hide">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center justify-center gap-1 px-2.5 py-2.5 text-xs font-medium transition-colors shrink-0 whitespace-nowrap",
                    activeTab === tab.key
                      ? "text-gold border-b-2 border-gold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── All Tab (Global Search) ── */}
            {activeTab === "all" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={globalFilter}
                      onChange={(e) => {
                        setGlobalFilter(e.target.value);
                        setGlobalDisplayCount(PAGE_SIZE);
                      }}
                      onBlur={handleSearchBlur}
                      placeholder={t("compendium_search_all")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                      autoFocus
                    />
                    {globalFilter && (
                      <button
                        type="button"
                        onClick={() => setGlobalFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {globalFilter.length >= 2 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {globalResults.length} {t("compendium_results_count")}
                    </p>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                  {globalFilter.length < 2 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm px-6 text-center">
                      {t("compendium_search_hint")}
                    </div>
                  ) : (isStoreLoading || storeEmpty) ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedGlobal.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedGlobal.map((result) => {
                        if (result.kind === "spell") {
                          const spell = result.item;
                          return (
                            <button
                              key={`spell-${spell.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedSpell(spell)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {spell.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>
                                    {spell.level === 0 ? t("spell_cantrip") : t("spell_level", { level: spell.level })}
                                  </span>
                                  <span>·</span>
                                  <span>{spell.school}</span>
                                </div>
                              </div>
                              <Sparkles className="w-3.5 h-3.5 text-purple-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "monster") {
                          const monster = result.item;
                          return (
                            <button
                              key={`monster-${monster.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedMonster(monster)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {monster.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>CR {monster.cr}</span>
                                  <span>·</span>
                                  <span>{monster.type}</span>
                                  <span>·</span>
                                  <span>{monster.size}</span>
                                </div>
                              </div>
                              <Skull className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "item") {
                          const item = result.item;
                          return (
                            <button
                              key={`item-${item.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedItem(item)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>{item.type}</span>
                                  {item.rarity && item.rarity !== "none" && (
                                    <><span>·</span><span>{item.rarity}</span></>
                                  )}
                                </div>
                              </div>
                              <Sword className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "feat") {
                          const feat = result.item;
                          return (
                            <button
                              key={`feat-${feat.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedFeat(feat)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {feat.name}
                                </div>
                                {feat.prerequisite && (
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {feat.prerequisite}
                                  </div>
                                )}
                              </div>
                              <Star className="w-3.5 h-3.5 text-yellow-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "ability") {
                          const ability = result.item;
                          return (
                            <button
                              key={`ab-${ability.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedAbility(ability)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {ability.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>{ability.source_class || ability.source_race || "Feat"}</span>
                                  {ability.level_acquired != null && <><span>·</span><span>Lv{ability.level_acquired}</span></>}
                                </div>
                              </div>
                              <Zap className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "race") {
                          const race = result.item;
                          return (
                            <button
                              key={`race-${race.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedRace(race)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {race.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  {race.ability_bonuses && <span>{race.ability_bonuses}</span>}
                                </div>
                              </div>
                              <Users className="w-3.5 h-3.5 text-blue-400/60 shrink-0" />
                            </button>
                          );
                        }
                        if (result.kind === "background") {
                          const bg = result.item;
                          return (
                            <button
                              key={`bg-${bg.id}`}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                              onClick={() => setSelectedBackground(bg)}
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {bg.name}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {bg.skill_proficiencies.join(", ")}
                                </div>
                              </div>
                              <ScrollText className="w-3.5 h-3.5 text-teal-400/60 shrink-0" />
                            </button>
                          );
                        }
                        // condition
                        const condition = result.item as SrdCondition;
                        return (
                          <button
                            key={`cond-${condition.id}`}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                            onClick={() => setSelectedCondition(condition)}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {condition.name}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {condition.description.slice(0, 80)}...
                              </div>
                            </div>
                            <HeartPulse className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                          </button>
                        );
                      })}

                      {hasMoreGlobal && (
                        <button
                          type="button"
                          onClick={() => setGlobalDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: globalResults.length - globalDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Spells Tab ── */}
            {activeTab === "spells" && (
              <>
                {/* Filters */}
                <div className="p-3 space-y-2 border-b border-white/10 shrink-0">
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

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedClass && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gold/20 border border-gold/50 text-gold">
                        {selectedClass}
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
                                !selectedClass ? "text-gold" : "text-muted-foreground"
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
                                  selectedClass === cls ? "text-gold" : "text-muted-foreground"
                                )}
                              >
                                {cls}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

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

                  <p className="text-[10px] text-muted-foreground/60">
                    {spellFilteredCount === spellTotalCount
                      ? t("spell_count_all", { count: spellTotalCount })
                      : t("spell_count_filtered", {
                          filtered: spellFilteredCount,
                          total: spellTotalCount,
                        })}
                  </p>
                </div>

                {/* Spell list */}
                <div className="overflow-y-auto flex-1">
                  {(isStoreLoading || storeEmpty) ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("spell_loading")}
                    </div>
                  ) : displayedSpells.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("spell_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedSpells.map((spell) => (
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

                      {hasMoreSpells && (
                        <button
                          type="button"
                          onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", {
                            remaining: spellFilteredCount - displayCount,
                          })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Conditions Tab ── */}
            {activeTab === "conditions" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={conditionFilter}
                      onChange={(e) => setConditionFilter(e.target.value)}
                      placeholder={t("compendium_search_conditions")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {conditionFilter && (
                      <button
                        type="button"
                        onClick={() => setConditionFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredConditions.length} {t("compendium_conditions_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {filteredConditions.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    filteredConditions.map((condition) => (
                      <button
                        key={condition.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                        onClick={() => setSelectedCondition(condition)}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {condition.name}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {condition.description.slice(0, 80)}...
                          </div>
                        </div>
                        <HeartPulse className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── Items Tab ── */}
            {activeTab === "items" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={itemNameFilter}
                      onChange={(e) => {
                        setItemNameFilter(e.target.value);
                        setItemDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_items")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {itemNameFilter && (
                      <button
                        type="button"
                        onClick={() => setItemNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredItems.length} {t("compendium_items_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {isStoreLoading ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedItems.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedItem(item)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>{item.type}</span>
                              {item.rarity && item.rarity !== "none" && (
                                <><span>·</span><span>{item.rarity}</span></>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.reqAttune && (
                              <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">ATT</span>
                            )}
                            <Sword className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </div>
                        </button>
                      ))}

                      {hasMoreItems && (
                        <button
                          type="button"
                          onClick={() => setItemDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: filteredItems.length - itemDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Feats Tab ── */}
            {activeTab === "feats" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={featNameFilter}
                      onChange={(e) => {
                        setFeatNameFilter(e.target.value);
                        setFeatDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_feats")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {featNameFilter && (
                      <button
                        type="button"
                        onClick={() => setFeatNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredFeats.length} {t("compendium_feats_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {feats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedFeats.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedFeats.map((feat) => (
                        <button
                          key={feat.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedFeat(feat)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {feat.name}
                            </div>
                            {feat.prerequisite && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {feat.prerequisite}
                              </div>
                            )}
                          </div>
                          <Star className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}

                      {hasMoreFeats && (
                        <button
                          type="button"
                          onClick={() => setFeatDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: filteredFeats.length - featDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Abilities Tab ── */}
            {activeTab === "abilities" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={abilityNameFilter}
                      onChange={(e) => {
                        setAbilityNameFilter(e.target.value);
                        setAbilityDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_abilities")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {abilityNameFilter && (
                      <button
                        type="button"
                        onClick={() => setAbilityNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredAbilities.length} {t("compendium_abilities_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {abilities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedAbilities.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedAbilities.map((ability) => (
                        <button
                          key={ability.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedAbility(ability)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {ability.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>{ability.source_class || ability.source_race || "Feat"}</span>
                              {ability.level_acquired != null && (
                                <><span>·</span><span>Lv{ability.level_acquired}</span></>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            ability.ability_type === "class_feature" ? "bg-amber-400/10 text-amber-400"
                            : ability.ability_type === "racial_trait" ? "bg-emerald-400/10 text-emerald-400"
                            : ability.ability_type === "subclass_feature" ? "bg-cyan-400/10 text-cyan-400"
                            : "bg-purple-400/10 text-purple-400"
                          }`}>
                            {ability.ability_type === "class_feature" ? "Class"
                            : ability.ability_type === "racial_trait" ? "Racial"
                            : ability.ability_type === "subclass_feature" ? "Subclass"
                            : "Feat"}
                          </span>
                        </button>
                      ))}

                      {hasMoreAbilities && (
                        <button
                          type="button"
                          onClick={() => setAbilityDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: filteredAbilities.length - abilityDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Races Tab ── */}
            {activeTab === "races" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={raceNameFilter}
                      onChange={(e) => {
                        setRaceNameFilter(e.target.value);
                        setRaceDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_races")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {raceNameFilter && (
                      <button
                        type="button"
                        onClick={() => setRaceNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredRaces.length} {t("compendium_races_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {races.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedRaces.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedRaces.map((race) => (
                        <button
                          key={race.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedRace(race)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {race.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {race.ability_bonuses && <span>{race.ability_bonuses}</span>}
                              {race.languages && (
                                <><span>·</span><span>{race.languages}</span></>
                              )}
                            </div>
                          </div>
                          <Users className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}

                      {hasMoreRaces && (
                        <button
                          type="button"
                          onClick={() => setRaceDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: filteredRaces.length - raceDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Backgrounds Tab ── */}
            {activeTab === "backgrounds" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={backgroundNameFilter}
                      onChange={(e) => {
                        setBackgroundNameFilter(e.target.value);
                        setBackgroundDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_backgrounds")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {backgroundNameFilter && (
                      <button
                        type="button"
                        onClick={() => setBackgroundNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredBackgrounds.length} {t("compendium_backgrounds_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {backgrounds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedBackgrounds.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedBackgrounds.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedBackground(bg)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {bg.name}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {bg.skill_proficiencies.join(", ")}
                            </div>
                          </div>
                          <ScrollText className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}

                      {hasMoreBackgrounds && (
                        <button
                          type="button"
                          onClick={() => setBackgroundDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", { remaining: filteredBackgrounds.length - backgroundDisplayCount })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── Monsters Tab ── */}
            {activeTab === "monsters" && (
              <>
                <div className="p-3 border-b border-white/10 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={monsterNameFilter}
                      onChange={(e) => {
                        setMonsterNameFilter(e.target.value);
                        setMonsterDisplayCount(PAGE_SIZE);
                      }}
                      placeholder={t("compendium_search_monsters")}
                      className="w-full h-9 pl-8 pr-8 text-sm bg-black/30 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/50"
                    />
                    {monsterNameFilter && (
                      <button
                        type="button"
                        onClick={() => setMonsterNameFilter("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filteredMonsters.length} {t("compendium_monsters_count")}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1">
                  {(isStoreLoading || allMonsters.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                      <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      {t("compendium_loading")}
                    </div>
                  ) : displayedMonsters.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                      {t("compendium_no_results")}
                    </div>
                  ) : (
                    <>
                      {displayedMonsters.map((monster) => (
                        <button
                          key={monster.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.04] flex items-center justify-between gap-2 transition-colors"
                          onClick={() => setSelectedMonster(monster)}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {monster.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>CR {monster.cr}</span>
                              <span>·</span>
                              <span>{monster.type}</span>
                              <span>·</span>
                              <span>{monster.size}</span>
                            </div>
                          </div>
                          <Skull className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}

                      {hasMoreMonsters && (
                        <button
                          type="button"
                          onClick={() => setMonsterDisplayCount((c) => c + PAGE_SIZE)}
                          className="w-full py-3 text-xs text-gold hover:text-gold/80 transition-colors"
                        >
                          {t("spell_load_more", {
                            remaining: filteredMonsters.length - monsterDisplayCount,
                          })}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
