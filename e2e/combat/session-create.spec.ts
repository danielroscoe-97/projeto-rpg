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

    // Combatant row added — name is in an input (app may append " 1" suffix)
    const nameValue = await page.locator('input[data-testid^="setup-name-"]').first().inputValue();
    expect(nameValue).toContain("Test Goblin");
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

    // Encounter name is auto-generated — no input needed

    // Add 2 combatants (re-open manual form if closed)
    for (const c of [
      { name: "Hero", hp: "40", ac: "16", init: "18" },
      { name: "Villain", hp: "50", ac: "14", init: "10" },
    ]) {
      const addRowName = page.locator('[data-testid="add-row-name"]');
      if (!(await addRowName.isVisible({ timeout: 1_000 }).catch(() => false))) {
        const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
        if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await manualToggle.click();
          await page.waitForTimeout(300);
        }
      }
      await page.locator('[data-testid="add-row-init"]').fill(c.init);
      await addRowName.fill(c.name);
      await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
      await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(500);
    }
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, { timeout: 5_000 });

    // Start combat
    await page.click('[data-testid="start-combat-btn"]');

    // Active combat view
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible();
  });
});
