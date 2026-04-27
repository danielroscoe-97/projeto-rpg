"use client";

import { useTranslations } from "next-intl";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { useResourceTrackers } from "@/lib/hooks/useResourceTrackers";
import { useCharacterAbilities } from "@/lib/hooks/useCharacterAbilities";
import { useActiveEffects } from "@/lib/hooks/useActiveEffects";

import { CharacterStatusPanel } from "../CharacterStatusPanel";
import { CharacterCoreStats } from "../CharacterCoreStats";
import { ProficienciesSection } from "../ProficienciesSection";
import { ActiveEffectsPanel } from "../ActiveEffectsPanel";
import { SpellSlotsHq } from "../SpellSlotsHq";
import { ResourceTrackerList } from "../ResourceTrackerList";
import { SpellListSection } from "../SpellListSection";
import { RestResetPanel } from "../RestResetPanel";

/**
 * Canonical prop shape forwarded by `PlayerHqShellV2` to every B2 tab
 * wrapper. Locked in B1 so all 4 wrappers (Heroi/Arsenal/Diario/Mapa)
 * share one signature — see `_bmad-output/party-mode-2026-04-22/
 * 09-implementation-plan.md` §B1/§B2 and the PR #62 follow-up. Sibling
 * wrappers `import type { PlayerHqV2TabProps } from "./HeroiTab"` to
 * avoid forking the contract.
 */
export interface PlayerHqV2TabProps {
  characterId: string;
  campaignId: string;
  userId: string;
}

/**
 * HeroiTab — Sprint 3 Track B · Story B2a.
 *
 * Composes the 8 existing Player HQ sections that make up the "ficha viva"
 * per [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md)
 * + [03-wireframe-heroi.md](../../../_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md):
 *
 *   1. CharacterStatusPanel    — HP + conditions
 *   2. CharacterCoreStats      — AC / Init / Speed / Inspiration / DC + 6 ability chips
 *   3. ProficienciesSection    — saves + skills (3-col grid per A3)
 *   4. ActiveEffectsPanel      — buffs / debuffs with concentration tracking
 *   5. SpellSlotsHq            — slots I-IX with dot toggles
 *   6. ResourceTrackerList     — class resources (Channel Divinity, Bardic etc.)
 *   7. SpellListSection        — known/prepared spells
 *   8. RestResetPanel          — short/long rest reset orchestrator
 *
 * Internal layout: single-column for now. The 2-column desktop layout
 * (decision #29) lands in Wave 3 / Story C3 — keeping single-col here
 * means C3 only has to swap the wrapper, not refactor data plumbing.
 *
 * Hooks called locally so the wrapper is self-contained — PlayerHqShellV2
 * does not need to plumb hook results through props (mirrors V1's pattern
 * where data fetching lives at the shell level but each section accepts
 * primitive values).
 *
 * NOTE: PostCombatBanner is intentionally NOT mounted here. Its host move
 * into HeroiTab is deferred until the `feat/estabilidade-combate` sprint
 * completes — combat-stability owns the `combat:ended` broadcast wiring.
 */
export function HeroiTab({
  characterId,
  // campaignId is forwarded to CharacterCoreStats for the AbilityChip
  // broadcast (Wave 3b · Story C7). userId is unused at this surface but
  // kept for parity with sibling wrappers — when a future section reads
  // it the prop is already wired.
  campaignId,
  userId: _userId,
}: PlayerHqV2TabProps) {
  const t = useTranslations("player_hq");

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

  // Single instance per hook — RestResetPanel + ResourceTrackerList share
  // the same `useResourceTrackers` view (matches V1 PlayerHqShell.tsx:252
  // "C-01 fix: Single instance of useResourceTrackers, shared by ...").
  const resourceHook = useResourceTrackers(characterId);
  const activeEffectsHook = useActiveEffects(characterId);
  // Abilities live in Arsenal but RestResetPanel must reset their cooldowns
  // too. ArsenalTab calls `useCharacterAbilities` independently for its own
  // list rendering. The two instances cost an extra Supabase fetch but
  // mirrors V1 PlayerHqShell.tsx:276 which also held the hook at shell
  // level for the same purpose. A future shell-level lift can dedupe.
  const abilitiesHook = useCharacterAbilities(characterId);

  const loading = charLoading || resourceHook.loading;

  if (loading) {
    return (
      <div
        className="space-y-3 animate-pulse"
        data-testid="heroi-tab-loading"
      >
        <div className="h-8 bg-white/5 rounded w-1/3" />
        <div className="h-40 bg-white/5 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!character) {
    return (
      <div
        className="text-center py-12"
        data-testid="heroi-tab-empty"
      >
        <p className="text-muted-foreground">{t("sheet.no_character")}</p>
      </div>
    );
  }

  const concentrationConflict =
    activeEffectsHook.getConcentrationConflict();

  return (
    <div className="space-y-3" data-testid="heroi-tab-content">
      {/* TODO(post-combat): mount PostCombatBanner here once combat-
          stability sprint completes wiring of the combat:ended broadcast
          into Player HQ. See `lib/hooks/usePostCombatState.ts` for the
          existing hook surface. */}

      {/* 1. HP + Conditions */}
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

      {/* 2. AC / Init / Speed / Inspiration / Spell Save DC + 6 ability chips.
          Wave 3b: passes proficiencies + level + campaign/character context
          so the V2 ability cells render as interactive AbilityChip with
          CHK + SAVE roll zones. V1 ignores the new props and renders the
          legacy static cells unchanged. */}
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
        proficiencies={character.proficiencies}
        level={character.level}
        campaignId={campaignId}
        characterId={character.id}
        characterName={character.name}
      />

      {/* 3. Saves + Skills (3-col grid per A3) */}
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

      {/* 4. Active Effects (buffs/debuffs + concentration) */}
      <ActiveEffectsPanel
        effects={activeEffectsHook.effects}
        loading={activeEffectsHook.loading}
        onAdd={activeEffectsHook.addEffect}
        onUpdate={activeEffectsHook.updateEffect}
        onDismiss={activeEffectsHook.dismissEffect}
        onDecrementQuantity={activeEffectsHook.decrementQuantity}
        onIncrementQuantity={activeEffectsHook.incrementQuantity}
        concentrationConflictName={concentrationConflict?.name}
        onDismissConcentration={
          concentrationConflict
            ? () => activeEffectsHook.dismissEffect(concentrationConflict.id)
            : undefined
        }
      />

      {/* 5. Spell Slots */}
      <SpellSlotsHq
        spellSlots={character.spell_slots}
        onUpdateSpellSlots={updateSpellSlots}
      />

      {/* 6. Class Resources */}
      <ResourceTrackerList
        trackers={resourceHook.trackers}
        loading={resourceHook.loading}
        onToggleDot={resourceHook.toggleDot}
        onResetTracker={resourceHook.resetTracker}
        onAddTracker={resourceHook.addTracker}
        onUpdateTracker={resourceHook.updateTracker}
        onDeleteTracker={resourceHook.deleteTracker}
      />

      {/* 7. Spell List (search + filter + favorites) */}
      <SpellListSection characterId={characterId} />

      {/* 8. Rest / Reset orchestrator. Renders LAST so the rest button is
          adjacent to the resources it affects when scrolling on mobile.
          On V1 this lived at the TOP of the resources tab; placing it
          last here matches the wireframe's intent of "end-of-day" action. */}
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
    </div>
  );
}
