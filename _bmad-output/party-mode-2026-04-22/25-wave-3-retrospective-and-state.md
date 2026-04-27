# Wave 3 Retrospective + State Snapshot

**Closed:** 2026-04-27 (mid-day session)
**Sessions:** 1 main + 11 background agents (1 sub-zero impl + 3 wave-track impls + 4 adversarial reviews + 1 BMAD party-mode + 2 cleanup)
**Master HEAD at start:** `0824b967` (after #81 Wave 3 kickoff prompt merge)
**Master HEAD at end:** `95fe8d22` (Wave 3a merge — last of 4 wave PRs)
**Net delta:** +4 squashed feature commits · ~10500 LOC across 64 changed files · 1 migration applied (187)

---

## 1. TL;DR

Wave 3 delivered the 3 sub-waves planned in [13-epics-waves.md §5 Wave 3](13-epics-waves.md), plus an unplanned **Sub-zero PR** that was added at runtime when discovery showed two PRD chores (decision #37 dot inversion + decision #45 concentration token) had been left undone by Sprint 4 of the original plan.

| Track | PR | Commit (squash) | Scope | Issue followup |
|---|---|---|---|---|
| Sub-zero | [#83](https://github.com/danielroscoe-97/projeto-rpg/pull/83) | `57d99f4d` | Dot inversion (PRD #37, V2-flag-gated) + `--concentration` token (PRD #45) + 2 P0 Gate C specs | [#84](https://github.com/danielroscoe-97/projeto-rpg/issues/84) |
| Wave 3b | [#85](https://github.com/danielroscoe-97/projeto-rpg/pull/85) | `4b58701` | AbilityChip CHK/SAVE rolls + dice-roller + useAbilityRoll + RollResultToast + 39 unit tests + 3 E2E specs | [#88](https://github.com/danielroscoe-97/projeto-rpg/issues/88) |
| Wave 3c | [#87](https://github.com/danielroscoe-97/projeto-rpg/pull/87) | `dc53098b` | Migration 187 `player_notes` (applied) + useMinhasNotas + MarkdownEditor + MinhasNotas + cross-nav + usePlayerNotifications + 5 E2E specs | [#89](https://github.com/danielroscoe-97/projeto-rpg/issues/89) |
| Wave 3a | [#86](https://github.com/danielroscoe-97/projeto-rpg/pull/86) | `95fe8d22` | RibbonVivo + SlotSummary + 2-col HeroiTab + useCampaignCombatState + CombatBanner + A6 PostCombatBanner mount + 4 E2E specs | [#90](https://github.com/danielroscoe-97/projeto-rpg/issues/90) |

**Process discipline maintained:**
- Adversarial 3-reviewer review on every PR (Blind Hunter + Edge Case Hunter + Acceptance Auditor consolidated in 1 agent prompt, ~500-800 words)
- Inline P0+P1 fixes when review caught issues (Wave 3a — see §4)
- Migration 187 applied via `supabase db push --linked` BEFORE merging the parent PR (regra absoluta respected)
- Follow-up issues (#84, #88, #89, #90) created for every unresolved finding so nothing got dropped silently
- All 4 worktrees cleaned + branches deleted local + remote at end

**V2 flag still OFF in production** — `NEXT_PUBLIC_PLAYER_HQ_V2=false` em Production, `true` em Preview/Dev/Staging. Flag flip plan unchanged: Sprint 10.

---

## 2. State of master at end of Wave 3

```
95fe8d22  feat(grimório): Wave 3a — Ribbon Vivo + Modo Combate Auto + A6 mount (#86)
dc53098b  feat(grimório): Wave 3c — Diário mini-wiki + migration 187 (PRD #24) (#87)
4b587018  feat(grimório): Wave 3b — AbilityChip Roller (PRD #44, #46) (#85)
57d99f4d  feat(grimório): Wave 3 Sub-zero — dot inversion (#37) + concentration token (#45) (#83)
6321346d  docs(grimório): progress snapshot + remaining roadmap (Sprint 9 + 10 detail) (#82)
0824b967  docs(grimório): Wave 3 kickoff prompt (Ribbon + Combat Auto + AbilityChip + Diário) (#81)
```

**DB state:** Supabase `mdcmjpcjkqgyxvhweoqs` — migrations 001-187 applied. `player_notes` table exists with 8 RLS policies (4 auth + 4 anon dual-auth via session_token EXISTS clause).

**Vercel envs:** unchanged (`NEXT_PUBLIC_PLAYER_HQ_V2=true` Preview/Dev, `false` Prod).

**Open PRs:** 0.

**Open issues created this session:** 4 (#84, #88, #89, #90).

---

## 3. Per-PR delivery detail

### 3.1 Sub-zero — PR #83 (3 commits, +676 / -27, 12 files)

**Why this PR existed at all:** Original plan had Sprint 4 "C-side chores" doing dot inversion + concentration color swap. Pre-flight discovery showed neither had landed:
- `components/player-hq/ResourceDots.tsx:82` still carried "Legacy semantic: pre-inversion mapping" comment with the unflipped formula
- `app/globals.css` had `--warning` but no `--concentration` (only `PostCombatBanner.tsx` had `var(--concentration, #7DD3FC)` as inline fallback)
- However EP-0 C0.2 (`<SpellSlotGrid>`) and C0.3 (`<Dot>`) **had** been delivered — just located at `components/ui/` not the originally-planned `components/shared/`. This was discovered after the kickoff prompt was already drafted.

BMAD party-mode (Winston + Amelia + Quinn + John) deliberated this and recommended folding the residual chores into a single Sub-zero PR before opening Wave 3a/3b/3c — so AbilityChip and SlotSummary could consume the canonical primitives without ad-hoc reimplementation. See `_bmad-output/party-mode-2026-04-22/` history for the deliberation transcript.

**What landed:**
- `inverted?: boolean` prop on `components/ui/SpellSlotGrid.tsx` (default false = bit-identical legacy)
- Three callers (`ResourceDots.tsx`, `SpellSlotsHq.tsx`, `SpellSlotTracker.tsx`) gated by `isPlayerHqV2Enabled()`. SpellSlotTracker uses an index mirror (`max - 1 - i`) when V2 ON to preserve the legacy `PlayerJoinClient.handleToggleSlot` contract — adversarial review walked 8 boundary cases and confirmed the mirror is mathematically correct.
- `--concentration: 197 92% 74%` (sky #7DD3FC) + `--concentration-foreground` in `app/globals.css`
- Tailwind `concentration: 'hsl(var(--concentration))'` extension in `tailwind.config.ts`
- Class swap amber→concentration on the 3 concentration-specific badges only (`ActiveEffectCard.tsx`, `SpellCard.tsx`, `ActiveEffectsBadges.tsx`); non-concentration amber usages preserved
- `e2e/features/spell-slot-dots-inverted.spec.ts` (Auth + Anon scope)
- `e2e/features/concentration-badge-sky.spec.ts` (computed style ≈ rgb(125,211,252) + class allowlist + negative control)

**Adversarial review:** APPROVE_WITH_FOLLOWUP. Production code sound; selector bug in 2 new specs caused silent `test.skip()` (issue #84 P1-1) — does not block merge because V2 flag is OFF in prod (zero blast radius).

**Heads-up worth flagging:**
- Worktree contained 4 unrelated `lib/realtime/{broadcast,broadcast.test,sanitize}.ts` + `lib/types/realtime.ts` modifications (an F03 `player:sos_resync_requested` feature) that the agent correctly did NOT commit. Saved to `.claude/worktree-cleanup-2026-04-27/wave-3-sub-zero-leftover-realtime-f03.patch` (94 lines).

---

### 3.2 Wave 3b — PR #85 (8 commits, +2356 / -15, 12 files)

**Owner story:** C7 AbilityChip rolável (PRD decisão #44 + #46).

**What landed:**
- `lib/utils/dice-roller.ts` — UI wrappers (`rollAbilityCheck`, `rollAbilitySave`, `rollD20WithMod`) over the existing `lib/utils/dice.ts` engine. 13 unit tests.
- `lib/hooks/useAbilityRoll.ts` — orchestrates roll → 24h sessionStorage history (FIFO `slice(-50)`, cap 50) → fire-and-forget broadcast on `campaign:{id}` channel using the same one-shot pattern as `lib/supabase/player-identity.ts:749`. Broadcast payload kept outside the strict `RealtimeEvent` typed union (zero risk to combat surface). 10 unit tests.
- `components/player-hq/v2/RollResultToast.tsx` — sonner-based toast with gold dice icon + formula breakdown
- `components/player-hq/v2/AbilityChip.tsx` — 2-zone (CHK + SAVE) interactive chip with long-press advantage menu, keyboard activation with Shift/Alt modifiers, ≥44px touch targets (WCAG SC 2.5.5). 16 unit tests.
- `components/player-hq/CharacterCoreStats.tsx` — branches on `isPlayerHqV2Enabled()`; V1 markup preserved untouched for flag-OFF environments.
- `components/player-hq/v2/HeroiTab.tsx` — passes new `proficiencies + level + campaign/character context` props through.
- 3 Playwright specs in `e2e/features/ability-chip-*` covering Gate Fase C rows 23-25 of [15-e2e-matrix.md](15-e2e-matrix.md).

**Adversarial review:** APPROVE_WITH_FOLLOWUP. Fórmulas D&D corretas (advantage 2d20kh1, disadvantage 2d20kl1, save+PB se prof, modifier negativo formato `- 1` correto), Combat Parity intent declared (`<!-- parity-intent guest:n/a anon:n/a auth:full -->`), 8-case boundary walks all clean.

**Issues flagged in #88 (none P0):**
- P1-1: Toast labels stay in EN on PT-BR locale (i18n gap; `DEFAULT_ROLL_TOAST_LABELS` not localized)
- P1-2: Advantage menu renders OVERLAPPING the CHK/SAVE buttons (5 LOC fix: change `mt-1` to `top-full mt-1`)
- P2-1: Doesn't reuse Sub-zero `<Dot>` primitive (hand-rolls 1.5×1.5 span, size not in `DotSize` enum)
- P2-3: Testid divergence V1↔V2 for INT and CHA (`ability-chip-int_score` vs `ability-chip-int`)
- P2-4: aria-label English-only ("Roll STR check, modifier +2")
- **Spec gap**: "+manual modifier" menu option NOT delivered (kickoff explicit "Long-press → menu Advantage/Disadvantage/+manual modifier"; agent shipped Advantage/Disadvantage/Normal only)

**Decision deferred:** `roll_history` table — out of scope per kickoff (sessionStorage only).
**Decision preserved:** `CharacterAttributeGrid.tsx` kept (`CharacterEditSheet.tsx` still consumes it as read-only modifier preview). Not a deletion candidate yet.

---

### 3.3 Wave 3c — PR #87 (8 commits, +2509 / -29, 21 files) + migration 187

**Owner stories:** D1 + D2 + D4 + D5 + Diário plumbing.

**Migration 187 deployment record:**
1. File created in worktree 3c by agent (idempotent via `CREATE TABLE IF NOT EXISTS` + `DROP POLICY IF EXISTS … CREATE POLICY` × 8)
2. **Applied via main worktree** (the worktree 3c was not Supabase-linked — `Cannot find project ref` error). Workflow:
   - `cp .claude/worktrees/wave-3-track-3c/supabase/migrations/187_player_notes.sql supabase/migrations/`
   - `supabase migration list --linked` → confirmed 187 pending
   - `supabase db push --linked --dry-run` → preview clean
   - `supabase db push --linked` → applied (8 NOTICEs from `DROP POLICY IF EXISTS` no-ops on first apply, expected)
   - `supabase migration list --linked` → confirmed 187 applied (Local=187, Remote=187)
   - `rm supabase/migrations/187_player_notes.sql` (deleted from main pre-merge to avoid pull conflict)
3. PR #87 merged via squash → file came back via the squash commit.

**Schema highlights:**
- `player_notes` columns: `id, user_id, session_token_id, campaign_id, title, content_md, tags text[], created_at, updated_at`
- XOR constraint: `((user_id IS NULL) <> (session_token_id IS NULL))`
- GIN index on `tags`
- 8 RLS policies (4 auth + 4 anon) using `auth.uid()` for both paths (NOT `request.jwt.claims` — the kickoff prompt's example, which doesn't match this codebase's pattern; agent verified against migrations 069 + 142 and adopted the correct pattern)

**What else landed:**
- `lib/hooks/useMinhasNotas.ts` — CRUD hook with optimistic updates + 30s debounce + `flushPendingSync` on `beforeunload`. 8 unit tests.
- `components/ui/MarkdownEditor.tsx` + `components/ui/markdown-editor-utils.ts` — textarea + preview MVP. `applyWrap` extracted to a separate util so jest can test it without dragging in `react-markdown` (ESM-only fights ts-jest CJS pipeline). 6 unit tests.
- `components/player-hq/v2/diario/MinhasNotas.tsx` — list cards + search + tag filter + inline editor. Mounted in `DiarioTab.tsx` (replaced the Sprint 3 placeholder).
- D4: `NpcCard.tsx` "Ver no Mapa" link + `PlayerNpcDrawer.tsx` "Ver no Diário" link + `PlayerHqShellV2.tsx` + `DiarioTab.tsx` + `PlayerMindMap.tsx` reactive URL listeners (URLs unconditionally shareable)
- D5: `lib/hooks/usePlayerNotifications.ts` + 3 new realtime event types (`note:received`, `quest:assigned`, `quest:updated`) added to `RealtimeEventType` and `SanitizedEvent` unions; sanitize.ts pass-through audited safe (no PII leak). Badge wired into Diário tab.
- 5 E2E specs in `e2e/features/{player-notes-crud,player-notes-rls-negative,player-notes-auto-save,diario-mapa-crossnav,dm-notes-inbox-realtime}.spec.ts`

**Adversarial review:** APPROVE_WITH_FOLLOWUP **after migration applied**. No P0. RLS pattern correct, XOR walks clean, sanitize.ts pass-through safe.

**Issues flagged in #89:**
- P1-1: Anon entrypoint para Diário não existe na arquitetura atual — `app/app/(with-sidebar)/campaigns/[id]/sheet/page.tsx:53` força `redirect('/auth/login')` quando `!user`. The "anon player full CRUD" promised in PR description is dead code today. Not a bug, but overstatement.
- P1-2: Anon hook side-effect — `useMinhasNotas.ts:160-174` does `.or(\`anon_user_id.eq.${uid},user_id.eq.${uid}\`)`; pattern is fragile. Mitigation: prefer `.in()` chained.
- P1-3: D4 NPC name-keyed URL ambiguous — `PlayerMindMap.tsx:144-161` picks first match if 2 NPCs share a name; rename breaks old URL silently.
- P1-4: UPDATE on `player_notes` with `user_id NULL→X` blocked by XOR (correct behavior, but no explicit test fixture).
- P2: PlayerHqShellV2 race with initial paint, notifications dedup, persist cross-tab/reload, MarkdownEditor sanitize comment (defensive — react-markdown v10 is XSS-safe by default but adding rehype-raw without rehype-sanitize would be a hole).

**Pattern observation:** Wave 3c agent **deviated from kickoff prompt** when discovering the codebase pattern was different (`auth.uid()` vs `request.jwt.claims`). Verified against migrations 069 + 142, found the correct pattern, implemented it, and documented the deviation. This is the right behavior — the kickoff was a guide, not gospel.

---

### 3.4 Wave 3a — PR #86 (10 commits + 1 fix commit + 1 merge commit, +2092 / -126 → +2109 / -134, 15 files at first push, 24 files after merge resolution)

**Owner stories:** C1 + C2 + C3 + C4 + C5 + A6.

**Most architecturally complex of the four PRs.** Required 1 merge resolution and 1 inline P0 fix during cleanup.

**What landed (10 commits):**
1. `HpDisplay` `variant="ribbon"` + `pulseOnChange` + `CharacterStatusPanel` `showHp`/`showConditions` opt-out flags
2. `<SlotSummary />` ribbon subcomponent (read-only, hidden for non-casters, reuses Sub-zero `<SpellSlotGrid density="compact">`)
3. `<RibbonVivo />` sticky 2-line composite + `player_hq.combat_auto` i18n namespace
4. `HeroiTab` 2-col CSS Grid (`xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`) + RibbonVivo mount
5. `useCampaignCombatState` hook (campaign-channel realtime + 30s/10s polling fallback)
6. `lib/realtime/campaign-combat-broadcast.ts` + emit `combat:started/ended/turn_advance` from `CombatSessionClient.tsx`
7. `<CombatBanner />` + HeroiTab combat-auto reorg (Pericias accordion + Quick-Note FAB)
8. A6 PostCombatBanner mount + client-side snapshot bridge
9. 4 E2E specs (Gate Fase C: ribbon-vivo-sticky, two-col-desktop, player-hq-combat-auto, ribbon-combat-parity-anon)
10. Final TS/lint cleanup

**Architectural decisions encoded in commits:**
- **Campaign-channel reuse** (200-channel cap memory + 2026-04-24 CDC postmortem): `useCampaignCombatState` subscribes to `campaign:${id}` consolidated channel, NEVER creates `combat:${id}` per-feature channel. Same for the broadcast emit.
- **Per-player snapshot built CLIENT-SIDE, NOT from broadcast** (privacy): When `combat:ended` arrives, HeroiTab builds the snapshot from its own `useCharacterStatus` ref. The Mestre never ships per-player HP/slots in the broadcast — that would leak between party members.
- **Stable refs** for `onCombatEnded` closure to avoid re-subscribe storms (channel teardown + recreate would burn the 200-channel cap on every render).
- **Best-effort transient broadcast** channels (sub/send/unsub <200ms) per Mestre lifecycle event — receivers maintain persistent subscription.
- **`combat:turn_advance` mirror is best-effort live** (not journal-replayed) — `useCampaignCombatState` polling fallback (30s threshold + 10s interval) covers gaps.

**Adversarial review:** **REQUEST_CHANGES** initially. P0 + P1 found:
- **P0-1 (BLOCKING)**: `useCampaignCombatState.ts:201` had `if (payload.snapshot && onCombatEndedRef.current)` — gated on `payload.snapshot` truthiness, but `CombatSessionClient` broadcast `combat:ended` WITHOUT snapshot (per the privacy decision above). Result: callback never fired → `recordCombatEnded` never persisted snapshot → **PostCombatBanner mount existed but was dead code**. A6 was end-to-end broken despite the wire being present.
- **P1-1**: `SlotSummary.tsx` did NOT pass `inverted={isPlayerHqV2Enabled()}` to `<SpellSlotGrid>` — while `SpellSlotsHq.tsx` (Coluna B) did. With V2 flag ON, the same caster's slot row would render filled-as-available in the ribbon and filled-as-consumed in the panel — opposite semantics for the same data.

**Inline fixes applied (commit pushed to feat/wave-3-ribbon-combat-auto):**
- Removed `payload.snapshot &&` gate. Callback always fires; HeroiTab builds snapshot client-side regardless of payload.
- `SlotSummary.tsx`: imported `isPlayerHqV2Enabled`, added `inverted={inverted}` prop to `<SpellSlotGrid>`, ariaLabel flips wording ("X of Y consumed" vs "X of Y available") so screen readers stay coherent.

**Type error caught only at Vercel build (deploy commit `6abe038`):**
- `Type 'undefined' is not assignable to type 'PostCombatSnapshot'` at `useCampaignCombatState.ts:207`
- After P0 fix, `payload.snapshot` is `PostCombatSnapshot | undefined` but the callback type was `(snapshot: PostCombatSnapshot) => void`
- Fix: changed `onCombatEnded?: (snapshot: PostCombatSnapshot | undefined) => void` (line 105). HeroiTab's `handleCombatEnded` already accepted `undefined` — so this was just a type signature alignment.
- **Lesson**: local `tsc --noEmit` ran clean BEFORE the merge with master because the type mismatch only surfaced after the union widening. The merge resolution commit caught it. Vercel build was the absolute last line of defense before merge.

**Merge conflict resolution** (master moved while PR was open):
- Wave 3c (PR #87) merged first, introducing changes to `messages/en.json`, `messages/pt-BR.json`, `components/player-hq/v2/HeroiTab.tsx`, etc.
- Wave 3a's HeroiTab refactor (replace V1 CharacterStatusPanel with RibbonVivo) conflicted with Wave 3b's earlier prop additions (now part of master).
- Resolution: `git checkout --ours HeroiTab.tsx` — kept Wave 3a's structure (which already included Wave 3b's CharacterCoreStats prop additions because Wave 3a had been rebased on Sub-zero already) + manually verified the merged state was coherent.
- Auto-merged (no conflict): `messages/*.json`, all newly-added files, `CharacterCoreStats.tsx`, `NpcCard.tsx`, `PlayerMindMap.tsx`, `PlayerNpcDrawer.tsx`, `PlayerHqShellV2.tsx`, `DiarioTab.tsx`.

**Issues flagged in #90:**
- P1-2: E2E `combat:started/ended` simulation likely SKIPS silently in CI (`broadcastOnCampaign` helper depends on `window.__supabase__` or hashed chunk path that doesn't exist in production builds; try/catch falls back to `test.skip(true, ...)`). Affirmative-path coverage = zero today.
- P3-2: Anon parity STRICT not satisfied — RibbonVivo doesn't render for `/join/[token]` (Anon goes through PlayerJoinClient, not V2 shell). `ribbon-combat-parity-anon.spec.ts` only validates `/join/<invalid-token>` doesn't crash. PR description honest about this; STRICT rule says UI-only changes apply to all 3 modes.
- P2: turn_advance race, lastRoundRef race, bg-card vs spec literal bg-elevated, transient broadcast race window, StrictMode double-channel.
- P3: CombatBanner has no fade-out animation (justified in code comment but spec asked for 400ms), redundant Temp HP between chip line 1 and controls line 2 in desktop.

---

## 4. Adversarial review consolidated lessons

The 3-reviewer pattern (`feedback_adversarial_review_default.md`) caught **2 production-blocking issues** that local CI missed:

| Where it caught | Issue | Cost if missed |
|---|---|---|
| Wave 3a P0-1 | A6 callback gated on `payload.snapshot` truthy; broadcast never carried snapshot (deliberate); PostCombatBanner = dead code | Feature ships with V2 flag flip in Sprint 10 → 0% of players see post-combat surface despite Sprint 2's A6 work + dormant components |
| Wave 3a P1-1 | SlotSummary not flag-gated; ribbon and panel show opposite dot semantics | UX confusion in every combat once V2 is ON |

**Other findings (not P0 but real):**
- Sub-zero specs: `[data-variant="transient"]` selector doesn't exist on SpellSlotGrid markup → silent skip → cannot fail → no regression gate. Issue #84.
- Wave 3b: i18n toast labels EN-only on PT-BR locale; advantage menu visually overlaps the buttons it was triggered from. Issue #88.
- Wave 3c: anon entrypoint dead code; NPC name-keyed URL ambiguous with duplicates. Issue #89.

**Process improvement to apply going forward:**
1. **Post-merge smoke** — even after CI green + adversarial APPROVE, run a quick local `pnpm build` + visual check of the Vercel preview before declaring DONE. Caught only by Vercel: the type error at `6abe038`.
2. **Type signatures evolve with prop changes** — when relaxing a callback gate (like the `payload.snapshot &&` removal), the parameter type must match the new range of possible values. `tsc --noEmit` will eventually catch it but only after the merge surface has unified.
3. **CI Playwright is gated off** (`Supabase secrets not configured — skipping E2E.`) — the green check is misleading. Issue #84 P1-2 tracks the infra fix. Until then, treat CI Playwright result as advisory, not authoritative.

---

## 5. Follow-up issues to consume before Sprint 10 (flag flip)

| Issue | Wave | Severity | Effort | Notes |
|---|---|---|---|---|
| [#84](https://github.com/danielroscoe-97/projeto-rpg/issues/84) | Sub-zero | P1 + P2 | M | Selector bug (silent skip) + CI Playwright secrets + a11y label parity. P1-1 fix is ~3 LOC (add `data-variant` attribute) or ~10 LOC (change selectors to anchor). |
| [#88](https://github.com/danielroscoe-97/projeto-rpg/issues/88) | Wave 3b | P1 + P2 + spec gap | M | i18n toast labels (4 i18n keys × 2 locales) + menu position fix (5 LOC `top-full`) + Dot primitive adoption + manual modifier gap (~30 LOC). |
| [#89](https://github.com/danielroscoe-97/projeto-rpg/issues/89) | Wave 3c | P1 × 4 + P2 + P3 | M-L | Anon entrypoint cleanup (PR description revision OR enable flow) + NPC URL composite key + notifications dedup + MarkdownEditor sanitize comment. |
| [#90](https://github.com/danielroscoe-97/projeto-rpg/issues/90) | Wave 3a | P1 + P2 × 5 + P3 × 4 | L | E2E selector gap (CI Playwright runner skip surface) + Anon parity (Wave promote `/join` to V2 shell OR add adversarial Anon ribbon E2E that simulates) + minor refinements. |

**Recommended ownership:** consume all 4 in a Sprint 9 cleanup pass (per the original sprint plan). They are NOT blockers for Wave 4 (Level Up Wizard) because Wave 4 doesn't touch Player HQ ribbon/Diário/Combat Auto surfaces — it adds a new wizard that mounts via the existing `<RibbonVivo>` chip extension point.

---

## 6. Migration 187 deployment record (canonical for next migrations)

**Date:** 2026-04-27 (mid-day)
**Operator:** main session (Claude Code Opus 4.7 1M)
**Method:** Supabase CLI from main worktree (linked to `mdcmjpcjkqgyxvhweoqs`)

**Pattern used:**
1. Worktree 3c (where PR #87 was developed) was NOT Supabase-linked — `supabase migration list --linked` failed with `Cannot find project ref. Have you run supabase link?`. Linking is per-directory; only main is linked.
2. Workaround:
   ```bash
   cp ".claude/worktrees/wave-3-track-3c/supabase/migrations/187_player_notes.sql" \
      "supabase/migrations/187_player_notes.sql"

   supabase migration list --linked    # confirm 187 pending
   supabase db push --linked --dry-run # preview
   supabase db push --linked           # apply

   rm "supabase/migrations/187_player_notes.sql"  # delete from main BEFORE pull
                                                    # to avoid conflict on squash merge
   ```
3. After PR #87 squash-merged, `git pull origin master` brought the file back via the squash commit. No conflict.

**Idempotency notes:**
- `CREATE TABLE IF NOT EXISTS` ✅ safe
- `CREATE INDEX IF NOT EXISTS` ✅ safe (3 of these)
- `DROP POLICY IF EXISTS … CREATE POLICY` ✅ safe (8 of these — emitted 8 NOTICEs on first apply, expected: "policy does not exist, skipping")
- `CREATE TRIGGER` ❌ **NOT idempotent** — no `IF NOT EXISTS`. Re-applying via the CLI manually would fail at the trigger line. Doesn't matter for `supabase db push` (which only runs each migration once via the migration history table) but worth knowing for emergency manual replays.

**Lesson for Wave 4 migration 188 (`level_up_invitations`):**
- Either link the worktree at start (`supabase link` per-directory in agent's worktree) OR keep the main-worktree apply pattern.
- Wave 3c's `auth.uid()` RLS pattern is the canonical one for this codebase. Don't follow kickoff prompts that suggest `request.jwt.claims` shims — verify against existing migrations first.

---

## 7. Worktree cleanup status

**Current state:**
- `.claude/worktrees/wave-3-sub-zero` — removed (PowerShell `Remove-Item -Recurse -Force` after `git worktree remove --force` failed on Windows file lock)
- `.claude/worktrees/wave-3-track-3a` — removed (same pattern)
- `.claude/worktrees/wave-3-track-3b` — removed (clean — no Windows lock)
- `.claude/worktrees/wave-3-track-3c` — removed (clean — no Windows lock)
- 4 stale worktree directories from prior sprints **still present** (not touched this session):
  - `sprint-3-kickoff`
  - `sprint-3-track-a`
  - `trackb-merge`
  - `visual-migrate`

**Patches preserved:**
- `.claude/worktree-cleanup-2026-04-27/wave-3-sub-zero-leftover-realtime-f03.patch` (94 lines — F03 `player:sos_resync_requested` feature from another session)

**Recommendation for next session:** the 4 stale dirs are FS-only orphans (registered worktrees were already deleted). Safe to PowerShell `Remove-Item` them — but verify each one's content first per `feedback_worktree_cleanup` rule.

---

## 8. What's NOT done (open items going into Wave 4)

### Hard blockers for Sprint 10 V2 flag flip
- **Issue #84 P1-1 fix** — both Sub-zero specs need to actually exercise the inversion (today they silent-skip)
- **Issue #84 P1-2** — CI Playwright Supabase secrets need to be provisioned, OR all 4 PRs' E2E coverage needs to be exercised locally + documented

### Soft blockers (UX bugs visible to users at flag flip)
- **Issue #88 P1-2** — Advantage menu visual position bug (5 LOC fix)
- **Issue #88 P1-1** — Toast labels in EN on PT-BR locale (4 i18n keys × 2 files)
- **Issue #90 P3-2** — Anon parity for ribbon (depends on `/join` surface being promoted to V2)

### Technical debt (won't be visible but should land)
- Issue #84 P2 (a11y label parity), Issue #88 P2 (Dot primitive adoption + testid alignment), Issue #89 (anon entrypoint cleanup, NPC URL composite key, notifications dedup), Issue #90 (turn_advance race, lastRoundRef race, etc.)
- Stale worktree FS cleanup (4 dirs)

### Wave 4 scope (next session's job)
- EP-5 Level Up Wizard end-to-end:
  - E1 — `level_up_invitations` migration (188)
  - E2 — Mestre release UI (`<LevelUpRelease />`)
  - E3 — Ribbon chip + `useLevelUpInvitation`
  - E4 — Wizard shell + Steps 1-2 (Class + HP)
  - E5 — Steps 3-4 (ASI/Feat + Spells)
  - E6 — Steps 5-6 (Features + Subclass + Final Review)
  - E7 — Mestre completion feedback + cancel + auto-expire
- Per the plan, Wave 4 is **mostly serial** internally (the wizard's `choices jsonb` state contract grows step by step). Parallelizable seams: E1 (migration) + E2 (Mestre UI) + E3 (ribbon chip) on one track, E4 → E5 → E6 strictly serial on another.

### Sprint 9-10 (after Wave 4)
- Sprint 9 — QA polish + a11y axe + Lighthouse + 4 follow-up issues consumed
- Sprint 10 — flip `NEXT_PUBLIC_PLAYER_HQ_V2=true` in production, retire V1 paths

---

## 9. Lessons learned for future sessions

1. **Pre-flight discovery is cheap; assumption is expensive.** The kickoff prompt assumed EP-0 C0.2/C0.3 had been done — which they had, but in a different directory than the prompt said. 30 minutes of file inspection saved the wrong "Sub-zero" scope from being implemented (would have re-extracted already-extracted primitives). Always check `Glob` + `Read` of canonical extension points before trusting plan documents.

2. **BMAD party-mode for technical decisions works.** The Sub-zero scope (3 PRs vs 1 PR) and the player_notes architecture (table paralela vs refactor in-place) were both decided in a single party-mode session with 4 agents. The session converged in ~30 minutes and the decisions stuck through implementation. Use this pattern for any non-trivial architecture choice.

3. **Adversarial review default catches what CI doesn't.** Wave 3a's P0 (A6 dead callback) would have shipped quietly if review was skipped. CI was 5/5 green. The reviewer's `Pass 1: Blind Hunter` walking the diff fresh found the gate that the implementing agent didn't notice (because they wrote both sides — the broadcast emit and the receiver — and never crossed the eye).

4. **Vercel build is the last type-check.** Local `tsc --noEmit` ran clean before the merge with master. The type error only surfaced AFTER `git merge` brought in master's changes that touched the same callsite. Vercel ran `tsc` after the merge and caught it. **Implication**: when resolving merge conflicts, always re-run `tsc --noEmit` before pushing.

5. **Multi-agent commit discipline (`feedback_multi_agent_commits`)** held up well. Each agent committed + pushed every batch (<15min). One agent's worktree contained 4 unrelated `lib/realtime/*` modifications that the agent correctly did NOT commit — that discipline saved a leak into the PR.

6. **Migration timing (`feedback_supabase_migration_runner`)** held up. Applied 187 BEFORE merging PR #87. Sprint 3's pain (mig committed but not applied → next deploy crashed with `42703 column does not exist`) was avoided.

7. **Windows worktree cleanup is unreliable** (`git worktree remove` fails with "Directory not empty" when files have locks). PowerShell `Remove-Item -Recurse -Force` is the reliable path on this OS. Memorialized in `feedback_worktree_cleanup`.

8. **Wave 3 was 4 PRs in ~6 hours of wall-clock** including 4 adversarial reviews + 1 BMAD party-mode + 1 inline fix cycle + 1 merge resolution + 1 migration application + 4 follow-up issues + cleanup. Multi-agent parallelism delivered. Without it, conservative estimate would be 2 weeks of solo dev.

---

**End of retrospective.** Wave 4 kickoff prompt: [26-wave-4-kickoff-prompt.md](26-wave-4-kickoff-prompt.md).
