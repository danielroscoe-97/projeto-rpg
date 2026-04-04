"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, Sparkles, Package, ScrollText, Map, Network, ChevronLeft } from "lucide-react";
import { CharacterStatusPanel } from "./CharacterStatusPanel";
import { CharacterCoreStats } from "./CharacterCoreStats";
import { ResourceTrackerList } from "./ResourceTrackerList";
import { SpellSlotsHq } from "./SpellSlotsHq";
import { RestResetPanel } from "./RestResetPanel";
import { SpellListSection } from "./SpellListSection";
import { BagOfHolding } from "./BagOfHolding";
import { PlayerNotesSection } from "./PlayerNotesSection";
import { PlayerQuestBoard } from "./PlayerQuestBoard";
import { PlayerMindMap } from "./PlayerMindMap";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { useResourceTrackers } from "@/lib/hooks/useResourceTrackers";

type Tab = "map" | "sheet" | "resources" | "inventory" | "notes" | "quests";

interface PlayerHqShellProps {
  characterId: string;
  campaignId: string;
  campaignName: string;
  userId: string;
}

export function PlayerHqShell({
  characterId,
  campaignId,
  campaignName,
  userId,
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
  } = useCharacterStatus(characterId);

  // C-01 fix: Single instance of useResourceTrackers, shared by RestResetPanel + ResourceTrackerList
  const resourceHook = useResourceTrackers(characterId);

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/app/campaigns/${campaignId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {character.name}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {[character.race, character.class, character.level ? `${t("sheet.level_prefix")}${character.level}` : null]
              .filter(Boolean)
              .join(" · ") || campaignName}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "map"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network className="w-4 h-4" />
          {t("tabs.map")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sheet")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "sheet"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="w-4 h-4" />
          {t("tabs.sheet")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "resources"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {t("tabs.resources")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "inventory"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          {t("tabs.inventory")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "notes"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ScrollText className="w-4 h-4" />
          {t("tabs.notes")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quests")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "quests"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Map className="w-4 h-4" />
          {t("tabs.quests")}
        </button>
      </div>

      {/* Tab content */}
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
      {activeTab === "inventory" && (
        <BagOfHolding
          campaignId={campaignId}
          userId={userId}
          isDm={false}
        />
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
  );
}
