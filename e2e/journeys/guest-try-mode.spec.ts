/**
 * Guest Try Mode Journey
 *
 * Tests the unauthenticated /try flow: no login required,
 * guided tour, monster search, add PC, start combat,
 * verify GuestBanner with timer, apply damage, signup CTA.
 */
import { test, expect } from "@playwright/test";

test.describe("Guest Try Mode Journey", () => {
  test("Full guest combat flow without authentication", async ({ page }) => {
    // 1. Navigate to /try (no login)
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // 2. Verify guided tour appears (if first visit)
    // The tour tooltip should appear for first-time visitors
    const tourTooltip = page.locator('[data-testid="tour-tooltip"]');
    const tourOverlay = page.locator('[data-testid="tour-overlay"]');

    // 3. Close/skip tour if visible
    const tourVisible = await tourTooltip.isVisible({ timeout: 5_000 }).catch(() => false);
    if (tourVisible) {
      // Try skip button first, then "Got it" button
      const skipBtn = page.locator('[data-testid="tour-skip"]');
      const gotItBtn = page.locator('[data-testid="tour-got-it"]');
      if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await skipBtn.click();
      } else if (await gotItBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await gotItBtn.click();
      }
      await page.waitForTimeout(500);
    }

    // 4. Search monster "Goblin" via SRD panel
    const srdSearchInput = page.locator('[data-testid="srd-search-input"]');
    if (await srdSearchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await srdSearchInput.fill("Goblin");
      const srdResults = page.locator('[data-testid="srd-results"]');
      await expect(srdResults).toBeVisible({ timeout: 10_000 });

      // 5. Add Goblin to encounter — click first result
      const firstResult = page.locator('[data-testid^="srd-result-"]').first();
      await expect(firstResult).toBeVisible({ timeout: 5_000 });
      await firstResult.click();
      await page.waitForTimeout(500);
      await srdSearchInput.clear();
    } else {
      // Fallback: add Goblin via the manual add row
      await page.fill('[data-testid="add-row-name"]', "Goblin");
      await page.fill('[data-testid="add-row-hp"]', "7");
      await page.fill('[data-testid="add-row-ac"]', "15");
      await page.fill('[data-testid="add-row-init"]', "12");
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(500);
    }

    // 6. Add PC manually
    await page.fill('[data-testid="add-row-name"]', "Hero");
    await page.fill('[data-testid="add-row-hp"]', "30");
    await page.fill('[data-testid="add-row-ac"]', "16");
    await page.fill('[data-testid="add-row-init"]', "14");
    await page.click('[data-testid="add-row-btn"]');

    // Verify combatants appear in the setup list
    const setupList = page.locator('[data-testid="setup-combatant-list"]');
    await expect(setupList).toBeVisible({ timeout: 5_000 });

    // 7. Set initiative — already set via form fields above.
    // Optionally use roll buttons:
    // await page.click('[data-testid="roll-all-init-btn"]');

    // 8. Start combat
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
    await startBtn.click();

    // Wait for active combat view
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 20_000 });

    // 9. Verify GuestBanner visible with timer
    const guestBanner = page.locator('[data-testid="guest-banner"]');
    await expect(guestBanner).toBeVisible({ timeout: 5_000 });

    // 10. Apply damage to test combat works without auth
    const combatantRows = page.locator('[data-testid^="combatant-row-"]');
    await expect(combatantRows.first()).toBeVisible({ timeout: 5_000 });

    // Get first combatant ID
    const firstRowTestId = await combatantRows.first().getAttribute("data-testid");
    const firstId = firstRowTestId?.replace("combatant-row-", "") ?? "";

    if (firstId) {
      const hpBtn = page.locator(`[data-testid="hp-btn-${firstId}"]`);
      await expect(hpBtn).toBeVisible({ timeout: 5_000 });
      await hpBtn.click();

      const adjuster = page.locator('[data-testid="hp-adjuster"]');
      await expect(adjuster).toBeVisible({ timeout: 5_000 });

      await page.fill('[data-testid="hp-amount-input"]', "3");
      await page.click('[data-testid="hp-apply-btn"]');
      await page.waitForTimeout(500);
    }

    // 11. Verify combat works without auth — next turn button should work
    const nextTurnBtn = page.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
    await nextTurnBtn.click();
    await page.waitForTimeout(500);

    // 12. Verify signup CTA present
    // GuestBanner contains a link to /auth/sign-up
    const signupLink = page.locator(
      '[data-testid="guest-banner"] a[href*="/auth/sign-up"]'
    );
    await expect(signupLink).toBeVisible({ timeout: 5_000 });

    // GuestBanner timer text should also be present
    const bannerText = await guestBanner.textContent();
    expect(bannerText).toBeTruthy();
  });
});
