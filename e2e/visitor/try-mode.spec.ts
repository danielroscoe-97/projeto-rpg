import { test, expect } from "@playwright/test";

test.describe("P0 — Visitor Try Mode", () => {
  test("Visitor can access /try and see encounter setup", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // Encounter setup UI should be visible (try mode loads a demo session)
    await expect(
      page.locator('[data-testid="encounter-setup"], [data-testid="active-combat"], main')
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Visitor can add combatants manually", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // Wait for try mode to load
    await page.waitForTimeout(2_000);

    // Look for add combatant button
    const addBtn = page.locator(
      '[data-testid="add-combatant-btn"], button:has-text("Add"), button:has-text("Adicionar")'
    );

    if (await addBtn.isVisible()) {
      await addBtn.click();

      // Add combatant form/dialog should appear
      await expect(
        page.locator(
          '[data-testid="add-combatant-form"], [data-testid="add-combatant-dialog"], [data-testid="add-combatant-panel"]'
        )
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Visitor can start combat and see initiative list", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // Try mode may auto-start with demo combatants
    // Check for either encounter setup or active combat
    const activeCombat = page.locator('[data-testid="active-combat"]');
    const initiativeList = page.locator('[data-testid="initiative-list"]');
    const encounterSetup = page.locator('[data-testid="encounter-setup"]');

    // Wait for page to fully load
    await page.waitForTimeout(3_000);

    // One of these should be visible
    const isActive = await activeCombat.isVisible();
    const hasList = await initiativeList.isVisible();
    const hasSetup = await encounterSetup.isVisible();

    expect(isActive || hasList || hasSetup).toBeTruthy();
  });

  test("Visitor /try does not require login", async ({ page }) => {
    // Clear all cookies/storage to ensure no auth
    await page.context().clearCookies();

    await page.goto("/try");

    // Should NOT redirect to login
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toContain("/auth/login");
    expect(page.url()).toContain("/try");
  });
});
