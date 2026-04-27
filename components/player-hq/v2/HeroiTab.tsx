"use client";

import { useTranslations } from "next-intl";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { useResourceTrackers } from "@/lib/hooks/useResourceTrackers";
import { useCharacterAbilities } from "@/lib/hooks/useCharacterAbilities";
import { useActiveEffects } from "@/lib/hooks/useActiveEffects";
import { useCampaignCombatState } from "@/lib/hooks/useCampaignCombatState";

import { CharacterStatusPanel } from "../CharacterStatusPanel";
import { CharacterCoreStats } from "../CharacterCoreStats";
import { ProficienciesSection } from "../ProficienciesSection";
import { ActiveEffectsPanel } from "../ActiveEffectsPanel";
import { SpellSlotsHq } from "../SpellSlotsHq";
import { ResourceTrackerList } from "../ResourceTrackerList";
import { SpellListSection } from "../SpellListSection";
import { RestResetPanel } from "../RestResetPanel";
import { RibbonVivo } from "./RibbonVivo";
import { CombatBanner } from "./CombatBanner";

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
  campaignId,
  // userId arrives from the shell for parity with sibling wrappers, but
  // Herói currently composes only character-scoped data. Keeping it in
  // the destructure (prefixed) silences unused-prop drift if ever a
  // section here grows to need it.
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

  // Wave 3a C4 — campaign-scoped combat detection. Hook owns the
  // realtime channel + 10s polling fallback + cleanup; HeroiTab consumes
  // the boolean + names to flip the layout into combat-auto mode.
  const combatState = useCampaignCombatState({
    campaignId,
    characterId,
  });

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

  // Combat-auto derives the URL for "Entrar no Combate" from the live
  // session id. Falls back to the campaign view when no session id is
  // observed yet (race on first broadcast — happens for ~1s).
  const combatHref = combatState.combatId
    ? `/app/combat/${combatState.combatId}`
    : `/app/campaigns/${campaignId}`;

  return (
    <div className="space-y-3" data-testid="heroi-tab-content">
      {/* TODO(post-combat A6): mount <PostCombatBanner> here in the
          follow-up commit. The wire-up reads usePostCombatState({
          mode: "auth" }) and shows the modal when visible+snapshot. */}

      {/* C5 — Combat banner. Slides in above the ribbon when combat is
          active; instant-unmounts on `combat:ended` so layout stabilizes
          immediately. Owns its own enter animation (CLS budget <0.1). */}
      <CombatBanner
        active={combatState.active}
        round={combatState.round}
        currentTurnName={combatState.currentTurn?.name ?? null}
        nextTurnName={combatState.nextTurn?.name ?? null}
        combatHref={combatHref}
      />

      {/* C1 — Ribbon Vivo. Sticky, 2-line, replaces the V1 HP card +
          stat-chips. Pulse gold on HP change activates only when combat
          is active (so out-of-combat tweaks stay quiet). */}
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
        combatActive={combatState.active}
        combatHref={combatState.active ? combatHref : null}
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

          {/* C5 — In combat-auto mode, perícias collapse into an
              accordion so saves + ability chips stay one glance away
              without the player scrolling past 18 skill rows. We use the
              native <details>/<summary> element to avoid pulling shadcn
              Collapsible just for one toggle. The accordion is closed by
              default; the player opens it explicitly when they need to
              roll a skill. Out of combat the section renders inline as
              before. */}
          {combatState.active ? (
            <details
              className="bg-card border border-border rounded-xl"
              data-testid="heroi-skills-collapsed"
            >
              <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold text-amber-400 uppercase tracking-wider hover:bg-white/5">
                {t("combat_auto.skills_accordion_label")}
              </summary>
              <div className="px-4 pb-3">
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
            </details>
          ) : (
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
          )}
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

      {/* C5 — Quick-Note FAB. Appears bottom-right only in combat-auto
          mode. The full inline note composer lives in Wave 3c (D5); for
          now the FAB deep-links to `/sheet?tab=diario&section=quick-note`
          so the affordance + URL contract exist. The Diário wrapper will
          intercept the section param and open the composer once D5
          ships. */}
      {combatState.active && (
        <a
          href={`/app/campaigns/${campaignId}/sheet?tab=diario&section=quick-note`}
          data-testid="combat-quick-note-fab"
          aria-label={t("combat_auto.quick_note_aria")}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 text-background shadow-lg shadow-black/40 hover:bg-amber-400 transition-colors"
        >
          <span aria-hidden className="text-xl">📝</span>
        </a>
      )}
    </div>
  );
}
