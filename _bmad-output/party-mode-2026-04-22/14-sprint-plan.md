# 14 — Sprint Plan · Player HQ Redesign (MVP)

**Date:** 2026-04-24
**Owner:** Scrum Master + Tech Lead (dispatch: Amelia + Winston)
**Scope:** Sequence the 6 approved epics from [13-epics-waves.md](_bmad-output/party-mode-2026-04-22/13-epics-waves.md) into executable 1-week sprints on 2 parallel agent tracks.
**Inputs:**
- [13-epics-waves.md](_bmad-output/party-mode-2026-04-22/13-epics-waves.md) — 6 epics in 5 waves (PRIMARY INPUT)
- [MVP-CUT.md](_bmad-output/party-mode-2026-04-22/MVP-CUT.md) — 19 🟢 MVP decisions
- [12-reuse-matrix.md](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) — REUSE/REFACTOR/ZERO per story
- [15-e2e-matrix.md](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — required E2E tests + per-wave merge gates
- [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) — 35 stories (A1-A6, B1-B6, C1-C7, D1-D9, E1-E7; D3/D6/D7/D8/D9 deferred to v1.5)
- [PRD-EPICO-CONSOLIDADO.md §2](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) — decision text
- [CLAUDE.md](CLAUDE.md) — Combat Parity Rule, Resilient Reconnection, Vocabulário Ubíquo

**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2=true` (default OFF in prod, ON in staging and agent dev worktrees).

> Note on flag name: This doc adopts `NEXT_PUBLIC_PLAYER_HQ_V2` per the user directive. [13-epics-waves.md](_bmad-output/party-mode-2026-04-22/13-epics-waves.md) and [12-reuse-matrix.md](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) reference the prior name `V4`. In Sprint 1 the agent will either (a) standardize on `V2` across docs or (b) keep V4 if grep reveals it’s already in code. Decision captured in S1 Dani checklist.

---

## 1. Executive summary

| Metric | Value |
|---|---|
| **Total sprints** | **10** (8 dev + 1 dedicated QA + 1 cleanup) |
| **Sprint length** | 1 week (5 working days) |
| **Dev sprints** | S1 (Wave 0) · S2 (Wave 1) · S3–S4 (Wave 2) · S5–S6 (Wave 3) · S7–S8 (Wave 4) |
| **MVP ship estimate** | **~10 weeks** from Monday of Sprint 1 (8 dev + 1 QA + 1 flag flip + cleanup) |
| **Agent tracks** | **2 parallel** (A = primary user-facing; B = enablement/infra/secondary) |
| **Worktrees** | `.claude/worktrees/agent-A` and `.claude/worktrees/agent-B` both branching from `master` |
| **Branch strategy** | Short-lived per story: `feat/ep-{N}-{story}-{slug}` → PR to `master` behind flag |
| **Migrations** | 2 (`player_notes` + `level_up_invitations`) in 1 combined PR · Winston reviewed · lands Sprint 5 |
| **Parity gate** | STRICT — Guest/Anon/Auth E2E coverage per PR (Combat Parity Rule); Auth-only stories document exclusion with reason |

**Key insight — why the flag matters:** Every PR merges to `master` gated by `NEXT_PUBLIC_PLAYER_HQ_V2`. In prod the flag stays OFF through all 8 dev sprints, so master is always deployable and other features/bugs can ship independently. Staging runs with flag ON for continuous QA feedback. When the flag flips ON in prod (Sprint 10), users see a complete, pre-tested V2 surface — not a WIP incremental rollout.

**Track split strategy:**
- **Track A** owns the user-visible spine: shell refactor (B1), Ribbon Vivo (C1–C2), AbilityChip (C7), Combat Auto reorg (C3–C5), Level Up Wizard body (E4–E6). These are the features Dani demos on Friday.
- **Track B** owns enablement + parallel-safe infra: EP-0 consolidations, flag plumbing, E2E rewrites (A6 conversion specs), migrations (D1+E1), Diário/mini-wiki (D1–D2, D4–D5), Mestre-side Level Up release (E2/E7), polish/a11y/bug-bash.

**Top 3 risks:**
1. **EP-5 wizard serialization** — Track A bottleneck weeks 7–8; Track B cannot split the `choices jsonb` contract. Mitigation: unit-test validation helpers Sprint 6 (Track B) before Sprint 7 wizard shell starts.
2. **PlayerHqShell.tsx triple-touch** — EP-1 (A1/A4 density), EP-2 (B1 spine), EP-3 (C1 ribbon host) all modify the same file across Sprints 2, 3, 5. Mitigation: sequential waves + explicit rebase handoffs (A1→B1→C1) with "only one open PR at a time" rule per [13-epics-waves.md §7](_bmad-output/party-mode-2026-04-22/13-epics-waves.md).
3. **Dot semantic inversion parity (R1)** — C-side chore (decision #37) flips visual meaning on [ResourceDots.tsx](components/player-hq/ResourceDots.tsx), [SpellSlotsHq.tsx](components/player-hq/SpellSlotsHq.tsx), [SpellSlotTracker.tsx](components/player/SpellSlotTracker.tsx). Mitigation: Wave 0 consolidation (EP-0 C0.2+C0.3) lands the primitives; all three files delegate to new `<Dot>` and `<SpellSlotGrid>` in a single PR during Sprint 5.

---

## 2. Feature flag contract

### 2.1 Env var

```
NEXT_PUBLIC_PLAYER_HQ_V2=true|false
```

| Environment | Value | Why |
|---|---|---|
| Prod | `false` through Sprint 9; flip `true` Sprint 10 | Master stays deployable; users see V1 until MVP completes |
| Staging | `true` from Sprint 2 onward | Dani QAs incrementally with flag ON |
| Preview (Vercel) | `true` on any `feat/ep-*` branch preview URL | Each PR preview shows V2 work |
| Agent dev worktree | `true` in `.env.local` | Agents always see their own code |

### 2.2 Code entry points

```
lib/flags/player-hq-v2.ts       ← read helper, single source of truth
  export const isPlayerHqV2Enabled = () => process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === 'true';
  export const PlayerHqV2Flag = ({ on, off }) => isPlayerHqV2Enabled() ? on : off;
```

**Branching pattern (hybrid, chosen for maintainability):**
- **New surfaces** → physical isolation under `components/player-hq/v2/*` (HeroiTab, ArsenalTab, DiarioTab, MapaTab, RibbonVivo, LevelUpWizard, etc.). Zero risk of V1 import drift.
- **Entry points** (routes, shell) → branch by flag inside the existing file:
  - `components/player-hq/PlayerHqShell.tsx` → conditional render V1 tabs or V2 tabs
  - `app/app/campaigns/[id]/sheet/page.tsx` → conditional SSR tab resolver
  - Conversion redirects (`RecapCtaCard`, `GuestRecapFlow`, `GuestUpsellModal`) → branch `redirectTo` prop default
- **Shared primitives from EP-0** (`components/shared/SpellSlotGrid.tsx`, `components/shared/Dot.tsx`, `components/ui/Drawer.tsx`) → always new, both V1 and V2 delegate to them (no flag needed).

### 2.3 Cleanup (Sprint 10)

- Delete `components/player-hq/v2/*` directory shim (no-op if V2 lives under `player-hq/*` after promotion)
- Delete `components/player-hq/Character*Legacy.tsx` + old 7-tab shell
- Delete `lib/flags/player-hq-v2.ts`
- grep + remove `NEXT_PUBLIC_PLAYER_HQ_V2` references
- Delete old i18n keys (`tabs.sheet`, `tabs.resources`, `tabs.abilities`, `tabs.inventory`, `tabs.notes`, `tabs.quests`, `tabs.map`) per [12-reuse-matrix.md §6.3](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md)

---

## 3. Branching workflow diagram

```
master  ────●──────●──────●──────●──────●──────●──────●──────●──────●─────►
             │      │      │      │      │      │      │      │      │
             │      │      │      │      │      │      │      │      │  (each ● = PR merge behind flag)
             │      │      │      │      │      │      │      │      │
          S1 EP-0 S1 flag S2 A1-A6 S3 B1  S4 B2-B6 S5 C1-C2 S6 C3-C5 S7 E1-E3 S8 E4-E6
             │      │      │      │      │      │      │      │      │
             │                    │                           │
             │                    │                           │
  feat/ep-0-c0-consolidation      │                           │
             └───────────►────────┘                           │
                                                              │
  feat/ep-1-a1-density────►►►─── master (fwd)                │
  feat/ep-2-b1-shell     ────►►► master                       │
  feat/ep-3-c1-ribbon    ────►►► master                       │
  feat/ep-4-d1-migrations────►►► master (Winston reviewed)    │
  feat/ep-5-e1-levelup   ────►►► master ──────────────────────┘

  Track A worktree: .claude/worktrees/agent-A/  (branches from master each sprint start)
  Track B worktree: .claude/worktrees/agent-B/  (branches from master each sprint start)

  Sync point = end of each sprint: both tracks `git fetch origin master && git rebase origin/master`

  Prod state: flag OFF S1–S9 → flag ON S10 → V1 code deleted S10 → V1/V2 collapsed
  Staging:    flag ON from S2 onward
```

---

## 4. Capacity assumptions (confirmed 2026-04-24)

| # | Question | Answer |
|---|---|---|
| 1 | Dev/agent capacity | **2 agent tracks in parallel** (A + B), each in isolated git worktree |
| 2 | Winston availability | **Async review** — ping when schema changes land (Sprint 5 migration PR) |
| 3 | QA strategy | Manual + exploratory + visual regression in **dedicated Sprint 9** with flag ON; E2E parity gate **strict per PR**; unit tests per PR |
| 4 | Migrations cadence | `player_notes` + `level_up_invitations` → **1 combined PR** Sprint 5, Winston reviewed; deploy precedes feature code |
| 5 | Feature flag | **YES** — `NEXT_PUBLIC_PLAYER_HQ_V2` gates V2 UI; master stays deployable |
| 6 | Combat Parity | **STRICT per PR** — Guest/Anon/Auth E2E required; Auth-only stories document exclusion |
| 7 | Worktrees | **Isolated** under `.claude/worktrees/agent-A` + `.claude/worktrees/agent-B`, both branching from `master` |

---

## 5. Sprint-by-sprint plan

> Dates are placeholders — Dani fills real dates Monday of S1. Story points use Fibonacci (1/2/3/5/8) calibrated to agent execution speed (1 pt ≈ 2 wall-clock hours at agent velocity, adjusted for PR review + CI).

### Sprint 1 — Foundation (Wave 0 + infra)

| Field | Value |
|---|---|
| **Dates** | Week 1 (Mon ___ to Fri ___) |
| **Sprint goal** | Land the 4 EP-0 consolidation primitives + flag/worktree/CI infra so Sprints 2–8 can parallelize safely. |
| **Waves covered** | Wave 0 (EP-0 C0.1–C0.4) |

**Track A plan (Wave 0 — EP-0 consolidations, serial)**

| Order | Story | Points | PR | Files |
|---|---|---:|---|---|
| 1 | **C0.1** HP status calc sweep — delegate all `hp.current/hp.max` arithmetic to `getHpStatus()` + `formatHpPct()` | 2 | `feat/ep-0-c01-hp-status-sweep` | [lib/utils/hp-status.ts](lib/utils/hp-status.ts) consumers |
| 2 | **C0.4** DrawerShell generalize — promote to `components/ui/Drawer.tsx` | 2 | `feat/ep-0-c04-drawer-ui` | [DrawerShell.tsx](components/player-hq/drawers/DrawerShell.tsx) |
| 3 | **C0.2** SpellSlotGrid extract — `components/shared/SpellSlotGrid.tsx` with `variant="hq\|combat\|ribbon"`; SpellSlotsHq + SpellSlotTracker re-export | 5 | `feat/ep-0-c02-spell-slot-grid` | [SpellSlotsHq.tsx](components/player-hq/SpellSlotsHq.tsx), [SpellSlotTracker.tsx](components/player/SpellSlotTracker.tsx) |
| 4 | **C0.3** Dot primitive — `components/shared/Dot.tsx` with `semantic="permanent\|transient"`; ResourceDots + CombatantRow reaction dot delegate | 5 | `feat/ep-0-c03-dot-primitive` | [ResourceDots.tsx](components/player-hq/ResourceDots.tsx), [CombatantRow.tsx:516](components/combat/CombatantRow.tsx#L516) (reference only) |

**Track A total:** 14 pts

**Track B plan (infra scaffolding)**

| Order | Task | Points | PR | Description |
|---|---|---:|---|---|
| 1 | Worktree setup + agent onboarding doc | 1 | (no PR) | Create `.claude/worktrees/agent-A` + `agent-B`, both branching from `master`. Document checkout commands. |
| 2 | Flag library | 2 | `feat/ep-infra-flag-lib` | `lib/flags/player-hq-v2.ts` + env var plumbing in `.env.example`, Vercel config notes. Standardize on `NEXT_PUBLIC_PLAYER_HQ_V2` (grep for `V4` and migrate if any references exist in code) |
| 3 | CI parity gate wiring | 3 | `feat/ep-infra-ci-parity-gate` | GitHub Actions workflow that runs `rtk playwright test --grep @combat-parity` on every PR touching `/sheet` or `/combat` surfaces; blocks merge on failure |
| 4 | E2E scaffolding for `/sheet` baseline | 3 | `feat/ep-infra-sheet-baseline-e2e` | Shell spec `e2e/features/sheet-baseline.spec.ts` with auth harness + navigation to `/sheet` + viewport helpers (390 + 1440); dormant placeholders for Sprint 2 stories |
| 5 | Rewrite conversion E2Es for #43 redirect (prep for A6) | 3 | `feat/ep-infra-recap-e2e-prep` | Update [recap-anon-signup.spec.ts](e2e/conversion/recap-anon-signup.spec.ts) + [recap-guest-signup-migrate.spec.ts](e2e/conversion/recap-guest-signup-migrate.spec.ts) to accept dual redirect targets (dashboard OR `/sheet?tab=heroi`) via flag check |

**Track B total:** 12 pts

**Flag touchpoints this sprint:**
- `lib/flags/player-hq-v2.ts` created (single source of truth)
- `.env.example` gains `NEXT_PUBLIC_PLAYER_HQ_V2=false`
- Vercel env var set: prod=false, staging=true, preview=true

**Integration checkpoints:**
- Mid-sprint (Wed): Track A C0.1 + C0.4 merged → Track B rebases
- End-sprint (Fri): Track A C0.2 + C0.3 merged → sync both worktrees

**Merge gates per PR:**
- Unit tests green (`rtk vitest run`)
- `rtk tsc --noEmit` clean
- Existing E2E green ([j21-player-ui-panels.spec.ts](e2e/journeys/j21-player-ui-panels.spec.ts), [active-effects.spec.ts](e2e/features/active-effects.spec.ts), [mind-map.spec.ts](e2e/campaign/mind-map.spec.ts))
- Combat Parity: N/A for EP-0 (internal refactor, no user-facing change)
- Winston review: **not required** (infra only)

**Staging demo (Friday):** No visible change — EP-0 is tech debt. Demo = screenshot of PR list showing 4 merged consolidation PRs + staging build running with flag ON (no regression). This is the "boring but critical" sprint.

**Risks + mitigations:**
1. **Dot semantic change leaks before downstream stories use it** → EP-0 C0.3 keeps today's `transient` default behavior bit-identical to avoid regression; inversion (decision #37) happens in Sprint 5 via new `<Dot semantic="transient" inverted />` prop.
2. **Consolidation reveals deeper coupling** → Timebox each sub-story; if C0.2/C0.3 hit unexpected coupling, scope narrowly (re-export only, keep implementations) and schedule deep-refactor for cleanup sprint.
3. **Flag name conflict (`V2` vs `V4`)** → Sprint 1 Day 1: grep codebase for `PLAYER_HQ_V4`; if present, Track B migrates to `V2` in same PR as flag-lib introduction.

**Handoff to Sprint 2:**
- Track A hands EP-0 primitives to EP-1 consumers
- Track B hands flag + CI + E2E scaffold to EP-1 + EP-2 stories

---

### Sprint 2 — Density quick wins (Wave 1)

| Field | Value |
|---|---|
| **Dates** | Week 2 |
| **Sprint goal** | Deliver ~30% density improvement on the existing 7-tab Player HQ (no topology change yet) + post-combat redirect to Herói surface across all 3 modes. |
| **Waves covered** | Wave 1 (EP-1 A1–A6) |

**Track A plan (density quick wins, 4 independent files)**

| Order | Story | Points | PR | File |
|---|---|---:|---|---|
| 1 | **A1** Spacing tokens sweep — `space-y-4 → space-y-3`, `p-4 → p-3` on cards | 2 | `feat/ep-1-a1-density-tokens` | [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx), [CharacterStatusPanel.tsx](components/player-hq/CharacterStatusPanel.tsx) |
| 2 | **A4** Header 4-line → 2-line | 2 | `feat/ep-1-a4-header-2lines` | [PlayerHqShell.tsx:175-231](components/player-hq/PlayerHqShell.tsx#L175) |
| 3 | **A2** Kill accordion on ability scores | 2 | `feat/ep-1-a2-accordion-kill` | [CharacterCoreStats.tsx:131](components/player-hq/CharacterCoreStats.tsx#L131) |
| 4 | **A5** HP controls inline | 3 | `feat/ep-1-a5-hp-inline` | [HpDisplay.tsx](components/player-hq/HpDisplay.tsx) |

**Track A total:** 9 pts

> **Rebase rule (per [13-epics-waves.md §7](_bmad-output/party-mode-2026-04-22/13-epics-waves.md)):** A1 touches PlayerHqShell spacing; A4 touches PlayerHqShell header. Both serialize on the same file — A1 merges first, A4 rebases. A2 and A5 touch different files and parallelize freely.

**Track B plan (perícias grid + post-combat redirect)**

| Order | Story | Points | PR | Files |
|---|---|---:|---|---|
| 1 | **A3** Perícias 3-col grid desktop | 3 | `feat/ep-1-a3-pericias-grid` | [ProficienciesSection.tsx](components/player-hq/ProficienciesSection.tsx) |
| 2 | **A6** Post-combat redirect + `PostCombatBanner` + `usePostCombatState` | 5 | `feat/ep-1-a6-post-combat-heroi` | [RecapCtaCard.tsx](components/conversion/RecapCtaCard.tsx), [GuestRecapFlow.tsx](components/conversion/GuestRecapFlow.tsx), [GuestUpsellModal.tsx](components/guest/GuestUpsellModal.tsx), `components/player-hq/v2/PostCombatBanner.tsx` (new), `lib/hooks/usePostCombatState.ts` (new) |
| 3 | Author 7 new P0 Gate Fase A E2Es from [15-e2e-matrix.md §6 rows 1–7](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) | 5 | `feat/ep-1-a-e2e-p0-suite` | 7 new specs: `sheet-visual-baseline`, `sheet-ability-chips-always-visible`, `sheet-hp-controls-inline`, `post-combat-redirect-heroi-{auth,anon,guest}`, `sheet-header-density` |

**Track B total:** 13 pts

**Flag touchpoints this sprint:**
- Track A density changes are flag-independent (apply to V1 shell, V2 inherits)
- Track B A6 branches `redirectTo` default by flag in `RecapCtaCard`/`GuestRecapFlow`/`GuestUpsellModal`: flag OFF = dashboard (current), flag ON = `/sheet?tab=heroi`
- `PostCombatBanner` + `usePostCombatState` live under `components/player-hq/v2/` — only mounted when flag ON in HeroiTab host (HeroiTab lands Sprint 3)

**Integration checkpoints:**
- End-day Wed: Track A's A1 + A4 merged → Track B rebases
- End-sprint Fri: All 6 stories merged; both tracks sync on master

**Merge gates per PR:**
- Unit tests green + `rtk tsc --noEmit`
- E2E gate: A1–A5 = Auth-only per [15-e2e-matrix.md §3](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) ("⛔ Guest, ⛔ Anon" with reason "no `/sheet` route in those modes") — documented in PR description. A6 = **strict 3-mode parity** (Guest/Anon/Auth E2E required — this is a Combat Parity story per decision #43).
- Visual regression: A1 + A4 require updated baselines (mobile 390 + desktop 1440) captured via `rtk playwright test --update-snapshots` + committed in PR
- Winston review: **not required**

**Staging demo (Friday):**
- Flag ON → open staging `/app/campaigns/[id]/sheet` (still 7 tabs, but denser)
- Show height reduction vs screenshot of prod
- Demo post-combat flow: finish a guest combat in `/try` → recap → OAuth signup → lands on Herói tab (new behavior)
- Demo same flow as Auth member → recap toast → auto-redirect 5s to Herói

**Risks + mitigations:**
1. **A5 HP inline breaks mobile 390 tap targets** → Spec pinned ≥40px tap target; Playwright mobile viewport test in A5 PR.
2. **A6 post-combat timing flakiness in E2E** → Per [15-e2e-matrix.md §7](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md), use `DEBUG_POST_COMBAT_REDIRECT_MS=500` env in test runs.
3. **Density reveals text overflow at 390px** → A1 PR includes 390px visual snapshot; if overflow detected, rollback card padding on mobile only (`@media (max-width: 640px)` override).

**Handoff to Sprint 3:**
- Master has V1 shell densified; Sprint 3 forks V2 shell from it
- `usePostCombatState` + `PostCombatBanner` wait for HeroiTab wrapper (Sprint 3)

---

### Sprint 3 — Shell spine (Wave 2 part 1)

| Field | Value |
|---|---|
| **Dates** | Week 3 |
| **Sprint goal** | Land the V2 PlayerHqShell spine + deep-link back-compat + tab state hook so Sprint 4 can fan out the 4 tab wrappers in parallel. |
| **Waves covered** | Wave 2 (EP-2 B1, B3, B4 prep) |

**Track A plan (shell spine — serial, single file)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **B1** New `PlayerHqShell` with 4 tabs (flag-gated V1/V2 switch) | 8 | `feat/ep-2-b1-shell-4tabs` | Touch [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx); V2 path renders `<HeroiTab/><ArsenalTab/><DiarioTab/><MapaTab/>` stubs; V1 path untouched. New i18n keys (`tabs.heroi`, `tabs.arsenal`, `tabs.diario`, `tabs.mapa`) added; old keys kept per [12-reuse-matrix.md §6.3](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md). Verify `NewBadge.tsx` usage per [12-reuse-matrix.md §6.2](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md). |
| 2 | **B3** Deep-link back-compat redirects (SSR) | 3 | `feat/ep-2-b3-deep-links` | `app/app/campaigns/[id]/sheet/page.tsx` accepts `?tab=`; 7 legacy values redirect per [09-implementation-plan.md B3 mapping](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) |

**Track A total:** 11 pts

**Track B plan (tab state hook + scaffolding for Sprint 4 + Wave 3 prep)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **B4** `usePlayerHqTabState` hook with localStorage 24h TTL | 3 | `feat/ep-2-b4-tab-state-hook` | `lib/hooks/usePlayerHqTabState.ts` new + unit tests; dev mode `__DEBUG_TAB_TTL_MS` override for testing |
| 2 | **B5** Keyboard shortcuts `1/2/3/4/?` + help overlay | 3 | `feat/ep-2-b5-keyboard-shortcuts` | `components/player-hq/v2/PlayerHqKeyboardShortcuts.tsx` + `KeyboardHelpOverlay.tsx` new; mounted only when flag ON |
| 3 | E2E authoring: Gate Fase B specs | 5 | `feat/ep-2-b-e2e-suite` | `player-hq-topology.spec.ts` (5 cenários B6) + `player-hq-deep-links.spec.ts` (7 mappings) + `player-hq-keyboard-shortcuts.spec.ts` + `player-hq-tab-persistence.spec.ts` + `sheet-a11y.spec.ts` + `sheet-mobile-390.spec.ts` |
| 4 | Wave 3 prep: Ribbon + AbilityChip stubs | 2 | `feat/ep-3-wave3-prep-stubs` | Empty component files under `components/player-hq/v2/` with TODO comments — no render logic. Keeps Sprint 5 agent start fast. |

**Track B total:** 13 pts

**Flag touchpoints this sprint:**
- **Primary touchpoint:** [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) gains `if (isPlayerHqV2Enabled()) return <V2Shell />; else return <V1Shell />;`
- `app/app/campaigns/[id]/sheet/page.tsx` SSR tab resolution branches by flag
- New V2 components under `components/player-hq/v2/*`

**Integration checkpoints:**
- Mid-sprint (Wed): Track A B1 merged → Track B rebases for B4/B5 to integrate with new shell
- End-sprint: Track A B3 done; Track B all 4 items done

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E gate: B1 regression — [j21-player-ui-panels.spec.ts](e2e/journeys/j21-player-ui-panels.spec.ts), [active-effects.spec.ts](e2e/features/active-effects.spec.ts), [mind-map.spec.ts](e2e/campaign/mind-map.spec.ts) must stay green with flag OFF (V1 untouched) AND with flag ON (V2 renders stubs correctly)
- **Auth-only exclusion documented:** Guest/Anon ⛔ for B1–B5 per [15-e2e-matrix.md §3](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) ("/sheet route only exists for Auth")
- Winston review: **optional but recommended** for B1 (touches SSR + routing); async ping
- Visual regression: baseline of 4 stub tabs captured (mobile + desktop)

**Staging demo (Friday):**
- Flag ON staging → `/sheet` shows 4 tab buttons (Herói · Arsenal · Diário · Mapa)
- Each tab renders empty stub with placeholder text
- Deep link `?tab=ficha` redirects to `?tab=heroi` (shown in URL bar animation)
- Press `2` → Arsenal tab active; `?` opens help overlay
- Flag OFF → old 7-tab view (for comparison)

**Risks + mitigations:**
1. **B1 SSR flash** → SSR reads `?tab` from search params server-side; no client hydration flip. Test in E2E with `page.waitForURL` + immediate screenshot.
2. **Tour breaks on new tab names** → Wait until Sprint 4 when tab wrappers have real content; tour update rolls into Sprint 9 QA polish.
3. **`NewBadge.tsx` deprecation** → B1 PR includes verification grep; if only used by old 7-tab bar, delete in same PR; if reused for notification badges, keep as REUSE.

**Handoff to Sprint 4:**
- Shell spine merged; 4 tab wrapper files exist as stubs
- Sprint 4 fills the stubs with composition of existing components (B2)

---

### Sprint 4 — Tab wrappers + dot inversion (Wave 2 part 2 + C-side chores)

| Field | Value |
|---|---|
| **Dates** | Week 4 |
| **Sprint goal** | Fill the 4 tab wrappers with composed content (B2) + land dot semantic inversion (decision #37) + concentration badge color change (decision #45) — setting up Wave 3 for conflict-free ribbon/combat work. |
| **Waves covered** | Wave 2 tail (EP-2 B2, B6) + Wave 3 "C-side chores" (dot inversion, concentration color) |

**Track A plan (Herói + Arsenal wrappers)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **B2a** HeroiTab wrapper composition | 3 | `feat/ep-2-b2a-heroi-tab` | Compose CharacterStatusPanel + CharacterCoreStats + ProficienciesSection + ActiveEffectsPanel + SpellSlotsHq + ResourceTrackerList + SpellListSection + RestResetPanel + PostCombatBanner (conditional). No reorg yet — that's C3 (Sprint 5). |
| 2 | **B2b** ArsenalTab wrapper composition | 2 | `feat/ep-2-b2b-arsenal-tab` | AbilitiesSection + AttunementSection + BagOfHolding + PersonalInventory |
| 3 | **B6** Full topology E2E spec | 2 | `feat/ep-2-b6-topology-e2e` | `player-hq-topology.spec.ts` extended to 5 cenários — flesh out the Sprint 3 scaffold |

**Track A total:** 7 pts

**Track B plan (Diário + Mapa wrappers + C-side chores)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **B2c** DiarioTab wrapper (skeleton, Minhas Notas empty state) | 3 | `feat/ep-2-b2c-diario-tab` | Compose DmNotesInbox + NpcJournal + PlayerQuestBoard + QuickNotesList + MinhasNotas empty state ("Em breve — aguardando Sprint 5"). [DmNotesInbox.tsx](components/player-hq/DmNotesInbox.tsx) moves here per [12-reuse-matrix.md §4.11](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md). |
| 2 | **B2d** MapaTab wrapper | 1 | `feat/ep-2-b2d-mapa-tab` | Host PlayerMindMap unchanged |
| 3 | **C-side** Dot inversion (decision #37) | 5 | `feat/ep-3-cside-dot-inversion` | Flip semantic in [ResourceDots.tsx](components/player-hq/ResourceDots.tsx) + [SpellSlotsHq.tsx](components/player-hq/SpellSlotsHq.tsx) + [SpellSlotTracker.tsx](components/player/SpellSlotTracker.tsx) via new `<Dot semantic="transient" inverted />` prop (EP-0 primitive). Flag-gated: flag OFF = today's behavior; flag ON = inverted. |
| 4 | **C-side** Concentration color `--warning` → `--concentration` (#7DD3FC) (decision #45) | 2 | `feat/ep-3-cside-conc-color` | [ActiveEffectsPanel.tsx](components/player-hq/ActiveEffectsPanel.tsx), [ActiveEffectCard.tsx](components/player-hq/ActiveEffectCard.tsx), [SpellCard.tsx](components/player-hq/SpellCard.tsx) + Tailwind token |
| 5 | E2E: `spell-slot-dots-inverted.spec.ts` + `concentration-badge-sky.spec.ts` | 3 | `feat/ep-3-cside-e2e` | Gate Fase C prep |

**Track B total:** 14 pts

**Flag touchpoints this sprint:**
- 4 tab wrappers live entirely under `components/player-hq/v2/` — no branching inside existing files
- Dot inversion is flag-gated inside ResourceDots: `const inverted = isPlayerHqV2Enabled() && semantic === 'transient';` — Combat Parity preserved because flag OFF = today's visual

**Integration checkpoints:**
- Daily: both tracks pull master before starting new story
- Mid-sprint: B2a merged → B2c rebases (shared components like DmNotesInbox move)
- End-sprint: all wrappers merged + C-side chores merged

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E: B2 stories = Auth-only; **C-side dot inversion = strict 3-mode parity** (Combat Parity per decision #37, SpellSlotTracker is used in player/combat/guest contexts)
- Visual regression: B2 tab wrappers (4 new baselines); concentration color update
- Winston review: **not required**
- Combat Parity explicit check: C-side dot inversion must include E2E scenarios for Guest (`/try`), Anon (`/join`), Auth (`/combat` + `/sheet`) per CLAUDE.md

**Staging demo (Friday):**
- Flag ON → all 4 tabs render actual content (Herói fleshed out, Arsenal fleshed out, Diário skeleton, Mapa mind-map working)
- Toggle flag OFF → revert to V1 7-tab; confirm feature parity
- Spell slots: show combat view with inverted dot meaning (filled = used)
- Active effect with concentration: badge now sky blue

**Risks + mitigations:**
1. **Dot inversion confuses existing players testing staging** → Commit message + PR description explain decision #37 rationale; stage-only for 1 week before widening; J21 regression spec confirms nothing else breaks.
2. **B2c Diário empty state feels broken** → Explicit "Sprint 5 feature" copy with countdown language; don't ship to prod until Sprint 5 migrations land.
3. **Mapa player restrictions regress** → Run [mind-map.spec.ts](e2e/campaign/mind-map.spec.ts) §10 Player Role Restrictions in every B2d PR.

**Handoff to Sprint 5:**
- All 4 tab wrappers alive; C-side cleanup done
- Sprint 5 opens with Wave 3 ribbon + Diário migrations — no shared-file conflicts remain

---

### Sprint 5 — Ribbon Vivo + Migrations + Diário (Wave 3 part 1)

| Field | Value |
|---|---|
| **Dates** | Week 5 |
| **Sprint goal** | Sticky Ribbon Vivo lives across 4 tabs + AbilityChip rolls from Herói + migrations (`player_notes` + `level_up_invitations`) deployed + Diário mini-wiki fully functional. |
| **Waves covered** | Wave 3a (Ribbon core) + Wave 3b (AbilityChip) + Wave 3c partial (Diário + migrations) |

**Track A plan (Ribbon Vivo + AbilityChip)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **C1** `<RibbonVivo />` sticky 2-line | 8 | `feat/ep-3-c1-ribbon-vivo` | `components/player-hq/v2/RibbonVivo.tsx` new; composes HpDisplay (new `variant="ribbon"`) + PlayerHpActions + AC/Init/Speed/Inspiration/Spell-Save-DC + SlotSummary + ConditionBadges + ActiveEffectsPanel (compact). [HpDisplay.tsx](components/player-hq/HpDisplay.tsx) gains additive `variant` prop (no V1 regression). |
| 2 | **C2** `<SlotSummary />` ribbon subcomponent | 3 | `feat/ep-3-c2-slot-summary` | Uses `<SpellSlotGrid variant="ribbon" />` from EP-0 C0.2 |
| 3 | **C7** AbilityChip + dice-roller + useAbilityRoll + RollResultToast | 8 | `feat/ep-3-c7-ability-chip` | Replaces cell markup in [CharacterCoreStats.tsx:146-167](components/player-hq/CharacterCoreStats.tsx#L146); deprecates [CharacterAttributeGrid.tsx](components/player-hq/CharacterAttributeGrid.tsx). Uses EP-0 `<Dot>` primitive. |

**Track A total:** 19 pts (stretch — C7 can slip to Sprint 6 if needed)

**Track B plan (migrations + Diário)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **D1 + E1** Combined migrations PR — `player_notes` + `level_up_invitations` | 5 | `feat/ep-4-5-migrations-combined` | 2 new SQL files in `supabase/migrations/` + RLS policies + indexes. **Winston async review required.** Migration deploy precedes feature code deploy per user directive. Includes auto-expire cron/trigger for `level_up_invitations` (E7 prereq). |
| 2 | **D1 hook** `usePlayerNotes` | 2 | `feat/ep-4-d1-use-player-notes` | CRUD hook by campaign (depends on migration merged) |
| 3 | **D2** MinhasNotas + MarkdownEditor | 8 | `feat/ep-4-d2-minhas-notas` | `components/player-hq/v2/diario/MinhasNotas.tsx` + `components/ui/MarkdownEditor.tsx`. Textarea + preview MVP. Auto-save 30s (dev override `DEBUG_AUTOSAVE_INTERVAL=2s`). Refactor [PlayerNotesSection.tsx](components/player-hq/PlayerNotesSection.tsx) with `storeVariant` prop. |
| 4 | **D4** Cross-nav Diário ↔ Mapa | 3 | `feat/ep-4-d4-crossnav` | [NpcCard.tsx](components/player-hq/NpcCard.tsx) + [PlayerNpcDrawer.tsx](components/player-hq/drawers/PlayerNpcDrawer.tsx) additive links |
| 5 | **D5** Notifications hook + inbox badge | 3 | `feat/ep-4-d5-notifications` | `lib/hooks/usePlayerNotifications.ts` + [DmNotesInbox.tsx](components/player-hq/DmNotesInbox.tsx) badge wiring |
| 6 | Gate Fase D E2Es (P0 subset) | 5 | `feat/ep-4-d-e2e-suite` | `player-notes-crud.spec.ts` + `player-notes-rls-negative.spec.ts` + `player-notes-auto-save.spec.ts` + `diario-mapa-crossnav.spec.ts` + `dm-notes-inbox-realtime.spec.ts` |

**Track B total:** 26 pts (heavy sprint — Track B carries migration + Diário; Track A owner helps with D2 MarkdownEditor if overflow)

**Flag touchpoints this sprint:**
- Ribbon Vivo lives in V2 shell only (under `components/player-hq/v2/`)
- HpDisplay new `variant="ribbon"` prop is additive — V1 ignores it, V2 uses it
- CharacterCoreStats cell markup swap behind flag: V1 keeps old CharacterAttributeGrid, V2 uses AbilityChip
- MinhasNotas only mounted inside V2 DiarioTab

**Integration checkpoints:**
- **Day 1 Mon:** Track B opens migrations PR; Winston async-pinged
- **Day 2 Tue:** Winston review complete → migrations merge → staging migrates
- **Day 3 Wed:** Track A C1 ribbon merges → Track B D2 editor merges
- **Day 5 Fri:** All stories done; sync both worktrees

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E:
  - C1/C2/C7 = **strict 3-mode parity where applicable** — C1 ribbon must render in Anon `/join` (Combat Parity); C7 ability roll is Auth-only (documented: "requires persistent `roll_history`"); C2 SlotSummary = Auth-only (anon has no caster state)
  - D1/D2/D4/D5 = Auth-only (documented: "mini-wiki requires persistent `player_notes`; anon sees 'crie conta pra salvar' prompt")
  - D1 RLS negative spec runs against anon to prove isolation
- **Winston review:** REQUIRED for `feat/ep-4-5-migrations-combined`
- Visual regression: ribbon baseline (desktop + mobile); ability chip layout; Diário editor
- Resilient Reconnection smoke: [j22-player-resilience.spec.ts](e2e/journeys/j22-player-resilience.spec.ts) must stay green with ribbon on

**Staging demo (Friday):**
- Flag ON → open Herói tab: ribbon sticky at top showing HP bar + AC/Init/Speed + slots + conditions
- Click ability CHECK zone → d20 rolls, toast shows result
- Navigate to Diário → Minhas Notas → create a note, add tags, autosave works, search finds it
- Open NPC card → "Ver no Mapa" link navigates to Mapa with drawer open
- Mestre sends a note in another session → badge appears on Diário in <2s

**Risks + mitigations:**
1. **C7 overflow to Sprint 6** → Budget allows C7 to slip; if it does, Sprint 6 absorbs it and Sprint 8 buffer shrinks. Dani accepts.
2. **Migration deploy fails in staging** → D1/E1 migrations are idempotent + reversible; rollback script in same PR. Winston async-reviews migrations **before** Monday merge.
3. **RLS negative test reveals bug** → Block Sprint 6 start until D1 RLS correct; this is a P0 gate per [15-e2e-matrix.md §6 row 30](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md).
4. **Realtime channel leak from `useCampaignCombatState` (Sprint 6 prep)** → Sprint 5 does not subscribe yet; Sprint 6 is when this materializes — Track B pre-writes channel-leak assertion into the C4 E2E scaffold.

**Handoff to Sprint 6:**
- Migrations deployed in staging; production migration deploy scheduled for Sprint 9 QA (pre-Sprint 10 flag flip)
- Ribbon + AbilityChip live; Sprint 6 adds Combat Auto reorg on top

---

### Sprint 6 — Combat Auto + polish (Wave 3 part 2)

| Field | Value |
|---|---|
| **Dates** | Week 6 |
| **Sprint goal** | Combat Auto reorganizes HeroiTab when realtime fires `combat:started`; 2-col desktop layout; visual regression snapshots of completed waves 0–3; pre-EP-5 validation helpers unit-tested. |
| **Waves covered** | Wave 3a tail (EP-3 C3, C4, C5) + C6 E2E + buffer for C7 if slipped from Sprint 5 + Wave 4 prep |

**Track A plan (Combat Auto reorg)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **C4** `useCampaignCombatState` hook | 3 | `feat/ep-3-c4-campaign-combat-state` | Subscribes to consolidated `campaign:${id}` channel (per R3 mitigation, no per-feature channel). 10s polling fallback. Returns `{active, round, currentTurn, nextTurn}`. Channel-leak assertion. |
| 2 | **C3** HeroiTab 2-col desktop layout | 3 | `feat/ep-3-c3-two-col` | CSS Grid `grid-template-areas` for CLS <0.1 per R4 mitigation |
| 3 | **C5** CombatBanner + Modo Combate Auto reorg | 8 | `feat/ep-3-c5-combat-auto` | `CombatBanner.tsx` new; HeroiTab swaps Col A/B based on `useCampaignCombatState`; FAB appears; banner slide-from-top 300ms, fade-out 400ms |
| 4 | **C6** E2E: `player-hq-combat-auto.spec.ts` (5 cenários) + `ribbon-combat-parity-anon.spec.ts` | 5 | `feat/ep-3-c6-combat-auto-e2e` | Gate Fase C final |

**Track A total:** 19 pts

**Track B plan (polish + Wave 4 prep)**

| Order | Task | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | Bug bash pass on Waves 0–3 | 3 | Multiple small PRs | Fix issues surfaced by Dani in staging over Sprints 1–5 |
| 2 | Visual regression baseline capture for all Wave 0–3 surfaces | 3 | `feat/ep-3-visual-baselines` | Mobile 390 + desktop 1440 + tablet 1024 for 4 tabs × ribbon states |
| 3 | a11y axe extension to `/sheet?tab=heroi/arsenal/diario/mapa` | 2 | `feat/ep-3-a11y-sheet` | Extend [accessibility.spec.ts](e2e/a11y/accessibility.spec.ts) |
| 4 | Wave 4 prep: **unit tests for 5e validation helpers** | 5 | `feat/ep-5-validation-unit-tests` | `lib/levelup/validate-level-up-choices.ts` skeleton + exhaustive unit tests per class × level × decision (ASI, feat, subclass). Per [13-epics-waves.md §7 R5 mitigation](_bmad-output/party-mode-2026-04-22/13-epics-waves.md), validation contract frozen before E4 starts. |
| 5 | Wave 4 prep: author E2E scaffolding for wizard | 3 | `feat/ep-5-wizard-e2e-scaffold` | Dormant spec shells for `levelup-dm-release`, `levelup-chip-ribbon`, `levelup-wizard-single-class-rogue`, `levelup-wizard-caster-bard` |

**Track B total:** 16 pts

**Flag touchpoints this sprint:**
- `useCampaignCombatState` is flag-agnostic (lives in `lib/hooks/`); only HeroiTab V2 consumes it
- CombatBanner + FAB only render inside V2 HeroiTab

**Integration checkpoints:**
- Daily pull from master
- End of Day 3: C4 merged → C5 builds on it
- End-sprint: Gate Fase C green; Wave 4 prep locked

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E: C4/C5 = **strict 3-mode parity** — C4 ribbon must light up for Anon players per Combat Parity Rule; documented in `ribbon-combat-parity-anon.spec.ts`
- Resilient Reconnection: C4 realtime subscription must pass [adversarial-visibility-sleep.spec.ts](e2e/combat/adversarial-visibility-sleep.spec.ts) + [adversarial-wifi-bounce.spec.ts](e2e/combat/adversarial-wifi-bounce.spec.ts)
- Winston review: **recommended** for C4 (realtime channel consolidation — R3 risk)
- Visual regression: HeroiTab 2-col vs 1-col; combat banner states

**Staging demo (Friday):**
- Flag ON → open Herói tab; Dani starts combat in Mestre session
- Player staging tab: combat banner slides in within 2s; HeroiTab reorganizes; FAB appears
- Dani ends combat → banner fades; layout reverts
- Test Anon `/join` ribbon parity: same behavior
- Show axe a11y report = 0 critical/serious
- Show unit test coverage report for 5e validation helpers (Wave 4 readiness gate)

**Risks + mitigations:**
1. **CLS >0.1 on Combat Auto reorg (R4)** → C3 PR measures CLS in Lighthouse CI; grid-template-areas fixed regions; if CLS exceeds, fall back to `opacity` transitions instead of grid swap.
2. **Realtime quota exceeded (R3)** → `useCampaignCombatState` subscribes to existing `campaign:${id}` channel (not a new one); asserted in unit test by spying on Supabase client.
3. **5e validation unit tests reveal spec gaps** → Sprint 6 Track B flags ambiguities for Dani clarification before Sprint 7 starts; if spec gap is big, schedule 1-day PM clarification with Dani.

**Handoff to Sprint 7:**
- Gate Fase C green in CI
- 5e validation helper unit-tested and frozen
- Wave 4 E2E scaffolding exists; Sprint 7 starts wizard shell immediately

---

### Sprint 7 — Level Up Wizard front half (Wave 4 part 1)

| Field | Value |
|---|---|
| **Dates** | Week 7 |
| **Sprint goal** | Mestre can release Level Up; Player sees chip in ribbon; wizard shell + Steps 1–3 work end-to-end (Class + HP + ASI/Feat) using frozen validation helpers. |
| **Waves covered** | Wave 4 (EP-5 E2, E3, E4, E5 Step 3) |

**Track A plan (Wizard shell + early steps)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **E4a** LevelUpWizard shell + stepper + useLevelUpWizard hook | 5 | `feat/ep-5-e4a-wizard-shell` | Uses `components/ui/Drawer.tsx` (EP-0 C0.4). `choices jsonb` contract locked per Sprint 6 unit tests. |
| 2 | **E4b** Step1ChooseClass + Step2Hp | 5 | `feat/ep-5-e4b-step1-step2` | Single-class auto-skip Step 1; Step 2 "Rolar" + "Média" + validation |
| 3 | **E5 Step 3** AsiOrFeat | 5 | `feat/ep-5-e5-step3` | ASI cap 20; half-feat support; canonical levels (4/8/12/16/19). Uses frozen validation. |

**Track A total:** 15 pts

**Track B plan (Mestre UI + ribbon chip)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **E2** `<LevelUpRelease />` Mestre UI | 5 | `feat/ep-5-e2-dm-release` | Modal over CampaignDmViewServer; multi-select characters + target level + optional message → INSERT batch + broadcast |
| 2 | **E3** Ribbon chip + `useLevelUpInvitation` | 3 | `feat/ep-5-e3-ribbon-chip` | RibbonVivo gets `pendingLevelUp` prop (additive); chip shows/hides based on hook |
| 3 | QA prep: E2E specs for E2 + E3 | 3 | `feat/ep-5-dm-release-e2e` | `levelup-dm-release.spec.ts` + `levelup-chip-ribbon.spec.ts` |
| 4 | Visual snapshots of completed waves (Waves 0–3 re-capture post-Combat Auto) | 2 | `feat/ep-5-visual-post-wave3` | Refreshed baselines after Sprint 6 |

**Track B total:** 13 pts

**Flag touchpoints this sprint:**
- LevelUpWizard lives under `components/player-hq/v2/levelup/*`
- Mestre LevelUpRelease lives under `components/dm/`; gated by flag so V1 users don't see button
- Secondary flag `NEXT_PUBLIC_LEVELUP_WIZARD=true` (sub-flag) allows gradual rollout per [13-epics-waves.md §7](_bmad-output/party-mode-2026-04-22/13-epics-waves.md); default ON in staging, ON in prod Sprint 10 alongside main flag

**Integration checkpoints:**
- End of Day 2: Track B E2 merged → Track A E4a builds on broadcast contract
- End of Day 4: Track A E4b merged → Track A starts E5 Step 3
- End of Day 5: Track A E5 Step 3 merged; Track B wrapped

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E: **E2/E3/E4/E5 all Auth-only per [15-e2e-matrix.md §3](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md)** (documented: "Level Up requires persistent character with class/level; `level_up_invitations` has RLS by user_id; Mestre always Auth")
- Winston review: **optional** (schema already landed Sprint 5)
- Visual regression: ribbon chip pulse gold animation (use `reducedMotion` to avoid flake)
- Fallback verification: CharacterEditSheet `✎ Editar` still works (regression per [13-epics-waves.md §7 R5](_bmad-output/party-mode-2026-04-22/13-epics-waves.md))

**Staging demo (Friday):**
- Flag ON → Dani opens Mestre view; clicks "Liberar Level Up"; selects 2 characters → INSERT batch + broadcast
- Player tabs: chip "🎉 Subir de Nível →" appears in ribbon within 2s
- Click chip → wizard opens at Step 1 (multiclass skipped for single-class); Step 2 HP roll or average; Step 3 ASI/Feat
- Close wizard mid-flow → reopen; state persisted
- Single-class rogue walkthrough up to Step 3

**Risks + mitigations:**
1. **Wizard `choices jsonb` schema drift** → Sprint 6 unit tests froze the contract; any Sprint 7 ambiguity triggers PM clarification not improvisation.
2. **Ribbon chip realtime delay >2s** → E3 E2E asserts <2s; if fails, investigate channel consolidation (not a new channel).
3. **Mestre release UI broadcasts before INSERT committed** → E2 PR uses transaction + `await` before broadcast; E2E race spec.

**Handoff to Sprint 8:**
- Wizard shell + 3 steps working
- Sprint 8 finishes Steps 4–6 + Review + Mestre completion feedback (E7)

---

### Sprint 8 — Level Up Wizard back half + cross-cutting polish (Wave 4 part 2)

| Field | Value |
|---|---|
| **Dates** | Week 8 |
| **Sprint goal** | Complete Level Up Wizard (Steps 4–6 + Final Review) + Mestre completion feedback + cancel + auto-expire + cross-cutting polish + a11y audit + mobile 390 sweep. |
| **Waves covered** | Wave 4 (EP-5 E5 Step 4, E6, E7) + polish |

**Track A plan (Wizard back half)**

| Order | Story | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **E5 Step 4** Spells | 5 | `feat/ep-5-e5-step4-spells` | Filter by class; slots recalculated auto; uses `<SpellSlotGrid>` from EP-0 |
| 2 | **E6a** Step5Features | 3 | `feat/ep-5-e6a-features` | List SRD features gained |
| 3 | **E6b** Step6Subclass | 3 | `feat/ep-5-e6b-subclass` | Only appears at canonical subclass-choice levels per class |
| 4 | **E6c** StepFinalReview + commit | 5 | `feat/ep-5-e6c-final-review` | UPDATE character + status='completed' + broadcast `levelup:completed` |
| 5 | Full wizard E2E: `levelup-wizard-single-class-rogue.spec.ts` + `levelup-wizard-caster-bard.spec.ts` + `levelup-wizard-resume.spec.ts` + `levelup-rls-negative.spec.ts` | 5 | `feat/ep-5-e6-wizard-e2e-full` | Gate Fase E |

**Track A total:** 21 pts (heavy — stretch, but Track A has been climbing throughput)

**Track B plan (Mestre E7 + cross-cutting polish)**

| Order | Task | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | **E7** Mestre completion toast + cancel + auto-expire verification | 5 | `feat/ep-5-e7-dm-feedback` | Toast on `levelup:completed`; Cancel button + broadcast `levelup:cancelled`; verify auto-expire cron runs correctly in staging |
| 2 | Cross-cutting a11y audit sweep | 3 | `feat/ep-final-a11y-sweep` | axe + manual keyboard nav audit across 4 tabs + wizard; fix findings |
| 3 | Mobile 390 final sweep | 3 | `feat/ep-final-mobile-390` | Every tab + ribbon + wizard on 390px; fix overflow / tap target issues |
| 4 | Edge case fixes from Sprint 7 bug-bash | 3 | Multiple small PRs | — |
| 5 | E2E: `levelup-dm-cancel-broadcast.spec.ts` | 2 | `feat/ep-5-e7-e2e` | — |

**Track B total:** 16 pts

**Flag touchpoints this sprint:**
- No new flag touchpoints — all V2 code added under `components/player-hq/v2/` + `components/dm/`
- End of sprint: full V2 surface complete behind flag

**Integration checkpoints:**
- Daily sync
- End of Day 3: E5 Step 4 merged; E6 steps start
- End of Day 5: Full wizard E2E green; Gate Fase E closed

**Merge gates per PR:**
- Unit tests + `rtk tsc --noEmit`
- E2E: full Gate Fase E per [15-e2e-matrix.md §4](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md)
- Visual regression: wizard steps snapshots
- Fallback regression: CharacterEditSheet still works
- Winston review: **not required**

**Staging demo (Friday):**
- Flag ON → Dani completes a full single-class rogue level up (Steps 1, 2, 3, 5 — subclass skip, Review, confirm)
- Mestre tab: toast "Capa Barsavi subiu pro lv 11" arrives in real time
- Dani completes a caster bard level up (Steps 1, 2, 3, 4, 5, 6, Review) — shows spells learned + slots updated
- Mestre cancels a pending invitation → chip disappears from ribbon within 2s
- Auto-expire: tamper timestamp in staging to 8 days ago; cron marks as expired; chip disappears

**Risks + mitigations:**
1. **E5 Step 4 spell filtering edge cases** → Unit-tested validation helpers from Sprint 6 cover spells-known per class/level; E2E bard spec walks through specific interactions.
2. **E7 cron auto-expire fails in staging** → Cron already in migrations PR (Sprint 5); staging tested daily from Sprint 5 onward; any failure surfaces before Sprint 8.
3. **Wizard mobile 390 overflow** → Sprint 8 Track B sweeps; wizard modal is full-screen on mobile per `<Drawer>` MVP.

**Handoff to Sprint 9:**
- **ALL MVP dev stories merged behind flag**
- Staging runs flag ON with full V2 surface
- Sprint 9 = dedicated QA phase

---

### Sprint 9 — Dedicated QA phase

| Field | Value |
|---|---|
| **Dates** | Week 9 |
| **Sprint goal** | Manual acceptance + exploratory + visual regression sign-off + a11y audit + performance check across all 4 tabs + wizard, flag ON in staging. Bugs hot-swap back to dev tracks. |
| **Waves covered** | QA of Waves 0–4 |

**Track A plan (bug-fix hot swaps based on QA findings)**

| Order | Task | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | Hot-fix stream (Track A takes user-facing bugs) | 10 budgeted | Multiple small PRs | Responds to Dani's QA reports |
| 2 | Performance audit (desktop 1440 + mobile 390 per decision #35) | 3 | `feat/final-perf-audit` | Lighthouse CI run + fix any regressions (CLS, LCP, TTI) |
| 3 | Post-Sprint 9 regression suite full pass | 2 | (no PR, CI run) | — |

**Track B plan (manual + exploratory QA + polish)**

| Order | Task | Points | PR | Notes |
|---|---|---:|---|---|
| 1 | Exploratory QA Guest / Anon / Auth matrix | 5 | QA report in `_bmad-output/party-mode-2026-04-22/qa-sprint9/` | Test 3 modes × 4 tabs × key flows |
| 2 | Visual regression sign-off (golden baseline) | 3 | `feat/final-visual-golden` | Refresh all baselines + approve |
| 3 | Tour update for 4-tab topology | 3 | `feat/final-tour-4tabs` | Update `/app` tour steps to match new structure |
| 4 | i18n PT-BR audit + EN mirror | 3 | `feat/final-i18n-audit` | Ensure all new keys (`tabs.heroi`, `ribbon.*`, `levelup.*`) are translated correctly per Vocabulário Ubíquo |
| 5 | Prod migration deploy staging → plan for Sprint 10 | 2 | (runbook doc) | Coordinate migration deploy window with Dani |

**Track B total budget:** 16 pts

**Flag touchpoints this sprint:**
- No code changes to flag mechanics
- Staging: flag ON continuously
- Prod: flag still OFF

**Integration checkpoints:**
- Daily QA standup: Dani reports findings; Scrum Master triages bugs to Track A or defers to post-MVP

**Merge gates per PR:**
- Hot-fix PRs must keep all existing E2E green
- Visual regression baselines re-approved after any fix

**Staging demo (Friday):**
- Dani signs off on MVP: all 4 tabs usable, ribbon solid, wizard complete, no critical bugs
- Migration deploy to production scheduled for Monday of Sprint 10

**Risks + mitigations:**
1. **QA reveals a critical bug blocking launch** → Sprint 9 has 10-pt bug budget on Track A; if exceeded, Sprint 10 flag flip postponed 1 week.
2. **Prod migration deploy anxiety** → Already dry-run in staging 4 weeks (Sprints 5–9); Winston async-signs off before production window.
3. **Tour update surfaces UX gaps** → Treated as polish, not blocker.

**Handoff to Sprint 10:**
- Migration deployed to production (early Monday S10)
- MVP green-lit for flag flip

---

### Sprint 10 — Flag flip + cleanup

| Field | Value |
|---|---|
| **Dates** | Week 10 |
| **Sprint goal** | Flip flag ON in production (soft launch); monitor 48-72h; then delete V1 code + flag reads + feature flag lib. |
| **Waves covered** | Production rollout + tech-debt cleanup |

**Track A plan (flip + monitor + cleanup)**

| Day | Task | Description |
|---|---|---|
| Mon | Migration deploy (prod) | Winston-supervised; backout plan ready |
| Tue | Flag ON — canary 10% | Vercel env var `NEXT_PUBLIC_PLAYER_HQ_V2=true` for 10% of users (via middleware cookie sampling) |
| Wed | Monitor + widen to 50% | Watch error rates, Sentry, session recordings |
| Thu | Widen to 100% | All users on V2 |
| Fri | Cleanup PR start | `feat/final-cleanup-v1-deletion` — delete V1 7-tab shell code, old i18n keys, flag lib |

**Track B plan (cleanup + retrospective)**

| Day | Task | Description |
|---|---|---|
| Mon | Sprint 10 runbook | — |
| Tue | Prep cleanup PR (branches ready) | — |
| Wed | Update docs to reflect V2 as canonical | `docs/glossario-ubiquo.md`, `CLAUDE.md`, PRD references |
| Thu | Author retrospective outline | Wins, misses, re-usability |
| Fri | Cleanup PR review + merge | After 100% flip verified healthy |

**Cleanup PR checklist:**
- [ ] Delete `components/player-hq/v2/` directory shim OR flatten `v2/*` up into `player-hq/*` (decide during PR)
- [ ] Delete V1 7-tab shell code + old tab wrappers
- [ ] Delete [CharacterAttributeGrid.tsx](components/player-hq/CharacterAttributeGrid.tsx) (deprecated per C7)
- [ ] Delete `lib/flags/player-hq-v2.ts`
- [ ] grep + remove all `isPlayerHqV2Enabled()` / `NEXT_PUBLIC_PLAYER_HQ_V2` references
- [ ] Remove env var from Vercel prod/staging/preview
- [ ] Delete old i18n keys (`tabs.sheet`, `tabs.resources`, `tabs.abilities`, `tabs.inventory`, `tabs.notes`, `tabs.quests`, `tabs.map`)
- [ ] Delete `lib/flags/player-hq-v2.ts` imports throughout codebase
- [ ] Update [CLAUDE.md](CLAUDE.md) with Player HQ V2 as canonical topology

**Flag touchpoints:**
- **Final use of flag** — monitored canary rollout
- **Final deletion** — all V1 code + flag lib removed by Friday

**Staging demo (Friday):**
- Codebase has NO flag reads for Player HQ
- Master is clean V2 codebase
- Retrospective shared with Dani

**Risks + mitigations:**
1. **Flag flip reveals prod-only bug** → Canary 10% catches it before 100%; instant rollback via env var flip.
2. **Cleanup PR breaks something** → Cleanup runs at end of week AFTER 100% stable; PR reviewed thoroughly; all E2E green.
3. **V1 code accidentally still imported** → grep-based CI check + unit test imports.

---

## 6. Cross-sprint dependencies diagram

```
S1  EP-0 consolidations + infra
      │
      ▼ (C0.2 + C0.3 unblock dot inversion)
      │ (flag lib unblocks V2 gating everywhere)
      │
S2  EP-1 density + A6 post-combat
      │
      ▼ (A1/A4 touch PlayerHqShell → B1 rebases)
      │ (A5 HP inline → C1 rebases for ribbon variant)
      │
S3  EP-2 B1 shell + B3/B4/B5 scaffold
      │
      ▼ (B1 shell + tab stubs unblock B2 composition)
      │
S4  EP-2 B2 wrappers + C-side dot inversion + conc color
      │
      ▼ (V2 shell alive + tab wrappers populated)
      │ (migrations decoupled — S5 Track B)
      │
S5  Ribbon (C1/C2) + AbilityChip (C7) + Migrations D1+E1 + Diário (D2/D4/D5)
      │
      ▼ (ribbon live + Diário functional + migrations deployed to staging)
      │
S6  Combat Auto (C3/C4/C5/C6) + visual baselines + Wave 4 prep (5e validation unit tests)
      │
      ▼ (Gate Fase C green; 5e validation frozen)
      │
S7  Wizard shell + E2/E3/E4/E5 Step 3
      │
      ▼ (wizard alive up through ASI/Feat)
      │
S8  Wizard tail (E5 Step 4 + E6 + E7) + cross-cutting polish
      │
      ▼ (Gate Fase E green; all MVP stories merged)
      │
S9  Dedicated QA (flag ON staging)
      │
      ▼ (QA sign-off + migration deploy runbook)
      │
S10 Flag flip canary → 100% → cleanup PR
      │
      ▼
   V2 shipped, V1 deleted, flag removed
```

**Key dependency arrows:**
- **Wave 0 → Wave 1:** EP-0 C0.1 (HP status) unblocks A5 (HP inline)
- **Wave 1 → Wave 2:** A1/A4 PlayerHqShell edits merge first → B1 rebases
- **Wave 2 → Wave 3:** B1 shell + B2 tab wrappers alive → Ribbon/AbilityChip/Combat Auto can compose
- **Wave 3 migration → Wave 4:** D1+E1 migrations deployed staging S5 → Wave 4 wizard runs against them in S7-S8
- **S6 unit tests → S7 wizard body:** 5e validation helper contract frozen before wizard shell
- **Wave 4 → QA → Flip:** All stories merged S8 → dedicated QA S9 → flag flip S10

---

## 7. Merge-order rulebook

Applies whenever Track A and Track B both open PRs in a sprint. The rules minimize rebase pain on hotspot files.

### Rule 1 — PlayerHqShell exclusive lock
Per [13-epics-waves.md §1](_bmad-output/party-mode-2026-04-22/13-epics-waves.md): only one open PR against [PlayerHqShell.tsx](components/player-hq/PlayerHqShell.tsx) at a time. Order of touches:
- Sprint 2 A1 (density) → merge → Sprint 2 A4 (header) rebases → merge
- Sprint 3 B1 (spine) rebases on A1+A4 → merge
- Sprint 5 C1 (ribbon host) consumes V2 shell without editing PlayerHqShell directly (ribbon renders above/inside V2 content)

### Rule 2 — CharacterCoreStats sequence
- Sprint 2 A2 (accordion kill) → merge
- Sprint 5 C7 (AbilityChip swap) rebases on A2 → merge
- [CharacterAttributeGrid.tsx](components/player-hq/CharacterAttributeGrid.tsx) deletion lands in C7 PR

### Rule 3 — HpDisplay sequence
- Sprint 2 A5 (HP inline) → merge
- Sprint 5 C1 (adds `variant="ribbon"` prop) rebases on A5 → merge (additive prop, no conflict zone)

### Rule 4 — Dot family consolidation first
- Sprint 1 EP-0 C0.3 Dot primitive → merge
- Sprint 4 dot inversion PR delegates via `<Dot inverted>` — no collision because EP-0 froze the contract

### Rule 5 — Migration PR precedes feature code
- Sprint 5 Week 1 Monday: D1+E1 combined migrations PR opens + Winston async-pinged
- Wednesday: migrations merge after review + staging deploy
- Thursday+: D2/D5/E3/E4 feature PRs land against deployed migrations

### Rule 6 — End-of-sprint master sync
Every Friday 16:00 local:
- Both tracks `git fetch origin master && git rebase origin/master`
- Any conflict triage decision → Scrum Master picks merge order
- Staging redeploys from fresh master for Dani's weekend QA

### Rule 7 — Parity gate is per PR, not per sprint
Every PR that touches `/sheet` or combat surfaces runs the combat parity CI gate automatically. Failures block merge. Stories documented as Auth-only in the PR description are exempt (documented reason required per CLAUDE.md).

---

## 8. Per-sprint story map

| Sprint | Track | Story IDs | Est pts | Merge gate | Winston review? | Flag touchpoint? |
|---|---|---|---:|---|:-:|:-:|
| S1 | A | C0.1, C0.4, C0.2, C0.3 | 14 | Existing E2E green; no user change | No | No (internal) |
| S1 | B | Flag lib, CI parity gate, E2E scaffold, recap E2E prep | 12 | Unit + TSC; CI gate wired | No | **Yes** — flag lib created |
| S2 | A | A1, A4, A2, A5 | 9 | Gate Fase A subset (5 P0 specs); Auth-only docs | No | Yes (indirect) |
| S2 | B | A3, A6, Gate Fase A P0 suite | 13 | A6 **strict 3-mode parity**; 7 new P0 specs | No | **Yes** — A6 branches redirectTo by flag |
| S3 | A | B1, B3 | 11 | j21/active-effects/mind-map regression green flag ON+OFF | Optional | **Yes** — primary touchpoint: PlayerHqShell flag branch |
| S3 | B | B4, B5, B6 E2E scaffold, Wave 3 stubs | 13 | Gate Fase B scaffold + a11y | No | Yes (stubs in `v2/`) |
| S4 | A | B2a, B2b, B6 full | 7 | Topology + a11y + visual regression | No | Yes (tab wrappers live) |
| S4 | B | B2c, B2d, C-side dot inversion, C-side conc color, C-side E2E | 14 | **Dot inversion = strict 3-mode parity** | No | Yes (dot inversion flag-gated) |
| S5 | A | C1, C2, C7 (stretch) | 19 | Gate Fase C subset; C7 Auth-only; C1 Anon parity | No | Yes (ribbon in V2 shell) |
| S5 | B | D1+E1 combined migrations, D1 hook, D2, D4, D5, Gate Fase D E2Es | 26 | **D1 RLS negative green**; D1/D2/D4/D5 Auth-only docs | **YES — migrations PR** | Yes (MinhasNotas in V2) |
| S6 | A | C4, C3, C5, C6 E2E | 19 | Gate Fase C green; **C4/C5 strict 3-mode parity**; Resilient Reconnection green | Optional (C4 realtime) | Yes (Combat Auto in V2) |
| S6 | B | Bug bash, visual baselines, a11y sheet, **5e validation unit tests**, wizard E2E scaffold | 16 | axe clean; unit coverage on validation | No | No |
| S7 | A | E4a shell, E4b Steps 1-2, E5 Step 3 | 15 | Wizard walkthrough Auth-only; fallback `✎ Editar` regression | No | Yes (wizard in V2) |
| S7 | B | E2, E3, E2/E3 E2E, visual post-Wave3 refresh | 13 | Ribbon chip realtime <2s | No | Yes (E2 Mestre UI flag-gated) |
| S8 | A | E5 Step 4, E6a, E6b, E6c, Gate Fase E wizard E2Es | 21 | Gate Fase E green; RLS negative; fallback regression | No | Yes (wizard completion) |
| S8 | B | E7, a11y sweep, mobile 390 sweep, bug-bash from S7, E7 E2E | 16 | axe clean; 390px usable; cron verified | No | No |
| S9 | A | Hot-fix stream; perf audit; regression suite | 15 budget | All pre-existing gates stay green | No | No |
| S9 | B | Exploratory QA, visual golden sign-off, tour update, i18n audit, migration runbook | 16 | QA sign-off; migrations ready for prod | Optional | No |
| S10 | A | Prod migration deploy; canary 10% → 50% → 100%; cleanup PR | 13 budget | 48-72h monitor; Sentry clean | **YES — prod migrations** | **Yes — final flag flip + deletion** |
| S10 | B | Docs update; retrospective; cleanup PR review | 10 budget | Cleanup PR green | No | **Yes — deletion PR** |

**Totals:** ~248 story points across 10 sprints across 2 tracks.

---

## 9. Risk register — top 5

| # | Risk | Sprints affected | Impact | Mitigation |
|---|---|---|:-:|---|
| R1 | **EP-5 wizard serialization blocks Track A** in Sprints 7–8 — `choices jsonb` contract cannot be split across steps | S7, S8 | High | 5e validation helpers unit-tested in Sprint 6 Track B before Sprint 7 starts; contract frozen; fallback `✎ Editar` stays alive; secondary flag `NEXT_PUBLIC_LEVELUP_WIZARD` for gradual rollout |
| R2 | **PlayerHqShell triple-touch collision** across A1/A4 (S2), B1 (S3), C1 (S5) | S2, S3, S5 | Med | Merge-order Rule 1 (exclusive lock); waves sequenced explicitly; C1 composes via V2 shell not PlayerHqShell file directly |
| R3 | **Dot inversion breaks combat parity (R1 from reuse matrix)** — visual meaning flip across Guest/Anon/Auth | S4 | High | EP-0 Dot primitive lands S1 with today's behavior preserved; inversion flag-gated S4; strict 3-mode parity E2E in PR |
| R4 | **Realtime quota exceeded (R3 from reuse matrix)** — `useCampaignCombatState` adds subscription | S6 | Med | Hook subscribes to existing `campaign:${id}` channel, NOT a new one; unit test asserts channel count stays at 1; secondary verification in [adversarial-visibility-sleep.spec.ts](e2e/combat/adversarial-visibility-sleep.spec.ts) |
| R5 | **Prod migration deploy fails or RLS bug surfaces** | S5 (staging), S10 (prod) | High | Winston async-reviews migrations PR S5; 4-week staging soak before prod deploy; reversible migrations; D1 RLS negative E2E is P0 gate |

**Secondary risks (monitored, not blocking):**
- CLS >0.1 from Combat Auto reorg (R4 reuse-matrix) — measured in Sprint 6
- Mobile 390 overflow after density changes — swept Sprint 8 Track B
- Flag naming conflict V2 vs V4 — resolved Sprint 1 Day 1
- i18n parity (PT-BR + EN) — audited Sprint 9 Track B

---

## 10. Go/no-go checklist for Sprint 1 kickoff

What Dani must have in place Monday of S1 for agents to start cleanly:

- [ ] **Worktrees created:** `.claude/worktrees/agent-A` and `.claude/worktrees/agent-B` both branching from `master` (HEAD)
- [ ] **Agent A and Agent B dispatch prompts drafted** — one-pager each, pointing to this doc + their Sprint 1 story list
- [ ] **Vercel env var set:** `NEXT_PUBLIC_PLAYER_HQ_V2` = `false` in prod, `true` in staging, `true` in preview (all branches)
- [ ] **Winston heads-up sent:** "Async review needed ~Sprint 5 Week 5 Monday for migrations PR" — give calendar heads-up
- [ ] **CI parity gate review:** Check `.github/workflows/*.yml` or equivalent; confirm Playwright + parity gate can be wired Sprint 1 Track B
- [ ] **Staging seed data:** Confirm staging has a test campaign with a Mestre + 2 players (1 Auth, 1 Anon) + a character per player — otherwise Sprint 5 migration demos break
- [ ] **Flag name decision:** Grep `NEXT_PUBLIC_PLAYER_HQ_V4` in codebase; if any references exist, Sprint 1 Track B task #2 migrates them to `V2`; if zero, Sprint 1 Track B proceeds with `V2` fresh
- [ ] **Dani available for Friday demos:** Block 30min Friday 16:00 for sprint demo + QA feedback
- [ ] **"Not in scope for MVP" list acknowledged:** D3 (backlinks `@` parser), D6/D7/D8/D9 (Biblioteca favoritos + Ctrl+K) are v1.5 per [MVP-CUT.md](_bmad-output/party-mode-2026-04-22/MVP-CUT.md) — agents will **not** build these
- [ ] **Pocket DM presencial rule reinforced:** Agents do not invent VTT-style action UI (per [CLAUDE.md](CLAUDE.md) feedback note); AbilityChip rolls dice + broadcasts, period — no "attack/move/reaction" buttons
- [ ] **Vocabulário Ubíquo locked:** Agents use "Mestre" not "DM" in user-facing copy per [CLAUDE.md](CLAUDE.md); "Herói", "Arsenal", "Diário", "Mapa" are the 4 canonical tab labels

---

## 11. Questions for Dani — ✅ ALL RESOLVED 2026-04-24

Todas as 6 perguntas residuais foram aprovadas nos defaults propostos:

1. **Flag name** — ✅ **V2** (padronizado em 5 docs 2026-04-24; zero V4 no código)
2. **Canary rollout shape in Sprint 10** — ✅ **Gradual 10% → 50% → 100%** sobre Tue/Wed/Thu
3. **Cleanup PR timing** — ✅ **Sprint 10 Friday** (V1 deletion + flag removal)
4. **Sprint 3 B1 Winston review** — ✅ **Opcional async**
5. **Sprint 9 QA intensity** — ✅ **1 semana** (Track A hot-swap pra bug fixes)
6. **Secondary flag `NEXT_PUBLIC_LEVELUP_WIZARD`** — ✅ **Aceitar** pra rollout gradual do wizard

---

**End of sprint plan.** Source of truth for Sprint 1 kickoff and weekly retrospectives. Disputes → escalate to Dani via sprint review Friday demo.
