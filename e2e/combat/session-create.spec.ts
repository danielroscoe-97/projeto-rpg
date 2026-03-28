import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P0 — DM Creates Session", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("DM can navigate to create new session", async ({ page }) => {
    await goToNewSession(page);
    await expect(page).toHaveURL(/\/app\/session\//);
  });

  test("DM session page shows encounter setup", async ({ page }) => {
    await goToNewSession(page);

    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="setup-combatant-list"]')).toBeVisible();
  });

  test("DM can add combatant in encounter setup", async ({ page }) => {
    await goToNewSession(page);

    await page.fill('[data-testid="add-row-name"]', "Test Goblin");
    await page.fill('[data-testid="add-row-hp"]', "7");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "12");
    await page.click('[data-testid="add-row-btn"]');

    // Combatant row added — name is in an input
    await expect(
      page.locator('input[data-testid^="setup-name-"]').first()
    ).toHaveValue("Test Goblin", { timeout: 5_000 });
  });

  test("DM can generate share link", async ({ page }) => {
    await goToNewSession(page);

    // On /session/new (sessionId=null), click share-prepare-btn to create session on-demand
    const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
    await expect(prepareBtn).toBeVisible({ timeout: 5_000 });
    await prepareBtn.click();

    // After session is created, ShareSessionButton replaces prepare-btn
    // Now share-session-generate should appear
    const generateBtn = page.locator('[data-testid="share-session-generate"]');
    await expect(generateBtn).toBeVisible({ timeout: 10_000 });
    await generateBtn.click();

    // Share URL should appear
    await expect(
      page.locator('[data-testid="share-session-url"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("DM can start combat with combatants", async ({ page }) => {
    await goToNewSession(page);

    // Set encounter name (required to start combat)
    await page.fill('[data-testid="encounter-name-input"]', "E2E Test Encounter");

    // Add 2 combatants
    await page.fill('[data-testid="add-row-name"]', "Hero");
    await page.fill('[data-testid="add-row-hp"]', "40");
    await page.fill('[data-testid="add-row-ac"]', "16");
    await page.fill('[data-testid="add-row-init"]', "18");
    await page.click('[data-testid="add-row-btn"]');
    await expect(page.locator('[data-testid^="setup-row-"]').first()).toBeVisible({ timeout: 5_000 });

    await page.fill('[data-testid="add-row-name"]', "Villain");
    await page.fill('[data-testid="add-row-hp"]', "50");
    await page.fill('[data-testid="add-row-ac"]', "14");
    await page.fill('[data-testid="add-row-init"]', "10");
    await page.click('[data-testid="add-row-btn"]');
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, { timeout: 5_000 });

    // Start combat
    await page.click('[data-testid="start-combat-btn"]');

    // Active combat view
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible();
  });
});
