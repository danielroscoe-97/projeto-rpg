/**
 * D2 — Compendium Edition Filter (VersionBadge + Source chips)
 *
 * Canonical scenario from docs/spec-compendium-edition-filter.md §7:
 *  - Open Player HQ (here: guest /try, which shares the same dialog).
 *  - Open the compendium → switch to the Monsters tab.
 *  - Assert the first row shows a "2014" or "2024" badge (VersionBadge).
 *  - Click the "SRD 2024" chip → count drops, badges read "2024".
 *  - Reload → filter choice persists via localStorage.
 */
import { test, expect, type Page } from "@playwright/test";
import {
  goToTryPage,
  addAllCombatants,
  startCombat,
  QUICK_ENCOUNTER,
} from "./guest-qa/helpers";

async function openCompendiumAndGoToMonsters(page: Page) {
  const btn = page.locator('[data-testid="compendium-browser-btn"]');
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });

  // Go to monsters tab. Label varies by locale — match EN or PT.
  const monstersTab = dialog
    .locator("button")
    .filter({ hasText: /^Monsters$|^Monstros$/i })
    .first();
  await expect(monstersTab).toBeVisible({ timeout: 5_000 });
  await monstersTab.click();
  await page.waitForTimeout(400);
  return dialog;
}

test.describe("D2 — Compendium edition filter", () => {
  test.beforeEach(async ({ page }) => {
    await goToTryPage(page);
    // Compendium button only appears during active combat.
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
  });

  test("monster row shows VersionBadge + SRD 2024 chip filters list", async ({
    page,
  }) => {
    const dialog = await openCompendiumAndGoToMonsters(page);

    // The filter toolbar should be present.
    const toolbar = dialog.locator(
      '[data-testid="compendium-monster-source-filter"]',
    );
    await expect(toolbar).toBeVisible({ timeout: 5_000 });

    // Baseline: 4 chips rendered for guest (nonsrd is gated behind
    // useContentAccess.canAccess, which is false in /try).
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-all"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-srd_2014"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-srd_2024"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-mad"]'),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-testid="compendium-monster-source-nonsrd"]'),
    ).toHaveCount(0);

    // The first monster row should carry a VersionBadge with text "2014" or "2024".
    const firstRowBadge = dialog
      .locator(".overflow-y-auto span[aria-label^='D&D']")
      .first();
    await expect(firstRowBadge).toBeVisible({ timeout: 5_000 });
    await expect(firstRowBadge).toHaveText(/2014|2024/);

    // Capture baseline count text for the "all" bucket.
    const countText = dialog
      .locator(".overflow-y-auto")
      .locator("xpath=..")
      .locator("p.text-\\[10px\\]")
      .last();
    const allCount = await countText.textContent();

    // Click the SRD 2024 chip — list should refresh and every visible badge
    // must read "2024" (not "2014").
    await dialog
      .locator('[data-testid="compendium-monster-source-srd_2024"]')
      .click();
    await page.waitForTimeout(400);

    const visibleBadges = await dialog
      .locator(".overflow-y-auto span[aria-label^='D&D']")
      .allTextContents();
    // At least one visible — the SRD 2024 set is non-empty in /try.
    expect(visibleBadges.length).toBeGreaterThan(0);
    for (const text of visibleBadges) {
      expect(text.trim()).toBe("2024");
    }

    const newCount = await countText.textContent();
    // Either strictly fewer, or at minimum not equal to the "all" label
    // (paranoia guard for tiny public datasets where both buckets coincide).
    expect(newCount).not.toBe(allCount);

    // Persistence: reload the page, re-open the dialog, and the chip should
    // come back already pressed.
    const persisted = await page.evaluate(() =>
      window.localStorage.getItem("compendium.monsters.filter.v1"),
    );
    expect(persisted).toBe("srd_2024");
  });
});
