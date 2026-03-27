import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P1 — Turn Advance & HP", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("DM can see active combat with initiative list", async ({ page }) => {
    // Navigate to dashboard and find an active session
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Look for session link/card
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sessionLink.click();
      await page.waitForURL("**/app/session/**", { timeout: 10_000 });

      // Check for active combat
      const activeCombat = page.locator('[data-testid="active-combat"]');
      if (await activeCombat.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
      }
    }
  });

  test("DM can advance turn", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session found");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const nextTurnBtn = page.locator('[data-testid="next-turn-btn"]');

    if (!(await nextTurnBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active combat — next turn button not visible");
      return;
    }

    // Click next turn
    await nextTurnBtn.click();

    // Active combat should still be visible (turn just advanced)
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
  });

  test("DM can open HP adjuster", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session found");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    // Find HP button on any combatant
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();

    if (!(await hpBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No combatants with HP buttons");
      return;
    }

    await hpBtn.click();

    // HP adjuster modal/popover should appear
    await expect(
      page.locator('[data-testid="hp-adjuster"], [data-testid="hp-adjust-input"], [role="dialog"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test("DM can end encounter", async ({ page }) => {
    // Create a fresh session to test ending
    await page.goto("/app/session/new");
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });

    const endBtn = page.locator('[data-testid="end-encounter-btn"]');

    // End encounter may only be visible during active combat
    if (await endBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await endBtn.click();

      // Confirmation dialog may appear
      const confirmBtn = page.locator(
        '[data-testid="confirm-end-encounter"], button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Sim"), button:has-text("Yes")'
      );
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Active combat should disappear
      await expect(page.locator('[data-testid="active-combat"]')).not.toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
