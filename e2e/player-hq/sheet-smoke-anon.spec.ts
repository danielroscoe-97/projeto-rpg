import { test, expect } from "@playwright/test";

/**
 * Player HQ — Anon smoke baseline (EP-INFRA.4, Sprint 1 Track B).
 *
 * Documents the intentional gap: anonymous players (entered via `/join/
 * [token]`) do NOT have access to `/app/campaigns/[id]/sheet`. The sheet
 * page's server component at `app/app/(with-sidebar)/campaigns/[id]/
 * sheet/page.tsx` redirects when `user` is null or when `membership.role`
 * is not `player`.
 *
 * Capturing this baseline matters because Sprint 2+ will start reshuffling
 * redirects (e.g. decision #43 — post-combat redirect changes destination
 * by role and flag). If a future refactor accidentally lets anon users
 * reach `/sheet` (or lets them land on a broken shell), this spec fails
 * with a clear pointer to the regression.
 *
 * Why an anon-focused baseline is valuable even though anon does not
 * currently reach the shell:
 *   1. Track B Sprint 2 rewrites conversion specs (recap-anon-signup +
 *      recap-guest-signup-migrate) to expect a new dual redirect target.
 *   2. Sprint 3+ may add a pared-down "anon sheet" for limited features
 *      (Arsenal read-only, etc.) — the baseline becomes the checkpoint
 *      where we decide "yes that change is intentional."
 *
 * Skip behavior: this test never exercises a real share token — it drives
 * anon access by visiting `/sheet` directly without authentication. No
 * seed data dependency.
 */

test.describe("Player HQ — Anon smoke (no /sheet access baseline)", () => {
  test.setTimeout(45_000);

  test("unauthenticated visit to /sheet redirects to /auth/login", async ({ page }) => {
    // Use a plausible-looking UUID — even if the campaign existed, the
    // redirect happens BEFORE the campaign lookup in the server component
    // (`if (!user) redirect("/auth/login")`).
    const fakeCampaignId = "00000000-0000-0000-0000-000000000000";

    await page.goto(`/app/campaigns/${fakeCampaignId}/sheet`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");

    // Expect redirect to login, NOT a rendered sheet.
    // Source of truth: app/app/(with-sidebar)/campaigns/[id]/sheet/page.tsx:21
    // → `if (!user) redirect("/auth/login")`. Match path exactly (with or
    // without query string), not a permissive fallback that would accept
    // the root `/` and mask future regressions.
    expect(page.url()).not.toMatch(/\/sheet(?:\?|$)/);
    expect(page.url()).toMatch(/\/auth\/login(?:\?|$)/);

    // The tablist must NOT exist for anon visitors.
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toHaveCount(0);
  });

  test("anon visitor landing on /join/[invalid-token] does not gain /sheet access", async ({
    page,
  }) => {
    // Exercise the /join entry point with a bogus token to confirm the
    // anon flow stays within PlayerJoinClient territory and never leaks
    // access to /sheet. Real tokens are covered by e2e/combat/player-join
    // + e2e/journeys/j11-player-view-complete.
    const bogusToken = "not-a-real-token-baseline-anon-smoke";
    await page.goto(`/join/${bogusToken}`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");

    // We don't care HOW the app handles the bad token (error message vs.
    // redirect vs. form) — we only care that `/sheet` never becomes
    // accessible as a side effect. The negative assertion is the point.
    expect(page.url()).not.toMatch(/\/app\/campaigns\/[^/]+\/sheet(?:\?|$)/);

    // PlayerHqShell's tablist role should not render anywhere.
    const tablist = page.locator('[role="tablist"]');
    const tabCount = await tablist.count();
    expect(tabCount).toBe(0);
  });
});
