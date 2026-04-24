# Reuse Matrix — Player HQ Redesign (MVP)

**Date:** 2026-04-23
**Tech Lead:** Winston (arch) · dispatch: Amelia (dev)
**Scope:** MVP cut — 19 🟢 decisions from [MVP-CUT.md](MVP-CUT.md)
**Inputs:** [11-inventory-current-codebase.md](11-inventory-current-codebase.md) · [PRD-EPICO-CONSOLIDADO.md §2](PRD-EPICO-CONSOLIDADO.md) · [09-implementation-plan.md](09-implementation-plan.md)
**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2=true`

---

## 1. Executive Summary

| Bucket | Count | LOC impact (est.) |
|---|---:|---:|
| 🟢 REUSE (as-is) | **34** | 0 |
| 🟡 REFACTOR (specific changes) | **18** | ~1,400–1,900 |
| 🔴 ZERO (new) | **29** | ~3,500–5,000 |
| ⚫ DEPRECATE (delete/replace) | **3** | −300 net |
| **Totals (scoped to MVP)** | **84** | ~+4,500 LOC net |

**Biggest reuse wins (zero dev cost):**
1. **Entire drawer family** ([PlayerNpcDrawer](../../components/player-hq/drawers/PlayerNpcDrawer.tsx), [PlayerQuestDrawer](../../components/player-hq/drawers/PlayerQuestDrawer.tsx), [PlayerLocationDrawer](../../components/player-hq/drawers/PlayerLocationDrawer.tsx), [PlayerFactionDrawer](../../components/player-hq/drawers/PlayerFactionDrawer.tsx), [PlayerPinDrawer](../../components/player-hq/drawers/PlayerPinDrawer.tsx), [PlayerSessionDrawer](../../components/player-hq/drawers/PlayerSessionDrawer.tsx), [DrawerShell](../../components/player-hq/drawers/DrawerShell.tsx)) — 707 LOC reused verbatim in Diário + Mapa.
2. **[PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx)** — semantic Dano/Cura/Temp buttons reused in Ribbon Vivo per decision #38; no fork.
3. **All 15 custom hooks** under `lib/hooks/` (useCharacterStatus, useResourceTrackers, useActiveEffects, etc.) — zero changes; new wrappers compose them.
4. **[ConditionBadges.tsx](../../components/player-hq/ConditionBadges.tsx)** (166 LOC) and **[RechargeButton.tsx]** — lift straight into Ribbon Vivo row 2.
5. **[PlayerMindMap.tsx](../../components/player-hq/PlayerMindMap.tsx)** (412 LOC) — MapaTab hosts it unchanged per §6 ("mínimas mudanças").

**Top-3 highest-risk refactors (full spec in §8):**
1. **PlayerHqShell 7→4 tabs + deep-link back-compat** (Story B1+B3) — touches every surface, routing contracts, tour, analytics. LOC: L. Risk: High.
2. **Dots semantic inversion** in SpellSlotsHq/ResourceDots (Story in Fase C, decision #37) — visual meaning flips (filled = USED for transient). High regression surface across combat parity (Guest/Anon/Auth). Risk: High.
3. **Modo Combate Auto reorg** (Story C5) — swaps Col A/B inside HeroiTab based on realtime `combat_active`. CLS risk; realtime quota risk. Risk: High.

**Scope-out (deferred to v1.5 / v2.0+):** `player_favorites` migration, FavoriteToggle on compendium cards, Diário Biblioteca sub-tab, Ctrl+K search integration, backlinks `@` parser, tag system, SVG/emoji policy rewrites. These components keep current classification but are **not listed** in this matrix beyond a deferred note.

---

## 2. Quick-Reference Matrix

### 2.1 Player HQ shell + tabs (orchestration)

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| PlayerHqShell | [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) | 🟡 REFACTOR | #28 #29 #34 #35 | B1, A1, A4 | L | High |
| HeroiTab | new file | 🔴 ZERO | #28 #30 #33 | B2, C3, C5 | M | Med |
| ArsenalTab | new file | 🔴 ZERO | #28 | B2 | S | Low |
| DiarioTab | new file | 🔴 ZERO | #28 #24 #25 | B2, D2 | M | Med |
| MapaTab | new file | 🔴 ZERO | #28 | B2 | S | Low |
| PlayerHqTabState hook | `lib/hooks/usePlayerHqTabState.ts` (new) | 🔴 ZERO | #34 | B4 | S | Low |
| PlayerHqKeyboardShortcuts | new file | 🔴 ZERO | (UX polish) | B5 | S | Low |
| KeyboardHelpOverlay | new file | 🔴 ZERO | (UX polish) | B5 | S | Low |
| Sheet page route | `app/app/campaigns/[id]/sheet/page.tsx` | 🟡 REFACTOR | #28 #34 back-compat | B3, B4 | M | Med |

### 2.2 Ribbon Vivo (new sticky HUD, crosses 4 tabs)

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| RibbonVivo | new file | 🔴 ZERO | #31 #39 | C1 | L | Med |
| SlotSummary | new file | 🔴 ZERO | #31 #39 | C2 | S | Low |
| CombatBanner | new file | 🔴 ZERO | #33 | C5 | M | Med |
| LevelUpChip (in ribbon) | (inlined into RibbonVivo) | 🔴 ZERO | #41 | E3 | S | Low |
| useCampaignCombatState | `lib/hooks/useCampaignCombatState.ts` (new) | 🔴 ZERO | #33 | C4 | M | High |
| useLevelUpInvitation | `lib/hooks/useLevelUpInvitation.ts` (new) | 🔴 ZERO | #41 | E3 | S | Low |
| usePostCombatState | `lib/hooks/usePostCombatState.ts` (new) | 🔴 ZERO | #43 | A6 | S | Low |

### 2.3 Herói tab — ficha viva

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| CharacterStatusPanel | [CharacterStatusPanel.tsx](../../components/player-hq/CharacterStatusPanel.tsx) | 🟡 REFACTOR | #27 #31 (spacing; HP ribbon migration) | A1, C1 | S | Low |
| CharacterCoreStats | [CharacterCoreStats.tsx:131](../../components/player-hq/CharacterCoreStats.tsx#L131) | 🟡 REFACTOR | #32 #44 | A2, C7 | M | Med |
| AbilityChip | new file | 🔴 ZERO | #44 #46 | C7 | L | Med |
| RollResultToast | new file | 🔴 ZERO | #44 | C7 | S | Low |
| useAbilityRoll | `lib/hooks/useAbilityRoll.ts` (new) | 🔴 ZERO | #44 | C7 | S | Low |
| dice-roller util | `lib/utils/dice-roller.ts` (new/confirm) | 🔴 ZERO | #44 | C7 | S | Low |
| CharacterAttributeGrid | [CharacterAttributeGrid.tsx](../../components/player-hq/CharacterAttributeGrid.tsx) | ⚫ DEPRECATE | Replaced by AbilityChip grid (#44) | C7 | — | Med |
| HpDisplay | [HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx) | 🟡 REFACTOR | #31 #38 #39 (inline controls + ribbon mode) | A5, C1 | M | Med |
| PlayerHpActions | [PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx) | 🟢 REUSE | #38 explicit reuse | A5/C1 (host) | — | Low |
| ConditionBadges | [ConditionBadges.tsx](../../components/player-hq/ConditionBadges.tsx) | 🟢 REUSE | #39 (host moves to Ribbon row 2) | C1 (host) | — | Low |
| ActiveEffectsPanel | [ActiveEffectsPanel.tsx](../../components/player-hq/ActiveEffectsPanel.tsx) | 🟡 REFACTOR | #45 (concentração color) | (C-side chore) | S | Low |
| ActiveEffectCard | [ActiveEffectCard.tsx](../../components/player-hq/ActiveEffectCard.tsx) | 🟡 REFACTOR | #45 | (C-side chore) | S | Low |
| AddActiveEffectDialog | [AddActiveEffectDialog.tsx](../../components/player-hq/AddActiveEffectDialog.tsx) | 🟢 REUSE | — | — | — | Low |
| SpellSlotsHq | [SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx) | 🟡 REFACTOR | #37 (dot inversion) #31 (ribbon mirror) | (C-side dot chore) | M | High |
| ResourceDots | [ResourceDots.tsx:65](../../components/player-hq/ResourceDots.tsx#L65) | 🟡 REFACTOR | #37 (dot inversion — transient) | (C-side dot chore) | S | High |
| ResourceTrackerList | [ResourceTrackerList.tsx](../../components/player-hq/ResourceTrackerList.tsx) | 🟢 REUSE | — | — | — | Low |
| ResourceTrackerRow | [ResourceTrackerRow.tsx](../../components/player-hq/ResourceTrackerRow.tsx) | 🟢 REUSE | Consumes ResourceDots (inherits fix) | — | — | Low |
| AddResourceTrackerDialog | [AddResourceTrackerDialog.tsx](../../components/player-hq/AddResourceTrackerDialog.tsx) | 🟢 REUSE | — | — | — | Low |
| SpellListSection | [SpellListSection.tsx](../../components/player-hq/SpellListSection.tsx) | 🟢 REUSE | (Favorites filter already exists) | — | — | Low |
| SpellCard | [SpellCard.tsx](../../components/player-hq/SpellCard.tsx) | 🟡 REFACTOR | #45 (conc badge color) | (C-side chore) | S | Low |
| ProficienciesSection | [ProficienciesSection.tsx](../../components/player-hq/ProficienciesSection.tsx) | 🟡 REFACTOR | #27 #30 (densify grid 3-col) | A3 | M | Low |
| RestResetPanel | [RestResetPanel.tsx](../../components/player-hq/RestResetPanel.tsx) | 🟢 REUSE | — | — | — | Low |
| PostCombatBanner | new file | 🔴 ZERO | #43 | A6 | S | Low |
| hp-status lib | [lib/utils/hp-status.ts](../../lib/utils/hp-status.ts) | 🟢 REUSE | #22 single-source-of-truth | — | — | Low |

### 2.4 Arsenal tab

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| AbilitiesSection | [AbilitiesSection.tsx](../../components/player-hq/AbilitiesSection.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| AbilityCard | [AbilityCard.tsx](../../components/player-hq/AbilityCard.tsx) | 🟢 REUSE | — | — | — | Low |
| AddAbilityDialog | [AddAbilityDialog.tsx](../../components/player-hq/AddAbilityDialog.tsx) | 🟢 REUSE | — | — | — | Low |
| AttunementSection | [AttunementSection.tsx](../../components/player-hq/AttunementSection.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| BagOfHolding | [BagOfHolding.tsx](../../components/player-hq/BagOfHolding.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| BagOfHoldingItem | [BagOfHoldingItem.tsx](../../components/player-hq/BagOfHoldingItem.tsx) | 🟢 REUSE | — | — | — | Low |
| PersonalInventory | [PersonalInventory.tsx](../../components/player-hq/PersonalInventory.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| AddItemForm | [AddItemForm.tsx](../../components/player-hq/AddItemForm.tsx) | 🟢 REUSE | — | — | — | Low |

### 2.5 Diário tab

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| NotesEditor (MinhasNotas) | new file `diario/MinhasNotas.tsx` | 🔴 ZERO | #24 | D2 | L | Med |
| MarkdownEditor | new `components/ui/MarkdownEditor.tsx` | 🔴 ZERO | #24 | D2 | M | Low |
| usePlayerNotes | `lib/hooks/usePlayerNotes.ts` (new) | 🔴 ZERO | #24 | D1 | S | Low |
| player_notes migration | `supabase/migrations/11X_*.sql` (new) | 🔴 ZERO | #24 | D1 | S | Med |
| PlayerNotesSection | [PlayerNotesSection.tsx](../../components/player-hq/PlayerNotesSection.tsx) | 🟡 REFACTOR | #24 (point at new store) | D2 | M | Med |
| DmNotesInbox | [DmNotesInbox.tsx](../../components/player-hq/DmNotesInbox.tsx) | 🟡 REFACTOR | (host move to Diário; notification badge) | B2, D5 | S | Low |
| QuickNotesList | [QuickNotesList.tsx](../../components/player-hq/QuickNotesList.tsx) | 🟢 REUSE | — | — | — | Low |
| JournalEntryCard | [JournalEntryCard.tsx](../../components/player-hq/JournalEntryCard.tsx) | 🟢 REUSE | — | — | — | Low |
| ScratchPad | [ScratchPad.tsx](../../components/player-hq/ScratchPad.tsx) | 🟢 REUSE | — | — | — | Low |
| NpcJournal | [NpcJournal.tsx](../../components/player-hq/NpcJournal.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| NpcCard | [NpcCard.tsx](../../components/player-hq/NpcCard.tsx) | 🟡 REFACTOR | (cross-nav to Mapa) | D4 | S | Low |
| PlayerQuestBoard | [PlayerQuestBoard.tsx](../../components/player-hq/PlayerQuestBoard.tsx) | 🟡 REFACTOR | #25 (entity-graph edges instead of separate store) | D2 (verify) | S | Low |
| PlayerQuestCard | [PlayerQuestCard.tsx](../../components/player-hq/PlayerQuestCard.tsx) | 🟢 REUSE | — | — | — | Low |

### 2.6 Mapa tab

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| PlayerMindMap | [PlayerMindMap.tsx](../../components/player-hq/PlayerMindMap.tsx) | 🟢 REUSE | — | B2 (host) | — | Low |
| MapRecap | [MapRecap.tsx](../../components/player-hq/MapRecap.tsx) | 🟢 REUSE | — | — | — | Low |
| DrawerShell | [DrawerShell.tsx](../../components/player-hq/drawers/DrawerShell.tsx) | 🟢 REUSE | — | — | — | Low |
| PlayerNpcDrawer | [PlayerNpcDrawer.tsx](../../components/player-hq/drawers/PlayerNpcDrawer.tsx) | 🟡 REFACTOR | Cross-nav "Ver no Diário" | D4 | S | Low |
| PlayerQuestDrawer | [PlayerQuestDrawer.tsx](../../components/player-hq/drawers/PlayerQuestDrawer.tsx) | 🟢 REUSE | — | — | — | Low |
| PlayerLocationDrawer | [PlayerLocationDrawer.tsx](../../components/player-hq/drawers/PlayerLocationDrawer.tsx) | 🟢 REUSE | — | — | — | Low |
| PlayerFactionDrawer | [PlayerFactionDrawer.tsx](../../components/player-hq/drawers/PlayerFactionDrawer.tsx) | 🟢 REUSE | — | — | — | Low |
| PlayerPinDrawer | [PlayerPinDrawer.tsx](../../components/player-hq/drawers/PlayerPinDrawer.tsx) | 🟢 REUSE | — | — | — | Low |
| PlayerSessionDrawer | [PlayerSessionDrawer.tsx](../../components/player-hq/drawers/PlayerSessionDrawer.tsx) | 🟢 REUSE | — | — | — | Low |

### 2.7 Level Up Wizard (Fase E)

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| level_up_invitations migration | `supabase/migrations/11Z_*.sql` (new) | 🔴 ZERO | #41 | E1 | M | Med |
| LevelUpRelease (Mestre UI) | `components/dm/LevelUpRelease.tsx` (new) | 🔴 ZERO | #41 | E2 | L | Med |
| LevelUpWizard (shell) | `components/player-hq/levelup/LevelUpWizard.tsx` (new) | 🔴 ZERO | #41 | E4 | L | Med |
| Step1ChooseClass | new file | 🔴 ZERO | #41 | E4 | M | Low |
| Step2Hp | new file | 🔴 ZERO | #41 | E4 | M | Low |
| Step3AsiOrFeat | new file | 🔴 ZERO | #41 | E5 | L | High |
| Step4Spells | new file | 🔴 ZERO | #41 | E5 | L | High |
| Step5Features | new file | 🔴 ZERO | #41 | E6 | M | Med |
| Step6Subclass | new file | 🔴 ZERO | #41 | E6 | M | Med |
| StepFinalReview | new file | 🔴 ZERO | #41 | E6 | S | Low |
| useLevelUpWizard | `lib/hooks/useLevelUpWizard.ts` (new) | 🔴 ZERO | #41 | E4 | M | Med |
| CharacterEditSheet | [CharacterEditSheet.tsx](../../components/player-hq/CharacterEditSheet.tsx) | 🟢 REUSE | #41 fallback "✎ Editar" preserved | — | — | Low |

### 2.8 Post-combat + conversion surfaces

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| RecapCtaCard | [RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx) | 🟡 REFACTOR | #43 (redirectTo default = /sheet?tab=heroi) | A6 | S | Low |
| GuestRecapFlow | [GuestRecapFlow.tsx](../../components/conversion/GuestRecapFlow.tsx) | 🟡 REFACTOR | #43 | A6 | S | Low |
| GuestUpsellModal | [GuestUpsellModal.tsx](../../components/guest/GuestUpsellModal.tsx) | 🟡 REFACTOR | #43 | A6 | S | Low |

### 2.9 Adjacent combat components (consulted for parity / dot pattern)

| Component | Path | Bucket | Decision drivers | Story | Effort | Risk |
|---|---|---|---|---|:-:|:-:|
| CombatantRow (reaction dot) | [CombatantRow.tsx:516](../../components/combat/CombatantRow.tsx#L516) | 🟢 REUSE | #37 canonical source | (read-only reference) | — | Low |
| SpellSlotTracker (combat variant) | [SpellSlotTracker.tsx](../../components/player/SpellSlotTracker.tsx) | 🟡 REFACTOR | #37 (same dot inversion) + consolidate with SpellSlotsHq | (C-side dot chore) | M | High |
| GuestCombatClient | [GuestCombatClient.tsx](../../components/guest/GuestCombatClient.tsx) | 🟢 REUSE | Combat Parity Rule | E2E only | — | Med |
| PlayerJoinClient | [PlayerJoinClient.tsx](../../components/player/PlayerJoinClient.tsx) | 🟢 REUSE | Combat Parity Rule | E2E only | — | Med |

---

## 3. REUSE detail — why each works as-is

- **Drawer family (7 files, 707 LOC)** — decision #28 keeps Mapa mostly unchanged (§6). Only `PlayerNpcDrawer` gets a cross-nav CTA; the rest are rendered inside MapaTab without modification.
- **[PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx)** — decision #38 explicitly names this component as the canonical Dano/Cura/Temp UI. Ribbon Vivo composes it via props; no fork.
- **[ConditionBadges.tsx](../../components/player-hq/ConditionBadges.tsx)** — already renders chips; Ribbon Vivo row 2 hosts them. The "overflow → +N" behavior (decision #39) belongs in RibbonVivo wrapper, not here.
- **Arsenal tab stack** (AbilitiesSection/AbilityCard/AttunementSection/BagOfHolding/PersonalInventory/AddItemForm/AddAbilityDialog) — no decision modifies Arsenal beyond topology placement. MVP scope-out of tag system means PersonalInventory (490 LOC) stays intact despite size flag. Extract work is **tech debt, deferred**.
- **RestResetPanel, ResourceTrackerList, ResourceTrackerRow, AddResourceTrackerDialog** — rest logic is unchanged; dot inversion is localized to `ResourceDots`, which propagates through these consumers without touching their contracts.
- **SpellListSection + SpellCard base** — "⭐ Favoritas" filter already exists in wireframes as a pre-existing state; favorites *population* is v1.5 (Biblioteca) so we keep today's behavior.
- **NpcJournal / QuickNotesList / JournalEntryCard / ScratchPad / MapRecap / PlayerQuestCard** — pure display components; host tab changes but internal contracts survive.
- **All 15 custom hooks** (`useCharacterStatus`, `useResourceTrackers`, `useCharacterAbilities`, `useActiveEffects`, `useCharacterSpells`, `useNotifications`, `usePersonalInventory`, `useBagOfHolding`, `useNpcJournal`, `usePlayerQuestBoard`, `usePlayerMindMap`, `useNodeViews`, `useEntityLinks`, etc.) — data contracts unchanged; new surfaces compose them.
- **[lib/utils/hp-status.ts](../../lib/utils/hp-status.ts)** — canonical per CLAUDE.md + decision #22. Consolidation (§7) means *other* places delegate to it, not that this file changes.
- **[CharacterEditSheet.tsx](../../components/player-hq/CharacterEditSheet.tsx)** — decision #41 preserves it explicitly as the Mestre override/fallback when the wizard is inappropriate.

---

## 4. REFACTOR detail

### 4.1 [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) — 7→4 tabs, header shrink
- **Changes:**
  - Replace `TABS` array (lines 33–43) with 4-tab array: `[heroi, arsenal, diario, mapa]` with icons `Heart / Package / BookOpen / Network` (all Lucide gold).
  - Change `type Tab` at line 33.
  - Collapse header (lines ~175–231) from 4 lines to 2 lines per story A4.
  - Apply `space-y-4` → `space-y-3` at lines 171/249/289 (A1).
  - Replace tab content switch (the 7-way `if/else` around lines 249–393) with 4 wrappers: `<HeroiTab /> <ArsenalTab /> <DiarioTab /> <MapaTab />`.
  - Default tab resolution delegated to new `usePlayerHqTabState` (story B4).
- **Why:** Decisions #28, #29, #34, #35; stories A1, A4, B1.
- **LOC:** L (>200 — shell is 393 LOC and loses roughly 150 while gaining 80).
- **Risk:** **High** — orchestrates every other change; touches routing, tour, analytics dust.
- **Stories:** **A1 · A4 · B1**.

### 4.2 [CharacterCoreStats.tsx:131](../../components/player-hq/CharacterCoreStats.tsx#L131) — remove accordion, swap in AbilityChip
- **Changes:**
  - Delete `useState` of `showAttributes` and the `<button>` toggle (lines ~131–144).
  - Always render the ability grid; change container from `.bg-card border …` to a plain grid.
  - Replace each of the 6 inner `<div>` ability cells (lines 146–167) with `<AbilityChip ability={key} score={score} …/>` (story C7).
  - Desktop: 6×1 grid ≥md; mobile: 3×2.
- **Why:** Decision #32 (never accordion) + decision #44 (2-zone chip). Story A2 removes the accordion without the roller; C7 swaps the cell markup for AbilityChip.
- **LOC:** M (50–100).
- **Risk:** Med — touches unit test for CharacterCoreStats and any caller that passes `showAttributes` prop (none known).
- **Stories:** **A2 (accordion removal) · C7 (AbilityChip swap)**.

### 4.3 [CharacterStatusPanel.tsx](../../components/player-hq/CharacterStatusPanel.tsx) — density + ribbon feed
- **Changes:** Apply `p-4` → `px-4 py-3` at line 53 (A1). When `<RibbonVivo />` takes over HP display (story C1), this panel keeps the summary grid of AC/Init/Speed only — HP bar moves up. Pass same character data through; no logic change.
- **Why:** #27 densification + #31 ribbon absorption.
- **LOC:** S (<50).
- **Risk:** Low.
- **Stories:** **A1 · C1**.

### 4.4 [HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx) — inline controls + ribbon mode
- **Changes:**
  - Move `[−5][−1][+1][+5]` buttons onto the same row as the HP bar (A5).
  - Hide HP Temp row when `hp_temp === 0`.
  - Add `variant: "inline" | "ribbon"` prop; `ribbon` variant is 56px tall, no labels, full-width bar behind text, gold pulse hook on HP change (C1).
- **Why:** #31, #38, #39.
- **LOC:** M (~80).
- **Risk:** Med — used in two contexts; test both.
- **Stories:** **A5 · C1**.

### 4.5 [ResourceDots.tsx:65](../../components/player-hq/ResourceDots.tsx#L65) — semantic inversion for transient
- **Changes:**
  - Today: `remaining = max − usedCount; isFilled = i < remaining;` i.e. **filled = remaining** (decision #37 anti-pattern for transient resources).
  - Add `semantic: "permanent" | "transient"` prop (default `"transient"` since this file's consumers are all transient).
  - When `transient`: `isFilled = i < usedCount` (filled = USED).
  - Update ARIA labels to match. Update the WCAG 44×44 area.
  - Copy the canonical pattern from [CombatantRow.tsx:516-520](../../components/combat/CombatantRow.tsx#L516) (reaction dot — source of truth).
- **Why:** Decision #37 names this file + line explicitly.
- **LOC:** S (<50 for this file, but semantic change cascades through tests).
- **Risk:** **High** — visual meaning flip; must update unit tests + Playwright visual snapshots + Combat Parity (Guest/Anon/Auth).
- **Stories:** **C-side "dot inversion chore"** (add to C1/C2 scope).

### 4.6 [SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx) — dot inversion (consumer of ResourceDots)
- **Changes:** Pass `semantic="transient"` through; verify the `handleToggle(level, dotIndex)` still flips `used` correctly (the dotIndex under the new convention now equals "slot index used" rather than "slot index remaining"). Update tests.
- **Why:** Decision #37.
- **LOC:** S (<30).
- **Risk:** **High** — visible regression if index arithmetic isn't updated together with ResourceDots.
- **Stories:** **C-side dot chore**.

### 4.7 [SpellSlotTracker.tsx](../../components/player/SpellSlotTracker.tsx) (combat variant)
- **Changes:** Same inversion as SpellSlotsHq (decision #37 names line 117–121). **Consolidation recommendation (§7):** merge with SpellSlotsHq into a single `<SpellSlotGrid variant="ribbon|hq|combat" />`.
- **Why:** #37 + duplication flagged in inventory §refactor.
- **LOC:** M (~80) if inlined; L (~250) if consolidation happens.
- **Risk:** **High** — combat parity surface.
- **Stories:** C-side chore (inversion only for MVP) or Sprint 1 consolidation (see §7).

### 4.8 [ProficienciesSection.tsx](../../components/player-hq/ProficienciesSection.tsx) — density + grid
- **Changes:** Reorganize 18 skill rows into 3-col grid ≥desktop, 1-col mobile. Shrink row height 56→36 px. No logic change.
- **Why:** #27 (densify) + #30 (density budget).
- **LOC:** M (~100).
- **Risk:** Low.
- **Stories:** **A3**.

### 4.9 [ActiveEffectsPanel.tsx](../../components/player-hq/ActiveEffectsPanel.tsx) + [ActiveEffectCard.tsx](../../components/player-hq/ActiveEffectCard.tsx) + [SpellCard.tsx](../../components/player-hq/SpellCard.tsx)
- **Changes:** Swap `--warning` token → `--concentration` (`#7DD3FC` sky). Tokens + CSS only; no behavior change.
- **Why:** Decision #45.
- **LOC:** S (<30 across all files).
- **Risk:** Low.
- **Stories:** **C-side concentration color chore** (bundle into C1 or C2 PR).

