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
import { useNotifications } from "@/lib/hooks/useNotifications";
import { AbilitiesSection } from "./AbilitiesSection";
import { AttunementSection } from "./AttunementSection";
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

  const { notifications } = useNotifications(userId);

  const loading = charLoading || resourceHook.loading;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
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
    <div className="space-y-4 pb-20">
      {/* Player HQ Tour — triggers on first visit */}
      <PlayerHqTourProvider shouldAutoStart={!playerHqTourCompleted} />

      {/* Header */}
      <div className="flex items-center gap-3" data-tour-id="hq-header">
        <Link
          href={`/app/campaigns/${campaignId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-foreground truncate flex items-center gap-1.5">
            <ClassIcon characterClass={character.class} size={20} className="text-amber-400 flex-shrink-0" />
            {character.name}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {[character.race, character.class, character.level ? `${t("sheet.level_prefix")}${character.level}` : null]
              .filter(Boolean)
              .join(" · ") || campaignName}
          </p>
        </div>
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
        <div className="space-y-4">
          <CharacterStatusPanel
            currentHp={character.current_hp}
            maxHp={character.max_hp}
            hpTemp={character.hp_temp}
            conditions={character.conditions}
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
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-4">
          <RestResetPanel
            resetByType={resourceHook.resetByType}
            countByResetType={resourceHook.countByResetType}
            spellSlots={character.spell_slots}
            onSpellSlotsReset={updateSpellSlots}
            additionalResetByType={abilitiesHook.resetByType}
            additionalCountByResetType={abilitiesHook.countByResetType}
          />
          <SpellSlotsHq
            spellSlots={character.spell_slots}
            onUpdateSpellSlots={updateSpellSlots}
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
        <div className="space-y-4">
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
