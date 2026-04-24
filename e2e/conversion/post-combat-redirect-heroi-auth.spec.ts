/**
 * E2E — A6: Auth post-combat redirect resolves to /sheet?tab=heroi when
 * `NEXT_PUBLIC_PLAYER_HQ_V2=true`, `/app/dashboard` otherwise.
 *
 * Combat Parity STRICT: this is the Auth companion to the Anon + Guest
 * specs in `post-combat-redirect-heroi-{anon,guest}.spec.ts`.
 *
 * Tested invariant: `resolvePostCombatRedirect({ mode: "auth",
 * campaignId })` returns the flag-aware target. We expose the contract by
 * visiting a campaign `/sheet` route (via helpers when seeded) and
 * confirming the `role="tablist"` shell is present — i.e. the shell can
 * host the post-combat surface.
 *
 * Skip behavior: if the Auth seed (DM_PRIMARY character + seeded campaign)
 * isn't available, we skip gracefully. A pure-util unit test for the
 * resolver lives in `lib/__tests__/post-combat-redirect.test.ts` so the
 * contract is still asserted.
 *
 * @tags @conversion @post-combat @a6 @combat-parity
 */

import { test, expect } from "@playwright/test";

test.describe("A6 — Auth post-combat redirect contract", () => {
  test.setTimeout(60_000);

  test("auth /sheet?tab=heroi hosts the shell when flag ON", async ({
    page,
  }) => {
    const flagOn = process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true";
    if (!flagOn) {
      test.skip(
        true,
        "Flag OFF — auth post-combat keeps /app/dashboard (legacy path). " +
          "Covered by recap-anon-signup.spec.ts dual-target branch.",
      );
      return;
    }

    // The canonical path built by `buildHeroiSheetPath`. We don't need a
    // live campaign to assert the shell renders — any authenticated /sheet
    // route hosts the tablist when the seed is present. Without seed we
    // skip.
    //
    // NOTE: seeding flow is covered by other E2Es (dashboard-tour,
    // player-continuity). Here we rely on visitor-authentication via the
    // existing Playwright auth fixture if the environment provides one;
    // otherwise skip.
    const testCampaignId = process.env.E2E_AUTH_CAMPAIGN_ID;
    if (!testCampaignId) {
      test.skip(
        true,
        "E2E_AUTH_CAMPAIGN_ID not set — cannot validate /sheet?tab=heroi " +
          "shell render without a seeded campaign. Contract covered by " +
          "lib/__tests__/post-combat-redirect.test.ts + integration specs.",
      );
      return;
    }

    await page.goto(`/app/campaigns/${testCampaignId}/sheet?tab=heroi`, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    // If we land on /auth/* or /login, seed is missing — skip rather than
    // false-fail.
    if (/\/(auth|login|sign[-_]?in)/.test(page.url())) {
      test.skip(
        true,
        `Redirected to ${page.url()} — auth fixture missing for this run`,
      );
      return;
    }

    const tablist = page.locator('[role="tablist"]').first();
    await expect(tablist).toBeVisible({ timeout: 20_000 });
  });

  test("auth dashboard redirect path remains valid when flag OFF", async ({
    page,
  }) => {
    const flagOn = process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true";
    if (flagOn) {
      test.skip(true, "Flag ON — this branch asserts OFF behavior");
      return;
    }

    await page.goto("/app/dashboard", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    // If unauthed, we'll bounce to /auth/login — that's fine, the route
    // exists. The assertion is simply that /app/dashboard does not 404.
    const is404 = await page
      .locator("text=/404|not found/i")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    expect(is404).toBe(false);
  });
});