### 4.10 [PlayerNotesSection.tsx](../../components/player-hq/PlayerNotesSection.tsx) — point at player_notes store
- **Changes:** Today reads from `player_journal_entries` (quick notes / journal / lore). After D1, "Minhas Notas" sub-section reads/writes `player_notes`. Add `storeVariant` prop (or branch by UI section). Preserve existing quick-note path untouched.
- **Why:** Decision #24 (mini-wiki tem schema próprio).
- **LOC:** M (~80).
- **Risk:** Med — dual data source during rollout.
- **Stories:** **D2**.

### 4.11 [DmNotesInbox.tsx](../../components/player-hq/DmNotesInbox.tsx) — badge + host move
- **Changes:** Moves into DiarioTab; add notification badge consumer from `usePlayerNotifications` (D5).
- **Why:** #28 topology + #D5 notifications.
- **LOC:** S.
- **Risk:** Low.
- **Stories:** **B2 · D5**.

### 4.12 [NpcCard.tsx](../../components/player-hq/NpcCard.tsx) — cross-nav to Mapa
- **Changes:** Add link "Ver no Mapa" → `?tab=mapa&drawer=npc:{id}`.
- **Why:** D4 cross-nav.
- **LOC:** S.
- **Risk:** Low.
- **Stories:** **D4**.

