import { test, expect } from "@playwright/test";

test.describe("P0 — Visitor Try Mode", () => {
  test("Visitor can access /try and see encounter setup", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // Encounter setup shows add-row form
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 15_000 });
  });

  test("Visitor can add combatant manually", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });

    // Fill in combatant details
    await page.fill('[data-testid="add-row-name"]', "Goblin");
    await page.fill('[data-testid="add-row-hp"]', "7");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "12");

    // Click "Adicionar"
    await page.click('[data-testid="add-row-btn"]');

    // Combatant row should appear — name is in an input inside setup-row
    await expect(
      page.locator('input[data-testid^="setup-name-"]').first()
    ).toHaveValue("Goblin", { timeout: 5_000 });
  });

  test("Visitor can add 2 combatants and start combat", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });

    // Add combatant 1
    await page.fill('[data-testid="add-row-name"]', "Fighter");
    await page.fill('[data-testid="add-row-hp"]', "45");
    await page.fill('[data-testid="add-row-ac"]', "18");
    await page.fill('[data-testid="add-row-init"]', "15");
    await page.click('[data-testid="add-row-btn"]');
    await expect(page.locator('[data-testid^="setup-row-"]').first()).toBeVisible({ timeout: 5_000 });

    // Add combatant 2
    await page.fill('[data-testid="add-row-name"]', "Mage");
    await page.fill('[data-testid="add-row-hp"]', "30");
    await page.fill('[data-testid="add-row-ac"]', "12");
    await page.fill('[data-testid="add-row-init"]', "10");
    await page.click('[data-testid="add-row-btn"]');

    // Should now have 2 combatant rows
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, { timeout: 5_000 });

    // Start combat
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Active combat should appear
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
  });

  test("Visitor /try does not require login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/try");
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toContain("/auth/login");
    expect(page.url()).toContain("/try");
  });
});
