# 13 — Epics + Waves · Player HQ Redesign (MVP)

**Date:** 2026-04-24
**Owner:** PM + Tech Lead (dispatch: Amelia + Winston)
**Scope:** Organize the 19 🟢 MVP decisions into parallelizable epics + waves.
**Inputs:**
- [MVP-CUT.md](_bmad-output/party-mode-2026-04-22/MVP-CUT.md) — 19 🟢 decisions grouped in 5 clusters (source of scope)
- [12-reuse-matrix.md](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) — REUSE/REFACTOR/ZERO classification + §7 consolidation tasks + §9 parallelization map
- [11-inventory-current-codebase.md](_bmad-output/party-mode-2026-04-22/11-inventory-current-codebase.md) — existing code map
- [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) — 35 story IDs (Fases A–E)
- [15-e2e-matrix.md](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — per-wave merge gates + 48 new tests
- [PRD-EPICO-CONSOLIDADO.md §2](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) — decision detail
**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2=true` (default OFF in prod)

**Capacity posture:** This document is **capacity-agnostic** — the waves and parallelization are the same whether 1 dev or 3 agents execute them. Sprint cadence and week counts are deliberately left to [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md).

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Epics** | **6** (1 consolidation + 5 feature epics) |
| **Waves** | **5** (Wave 0 consolidation · Wave 1 density · Wave 2 topology · Wave 3 ribbon+combat+diário · Wave 4 level-up) |
| **MVP decisions covered** | 19/19 |
| **Stories referenced** | 30 of 35 from [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) (v1.5 stories D6/D7/D8/D9 excluded per MVP cut) |
| **Migrations in MVP** | 2 (`player_notes`, `level_up_invitations`) |
| **New E2E specs** | ~34 of 48 from [15-e2e-matrix.md](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — remainder are Biblioteca/favorites (v1.5) |

**Top parallelization win:** **Wave 3** can run with **up to 4 concurrent tracks** (Ribbon, Combat-Auto, AbilityChip, Diário+mini-wiki) because the Wave 0 consolidations (SpellSlotGrid, Dot primitive, DrawerShell→ui/Drawer) remove the only shared landmines. This is the single-biggest throughput lever in the plan.

**Top serial bottleneck:** **EP-5 (Level Up Wizard)** is mostly serial — the 6 wizard steps (E4→E5→E6) depend on the wizard shell + `choices jsonb` state contract and must land in order. The only parallel seams are (a) migration+Mestre-release UI (E1+E2) vs. wizard shell, and (b) ribbon chip (E3) vs. wizard body. Budget this epic for 1-2 concurrent tracks max.

**Second-biggest risk:** **PlayerHqShell.tsx** is touched by 3 epics (EP-1 density, EP-2 topology, EP-3 ribbon host). Coordination rule: only one open PR against this file at a time; later epics rebase on earlier ones. Same rule applies to **CharacterCoreStats.tsx** (EP-1 accordion kill + EP-3 AbilityChip swap) and **HpDisplay.tsx** (EP-1 inline controls + EP-3 ribbon variant).

---

## 2. Dependency Graph

```
                           ┌────────────────────────────────────┐
                           │  Wave 0 — EP-0 Consolidation       │
                           │  (4 tech-debt tasks, unblocks all) │
                           └──────────────────┬─────────────────┘
                                              │
                                              ▼
                           ┌────────────────────────────────────┐
                           │  Wave 1 — EP-1 Density + Post-Cbt  │
                           │  (A1–A6, no topology change)       │
                           └──────────────────┬─────────────────┘
                                              │
                                              ▼
                           ┌────────────────────────────────────┐
                           │  Wave 2 — EP-2 Topology 7→4        │
                           │  (B1–B6, routing + shell refactor) │
                           └──────────────────┬─────────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
           ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
           │ Wave 3a — EP-3   │   │ Wave 3b — EP-3   │   │ Wave 3c — EP-4   │
           │ Ribbon + Combat  │   │ AbilityChip      │   │ Diário + wiki    │
           │ Auto (C1–C5)     │   │ Roller (C7)      │   │ (D1–D5)          │
           └──────────┬───────┘   └──────────┬───────┘   └──────────┬───────┘
                      └──────────────────┬──────┴──────────────────┘
                                         ▼
                           ┌────────────────────────────────────┐
                           │  Wave 4 — EP-5 Level Up Wizard     │
                           │  (E1–E7, mostly serial inside)     │
                           └────────────────────────────────────┘
```

**Legend:**
- Boxes = epics/wave groups
- Vertical arrows = hard dependency (must merge before next wave starts)
- Horizontal arrows within a wave = parallel tracks (can run in separate branches/worktrees)

---

## 3. Wave 0 — Consolidation (Sprint 1 prerequisite)

These are **tech-debt stories**, not feature work. They do **not** deliver a user-visible change, but they remove the land-mines that would otherwise collide in Waves 2–3 when parallel tracks open. Source: [12-reuse-matrix.md §7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md).

| ID | Task | Justification (one line) | Effort | Risk |
|---|---|---|:-:|:-:|
| **C0.1** | HP status calc consolidation — sweep `hp.current/hp.max` arithmetic, delegate all callers to `getHpStatus()` + `formatHpPct()` in [lib/utils/hp-status.ts](lib/utils/hp-status.ts) | Unblocks Ribbon Vivo (C1), HpDisplay refactor (A5), CombatBanner (C5) — all need one stable `HpStatus` enum contract before they fork | S | Low |
| **C0.2** | Spell slot UI consolidation — extract `<SpellSlotGrid variant="hq\|combat\|ribbon" />` in `components/shared/`; [SpellSlotsHq.tsx](components/player-hq/SpellSlotsHq.tsx) + [SpellSlotTracker.tsx](components/player/SpellSlotTracker.tsx) re-export from it | Decision #37 (dot inversion) must land in **one** place, not two — else combat parity surface triples and Wave 3 collides with itself | M | **High if deferred** |
| **C0.3** | Dot pattern shared primitive — extract `<Dot semantic="permanent\|transient" state="on\|off" />`; consolidate ResourceDots, SpellSlot dots, CombatantRow reaction dot source of truth (canonical pattern lives in [CombatantRow.tsx:516](components/combat/CombatantRow.tsx#L516)) | Enforces decision #37 once; AbilityChip (C7) and future Biblioteca ⭐ reuse; removes 3× maintenance surface | M | High if deferred |
| **C0.4** | DrawerShell generalization — promote [DrawerShell.tsx](components/player-hq/drawers/DrawerShell.tsx) to `components/ui/Drawer.tsx` | Lets LevelUpWizard (E4) reuse instead of rebuilding; Wave 4 velocity gain | S | Low |

**Wave 0 constraints:**
- Owner: **single dev/agent (Arch)** — these four tasks touch shared primitives; parallel execution here is a foot-gun.
- Merge gate: no user-visible regression; existing tests in [e2e/journeys/j21-player-ui-panels.spec.ts](e2e/journeys/j21-player-ui-panels.spec.ts) and [e2e/features/active-effects.spec.ts](e2e/features/active-effects.spec.ts) must stay green.
- Output: 4 consolidated primitives + deletion of duplicated code (~−150 LOC net).
- **DoD:** downstream epics (EP-1 … EP-5) can import from the new primitives without additional refactor.

---

## 4. Epics

### EP-0 · Consolidation (tech debt · Wave 0)

| Field | Value |
|---|---|
| **Outcome** | Shared primitives (HP status, SpellSlotGrid, Dot, Drawer) exist in one canonical location — no user-visible change, but every downstream epic has one fewer refactor surface. |
| **MVP decisions covered** | None directly (enabler for #37, #31, #41) |
| **Stories** | C0.1, C0.2, C0.3, C0.4 (see §3 above — not in [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md), sourced from [12-reuse-matrix.md §7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md)) |
| **REUSE** | [hp-status.ts](lib/utils/hp-status.ts), [DrawerShell.tsx](components/player-hq/drawers/DrawerShell.tsx) (moved, not rewritten) |
| **REFACTOR** | [ResourceDots.tsx](components/player-hq/ResourceDots.tsx), [SpellSlotsHq.tsx](components/player-hq/SpellSlotsHq.tsx), [SpellSlotTracker.tsx](components/player/SpellSlotTracker.tsx) (all re-export from shared primitives) |
| **ZERO** | `components/shared/SpellSlotGrid.tsx`, `components/shared/Dot.tsx`, `components/ui/Drawer.tsx` |
| **Merge gate** | Zero user-visible regression. Existing E2E ([j21](e2e/journeys/j21-player-ui-panels.spec.ts), [active-effects](e2e/features/active-effects.spec.ts), [mind-map](e2e/campaign/mind-map.spec.ts)) green. |
| **Effort** | S + M + M + S ≈ **M total** |
| **Risk** | **High if deferred** (C0.2, C0.3 specifically); Low if done first |

---

### EP-1 · Density Quick Wins + Post-Combat Redirect (Wave 1)

| Field | Value |
|---|---|
| **Outcome** | Existing 7-tab Player HQ is ~30% denser (ability scores always visible, HP controls inline, header 2 lines, perícias grid 3-col); post-combat redirects to Herói surface across Guest/Anon/Auth. |
| **MVP decisions covered** | #27 (densidade), #30 (density budget), #32 (ability scores sem accordion), #38 (HP controls), #43 (pós-combate→Herói) — partial on #31/#39 (ribbon foundation only) |
| **Stories** | **A1** (spacing tokens), **A2** (accordion kill), **A3** (perícias grid), **A4** (header 2 lines), **A5** (HP inline), **A6** (post-combat redirect + `PostCombatBanner`) |
| **REUSE** | [PlayerHpActions.tsx](components/player/PlayerHpActions.tsx), 15 data hooks (no changes) |
| **REFACTOR** | [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) (spacing only), [CharacterStatusPanel.tsx](components/player-hq/CharacterStatusPanel.tsx), [CharacterCoreStats.tsx](components/player-hq/CharacterCoreStats.tsx) (accordion kill), [ProficienciesSection.tsx](components/player-hq/ProficienciesSection.tsx), [HpDisplay.tsx](components/player-hq/HpDisplay.tsx) (inline), [RecapCtaCard.tsx](components/conversion/RecapCtaCard.tsx), [GuestRecapFlow.tsx](components/conversion/GuestRecapFlow.tsx), [GuestUpsellModal.tsx](components/guest/GuestUpsellModal.tsx) |
| **ZERO** | `PostCombatBanner.tsx`, `lib/hooks/usePostCombatState.ts` |
| **Merge gate** | Gate Fase A from [15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — 7 spec files incl. `sheet-visual-baseline`, `sheet-ability-chips-always-visible`, `sheet-hp-controls-inline`, `post-combat-redirect-heroi-*` (Guest+Anon+Auth, Combat Parity mandatory for A6) |
| **Effort** | **M** (~20–30 LOC per story × 6 stories; A6 is the large one) |
| **Risk** | **Low** (no topology change, purely visual + one redirect contract) — A6 is the only Med (3-mode parity, debug-env timing) |

---

### EP-2 · Topologia 7→4 Tabs + Default Herói (Wave 2)

| Field | Value |
|---|---|
| **Outcome** | Player HQ shell renders 4 tabs (Herói · Arsenal · Diário · Mapa) with default = Herói, keyboard shortcuts 1–4, localStorage 24h persistence, and 7-way back-compat deep-link redirects — zero internal-component refactor, pure reorganization. |
| **MVP decisions covered** | #28 (4 sub-tabs), #29 (label "Herói"), #34 (default Herói + persistência), #35 (desktop + mobile MVP) |
| **Stories** | **B1** (new PlayerHqShell), **B2** (tab wrappers), **B3** (deep-link back-compat), **B4** (default + 24h TTL), **B5** (keyboard shortcuts), **B6** (E2E topology) |
| **REUSE** | All 27 internal components (CharacterStatusPanel, CharacterCoreStats, AbilitiesSection, AttunementSection, BagOfHolding, PersonalInventory, PlayerNotesSection, NpcJournal, PlayerQuestBoard, PlayerMindMap, 7 drawers, etc.) |
| **REFACTOR** | [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) (TABS array + content switch), `app/app/campaigns/[id]/sheet/page.tsx` (deep-link redirects + SSR tab resolution), [DmNotesInbox.tsx](components/player-hq/DmNotesInbox.tsx) (host move to Diário) |
| **ZERO** | `HeroiTab.tsx`, `ArsenalTab.tsx`, `DiarioTab.tsx`, `MapaTab.tsx`, `lib/hooks/usePlayerHqTabState.ts`, `PlayerHqKeyboardShortcuts.tsx`, `KeyboardHelpOverlay.tsx` |
| **DEPRECATE** | Old 7-tab i18n keys (`tabs.sheet`, `tabs.resources`, etc. — keep for 1 release w/ deprecation comment), [CharacterAttributeGrid.tsx](components/player-hq/CharacterAttributeGrid.tsx) (scheduled for EP-3 C7 kill, but verified dead in B1) |
| **Merge gate** | Gate Fase B from [15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — includes `player-hq-topology.spec.ts` (5 B6 scenarios), `player-hq-deep-links.spec.ts` (7 mappings), `player-hq-keyboard-shortcuts.spec.ts`, `player-hq-tab-persistence.spec.ts`, `sheet-a11y.spec.ts`, `sheet-mobile-390.spec.ts`, plus mind-map + J21 + active-effects regression |
| **Effort** | **L** (PlayerHqShell refactor is the spine change; 4 new tab wrappers are small but total LOC is ~800 moved/restructured) |
| **Risk** | **High** — touches routing, tour, analytics, SSR flash, 15 existing E2E specs at risk. Feature-flag OFF by default. |

---

### EP-3 · Ribbon Vivo + Modo Combate Auto + AbilityChip Roller (Wave 3a+3b)

| Field | Value |
|---|---|
| **Outcome** | Sticky 2-line ribbon at top of every tab shows HP + AC/Init/Speed + slots + conditions + active effects; combat state is auto-detected from realtime and reorganizes Herói (Col A / Col B swap) + shows CombatBanner; ability scores become 2-zone clickable chips (CHECK + SAVE) that roll d20+mod and broadcast to Mestre; dot semantics inverted per decision #37; concentration badge is sky-blue #7DD3FC per decision #45. |
| **MVP decisions covered** | #31 (ribbon sticky), #33 (Modo Combate Auto completo), #37 (dots permanente vs transitório), #39 (ribbon 2 linhas), #44 (ability chip CHECK+SAVE), #45 (concentração azul sky), #46 (save destacado em gold) |
| **Stories** | **C1** (RibbonVivo), **C2** (SlotSummary), **C3** (layout 2-col desktop), **C4** (useCampaignCombatState hook), **C5** (Modo Combate Auto + CombatBanner), **C7** (AbilityChip + roller + RollResultToast + useAbilityRoll + dice-roller) — **note: no C6 in plan; E2E is "combat-auto" at gate level** |
| **REUSE** | [PlayerHpActions.tsx](components/player/PlayerHpActions.tsx) (composed into ribbon per #38), [ConditionBadges.tsx](components/player-hq/ConditionBadges.tsx) (moves to ribbon row 2), [CombatantRow.tsx:516](components/combat/CombatantRow.tsx#L516) (dot canonical reference, read-only) |
| **REFACTOR** | [HpDisplay.tsx](components/player-hq/HpDisplay.tsx) (add `variant="ribbon"`), [CharacterStatusPanel.tsx](components/player-hq/CharacterStatusPanel.tsx) (HP bar moves out), [CharacterCoreStats.tsx](components/player-hq/CharacterCoreStats.tsx) (swap ability cell → AbilityChip), [ActiveEffectsPanel.tsx](components/player-hq/ActiveEffectsPanel.tsx), [ActiveEffectCard.tsx](components/player-hq/ActiveEffectCard.tsx), [SpellCard.tsx](components/player-hq/SpellCard.tsx) (concentração color swap `--warning` → `--concentration`), plus `HeroiTab.tsx` reorg via `useCampaignCombatState` |
| **ZERO** | `RibbonVivo.tsx`, `SlotSummary.tsx`, `CombatBanner.tsx`, `AbilityChip.tsx`, `RollResultToast.tsx`, `lib/hooks/useCampaignCombatState.ts`, `lib/hooks/useAbilityRoll.ts`, `lib/utils/dice-roller.ts` |
| **DEPRECATE** | [CharacterAttributeGrid.tsx](components/player-hq/CharacterAttributeGrid.tsx) (finally killed when AbilityChip grid ships in C7) |
| **Merge gate** | Gate Fase C from [15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — `player-hq-combat-auto.spec.ts`, `ribbon-vivo-sticky.spec.ts`, `ability-chip-roller-check/save.spec.ts`, `spell-slot-dots-inverted.spec.ts`, `concentration-badge-sky.spec.ts`, `ribbon-combat-parity-anon.spec.ts` (Combat Parity); J22 resilient-reconnect + adversarial-visibility-sleep regression |
| **Effort** | **L** (RibbonVivo ~400 LOC + AbilityChip ~300 LOC + CombatBanner + hook = largest net-new surface in MVP) |
| **Risk** | **High** — R1 (dot inversion parity), R3 (realtime quota — use consolidated channel, no per-feature channel), R4 (CLS from Combat Auto reorg); mitigations in [12-reuse-matrix.md §8](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) |

---

### EP-4 · Diário + Mini-wiki + Cross-nav (Wave 3c)

| Field | Value |
|---|---|
| **Outcome** | Diário tab hosts "Minhas Notas" (markdown editor + tags + local search + 30s auto-save) backed by new `player_notes` table with RLS; quests surface via entity-graph edges (UI-only, no new table); NPC cards cross-nav to Mapa drawers and vice-versa via shareable URLs; anonymous players see Journey-light with "crie conta pra salvar" prompts. |
| **MVP decisions covered** | #24 (mini-wiki `player_notes`), #25 (quests via entity graph), #17 (jogador anônimo vê Journey light) |
| **Stories** | **D1** (`player_notes` migration + hook), **D2** (MinhasNotas + MarkdownEditor), **D4** (cross-nav Diário ↔ Mapa), **D5** (notifications in-app) — **D3 (backlinks `@` parser) is v1.5 per MVP cut §🟡; D6–D9 (favorites + Biblioteca + Ctrl+K) are v1.5** |
| **REUSE** | [QuickNotesList.tsx](components/player-hq/QuickNotesList.tsx), [JournalEntryCard.tsx](components/player-hq/JournalEntryCard.tsx), [ScratchPad.tsx](components/player-hq/ScratchPad.tsx), [NpcJournal.tsx](components/player-hq/NpcJournal.tsx), [PlayerQuestCard.tsx](components/player-hq/PlayerQuestCard.tsx), all 7 drawers from [drawers/](components/player-hq/drawers/), [PlayerMindMap.tsx](components/player-hq/PlayerMindMap.tsx) (unchanged) |
| **REFACTOR** | [PlayerNotesSection.tsx](components/player-hq/PlayerNotesSection.tsx) (point at `player_notes` via `storeVariant` prop, preserve `player_journal_entries` path), [NpcCard.tsx](components/player-hq/NpcCard.tsx) (cross-nav link), [PlayerNpcDrawer.tsx](components/player-hq/drawers/PlayerNpcDrawer.tsx) (cross-nav CTA + "Notas" tab), [PlayerQuestBoard.tsx](components/player-hq/PlayerQuestBoard.tsx) (verify `campaign_mind_map_edges` usage; tweak if needed), [DmNotesInbox.tsx](components/player-hq/DmNotesInbox.tsx) (badge via `usePlayerNotifications`) |
| **ZERO** | `supabase/migrations/11X_player_notes.sql`, `lib/hooks/usePlayerNotes.ts`, `components/player-hq/diario/MinhasNotas.tsx`, `components/ui/MarkdownEditor.tsx`, `lib/hooks/usePlayerNotifications.ts` |
| **Merge gate** | Gate Fase D (reduced — Biblioteca/favorites stories deferred) — `player-notes-crud.spec.ts`, `player-notes-rls-negative.spec.ts` (RLS critical), `player-notes-auto-save.spec.ts`, `diario-mapa-crossnav.spec.ts`, `dm-notes-inbox-realtime.spec.ts` |
| **Effort** | **M** (migration + hook + editor + 3 cross-nav tweaks; MarkdownEditor MVP is textarea+preview, not a full WYSIWYG) |
| **Risk** | **Med** — R on RLS correctness (dual-auth user_id XOR session_token_id), migration ordering in prod |

---

### EP-5 · Wizard de Level Up (Wave 4)

| Field | Value |
|---|---|
| **Outcome** | Mestre releases level-up via a modal over CampaignDmViewServer (multi-select characters + target level + optional narrative message → INSERT batch + broadcast `levelup:offered`); players see "🎉 Subir de Nível →" chip in the ribbon; clicking opens a 6-step wizard (Class → HP → ASI/Feat → Spells → Features → Subclass → Final Review) that persists `choices jsonb` across closes; completion UPDATES character + broadcasts `levelup:completed`; auto-expire after 7d via cron/trigger. |
| **MVP decisions covered** | #41 (Wizard Level Up completo) |
| **Stories** | **E1** (`level_up_invitations` migration + RLS), **E2** (Mestre release UI), **E3** (ribbon chip + `useLevelUpInvitation`), **E4** (wizard shell + Step1 + Step2), **E5** (Step3 ASI/Feat + Step4 Spells), **E6** (Step5 Features + Step6 Subclass + FinalReview), **E7** (Mestre completion feedback + cancel + auto-expire) |
| **REUSE** | [CharacterEditSheet.tsx](components/player-hq/CharacterEditSheet.tsx) (fallback `✎ Editar` preserved per #41), `components/ui/Drawer.tsx` (from EP-0 C0.4), `components/shared/SpellSlotGrid.tsx` (from EP-0 C0.2 — slots recalc in Step4) |
| **REFACTOR** | `RibbonVivo.tsx` (EP-3 output — add `pendingLevelUp` prop surface; no refactor of other code) |
| **ZERO** | `supabase/migrations/11Z_level_up_invitations.sql`, `components/dm/LevelUpRelease.tsx`, `components/player-hq/levelup/LevelUpWizard.tsx`, Step1–Step6 + StepFinalReview (7 files), `lib/hooks/useLevelUpWizard.ts`, `lib/hooks/useLevelUpInvitation.ts`, cron/Postgres trigger for auto-expire |
| **Merge gate** | Gate Fase E from [15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — `levelup-dm-release.spec.ts`, `levelup-chip-ribbon.spec.ts`, `levelup-wizard-single-class-rogue.spec.ts`, `levelup-wizard-caster-bard.spec.ts`, `levelup-wizard-resume.spec.ts`, `levelup-rls-negative.spec.ts`, `levelup-dm-cancel-broadcast.spec.ts`; fallback `✎ Editar` regression |
| **Effort** | **XL** (7 stories · 7+ new components · 6 wizard steps · migration · cron · ~1,500 LOC total — the largest epic by a wide margin) |
| **Risk** | **High** — R5 (5e rule validation combinatorics for ASI cap, half-feats, multiclass prereqs, spells-known per class/level); testability risk on 5e rules calls for unit tests in validation helpers + 2 canonical E2E flows (rogue single + bard caster) per [15-e2e-matrix.md §7](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) |

---

## 5. Waves

### Wave 0 — Consolidation (Sprint 1 prerequisite · 1 track)

| Epic | Rationale |
|---|---|
| **EP-0** (C0.1–C0.4) | Single serial track. Four small primitives extracted before any feature epic opens a PR against ResourceDots / SpellSlotsHq / HpDisplay. |

**Dependencies:** None.
**Parallelism:** **1 track** (single arch-owner). Any attempt to parallelize inside EP-0 re-introduces the collision risk EP-0 is meant to prevent.
**Exit:** All 4 primitives live in `components/shared/` or `components/ui/`; `rtk tsc --noEmit` clean; [j21](e2e/journeys/j21-player-ui-panels.spec.ts) + [active-effects](e2e/features/active-effects.spec.ts) green.

---

### Wave 1 — Density + Post-Combat Redirect (1–4 tracks)

| Epic | Rationale |
|---|---|
| **EP-1** (A1–A6) | Six stories, four of them are pure CSS/JSX chores on distinct files (P1a–P1d in [12-reuse-matrix.md §9](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md)). A6 is a contained redirect-contract change across 3 conversion surfaces. |

**Dependencies:** Wave 0 merged (to consume consolidated HP status).
**Parallelism:** **1–4 tracks.** Stories A1 (PlayerHqShell density), A2 (CharacterCoreStats accordion kill), A3 (ProficienciesSection grid), A5 (HpDisplay inline) touch 4 different files — zero conflict. A6 is a 5th independent track (conversion components). Single dev runs serially; 3–4 agents run in parallel.
**Exit:** Gate Fase A green ([15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md)); density measurable at ≥20% height reduction in visual diff.

---

### Wave 2 — Topology 7→4 (1–3 tracks)

| Epic | Rationale |
|---|---|
| **EP-2** (B1–B6) | One shell refactor (B1) + four surrounding stories (B2 wrappers, B3 redirects, B4 persistence, B5 shortcuts) + E2E (B6). |

**Dependencies:** Wave 1 merged — density chores touched PlayerHqShell spacing; B1 rebases on A1/A4 before starting.
**Parallelism:** **1–3 tracks.** Serial dependency: B1 (shell rewrite) must land **first** (or at least merge-ready) before B2 (tab wrappers) can compose. After B1, B3 (routing) + B4 (tab state hook) + B5 (shortcuts) run independently. **Coordination rule:** only one open PR against [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) at a time.
**Exit:** Gate Fase B green; 7 legacy deep links redirect; tour updated; feature flag `NEXT_PUBLIC_PLAYER_HQ_V2` OFF in prod.

---

### Wave 3 — Ribbon + Combat Auto + Diário (2–4 tracks)

| Sub-wave | Epic stories | Rationale |
|---|---|---|
| **3a** | EP-3 C1, C2, C3, C4, C5 (Ribbon + Combat Auto) | RibbonVivo + combat banner + reorg all live in `HeroiTab.tsx` orchestration — internal stories mostly sequential, but isolated from 3b/3c. |
| **3b** | EP-3 C7 (AbilityChip roller) | Operates on [CharacterCoreStats.tsx](components/player-hq/CharacterCoreStats.tsx) cells only — no shell coupling after EP-0/EP-2 land. |
| **3c** | EP-4 D1, D2, D4, D5 (Diário + mini-wiki + cross-nav) | Entirely new files under `components/player-hq/diario/` + cross-nav tweaks to NpcCard/PlayerNpcDrawer — zero overlap with 3a/3b. |

**Dependencies:** Wave 2 merged (4-tab shell + tab wrappers exist for ribbon/diário to host).
**Parallelism:** **2–4 tracks.** 3a, 3b, 3c are fully independent once Wave 0/2 land (EP-0 SpellSlotGrid/Dot consolidation + EP-2 tab wrappers are the shared primitives). **Biggest parallel win of the plan.**
**Coordination rules:**
- 3a+3b both touch [CharacterCoreStats.tsx](components/player-hq/CharacterCoreStats.tsx) (C3 reorg context + C7 cell swap) — C7 rebases on C3.
- 3a touches [HpDisplay.tsx](components/player-hq/HpDisplay.tsx) `variant="ribbon"` — rebases on A5 (Wave 1).
- 3c has no conflict zones with 3a/3b.

**Exit:** Gate Fase C green; Combat Parity verified for Anon on ribbon; realtime channel count stable (no per-feature channel).

---

### Wave 4 — Level Up Wizard (1–2 tracks)

| Epic | Rationale |
|---|---|
| **EP-5** (E1–E7) | Mostly serial inside the epic; parallel seams are limited. |

**Dependencies:** Wave 3 merged — EP-5 consumes RibbonVivo (for E3 chip) and `components/ui/Drawer.tsx` (EP-0 output).
**Parallelism:** **1–2 tracks.** Parallel seams:
- **Track A:** E1 (migration) → E2 (Mestre release UI) → E7 (Mestre completion feedback). Linear.
- **Track B (starts after E1):** E4 (wizard shell + steps 1–2) → E5 (steps 3–4) → E6 (steps 5–6 + final review). Strictly serial — each step depends on the wizard's `choices jsonb` contract and the prior step's ASI/Feat/Spells/Features compositions.
- **Track C (parallel to E2):** E3 (ribbon chip + `useLevelUpInvitation` hook). Small, isolated.

**Coordination rules:** Track B is the throughput bottleneck of the epic — cannot be split further without breaking the wizard state machine. Unit-test 5e validation helpers separately per [15-e2e-matrix.md §7](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) risk R5.
**Exit:** Gate Fase E green; fallback `✎ Editar` still works; auto-expire cron verified in staging; feature-flag rollout plan (10% → 50% → 100%).

---

## 6. Parallelization Matrix

| Epic | Can parallelize with | Conflict zones | Mitigation |
|---|---|---|---|
| **EP-0** (Wave 0) | — (single track) | Touches ResourceDots, SpellSlotsHq, SpellSlotTracker, DrawerShell, hp-status callers — all downstream epics consume these | Serialize inside Wave 0; no feature PRs open during it. |
| **EP-1** (Wave 1) | Self-parallel: A1/A2/A3/A5/A6 across 4–5 files | A1 vs future B1 both touch [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) | Wave order: A1 lands before B1; B1 rebases on A1. |
| **EP-2** (Wave 2) | Self-parallel after B1 lands: B3+B4+B5 | B1 is serial point on PlayerHqShell; B2 depends on B1 | B1 merges first as a prereq for B2; B3/B4/B5 then run in parallel tracks. |
| **EP-3 (ribbon track)** (Wave 3a) | EP-3 (AbilityChip, 3b) · EP-4 (3c) | C1/C5 touch HpDisplay + HeroiTab; C3 restructures HeroiTab columns | After EP-2 lands, HeroiTab exists as a wrapper; C3 + C5 coordinate via a shared PR window; HpDisplay variant change is additive (new prop) not breaking. |
| **EP-3 (AbilityChip track)** (Wave 3b) | EP-3 (ribbon, 3a) · EP-4 (3c) | C7 rewrites CharacterCoreStats cell markup; C3 (ribbon track) restructures surrounding grid | C7 rebases on C3; both consume the EP-0 `<Dot>` primitive so index arithmetic is already settled. |
| **EP-4** (Wave 3c) | EP-3 (ribbon + ability, 3a/3b) | None in MVP scope — D3 backlinks parser deferred to v1.5 means no shared parser code; cross-nav tweaks are additive | Zero conflict; runs fully independently once Wave 2 merged. |
| **EP-5** (Wave 4) | Limited inside epic: E2+E3 parallel to E4-shell; E7 parallel to E6 | RibbonVivo gets `pendingLevelUp` prop (additive); no external epic conflicts since Wave 3 already merged | Wave order guarantees no external conflict; internal track B (E4→E5→E6) is the bottleneck. |

---

## 7. Bottleneck Callout

### Primary: EP-5 · Wizard de Level Up

**Why it's single-dev-blocked (in its wizard body):**
- Steps 3–6 share a `choices jsonb` state contract that grows with each step; Step N's inputs depend on Step N−1's outputs (HP from Step 2 feeds character update; class from Step 1 feeds available ASI/feats in Step 3; spells-known in Step 4 depends on class + new level).
- 5e rule validation (half-feats, ASI cap at 20, multiclass prereqs, spells-known per class/level) is non-trivial and must be centralized — splitting across multiple devs risks divergent validation.
- The wizard shell (E4) defines the stepper contract; if two devs work steps 3 and 5 in parallel before the contract stabilizes, they'll collide on the jsonb schema.

**Blast radius minimization:**
1. **Unit-test 5e validation first.** Before E4 starts, one dev authors `lib/levelup/validate-level-up-choices.ts` with exhaustive unit tests per class × level × decision branch (ASI, feat, subclass). This unblocks parallel step work later because the validation contract is frozen.
2. **Parallelize the three safe seams:** Track A (E1 migration + E2 Mestre UI + E7 feedback), Track B (wizard shell + steps serial), Track C (E3 ribbon chip + hook). Never more.
3. **Keep CharacterEditSheet fallback alive.** [CharacterEditSheet.tsx](components/player-hq/CharacterEditSheet.tsx) remains the Mestre override per decision #41 — if wizard slips, feature flag the wizard off and DMs still function via `✎ Editar`.
4. **Rollout behind flag.** Wave 4 merges behind `NEXT_PUBLIC_PLAYER_HQ_V2` + a secondary `NEXT_PUBLIC_LEVELUP_WIZARD` flag; 10%→50%→100% staggered rollout per [09-implementation-plan.md DoD](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).

### Secondary: EP-2 B1 (PlayerHqShell refactor)

**Why it's single-dev-blocked (for ~1 day):** Every downstream epic (EP-3 ribbon host, EP-4 diário wrapper, EP-5 ribbon chip prop) needs the 4-tab shell to exist. B1 is a 6–10h story that must be the **first** PR of Wave 2.

**Blast radius minimization:** Land B1 in isolation with only B2 following immediately; B3/B4/B5 then parallelize. This adds ~1 day of serial time but unblocks the rest of Wave 2+ cleanly.

---

## 8. Next Steps → Atividade 5 (Sprint Planning)

This document is capacity-agnostic. Atividade 5 ([14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)) will turn these waves into sprint cadence based on Dani's capacity answers.

### Capacity questions Dani MUST answer before Sprint 1 starts

1. **How many devs/agents work on Player HQ concurrently?**
   - 1 solo → waves collapse to a ~5-sprint serial plan; bottleneck is total LOC (~+4,500 net).
   - 2–3 → Wave 3 delivers the biggest speedup (3 parallel tracks); Wave 1 also speedups materially.
   - 4+ → diminishing returns after Wave 3; Wave 4 caps at 2 useful tracks.

2. **Is Winston (arch) available for Wave 0 and the first 2 days of Wave 2?**
   - Wave 0 is arch-owned by design. Wave 2 B1 benefits from arch pair-review because it touches SSR + routing + tour + analytics.

3. **Can we afford a dedicated QA dev for ~25 dev-days of E2E work?**
   - [15-e2e-matrix.md §6](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) estimates 48 new E2E tests ≈ 200 dev-hours. MVP scope (34 of 48, excluding Biblioteca/favorites) = ~140 hours. If no dedicated QA, devs write their own gate tests — add ~20% per wave.

4. **Is Supabase migration cadence aligned?**
   - 2 migrations in MVP: `player_notes` (Wave 3c / EP-4 D1) and `level_up_invitations` (Wave 4 / EP-5 E1). Both need prod window + staging validation before their parent epic merges. Cron trigger for E7 auto-expire adds a 3rd DB change.

5. **What's the feature-flag rollout tolerance?**
   - Plan assumes `NEXT_PUBLIC_PLAYER_HQ_V2=OFF` in prod until Wave 3 merges, then 10%→50%→100% per [09-implementation-plan.md DoD](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md). If Dani wants a hard cut-over, add 1 sprint for parallel-run testing.

6. **Is combat parity coverage (Guest/Anon/Auth) a hard merge gate per wave, or only at release?**
   - EP-1 A6 and EP-3 C5 both require 3-mode coverage per Combat Parity Rule. If relaxed to release-gate only, Waves 1 and 3 ship ~2 days faster but rollout risk increases.

7. **Single repo or worktrees for parallel tracks?**
   - [12-reuse-matrix.md §9](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) flags PlayerHqShell/CharacterCoreStats/HpDisplay as hotspots. Worktrees are strongly recommended for Wave 3's 3 tracks to avoid rebase churn.

---

**End of epics + waves.** Source of truth for [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) (Atividade 5) and [16-readiness-check.md](_bmad-output/party-mode-2026-04-22/16-readiness-check.md) (Atividade 7).
