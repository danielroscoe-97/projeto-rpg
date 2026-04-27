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
import { RibbonVivo } from "./RibbonVivo";

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
 * HeroiTab — Wave 3a Stories C1 + C3.
 *
 * Composition (per
 * [03-wireframe-heroi.md](../../../_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md)):
 *
 *   Sticky    : RibbonVivo       — HP + chips + slots + conditions
 *   Coluna A  : CharacterCoreStats + ProficienciesSection
 *   Coluna B  : ActiveEffectsPanel + ResourceTrackerList + SpellSlotsHq
 *               + SpellListSection
 *   Footer    : RestResetPanel
 *
 * Layout:
 *   - Below `xl` (1280px): single-column stack — A then B (mobile-first).
 *   - At `xl+`: CSS Grid `xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` so
 *     each column flexes to half the viewport with `gap-6 xl:gap-10`.
 *
 * `<CharacterStatusPanel>` from V1 still mounts in coluna A but with
 * `showHp=false` because the ribbon is the canonical HP surface. The
 * conditions chip grid stays here so toggle parity with V1 is preserved
 * (the ribbon's condition strip is the same component, but the in-coluna
 * copy stays the keyboard-nav anchor).
 *
 * NOTE: Combat-auto reorg (C5), `useCampaignCombatState` (C4),
 * `<CombatBanner>` (C5), and `<PostCombatBanner>` mount (A6) land in the
 * follow-up commits in this same PR. The TODO marker at the top of the
 * return body is the host point for those mounts.
 */
export function HeroiTab({
  characterId,
  // campaignId/userId arrive from the shell for parity with sibling
  // wrappers, but Herói currently composes only character-scoped data.
  // Keeping them in the destructure (prefixed) silences unused-prop
  // drift if ever a section here grows to need them.
  campaignId: _campaignId,
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
      {/* TODO(post-combat + combat-auto): the next commits in this PR
          mount <CombatBanner> + <PostCombatBanner> here, and wire the
          ribbon's `combatActive` flag from `useCampaignCombatState`.
          Layout below stays valid in both states because the columns are
          self-balancing via `minmax(0, 1fr)`. */}

      {/* C1 — Ribbon Vivo. Sticky, 2-line, replaces the V1 HP card +
          stat-chips. `combatActive` defaults to false here; the C4 hook
          flips it once landed. */}
      <RibbonVivo
        characterId={character.id}
        characterName={character.name}
        currentHp={character.current_hp}
        maxHp={character.max_hp}
        hpTemp={character.hp_temp}
        ac={character.ac}
        initiativeBonus={character.initiative_bonus}
        speed={character.speed}
        inspiration={character.inspiration}
        spellSaveDc={character.spell_save_dc}
        conditions={character.conditions}
        spellSlots={character.spell_slots}
        onHpChange={updateHp}
        onTempHpChange={updateTempHp}
        onToggleCondition={toggleCondition}
        onSetConditions={setConditions}
        onToggleInspiration={toggleInspiration}
      />

      {/* C3 — 2-col layout. `xl:` breakpoint = ≥1280px per spec §1.
          `minmax(0, 1fr)` lets each column flex to half the viewport
          while clipping content that would overflow (long monster
          names, etc). Single column stack <1280px. */}
      <div
        className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 xl:gap-10"
        data-testid="heroi-2col-grid"
      >
        {/* ── Coluna A — Identidade & Proficiências ─────────────────── */}
        <div className="space-y-3" data-testid="heroi-col-a">
          {/* CharacterStatusPanel still mounts so condition toggles + the
              exhaustion drop-down keep their canonical home — but `showHp`
              is off because the ribbon owns the HP surface now. */}
          <CharacterStatusPanel
            currentHp={character.current_hp}
            maxHp={character.max_hp}
            hpTemp={character.hp_temp}
            conditions={character.conditions}
            characterId={character.id}
            characterName={character.name}
            showHp={false}
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

        {/* ── Coluna B — Recursos voláteis ──────────────────────────── */}
        <div className="space-y-3" data-testid="heroi-col-b">
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

          <ResourceTrackerList
            trackers={resourceHook.trackers}
            loading={resourceHook.loading}
            onToggleDot={resourceHook.toggleDot}
            onResetTracker={resourceHook.resetTracker}
            onAddTracker={resourceHook.addTracker}
            onUpdateTracker={resourceHook.updateTracker}
            onDeleteTracker={resourceHook.deleteTracker}
          />

          <SpellSlotsHq
            spellSlots={character.spell_slots}
            onUpdateSpellSlots={updateSpellSlots}
          />

          <SpellListSection characterId={characterId} />
        </div>
      </div>

      {/* Footer — RestResetPanel spans full width since it acts on data
          owned by both columns. Renders last so the "end of day" action
          is the natural scroll-to-bottom destination. */}
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
