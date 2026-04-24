"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, Sparkles, Package, ScrollText, Map, Network, ChevronLeft, Zap, type LucideIcon } from "lucide-react";
import { ClassIcon } from "@/components/character/ClassIcon";
import { CharacterStatusPanel } from "./CharacterStatusPanel";
import { CharacterCoreStats } from "./CharacterCoreStats";
import { CharacterEditSheet } from "./CharacterEditSheet";
import { ResourceTrackerList } from "./ResourceTrackerList";
import { SpellSlotsHq } from "./SpellSlotsHq";
import { RestResetPanel } from "./RestResetPanel";
import { SpellListSection } from "./SpellListSection";
import { BagOfHolding } from "./BagOfHolding";
import { PersonalInventory } from "./PersonalInventory";
import { NotificationFeed } from "./NotificationFeed";
import { PlayerNotesSection } from "./PlayerNotesSection";
import { PlayerQuestBoard } from "./PlayerQuestBoard";
import { PlayerMindMap } from "./PlayerMindMap";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { useResourceTrackers } from "@/lib/hooks/useResourceTrackers";
import { useCharacterAbilities } from "@/lib/hooks/useCharacterAbilities";
import { useActiveEffects } from "@/lib/hooks/useActiveEffects";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { AbilitiesSection } from "./AbilitiesSection";
import { ActiveEffectsPanel } from "./ActiveEffectsPanel";
import { AttunementSection } from "./AttunementSection";
import { ProficienciesSection } from "./ProficienciesSection";
import { CharacterPdfExport } from "./CharacterPdfExport";
import { PlayerHqTourProvider } from "@/components/tour/PlayerHqTourProvider";

type Tab = "map" | "sheet" | "resources" | "abilities" | "inventory" | "notes" | "quests";

const TABS: Array<{ key: Tab; icon: LucideIcon; labelKey: string }> = [
  { key: "map", icon: Network, labelKey: "tabs.map" },
  { key: "sheet", icon: Heart, labelKey: "tabs.sheet" },
  { key: "resources", icon: Sparkles, labelKey: "tabs.resources" },
  { key: "abilities", icon: Zap, labelKey: "tabs.abilities" },
  { key: "inventory", icon: Package, labelKey: "tabs.inventory" },
  { key: "notes", icon: ScrollText, labelKey: "tabs.notes" },
  { key: "quests", icon: Map, labelKey: "tabs.quests" },
];