### 4.13 [PlayerNpcDrawer.tsx](../../components/player-hq/drawers/PlayerNpcDrawer.tsx) — cross-nav to Diário
- **Changes:** Add "Ver no Diário" CTA → `?tab=diario&section=npcs&id={id}`; add tab "Notas" that links to same id.
- **Why:** D4.
- **LOC:** S.
- **Risk:** Low.
- **Stories:** **D4**.

### 4.14 [PlayerQuestBoard.tsx](../../components/player-hq/PlayerQuestBoard.tsx) — entity-graph edges
- **Changes:** Verify the hook uses `campaign_mind_map_edges` for quest→entity relations (decision #25 = UI-only, zero new tables). If today uses a separate join, migrate the read to edges. If already compliant, no changes.
- **Why:** #25.
- **LOC:** S (or zero if already compliant).
- **Risk:** Low.
- **Stories:** **D2 (verify + possibly tweak)**.

### 4.15 [RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx) / [GuestRecapFlow.tsx](../../components/conversion/GuestRecapFlow.tsx) / [GuestUpsellModal.tsx](../../components/guest/GuestUpsellModal.tsx)
- **Changes:** Change default `redirectTo` prop to `/sheet?tab=heroi` for the authenticated + anon paths. Guest (`/try`) keeps current behavior per #43.
- **Why:** Decision #43.
- **LOC:** S each (<30 per file).
- **Risk:** Low — these are already in production, surfaced in the inventory as "infra parcial".
- **Stories:** **A6**.

### 4.16 Sheet page route — `app/app/campaigns/[id]/sheet/page.tsx`
- **Changes:**
  - Accept `?tab` param; default to `heroi`.
  - 301/302 redirect for legacy values (`ficha`, `recursos`, `habilidades`, `inventario`, `notas`, `quests`, `map`) per §6.2 mapping.
  - SSR must render the correct tab without client-side flash.
- **Why:** #28 + #34 back-compat.
- **LOC:** M (~80).
- **Risk:** Med — bookmarks from DMs and old recap links must survive.
- **Stories:** **B3 · B4**.

---

## 5. ZERO detail — new components

### 5.1 RibbonVivo + subcomponents (Fase C)
- **RibbonVivo** (`components/player-hq/RibbonVivo.tsx`) — sticky 2-line HUD; composes HpDisplay (ribbon variant) + PlayerHpActions + AC/Init/Speed badges + Inspiration + Spell-Save DC + SlotSummary + ConditionBadges + ActiveEffectsPanel (compact). **Template:** current header in [PlayerHqShell.tsx:175-231](../../components/player-hq/PlayerHqShell.tsx#L175) + [CharacterStatusPanel.tsx](../../components/player-hq/CharacterStatusPanel.tsx). **Decision:** #31, #39. **LOC:** L (~400). **Story:** **C1**.
- **SlotSummary** (`components/player-hq/SlotSummary.tsx`) — condensed slot view for ribbon row 2; clickable popover on mobile. **Template:** [SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx) summary logic + [ResourceDots.tsx](../../components/player-hq/ResourceDots.tsx) dots. **Decision:** #31, #39. **LOC:** S. **Story:** **C2**.
- **CombatBanner** (`components/player-hq/CombatBanner.tsx`) — "⚔ Round N · Turno de [Nome] · próximo: [Nome]" slide-down banner. **Template:** existing encounter banner in combat shell (search `combat:started` usage). **Decision:** #33. **LOC:** M. **Story:** **C5**.
- **PostCombatBanner** (`components/player-hq/PostCombatBanner.tsx`) — "🎉 Combate vencido!" topo do Herói, auto-dismiss 30s. **Template:** [RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx). **Decision:** #43. **LOC:** S. **Story:** **A6**.

### 5.2 AbilityChip + dice infra (story C7)
- **AbilityChip** (`components/player-hq/AbilityChip.tsx`) — 2-zone (CHECK + SAVE) clickable chip; hover 🎲; long-press = Advantage menu. Replaces the inner cell markup in [CharacterCoreStats.tsx:146-167](../../components/player-hq/CharacterCoreStats.tsx#L146). **Template:** current ability cell + [CombatantRow.tsx:516](../../components/combat/CombatantRow.tsx#L516) for dot pattern. **Decision:** #44, #46. **LOC:** L (~300). **Story:** **C7**.
- **RollResultToast** (`components/player-hq/RollResultToast.tsx`) — popover showing "STR check: 14 (12+2)". **Template:** existing toast system (sonner or shadcn). **Decision:** #44. **LOC:** S. **Story:** **C7**.
- **useAbilityRoll** (`lib/hooks/useAbilityRoll.ts`) — orchestrates roll + broadcast to Mestre. **Decision:** #44. **LOC:** S. **Story:** **C7**.
- **dice-roller util** (`lib/utils/dice-roller.ts`) — `rollD20WithMod(mod, advantage?)`. **Decision:** #44. **LOC:** S. **Story:** **C7**.

### 5.3 Tab wrappers (story B2)
- **HeroiTab** — Composes CharacterStatusPanel + CharacterCoreStats (w/ AbilityChip) + ProficienciesSection + ActiveEffectsPanel + SpellSlotsHq + ResourceTrackerList + SpellListSection + RestResetPanel + PostCombatBanner (conditional) + CombatBanner (conditional). Implements CombatAutoReorganizer swap (Col A/B) based on `useCampaignCombatState`. **Template:** current `sheet` tab block in [PlayerHqShell.tsx:249](../../components/player-hq/PlayerHqShell.tsx#L249). **Decision:** #28, #33. **LOC:** M (~250). **Story:** **B2 · C3 · C5**.
- **ArsenalTab** — AbilitiesSection + AttunementSection + BagOfHolding + PersonalInventory. **Template:** current `abilities`/`inventory` tabs. **Decision:** #28. **LOC:** S (~80). **Story:** **B2**.
- **DiarioTab** — MinhasNotas + DmNotesInbox + NpcJournal + PlayerQuestBoard + QuickNotesList. Tab bar internal for sub-sections (notas/quests/npcs/recaps). **Decision:** #28. **LOC:** M (~200). **Story:** **B2 · D2**.
- **MapaTab** — PlayerMindMap only. **Decision:** #28. **LOC:** S (~40). **Story:** **B2**.

### 5.4 Topology helpers (Fase B)
- **usePlayerHqTabState** (`lib/hooks/usePlayerHqTabState.ts`) — query param ↔ localStorage 24h TTL. **Decision:** #34. **LOC:** S. **Story:** **B4**.
- **PlayerHqKeyboardShortcuts** — global `1/2/3/4/N/?` handler, ignores inputs. **LOC:** S. **Story:** **B5**.
- **KeyboardHelpOverlay** — `?` opens shortcut list. **LOC:** S. **Story:** **B5**.

### 5.5 Realtime + combat hooks (Fase C)
- **useCampaignCombatState** (`lib/hooks/useCampaignCombatState.ts`) — subscribes to `campaign:${id}` for `combat:started`/`combat:ended`; 10s polling fallback. Returns `{active, round, currentTurn, nextTurn}`. **Decision:** #33. **LOC:** M. **Risk:** realtime quota. **Story:** **C4**.
- **usePostCombatState** — detects `combat:ended` <5min ago; surfaces stats to PostCombatBanner. **Decision:** #43. **LOC:** S. **Story:** **A6**.

### 5.6 Diário — mini-wiki (Fase D)
- **player_notes migration** (`supabase/migrations/11X_player_notes.sql`) — dual-auth (user_id XOR session_token_id), tags array + GIN, RLS. Spec in schema-investigation-winston. **Decision:** #24. **Story:** **D1**.
- **usePlayerNotes** — CRUD by campaign. **Decision:** #24. **Story:** **D1**.
- **MinhasNotas** (`components/player-hq/diario/MinhasNotas.tsx`) — list+editor; title autoderived; tags chips; local search; auto-save 30s. **Decision:** #24. **LOC:** L. **Story:** **D2**.
- **MarkdownEditor** (`components/ui/MarkdownEditor.tsx`) — minimal MVP editor (textarea + preview toggle). **Decision:** #24. **LOC:** M. **Story:** **D2**.

### 5.7 Level Up Wizard (Fase E — entire cluster is 🔴)
- **level_up_invitations migration** — schema with `choices jsonb`, TTL 7d, dual RLS. **Decision:** #41. **Story:** **E1**.
- **LevelUpRelease** (Mestre UI) — modal over CampaignDmViewServer, multi-select characters, target level, optional message, INSERT batch + broadcast. **Decision:** #41. **LOC:** L. **Story:** **E2**.
- **LevelUpWizard** (shell) + 6 step components + **StepFinalReview** + **useLevelUpWizard** — stepper with persistent `choices jsonb`. **Decision:** #41. **Template:** any existing wizard in the codebase (guest onboarding flow). **LOC:** L × 6 steps ≈ 1,500+. **Story:** **E4 · E5 · E6**.
- **useLevelUpInvitation** — subscribe/poll pending invitation for a character. **Decision:** #41. **Story:** **E3**.

---

## 6. DEPRECATE detail

### 6.1 CharacterAttributeGrid — [CharacterAttributeGrid.tsx](../../components/player-hq/CharacterAttributeGrid.tsx)
- **Why:** Superseded by AbilityChip (decision #44).
- **Imports that break:** Check [CharacterCoreStats.tsx](../../components/player-hq/CharacterCoreStats.tsx) and any Mestre preview that consumes it. Migration: replace with `<AbilityChip />` grid; keep the same data contract (takes `abilityValues` object).
- **Story:** **C7**. Delete in same PR that introduces AbilityChip.

### 6.2 NewBadge (if unused) — [NewBadge.tsx](../../components/player-hq/NewBadge.tsx)
- **Why:** Audit required — inventory lists it but no MVP decision references it. If it's only used by the old 7-tab bar, it dies with the topology refactor.
- **Imports that break:** Check [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) — old tab bar used it for "new item" dots. New 4-tab bar uses the same pattern.
- **Story:** Keep as REUSE if consumed by new tab bar (badges per §6.3 of PRD); otherwise DEPRECATE in B1. **Verify during B1**.

### 6.3 Old 7-tab labels in i18n
- **Why:** `tabs.sheet`, `tabs.resources`, `tabs.abilities`, `tabs.inventory`, `tabs.notes`, `tabs.quests`, `tabs.map` become dead keys once B1 lands. Replace with `tabs.heroi`, `tabs.arsenal`, `tabs.diario`, `tabs.mapa`.
- **Imports that break:** Any `t("player_hq.tabs.<old>")` call — grep before deleting keys.
- **Story:** **B1**. Keep old keys for 1 release with deprecation comment; remove in v1.5.

---

## 7. Consolidation recommendations (Sprint 1 to unblock parallel dev)

These are **not MVP stories** per se, but executing them in Sprint 1 removes land-mines before Fase C/D start in parallel.

### 7.1 HP status calc consolidation (inventory-flagged: "3 places")
- **Action:** Sweep codebase for any `hp.current / hp.max` arithmetic and replace with `getHpStatus()` + `formatHpPct()` from [lib/utils/hp-status.ts](../../lib/utils/hp-status.ts). CLAUDE.md already names this the source of truth.
- **Effort:** S (<50 LOC of deletions).
- **Unblocks:** Ribbon Vivo (C1), HpDisplay refactor (A5), CombatBanner (C5) — all want one stable `HpStatus` enum.

### 7.2 Spell slot UI consolidation — SpellSlotsHq + SpellSlotTracker
- **Action:** Extract `<SpellSlotGrid variant="hq|combat|ribbon" />` in `components/shared/`. Both existing files re-export from it during migration.
- **Effort:** M (~200 LOC moved, 1 new shared file).
- **Unblocks:** Decision #37 dot inversion lands in **one** place, not two. Massively reduces parity test surface.
- **Risk:** **High** if deferred — two independent changes collide in Sprint 2.

### 7.3 Dot pattern shared primitive
- **Action:** Extract `<Dot semantic="permanent|transient" state="on|off" size={...} />` as the sole dot primitive. Today ResourceDots, SpellSlotsHq, SpellSlotTracker, CombatantRow each implement variants.
- **Effort:** M (~150 LOC consolidation).
- **Unblocks:** Decision #37 enforcement; AbilityChip dot reuse; future Biblioteca ⭐ dot.

### 7.4 DrawerShell generalization
- **Action:** Promote [DrawerShell.tsx](../../components/player-hq/drawers/DrawerShell.tsx) to `components/ui/Drawer.tsx`. Enables LevelUpWizard (E4) to reuse instead of rebuilding.
- **Effort:** S (mostly move).
- **Unblocks:** Fase E velocity.

---

## 8. Risk Register — top 5

| # | Risk | File(s) | Mitigation | Owner |
|---|---|---|---|---|
| R1 | **Dot semantic inversion breaks combat parity** (Guest/Anon/Auth) | [ResourceDots.tsx:65](../../components/player-hq/ResourceDots.tsx#L65), [SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx), [SpellSlotTracker.tsx](../../components/player/SpellSlotTracker.tsx) | §7.2+§7.3 consolidation first; add visual regression snapshots per auth mode; Playwright 390×1440 | Dev (A2/C-side) |
| R2 | **PlayerHqShell 7→4 regresses tour/analytics/SSR** | [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) + route | Feature flag OFF by default; back-compat redirects in `sheet/page.tsx`; smoke E2E on 3 legacy URLs | Dev (B1) |
| R3 | **Realtime quota exceeded** (useCampaignCombatState + useLevelUpInvitation + existing channels) | new hooks in Fase C/E | Piggyback on consolidated `campaign:${id}` channel per `project_realtime_rate_limit_root_cause`; NO per-feature channel | Arch review |
| R4 | **CLS on Modo Combate Auto reorg** | `HeroiTab.tsx` + `CombatBanner.tsx` | CSS Grid `grid-template-areas` with fixed regions; measure CLS in Lighthouse; cap <0.1 | Dev (C5) |
| R5 | **LevelUpWizard 5e rule validation** (ASI vs Feat, multiclass prereqs, spells known) | E4/E5/E6 | Unit tests per rule; fallback `✎ Editar` always available; audit trail in `choices jsonb` for bug reports | Dev (Fase E) |

---

## 9. Parallelization Map

Below are clusters that can be developed in **parallel** with minimal merge conflicts. Fase-prefix indicates the story cluster the cluster executes inside.

### Wave 1 — Sprint 1 (parallel, all independent)

| Cluster | Files owned (no overlap) | Stories | Dev/agent |
|---|---|---|---|
| **P1a — Density chores** | [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) (spacing only), [CharacterStatusPanel.tsx](../../components/player-hq/CharacterStatusPanel.tsx), [ProficienciesSection.tsx](../../components/player-hq/ProficienciesSection.tsx) | A1, A3 | Dev A |
| **P1b — Accordion kill** | [CharacterCoreStats.tsx](../../components/player-hq/CharacterCoreStats.tsx) (accordion only, no AbilityChip yet) | A2 | Dev B |
| **P1c — HP inline** | [HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx), [PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx) (compose) | A5 | Dev C |
| **P1d — Post-combat redirect** | [RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx), [GuestRecapFlow.tsx](../../components/conversion/GuestRecapFlow.tsx), [GuestUpsellModal.tsx](../../components/guest/GuestUpsellModal.tsx), `PostCombatBanner.tsx`, `usePostCombatState.ts` | A6 | Dev D |
| **P1e — Consolidations (§7)** | [lib/utils/hp-status.ts](../../lib/utils/hp-status.ts) sweep + new `components/shared/SpellSlotGrid.tsx` + `components/shared/Dot.tsx` + `components/ui/Drawer.tsx` | §7.1–7.4 | Arch |

### Wave 2 — Sprint 2 (B + C-foundation, parallel after Wave 1 merges)

| Cluster | Files owned | Stories | Dev/agent |
|---|---|---|---|
| **P2a — Topology** | [PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) (tabs array + content switch), `sheet/page.tsx`, `usePlayerHqTabState.ts` | B1, B3, B4 | Dev A |
| **P2b — Tab wrappers** | `HeroiTab.tsx`, `ArsenalTab.tsx`, `DiarioTab.tsx`, `MapaTab.tsx` | B2 | Dev B |
| **P2c — Keyboard shortcuts** | `PlayerHqKeyboardShortcuts.tsx`, `KeyboardHelpOverlay.tsx` | B5 | Dev C |
| **P2d — Dot inversion** | [ResourceDots.tsx](../../components/player-hq/ResourceDots.tsx), [SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx), [SpellSlotTracker.tsx](../../components/player/SpellSlotTracker.tsx) (all via new `Dot`/`SpellSlotGrid`) | C-side dot chore | Dev D |
| **P2e — Concentration color** | [ActiveEffectsPanel.tsx](../../components/player-hq/ActiveEffectsPanel.tsx), [ActiveEffectCard.tsx](../../components/player-hq/ActiveEffectCard.tsx), [SpellCard.tsx](../../components/player-hq/SpellCard.tsx), tokens | C-side color chore | Dev E |
| **P2f — E2E topology** | `e2e/features/player-hq-topology.spec.ts` | B6 | QA |

### Wave 3 — Sprint 3 (C + D parallel, needs Wave 2 merged)

| Cluster | Files owned | Stories | Dev/agent |
|---|---|---|---|
| **P3a — Ribbon** | `RibbonVivo.tsx`, `SlotSummary.tsx`, HpDisplay `variant="ribbon"` | C1, C2 | Dev A |
| **P3b — Combat Auto** | `useCampaignCombatState.ts`, `CombatBanner.tsx`, HeroiTab reorg | C3, C4, C5 | Dev B |
| **P3c — AbilityChip** | `AbilityChip.tsx`, `RollResultToast.tsx`, `useAbilityRoll.ts`, `dice-roller.ts`, CharacterCoreStats swap | C7 | Dev C |
| **P3d — Notes schema + editor** | `player_notes` migration, `usePlayerNotes.ts`, `MinhasNotas.tsx`, `MarkdownEditor.tsx`, [PlayerNotesSection.tsx](../../components/player-hq/PlayerNotesSection.tsx) | D1, D2 | Dev D |
| **P3e — Cross-nav** | [NpcCard.tsx](../../components/player-hq/NpcCard.tsx), [PlayerNpcDrawer.tsx](../../components/player-hq/drawers/PlayerNpcDrawer.tsx) | D4 | Dev E |
| **P3f — Notifications** | `usePlayerNotifications.ts`, [DmNotesInbox.tsx](../../components/player-hq/DmNotesInbox.tsx) | D5 | Dev F |
| **P3g — E2E combat auto** | `e2e/features/player-hq-combat-auto.spec.ts` | C6 | QA |

### Wave 4 — Sprint 4 (Fase E — mostly serial)

Fase E (LevelUp) is **mostly serial** because each step depends on the wizard shell. Parallelism limited to:
- **P4a** — Migration + Mestre UI (E1 + E2) — Dev A
- **P4b** — Wizard shell + Step1/Step2 (E4) — Dev B (starts after E1)
- **P4c** — Step3/Step4 (E5) + Step5/Step6/Final (E6) — Dev B continues
- **P4d** — Ribbon chip (E3) — Dev C (parallel to E2, needs E1)
- **P4e** — Mestre completion feedback (E7) — Dev D (parallel to E6)

### Conflict hotspots (require coordination)

- **PlayerHqShell.tsx** — touched by P1a, P2a, and arguably C1 host. **Rule:** only one PR open against this file at a time; rebase P2a on top of P1a before merge.
- **CharacterCoreStats.tsx** — touched by P1b (accordion kill) and P3c (AbilityChip). **Rule:** P3c rebases on P1b.
- **HpDisplay.tsx** — touched by P1c (inline) and P3a (ribbon variant). **Rule:** P3a rebases on P1c.
- **ResourceDots.tsx family** — P1e (consolidation) must land before P2d (inversion) or P2d becomes 3× the surface.

---

## 10. Scoped-out (v1.5 / v2.0+ — not in this matrix)

Deferred per [MVP-CUT.md](MVP-CUT.md):
- **v1.5** — `player_favorites` migration, FavoriteToggle component, Biblioteca sub-tab in Diário, Ctrl+K favorites integration, backlinks `@` parser, tag system richer than plain tags, dismissible tour overhaul.
- **v2.0+** — Ctrl+K first-class global search, SVG gold + emoji narrative policy rewrites at scale (applied ad hoc, no story).
- **Deprecation-only (out of MVP):** extraction of PersonalInventory/ProficienciesSection/PlayerMindMap into sub-modules (tech debt — do in dedicated refactor sprint, not before Player HQ v4 ships).

---

**Fim da matriz.** Source-of-truth pra Wave 1-4. Disputes → escalate to Dani via PRD review.
