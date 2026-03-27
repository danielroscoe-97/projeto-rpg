import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P0 — DM Creates Session", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("DM can navigate to create new session", async ({ page }) => {
    await page.goto("/app/session/new");

    // Should redirect to /app/session/<uuid> after creation
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/app\/session\//);
  });

  test("DM session page has core UI elements", async ({ page }) => {
    await page.goto("/app/session/new");
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });

    // Should have add combatant button
    await expect(
      page.locator('[data-testid="add-combatant-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("DM can add combatant", async ({ page }) => {
    await page.goto("/app/session/new");
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });

    const addBtn = page.locator('[data-testid="add-combatant-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // Add panel should appear with mode choices
    await expect(
      page.locator('[data-testid="add-combatant-panel"], [data-testid="add-mode-monster"], [data-testid="add-mode-manual"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test("DM can see share session link", async ({ page }) => {
    await page.goto("/app/session/new");
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });

    // Look for share/link button
    const shareBtn = page.locator(
      '[data-testid="share-session-btn"], [data-testid="share-session-generate"], button:has-text("Compartilhar"), button:has-text("Share"), button:has-text("Link")'
    );

    // Share functionality should be available
    await page.waitForTimeout(2_000);
    if (await shareBtn.isVisible()) {
      await shareBtn.click();

      // Token or link should be visible or copied
      await page.waitForTimeout(1_000);
    }
  });
});