function TabBar({
  activeTab,
  onTabChange,
  t,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  t: ReturnType<typeof useTranslations<"player_hq">>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFade(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkOverflow, { passive: true });
    window.addEventListener("resize", checkOverflow);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex border-b border-border overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label={t("tabs.aria_tablist")}
      >
        {TABS.map(({ key, icon: Icon, labelKey }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={activeTab === key}
            aria-controls={`panel-${key}`}
            data-tour-id={`hq-tab-${key}`}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === key
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>
      {/* Scroll fade indicator (right edge) */}
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}

/**
 * Line 2 of the Player HQ header (EP-1 A4 "Recursos rápidos").
 * Canonical spec: _bmad-output/party-mode-2026-04-22/08-design-tokens-delta.md §13
 *
 * Renders `HD x/y · CD x/y · Insp x · [✨ Slots X/Y →]`.
 *
 * `hit_dice` and `class.resources.primary` are not yet modelled on
 * `player_characters` — those chips render the muted em-dash placeholder
 * until Sprint 3+ lands the schema. Inspiration + spell slot total are live.
 */
function PlayerHqQuickResources({
  inspiration,
  spellSlots,
  onJumpToSlots,
  t,
}: {
  inspiration: boolean;
  spellSlots: Record<string, { max: number; used: number }> | null;
  onJumpToSlots: () => void;
  t: ReturnType<typeof useTranslations<"player_hq">>;
}) {
  const inspCount = inspiration ? 1 : 0;
  const inspMuted = inspCount === 0;

  const { slotsUsed, slotsMax } = (() => {
    if (!spellSlots) return { slotsUsed: 0, slotsMax: 0 };
    return Object.values(spellSlots).reduce(
      (acc, s) => ({
        slotsUsed: acc.slotsUsed + (s?.used ?? 0),
        slotsMax: acc.slotsMax + (s?.max ?? 0),
      }),
      { slotsUsed: 0, slotsMax: 0 }
    );
  })();

  const hasSlots = slotsMax > 0;
  const placeholder = t("header.empty_placeholder");
  // Separator shared across chips (U+00B7 middle dot).
  const Sep = () => (
    <span aria-hidden className="text-muted-foreground/60 select-none">·</span>
  );

  return (
    <div
      className="flex items-center flex-wrap gap-x-3 gap-y-1 pl-8 text-[13px] tabular-nums"
      data-testid="hq-header-quick-resources"
    >
      {/* HD — data not yet modelled on player_characters */}
      <span
        className="inline-flex items-baseline gap-1 text-muted-foreground"
        aria-label={t("header.hd_empty_aria")}
      >
        <span className="text-[11px] uppercase tracking-[0.08em]" aria-hidden="true">
          {t("header.hd_label")}
        </span>
        <span aria-hidden="true">{placeholder}</span>
      </span>
      <Sep />
      {/* CD — data not yet modelled (class.resources.primary pending Sprint 3+) */}
      <span
        className="inline-flex items-baseline gap-1 text-muted-foreground"
        aria-label={t("header.cd_empty_aria")}
      >
        <span className="text-[11px] uppercase tracking-[0.08em]" aria-hidden="true">
          {t("header.cd_label")}
        </span>
        <span aria-hidden="true">{placeholder}</span>
      </span>
      <Sep />
      {/* Inspiration — muted when zero per §13.1 */}
      <span
        className={`inline-flex items-baseline gap-1 ${
          inspMuted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("header.inspiration_short")}
        </span>
        <span>{inspCount}</span>
      </span>
      {/* Spell slots chip — click switches to Resources tab (Sprint 3+: the
          spec §13.2 scroll-to + highlight ring upgrade lands with the V2
          shell; today we switch tabs as a usable stop-gap). */}
      {hasSlots && (
        <button
          type="button"
          onClick={onJumpToSlots}
          aria-label={t("header.slots_chip_aria", {
            used: slotsUsed,
            max: slotsMax,
          })}
          data-testid="hq-header-slots-chip"
          className="inline-flex items-center gap-1 basis-full sm:basis-auto justify-end sm:justify-start text-[12px] font-medium text-amber-400 hover:text-amber-300 transition-colors min-h-[44px] sm:min-h-[28px] px-1 -mx-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          <span>
            {t("header.slots_chip_label", {
              used: slotsUsed,
              max: slotsMax,
            })}
          </span>
          <span aria-hidden>→</span>
        </button>
      )}
    </div>
  );
}

interface PlayerHqShellProps {
  characterId: string;
  campaignId: string;
  campaignName: string;
  userId: string;
  /** Whether the HQ tour has been completed — false triggers the tour */
  playerHqTourCompleted?: boolean;
}

export function PlayerHqShell({
  characterId,
  campaignId,
  campaignName,
  userId,
  playerHqTourCompleted = true,
}: PlayerHqShellProps) {
  const t = useTranslations("player_hq");
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const {
    character,
    loading: charLoading,
    updateHp,
    updateTempHp,
    toggleCondition,
    setConditions,
    toggleInspiration,
    updateSpellSlots,
    saveField,
  } = useCharacterStatus(characterId);

  // C-01 fix: Single instance of useResourceTrackers, shared by RestResetPanel + ResourceTrackerList
  const resourceHook = useResourceTrackers(characterId);
  const abilitiesHook = useCharacterAbilities(characterId);
  const activeEffectsHook = useActiveEffects(characterId);

  const { notifications } = useNotifications(userId);

  const loading = charLoading || resourceHook.loading;

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/3" />
        <div className="h-40 bg-white/5 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("sheet.no_character")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Player HQ Tour — triggers on first visit */}
      <PlayerHqTourProvider shouldAutoStart={!playerHqTourCompleted} />

      {/* Header — 2 lines: (1) identity, (2) recursos rápidos */}
      <div className="flex flex-col gap-1.5" data-tour-id="hq-header">
        {/* Line 1: identity row */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/app/campaigns/${campaignId}`}
            aria-label={t("header.back_aria")}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <ClassIcon
              characterClass={character.class}
              size={20}
              className="text-amber-400 flex-shrink-0"
            />
            <h1 className="text-lg font-semibold text-foreground truncate">
              {[
                campaignName,
                character.name,
                [character.race, character.class].filter(Boolean).join("/") || null,
                character.level
                  ? `${t("sheet.level_prefix")}${character.level}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </h1>
          </div>
          <CharacterPdfExport
            character={{
              ...character,
              proficiencies: character.proficiencies ?? {},
            }}
          />
          <CharacterEditSheet
            character={character}
            onSave={saveField}
            translations={{
              edit_character: t("edit.edit_character"),
              identity: t("edit.identity"),
              combat_stats: t("edit.combat_stats"),
              attributes: t("edit.attributes"),
              notes: t("edit.notes"),
              name: t("edit.name"),
              race: t("edit.race"),
              class: t("edit.class"),
              level: t("edit.level"),
              subclass: t("edit.subclass"),
              subrace: t("edit.subrace"),
              background: t("edit.background"),
              alignment: t("edit.alignment"),
              max_hp: t("edit.max_hp"),
              ac: t("edit.ac"),
              speed: t("edit.speed"),
              initiative_bonus: t("edit.initiative_bonus"),
              spell_save_dc: t("edit.spell_save_dc"),
              str: t("edit.str"),
              dex: t("edit.dex"),
              con: t("edit.con"),
              int: t("edit.int"),
              wis: t("edit.wis"),
              cha: t("edit.cha"),
              notes_placeholder: t("edit.notes_placeholder"),
            }}
          />
        </div>
        {/* Line 2: recursos rápidos (HD · CD · Insp · Slots chip) */}
        <PlayerHqQuickResources
          inspiration={character.inspiration}
          spellSlots={character.spell_slots}
          onJumpToSlots={() => setActiveTab("resources")}
          t={t}
        />
      </div>

      {/* Tab bar with ARIA roles + mobile scroll fade */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} t={t} />

      {/* Tab content */}
      <div key={activeTab} id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="animate-in fade-in-0 duration-150">
      {activeTab === "map" && (
        <PlayerMindMap
          campaignId={campaignId}
          campaignName={campaignName}
          characterId={characterId}
          userId={userId}
          onNavigateTab={(tab) => setActiveTab(tab as Tab)}
        />
      )}

      {activeTab === "sheet" && (
        <div className="space-y-3">
          <CharacterStatusPanel
            currentHp={character.current_hp}
            maxHp={character.max_hp}
            hpTemp={character.hp_temp}
            conditions={character.conditions}
            characterId={character.id}
            characterName={character.name}
            onHpChange={updateHp}
            onTempHpChange={updateTempHp}
            onToggleCondition={toggleCondition}
            onSetConditions={setConditions}
          />
          <CharacterCoreStats
            ac={character.ac}
            initiativeBonus={character.initiative_bonus}
            speed={character.speed}
            inspiration={character.inspiration}
            spellSaveDc={character.spell_save_dc}
            str={character.str}
            dex={character.dex}
            con={character.con}
            intScore={character.int_score}
            wis={character.wis}
            chaScore={character.cha_score}
            onToggleInspiration={toggleInspiration}
          />
          <ProficienciesSection
            proficiencies={character.proficiencies ?? {}}
            level={character.level}
            str={character.str}
            dex={character.dex}
            con={character.con}
            intScore={character.int_score}
            wis={character.wis}
            chaScore={character.cha_score}
            onSave={saveField}
          />
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-3">
          <RestResetPanel
            resetByType={resourceHook.resetByType}
            countByResetType={resourceHook.countByResetType}
            spellSlots={character.spell_slots}
            onSpellSlotsReset={updateSpellSlots}
            additionalResetByType={abilitiesHook.resetByType}
            additionalCountByResetType={abilitiesHook.countByResetType}
            onDismissAllEffects={activeEffectsHook.dismissAll}
            activeEffectCount={activeEffectsHook.effects.length}
          />
          <SpellSlotsHq
            spellSlots={character.spell_slots}
            onUpdateSpellSlots={updateSpellSlots}
          />
          <ActiveEffectsPanel
            effects={activeEffectsHook.effects}
            loading={activeEffectsHook.loading}
            onAdd={activeEffectsHook.addEffect}
            onUpdate={activeEffectsHook.updateEffect}
            onDismiss={activeEffectsHook.dismissEffect}
            onDecrementQuantity={activeEffectsHook.decrementQuantity}
            onIncrementQuantity={activeEffectsHook.incrementQuantity}
            concentrationConflictName={activeEffectsHook.getConcentrationConflict()?.name}
            onDismissConcentration={
              activeEffectsHook.getConcentrationConflict()
                ? () => activeEffectsHook.dismissEffect(activeEffectsHook.getConcentrationConflict()!.id)
                : undefined
            }
          />
          <ResourceTrackerList
            trackers={resourceHook.trackers}
            loading={resourceHook.loading}
            onToggleDot={resourceHook.toggleDot}
            onResetTracker={resourceHook.resetTracker}
            onAddTracker={resourceHook.addTracker}
            onUpdateTracker={resourceHook.updateTracker}
            onDeleteTracker={resourceHook.deleteTracker}
          />
          <SpellListSection characterId={characterId} />
        </div>
      )}
      {activeTab === "abilities" && (
        <AbilitiesSection
          characterId={characterId}
          characterClass={character.class}
          characterRace={character.race}
        />
      )}

      {activeTab === "inventory" && (
        <div className="space-y-3">
          {/* Attunement slots */}
          <AttunementSection characterId={characterId} />

          {/* Personal inventory */}
          <PersonalInventory characterId={characterId} />

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              {t("personal.shared_inventory")}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Shared Bag of Holding */}
          <BagOfHolding
            campaignId={campaignId}
            userId={userId}
            isDm={false}
          />
          {notifications.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-4 pt-3 pb-1">
                {t("notifications.title")}
              </h3>
              <NotificationFeed
                notifications={notifications}
                emptyMessage={t("notifications.empty")}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <PlayerNotesSection
          characterId={characterId}
          campaignId={campaignId}
        />
      )}

      {activeTab === "quests" && (
        <PlayerQuestBoard
          campaignId={campaignId}
          userId={userId}
        />
      )}
      </div>
    </div>
  );
}
