# Sprint 2 Prep — E2E Conversion Spec Audit (A6 decision #43)

**Owner:** Track B · **Generated:** 2026-04-23 (Sprint 1 Task 4)
**Source:** [15-e2e-matrix.md §Parity gaps row 9](./15-e2e-matrix.md#5-parity-gaps-em-testes-atuais) marked the two recap specs as broken by decision #43.
**Goal of this doc:** give the Sprint 2 A6 implementer file+line-precision on where the dashboard-redirect assertion lives so the rewrite becomes a 15-minute edit instead of a spelunking session.

## Decision #43 (PRD-EPICO-CONSOLIDADO.md decision #43)

Post-combat redirect destination changes **by role + flag**:

| Mode | Flag OFF (current prod) | Flag ON (V2 target) |
|---|---|---|
| Authenticated | `/app/dashboard` (today) | Toast "Combate encerrado · Ver sua ficha →" with CTA to `/sheet?tab=heroi`. Auto-redirect 5s. |
| Anonymous (`/join/[token]`) | `/app/dashboard` after signup | `RecapCtaCard` with `redirectTo=/sheet?tab=heroi`. OAuth claim auto-applied. |
| Guest (`/try`) | `/app/dashboard` after signup | **Unchanged** per #43 (guest keeps dashboard — no seeded campaign_id to hydrate HQ). |

Track B plan (from `14-sprint-plan.md:231`): **A6 branches `redirectTo` default by flag in `RecapCtaCard` / `GuestRecapFlow` / `GuestUpsellModal`**. Flag OFF = dashboard (current). Flag ON = `/sheet?tab=heroi`.

## Files that need dual-target assertion

### `e2e/conversion/recap-anon-signup.spec.ts`

**Affected lines:**

| Line | Current code | Problem | Sprint 2 rewrite |
|---|---|---|---|
| 196–198 | ```await playerPage.goto("/app/dashboard", { waitUntil: "domcontentloaded" });``` | Hard-codes dashboard navigation AFTER signup. Once A6 lands with flag ON, the auth-callback may redirect to `/sheet?tab=heroi` automatically, making this `goto` a redundant no-op (dashboard never loaded) or a regression (we overwrite the V2 redirect). | Replace with a `waitForURL` that accepts BOTH targets; assert whichever matches depending on `isPlayerHqV2Enabled()`: `await playerPage.waitForURL(/\/app\/dashboard\|\/app\/campaigns\/[^/]+\/sheet\?tab=heroi/, { timeout: 30_000 })`. |
| 203–212 | ```const charCard = playerPage.locator([...]`\`character-card\`...).first();``` `await expect(charCard).toBeVisible(...);` | Assertion assumes dashboard rendering (looks for `character-card` / `my-character-card` testids that live on the dashboard, not on `/sheet`). | Branch the assertion: when URL matches `/sheet?tab=heroi`, look for `PlayerHqShell` tablist (`[role="tablist"]` with `#tab-heroi`). Keep the dashboard branch for flag-OFF. |

**Key invariants to preserve:**
- Line 192–193: `session_token_id` preserved across upgrade (Resilient Reconnection). **Do not touch.**
- Line 164–178: `upgradeResponsePromise` (F31 saga response). **Do not touch.**
- Line 126: `conversion.recap-cta.anon.headline` contains character name. **Do not touch.**

### `e2e/conversion/recap-guest-signup-migrate.spec.ts`

**Affected lines:**

| Line | Current code | Problem | Sprint 2 rewrite |
|---|---|---|---|
| 214–217 | ```await page.waitForURL(/\/app\/dashboard/, { timeout: 30_000, waitUntil: "domcontentloaded" });``` | Hardcodes dashboard as the only acceptable post-migrate destination. Per decision #43, guest path KEEPS dashboard in V2 — so technically this line could survive. **But:** an accidental future change to guest redirect would go undetected. | Keep regex targeting `/app/dashboard` but add a comment explicitly calling out "guest redirects to dashboard per decision #43 — do NOT change without updating that decision." Optional: add a negative assertion that the URL is NOT `/sheet?tab=heroi` (to lock in the guest-specific behavior). |
| 219–229 | ```const thorinCard = page.locator([...]`character-card`:has-text("Thorin")...).first();``` `await expect(thorinCard).toBeVisible(...)` | Correct for guest (stays dashboard). No change needed. | No change. |
| 234–237 | ```await page.goto("/app/dashboard/characters", ...).catch(() => {});``` | Best-effort navigation to verify default-character flag. Still valid in V2 (guest doesn't go to /sheet). | No change. |
| 259–274 | ```const legolasStillInGuest = await page.evaluate(() => { ... pocketdm_guest_combat_snapshot ... });``` | Validates F7 partial-migrate invariant (Thorin migrated, Legolas stays in guest). Independent of #43. | No change. |

**Key invariants to preserve:**
- Line 94–103: `is_player` guest-store count check (F7). **Do not touch.**
- Line 129–140: `thorinId` lookup from guest store. **Do not touch.**
- Line 173–199: `migrate-guest-character` POST assertion. **Do not touch.**

## Summary — what Sprint 2 A6 E2E rewrite does

Three layers of change:

1. **recap-anon-signup.spec.ts** lines 196–212 — swap hardcoded `/app/dashboard` with a flag-aware dual-target `waitForURL` + branched character-card / tablist assertions. Expected diff: ~25 lines.
2. **recap-guest-signup-migrate.spec.ts** — comment-only change to lock in the guest-dashboard invariant per #43. Expected diff: ~5 lines.
3. **New spec** — `e2e/player-hq/post-combat-redirect-heroi.spec.ts` already queued in `15-e2e-matrix.md §6 rows 5–7` (P0, 3 modes, M effort each). Implements the V2-ON assertion end-to-end.

## Flag pattern to use in the rewrite

```ts
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

// In a Playwright test, env vars must be injected via playwright.config.ts
// webServer.env or via `process.env` — the current `NEXT_PUBLIC_PLAYER_HQ_V2`
// is inlined at BUILD time, so the test's check reflects the build config.
//
// Pattern:
const v2 = process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true";

if (v2) {
  await page.waitForURL(/\/app\/campaigns\/[^/]+\/sheet\?tab=heroi/, { timeout: 30_000 });
  await expect(page.locator('#tab-heroi')).toHaveAttribute("aria-selected", "true");
} else {
  await page.waitForURL(/\/app\/dashboard/, { timeout: 30_000 });
  await expect(page.locator('[data-testid="character-card"]:has-text("Thorin")')).toBeVisible();
}
```

**Gotcha:** Playwright's webServer already injects `NEXT_PUBLIC_PLAYER_HQ_V2=true` when we want V2 testing (see `playwright.config.ts` — add when A6 lands). In CI, this env lives in the GitHub Actions workflow. Staging deploys with flag ON will have the V2 branch run; prod (flag OFF) will hit the legacy branch.

## Out-of-scope for this audit

- **Writing the actual rewrites** — that's Sprint 2 Track B item 5 (`feat/ep-infra-recap-e2e-prep`), not Sprint 1.
- **Updating `components/conversion/RecapCtaCard.tsx`** — Sprint 2 Track B plan §2 item 1.
- **Adding `PostCombatBanner`** — Sprint 2 story A6 new file, covered by `_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md:333`.
- **`post-combat-redirect-heroi-*.spec.ts` (3 new specs)** — Gate Fase A item 7 per `14-sprint-plan.md`, covered by Track A in Sprint 2.

## File locations — cheat sheet for Sprint 2 A6 implementer

| Asset | Path |
|---|---|
| Current recap anon spec | [`e2e/conversion/recap-anon-signup.spec.ts`](../../e2e/conversion/recap-anon-signup.spec.ts) |
| Current recap guest spec | [`e2e/conversion/recap-guest-signup-migrate.spec.ts`](../../e2e/conversion/recap-guest-signup-migrate.spec.ts) |
| Feature flag lib | [`lib/flags/player-hq-v2.ts`](../../lib/flags/player-hq-v2.ts) (new Sprint 1 PR #35) |
| Flag doc | [`docs/feature-flags.md`](../../docs/feature-flags.md) |
| Combat parity gate | [`.github/workflows/parity-check.yml`](../../.github/workflows/parity-check.yml) (new Sprint 1 PR #37) |
| E2E scaffold | [`e2e/player-hq/`](../../e2e/player-hq/) (new Sprint 1 PR #39) |
| Components needing the `redirectTo` prop swap | `components/conversion/RecapCtaCard.tsx`, `components/conversion/GuestRecapFlow.tsx`, `components/guest/GuestUpsellModal.tsx` |
