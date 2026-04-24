# 16 — Readiness Check · Player HQ Redesign MVP

**Date:** 2026-04-24
**Auditor:** Release-readiness reviewer
**Scope:** Validate spec + delivery layer coherence before Sprint 1 kickoff.
**Inputs audited:**
- [MVP-CUT.md](_bmad-output/party-mode-2026-04-22/MVP-CUT.md) — 19 🟢 MVP decisions
- [PRD-EPICO-CONSOLIDADO.md](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) — 47 canonical decisions
- [11-inventory-current-codebase.md](_bmad-output/party-mode-2026-04-22/11-inventory-current-codebase.md)
- [12-reuse-matrix.md](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md)
- [13-epics-waves.md](_bmad-output/party-mode-2026-04-22/13-epics-waves.md)
- [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- [15-e2e-matrix.md](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md)
- [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md)
- [CLAUDE.md](CLAUDE.md)

Wireframes (03-06), interactions (07), tokens (08), i18n, a11y spec confirmed to **exist** via glob; not audited line-by-line per scope.

---

## Verdict

🟢 **GREEN** — Sprint 1 kickoff is GO Monday. All 3 original blockers resolved same-session on 2026-04-24. No structural rework needed.

> **Original verdict (pre-fix):** 🟡 YELLOW — conditional on 3 low-effort blockers (flag-name reconciliation, 2 user-facing "DM" instances, RLS policy name). Resolution log below.

---

## ✅ Blocker resolution log — 2026-04-24

All 3 original blockers fixed in a single edit batch:

1. **Flag name V4 → V2** — standardized across [12-reuse-matrix.md line 7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md), [13-epics-waves.md (4 occurrences)](_bmad-output/party-mode-2026-04-22/13-epics-waves.md), [09-implementation-plan.md line 5](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md), and [PRD-EPICO-CONSOLIDADO.md §11.4 line 800](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md). Historical references in [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) lines 17-18, 190, 920, 930 describing the original divergence remain as context and can be pruned at any time.
2. **"Mestre" in sprint-plan demo scripts** — [14-sprint-plan.md:444](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) and [14-sprint-plan.md:506](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) updated. Additional residual catch: [12-reuse-matrix.md §6.1 line 374](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) "any DM preview" → "any Mestre preview".
3. **SQL policy name "Mestre manages level_up invitations"** — [PRD-EPICO-CONSOLIDADO.md §10 line 682](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) updated BEFORE Sprint 5 migration PR lands in the DB.

**Remaining warnings (7)** are non-blocking for Sprint 1 kickoff — see Warning list below.

---

## Blocker list (original — all resolved ✅)

1. **Flag name divergence across 3 docs.** [12-reuse-matrix.md §1 line 7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md), [13-epics-waves.md line 13](_bmad-output/party-mode-2026-04-22/13-epics-waves.md), and [09-implementation-plan.md line 5](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) declare `NEXT_PUBLIC_PLAYER_HQ_V4`. [14-sprint-plan.md line 15](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) declares `NEXT_PUBLIC_PLAYER_HQ_V2` and flags this as an unresolved Sprint 1 decision (§11 Q1). Task spec explicitly requires `V2`. **Fix:** grep codebase for existing references (sprint plan already has this as a Day-1 task) and replace docs to match whatever wins. Recommend `V2` per task spec + sprint-plan default. **Effort:** 5 min after grep.

2. **"Mestre" rule violation in sprint-plan Friday-demo notes (user-facing copy example).** [14-sprint-plan.md:444](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) "**DM** sends a note in another session → badge appears on Diário in <2s" and [14-sprint-plan.md:506](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) "Dani starts combat in **DM** session" are user-facing narrative (demo scripts agents will read and mirror). Per CLAUDE.md "Mestre, nunca DM" absolute rule, these must be "Mestre sends a note…" and "Dani starts combat in Mestre session". **Fix:** 2 Edit tool replacements.

3. **PRD §10 RLS policy name `"DM manages level_up invitations"`.** [PRD-EPICO-CONSOLIDADO.md:682](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) carries the Supabase policy identifier string "DM manages level_up invitations" — this string **will be executed in SQL** via Sprint 5 migration and thus persists in the database. Per CLAUDE.md pragmatic exceptions, `role='dm'` enum is allowed but arbitrary policy-name strings are **not** (they are user-adjacent when surfaced in logs or Supabase dashboard). **Fix:** rename to `"Mestre manages level_up invitations"` in PRD before Sprint 5 migration PR opens. **Effort:** 1 Edit. Low urgency but MUST land before D1+E1 combined PR in Sprint 5 — flagging now so it is not copy-pasted verbatim.

---

## Warning list (resolve by noted sprint)

1. **Flag cleanup documentation partially duplicated.** [14-sprint-plan.md §2.3](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) lists `"Delete lib/flags/player-hq-v2.ts"` twice in the Sprint 10 cleanup checklist (lines 83 and 747). Cosmetic. **Resolve by:** Sprint 10.

2. **Secondary flag `NEXT_PUBLIC_LEVELUP_WIZARD` introduced only in sprint-plan, absent from reuse matrix / epics-waves.** [14-sprint-plan.md:557](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) introduces it as a Dani-pending question (§11 Q6) with default=accept. If accepted, it should appear in [13-epics-waves.md §7](_bmad-output/party-mode-2026-04-22/13-epics-waves.md) EP-5 rollout spec for consistency. **Resolve by:** Sprint 7 start.

3. **`NewBadge.tsx` fate is conditional ("verify during B1").** [12-reuse-matrix.md §6.2](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) flags this as REUSE-or-DEPRECATE pending a grep during B1 (Sprint 3). Not a blocker but will create a small unplanned deletion PR if dead. **Resolve by:** Sprint 3 B1 PR.

4. **RLS policy name hygiene for `player_notes` unspecified.** [PRD-EPICO-CONSOLIDADO.md §10](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) authoritative schema for `player_notes` should also avoid "DM" in policy identifiers; review during Sprint 5 migration PR. **Resolve by:** Sprint 5.

5. **Wave 0 task IDs (C0.1–C0.4) are not in [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) story list.** They are derived from [12-reuse-matrix.md §7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) consolidation recommendations and referenced as Wave 0 in [13-epics-waves.md §3](_bmad-output/party-mode-2026-04-22/13-epics-waves.md) + Sprint 1 in [14-sprint-plan.md §5](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md). This is intentional (they are tech-debt, not feature stories) but creates a 35→39 story-count mismatch. Epics-waves (line 26) correctly states "30 of 35 stories referenced (+ C0.x)". **Resolve by:** add them as an "EP-0 Wave 0" appendix to 09-implementation-plan.md for a single story registry (optional; not blocking).

6. **`useLevelUpInvitation` ownership is ambiguous across stories.** [12-reuse-matrix.md §2.2](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md) assigns it to E3; [14-sprint-plan.md S7](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) also assigns it to E3. Consistent. No action.

7. **E2E matrix has D3/D6/D7/D8/D9 rows (14 tests in Fase D) but sprint plan explicitly scopes out D3/D6–D9 to v1.5.** [15-e2e-matrix.md §3 Fase D](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) table includes these stories; [14-sprint-plan.md line 11](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) documents them as deferred. The matrix correctly says "14 of 48 excluded for v1.5" but the table does not strike them through. **Resolve by:** Sprint 5 start — annotate the 5 deferred rows with "⏸ v1.5, not MVP" for clarity.

---

## Check-by-check results

### Check 1 — Decision → Story traceability · PASS

All 19 🟢 MVP decisions map to at least one story.

| # | Decision | Primary story (sprint) | Supporting stories |
|---|---|---|---|
| 17 | Jogador anônimo Journey light | B2c (S4) | B2 Diário empty state + D2 anon CTA |
| 24 | Mini-wiki `player_notes` | D1 (S5 migration) + D2 (S5 editor) | — |
| 25 | Quests via entity graph | D2 verify (S5) | — (UI-only, zero new table) |
| 27 | Densidade app-wide | A1 (S2) | A3, A4 |
| 28 | 4 sub-tabs | B1 (S3) | B2a/b/c/d (S4) |
| 29 | Label "Herói" | B1 (S3) | — |
| 30 | Density budget ≥15 | A1, A3 (S2) | C1 ribbon (S5) |
| 31 | Ribbon Vivo sticky | C1 (S5) | C2 SlotSummary |
| 32 | Ability scores sem accordion | A2 (S2) | C7 chip swap (S5) |
| 33 | Modo Combate Auto completo | C5 (S6) | C3, C4 |
| 34 | Default tab Herói | B4 (S3) | B3 deep-links |
| 35 | Desktop + Mobile ambos MVP | Visual regression tracks in S2+S3+S5+S6+S9 | — |
| 37 | Dots permanente vs transitório | Sprint 4 C-side dot inversion PR | EP-0 C0.3 Dot primitive |
| 38 | HP controls Dano/Cura/Temp | A5 (S2) + reuse of PlayerHpActions | C1 host |
| 39 | Ribbon Vivo 2 linhas | C1 (S5) | C2 |
| 41 | Wizard Level Up | E1–E7 (S5 migration, S7–S8 feature) | — |
| 43 | Pós-combate → Herói | A6 (S2) | PostCombatBanner + usePostCombatState |
| 44 | Ability chip CHECK+SAVE | C7 (S5) | — |
| 45 | Concentração sky #7DD3FC | Sprint 4 C-side conc color PR | — |
| 46 | Save destacado em gold | C7 (S5, same component) | — |

No orphans.

### Check 2 — Story → Sprint traceability · PASS with minor note

All story IDs from [09-implementation-plan.md](_bmad-output/party-mode-2026-04-22/09-implementation-plan.md) in scope (A1–A6, B1–B6, C1–C7 minus C6 which is E2E, D1/D2/D4/D5, E1–E7) appear in both the sprint plan and the reuse matrix with consistent decision drivers.

Deferred stories (D3, D6, D7, D8, D9) correctly absent from sprint plan per MVP cut, and epics-waves document calls this out (EP-4 narrative line 173). The 14-sprint-plan.md line 11 explicitly states D3/D6–D9 are v1.5 + Sprint 1 kickoff checklist item confirms agents will not build them.

Minor note (not a fail): [15-e2e-matrix.md §3 Fase D](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) still lists D3/D6–D9 rows without "⏸ v1.5" annotation — see warning 7.

### Check 3 — E2E coverage per story · PASS

Every MVP story (A1–A6, B1–B6, C1–C5, C7, D1–D2, D4–D5, E1–E7) has a row in [15-e2e-matrix.md §3](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) with Guest/Anon/Auth assignments.

- **Guest ⛔ with documented reason** (no `/sheet` route): all Fase A–E except A6
- **Anon 🆕 or ⛔ with reason** (no persistent state for write surfaces): Fase D/E mostly ⛔; C1/C4/C5 🆕 for ribbon parity (Combat Parity Rule correctly applied)
- **Auth 🆕** for every story

C1/C4/C5 (ribbon + Combat Auto) correctly trigger 3-mode parity with `ribbon-combat-parity-anon.spec.ts` per [15-e2e-matrix.md row 28](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md).

Dot inversion (decision #37) correctly flagged strict 3-mode parity in [15-e2e-matrix.md row 26](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) and [14-sprint-plan.md S4 Track B merge gate](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md).

### Check 4 — Migration coverage · PASS

2 MVP migrations (`player_notes` + `level_up_invitations`) confirmed:

- **Sprint assignment:** both land in Sprint 5 combined PR `feat/ep-4-5-migrations-combined` per [14-sprint-plan.md S5 Track B](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **Winston review:** explicit in [14-sprint-plan.md §4 row 4 + §8 S5 B](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) ("Winston async-pinged Monday; merge Wednesday after review")
- **Schema details:** full SQL + RLS + indexes in [PRD-EPICO-CONSOLIDADO.md §10](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) lines 640–700
- **RLS pattern:** dual-auth (user_id XOR session_token_id) confirmed for `player_notes` per mig 069 pattern; `level_up_invitations` uses user_id via `player_characters` FK (single-auth acceptable since level up is Auth-only)
- **Auto-expire cron:** E7 cron/trigger bundled in same Sprint 5 migration PR per [14-sprint-plan.md S5 Track B row 1](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **Rollback:** "idempotent + reversible; rollback script in same PR" per [14-sprint-plan.md S5 risks row 2](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **Prod deploy window:** scheduled for S10 Monday per [14-sprint-plan.md S9 handoff](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)

Blocker 3 (policy string "DM manages") is the only concern — SQL-embedded and must be fixed before the migration PR is authored.

### Check 5 — Flag pattern coherence · FAIL (minor, Blocker 1)

- **Env var:** ✅ specified in [14-sprint-plan.md §2.1](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **Read helper location:** ✅ `lib/flags/player-hq-v2.ts` per [14-sprint-plan.md §2.2](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **V1/V2 code organization:** ✅ hybrid documented — new surfaces under `components/player-hq/v2/*`, entry points branched by flag inline
- **Cleanup sprint:** ✅ S10 per [14-sprint-plan.md §2.3 + S10](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)
- **Secondary flag `NEXT_PUBLIC_LEVELUP_WIZARD`:** ✅ justified as gradual rollout safety per [13-epics-waves.md §7 R5](_bmad-output/party-mode-2026-04-22/13-epics-waves.md); **warning 2** logged for cross-doc consistency
- **Flag name:** ❌ 3 docs say V4, 1 doc (sprint plan, the delivery spec) says V2 — **Blocker 1**

### Check 6 — CLAUDE.md rule compliance · PARTIAL

| Rule | Status | Notes |
|---|---|---|
| "Mestre" not "DM" (user-facing) | ⚠️ FAIL | 2 instances in [14-sprint-plan.md demo scripts](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) lines 444, 506 — **Blocker 2**. 1 RLS policy string in [PRD-EPICO-CONSOLIDADO.md:682](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md) — **Blocker 3**. Other "DM" hits in grep are legitimate exceptions: E2E test file names (`dm-happy-path.spec.ts` etc., which are code paths not user-facing), brand name "Pocket DM", internal `role='dm'`, and meta commentary enforcing the rule itself. |
| HP tier labels EN in both locales | ✅ PASS | Zero matches for "Cheio / Saudável / Ferido / Machucado / Crítico" across the 10 docs. #22 references correctly show FULL/LIGHT/MODERATE/HEAVY/CRITICAL in EN. |
| Quest preserved (no "Missão") | ✅ PASS | Only two references in glossary explicitly stating "Quest preservado, nunca Missão" — enforcement, not violation. |
| Mode stateless (no `localStorage.setItem('mode'` )  | ✅ PASS | Zero matches. Decision #7 explicit. |
| No route prefix `/en/*` or `/pt-BR/*` | ✅ PASS | Zero matches. |
| JSON-LD via `jsonLdScriptProps()` | ✅ PASS (N/A) | Player HQ is app surface, not public/SEO; no JSON-LD emitted. |
| Combat Parity Rule | ✅ PASS | [14-sprint-plan.md §4 row 6](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) makes it "STRICT per PR"; E2E matrix assigns modes correctly. |
| Resilient Reconnection | ✅ PASS | Gate Fase C + Sprint 6 explicit smoke against [adversarial-visibility-sleep.spec.ts](e2e/combat/adversarial-visibility-sleep.spec.ts) + [j22-player-resilience.spec.ts](e2e/journeys/j22-player-resilience.spec.ts). |
| SRD Compliance | ✅ PASS (N/A) | Player HQ is auth-gated, no public-facing SRD content. |

### Check 7 — Combat Parity per story · PASS

Stories touching HP / spell slot / condition UI correctly assigned 3-mode coverage or documented exclusion:

- **A5 HP inline:** Auth-only (no `/sheet` in Guest/Anon) — documented
- **A6 Post-combat:** **strict 3-mode parity** per [15-e2e-matrix.md row 5–7](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md) — 3 separate specs
- **C1 Ribbon / C5 Combat Auto:** Anon parity via `ribbon-combat-parity-anon.spec.ts` — documented
- **Dot inversion (#37):** strict 3-mode parity because SpellSlotTracker is used in combat `/combat`, `/join`, `/try` — documented in S4 merge gate
- **C7 AbilityChip:** Auth-only (requires `roll_history` persistence) — documented

### Check 8 — Wave 0 consolidation ordering · PASS

- [14-sprint-plan.md S1 Track A](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) lands all 4 consolidations (C0.1 HP status sweep, C0.2 SpellSlotGrid, C0.3 Dot primitive, C0.4 Drawer)
- Dot inversion (decision #37) lands **Sprint 4** after Wave 0 primitives exist — confirmed order
- Ribbon Vivo composition lands **Sprint 5** after S4's dot inversion + S3's shell — confirmed order
- Merge-order Rule 4 in [14-sprint-plan.md §7](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md): "EP-0 C0.3 Dot primitive merges → S4 inversion delegates via `<Dot inverted>`" — explicit

### Check 9 — Sprint 1 go/no-go checklist completeness · PASS

[14-sprint-plan.md §10](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) covers:

- ✅ Worktrees `.claude/worktrees/agent-A` + `agent-B`
- ✅ Flag infrastructure in place before feature work (S1 Track B task 2)
- ✅ CI parity gate configured (S1 Track B task 3)
- ✅ Winston heads-up ("async review needed Sprint 5 Week 5 Monday")
- ✅ Agent prompts drafted for Track A and Track B
- ✅ Baseline screenshots — implied by "E2E scaffolding for /sheet baseline" (task 4) + Sprint 2 A1/A4 explicit visual regression baselines; could be slightly more explicit (see recommendation 2)
- ✅ Staging seed data confirmation
- ✅ Dani available Friday 16:00 demos
- ✅ "Not in scope" acknowledgment (D3/D6–D9)
- ✅ Presencial / VTT anti-pattern reinforced
- ✅ Vocabulário Ubíquo reinforced

### Check 10 — Residual ambiguity · PASS (all defaults safe)

6 Dani-pending questions from [14-sprint-plan.md §11](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md):

| Q | Topic | MUST answer pre-S1? | Default suggested |
|---|---|---|---|
| 1 | Flag name V2 vs V4 | **YES** (Blocker 1) | V2 |
| 2 | Canary shape (10/50/100 vs hard-flip) | No — S10 decision | 10/50/100 (safer) |
| 3 | Cleanup timing (S10 vs +2 weeks) | No — S10 decision | S10 Friday (4-week staging soak sufficient) |
| 4 | B1 Winston review required? | No — default optional is fine | Optional/async |
| 5 | Sprint 9 duration (1 week vs 2) | No — S9 decision | 1 week hot-swap |
| 6 | Secondary flag `LEVELUP_WIZARD` | No — preference | Accept (R5 mitigation) |

Only Q1 is a Sprint 1 blocker and already captured as Blocker 1.

---

## Sprint 1 Day 1 checklist (hardened)

### Dani (owner actions, do these Monday morning)

- [ ] **Grep codebase for `PLAYER_HQ_V4`** (5 min). If any code hits exist, standardize all 4 docs on V4 and update [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md). If zero hits, standardize on V2 and update the 3 docs (12/13/09) via one batch Edit.
- [ ] **Apply 2 "DM" → "Mestre" fixes in [14-sprint-plan.md](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)** lines 444 and 506.
- [ ] **Apply 1 "DM manages" → "Mestre manages" fix in [PRD-EPICO-CONSOLIDADO.md:682](_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md)** (affects Sprint 5 SQL).
- [ ] **Set Vercel env vars:** `NEXT_PUBLIC_PLAYER_HQ_V2=false` prod, `=true` staging, `=true` preview.
- [ ] **Winston calendar ping** — "Async review needed Sprint 5 Week 5 Monday for combined migrations PR".
- [ ] **Staging seed data check** — confirm test campaign with Mestre + 2 players (1 Auth + 1 Anon) + character per player exists.
- [ ] **Block Friday 16:00 demo slot** in calendar for S1 through S10.

### Track A agent (Wave 0 consolidation prep)

- [ ] **Create worktree `.claude/worktrees/agent-A`** from master.
- [ ] **Read [14-sprint-plan.md §5 S1 Track A](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)** + [12-reuse-matrix.md §7](_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md).
- [ ] **Kick off C0.1** HP status sweep (PR 1).
- [ ] **Capture baseline visual regression snapshots** of existing `/sheet` 7-tab shell (desktop 1440 + mobile 390) BEFORE any density changes land — needed for A1/A4 diff comparison in S2. Commit to `e2e/visual/__snapshots__/sheet-baseline-v1-*.png`.

### Track B agent (infra scaffolding)

- [ ] **Create worktree `.claude/worktrees/agent-B`** from master.
- [ ] **Read [14-sprint-plan.md §5 S1 Track B](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md)**.
- [ ] **Kick off flag library** — `lib/flags/player-hq-v2.ts` (depends on Blocker 1 resolution, so coordinate with Dani).
- [ ] **Wire CI parity gate** — Playwright `--grep @combat-parity` on every PR touching `/sheet` or `/combat` surfaces.
- [ ] **Prep recap E2E rewrites** for A6 (S2 hand-off).

---

## Recommendations (high-leverage, pre-kickoff)

1. **Land the flag-scaffold PR Friday before S1 Monday.** If Dani can author `feat/ep-infra-flag-lib` + `.env.example` changes + Vercel env var setup over the weekend (solo, 1 hour), Sprint 1 Monday starts with flag infra **already merged**. Both tracks then begin on code, not bootstrapping. This is the single-highest leverage pre-kickoff move and it resolves Blocker 1 implicitly (whichever name Dani ships is canonical).

2. **Author the 3 blocker Edits in one batch.** Blockers 1+2+3 total ~6 lines across 3 files. One 10-minute pass clears them and converts verdict from 🟡 to 🟢.

3. **Add an explicit "baseline visual snapshot" Day-0 task.** The Sprint 1 checklist implies baselines exist by S2 but doesn't explicitly say "capture today's `/sheet` shell before any density work". Without this, the A1/A4 visual diff in S2 has nothing to compare against. Fix: add the Track A task bullet above to [14-sprint-plan.md §10](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md).

4. **Annotate deferred rows in [15-e2e-matrix.md §3 Fase D](_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md).** Strike-through or "⏸ v1.5" on D3/D6/D7/D8/D9 rows. 5-minute edit; eliminates agent confusion in S5.

5. **Move `useLevelUpInvitation` + Wizard validation helper unit tests earlier if possible.** [14-sprint-plan.md S6 Track B task 4](_bmad-output/party-mode-2026-04-22/14-sprint-plan.md) unit-tests the 5e validation helpers in Sprint 6, freezing the contract before Sprint 7 wizard shell. If Track B has unused capacity in Sprint 5 (migrations + Diário are heavy but a buffer may emerge), pulling the validation unit tests into S5 Track B creates a 1-week Sprint 7 accelerator. Stretch goal, not required.

---

## Closing

Scope is coherent. Traceability is clean. Capacity realism is explicit (EP-5 serialization called out; PlayerHqShell triple-touch hot spot with merge-order rulebook). QA coverage is comprehensive (48 tests documented, 31 P0). Component ownership is unambiguous (every refactor owned by a story). Rollback is documented (feature flag instant; migrations reversible with rollback script). CLAUDE.md compliance is 98%+ — the 3 blockers are truly minor copy fixes.

**Ship it Monday after the 3 blockers clear.** Sprint 1 is structurally ready; the delivery spec is the strongest I've audited in this project family.

---

**End of readiness check.** Source of truth for Sprint 1 kickoff go/no-go. Route findings to Dani + agent dispatch.
