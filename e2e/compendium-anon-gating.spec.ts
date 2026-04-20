/**
 * SRD Content Compliance — "Outros livros" (nonsrd) chip gating
 *
 * Regression guard for the anonymous-gating bug fixed on 2026-04-20
 * (lib/hooks/use-content-access.ts): Supabase anonymous users have a userId
 * but MUST NOT be treated as authenticated for non-SRD content gating. When
 * the fix is missing, the "Outros livros" chip appears in PlayerCompendiumBrowser
 * filter even though the dataset under `public/srd/` contains zero non-SRD
 * rows — producing 0 results and leaking licensed content labels publicly.
 *
 * Matrix coverage:
 *   1. Guest /try — no Supabase user at all → chip absent (tested here)
 *   2. Anonymous /join/[token] — Supabase user with is_anonymous=true
 *   3. Real auth without whitelist/agreement → chip absent
 *   4. Real auth with whitelist → chip present
 *
 * Cases 2–4 require heavy fixture setup (DM session + tokens + DB rows).
 * They are covered by lib/hooks/use-content-access.test.ts so this spec
 * only smoke-tests case 1 and leaves the others as documented skips.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  goToTryPage,
  addAllCombatants,
  startCombat,
  QUICK_ENCOUNTER,
} from "./guest-qa/helpers";

async function openCompendiumMonsters(page: Page) {
  const btn = page.locator('[data-testid="compendium-browser-btn"]');
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  const monstersTab = dialog
    .locator("button")
    .filter({ hasText: /^Monsters$|^Monstros$/i })
    .first();
  await expect(monstersTab).toBeVisible({ timeout: 5_000 });
  await monstersTab.click();
  await page.waitForTimeout(400);
  return dialog;
}

test.describe("SRD Compliance — anon gating on the 'Outros livros' chip", () => {
  test("Guest /try never renders the nonsrd chip", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    const dialog = await openCompendiumMonsters(page);

    const toolbar = dialog.locator(
      '[data-testid="compendium-monster-source-filter"]',
    );
    await expect(toolbar).toBeVisible({ timeout: 5_000 });

    // SRD chips are present for guests (public data only).
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-srd_2014"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-srd_2024"]'),
    ).toBeVisible();

    // The nonsrd chip (gated behind useContentAccess.canAccess) MUST NEVER
    // appear for a guest — no Supabase user, so isAuthenticated=false.
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-nonsrd"]'),
    ).toHaveCount(0);
  });

  test.skip(
    "Anonymous player via /join/[token] never renders the nonsrd chip",
    async () => {
      // Covered by lib/hooks/use-content-access.test.ts
      //   'REGRESSION: anon user with whitelist + agreement still returns canAccess=false'
      // Requires DM session + share-token + late-join approval to reach the
      // compendium — reintroduce when a lean fixture helper exists.
    },
  );

  test.skip(
    "Real-auth user without whitelist/agreement never renders the nonsrd chip",
    async () => {
      // Covered by lib/hooks/use-content-access.test.ts
      //   'real-auth user without whitelist/agreement returns canAccess=false'
    },
  );

  test.skip(
    "Real-auth whitelisted user renders the nonsrd chip",
    async () => {
      // Covered by lib/hooks/use-content-access.test.ts
      //   'real-auth whitelisted user returns canAccess=true'
    },
  );
});
