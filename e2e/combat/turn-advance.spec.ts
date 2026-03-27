import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P1 — Turn Advance & HP", () => {
  test("DM can advance turn in active combat", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Fighter", hp: "45", ac: "18", init: "15" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]);

    // Next turn button should be visible in active combat
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });

    // Click next turn
    await nextTurnBtn.click();

    // Active combat should still be visible
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();
    await expect(dmPage.locator('[data-testid="initiative-list"]')).toBeVisible();

    await dmContext.close();
  });

  test("DM can open HP adjuster on a combatant", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Warrior", hp: "50", ac: "16", init: "12" },
      { name: "Orc", hp: "15", ac: "13", init: "8" },
    ]);

    // Find HP button on any combatant
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });

    await hpBtn.click();

    // HP adjuster should open
    await expect(
      dmPage.locator('[data-testid="hp-adjuster"], [role="dialog"], .hp-adjust')
    ).toBeVisible({ timeout: 5_000 });

    await dmContext.close();
  });

  test("DM can end encounter", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "40", ac: "16", init: "18" },
      { name: "Villain", hp: "50", ac: "14", init: "10" },
    ]);

    const endBtn = dmPage.locator('[data-testid="end-encounter-btn"]');
    await expect(endBtn).toBeVisible({ timeout: 5_000 });
    await endBtn.click();

    // Confirmation dialog may appear
    const confirmBtn = dmPage.locator(
      'button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Sim"), button:has-text("Yes"), button:has-text("Finalizar")'
    );
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // Active combat should disappear
    await expect(dmPage.locator('[data-testid="active-combat"]')).not.toBeVisible({
      timeout: 10_000,
    });

    await dmContext.close();
  });
});
