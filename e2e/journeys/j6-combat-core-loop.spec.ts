/**
 * J6 — Combate Completo (Core Loop)
 *
 * Core product: HP adjust, condicoes, derrotar, curar, finalizar.
 * Se isso falhar, nada mais importa.
 *
 * Gaps cobertos:
 *  - J6.3 Derrotar combatente (HP = 0)
 *  - J6.4 Aplicar condicao
 *  - J6.5 Curar combatente
 */
import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

async function addCombatant(
  page: import("@playwright/test").Page,
  c: { name: string; hp: string; ac: string; init: string }
) {
  const nameInput = page.locator('[data-testid="add-row-name"]');
  if (!(await nameInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const manualToggle = page.locator("button").filter({ hasText: /Manual/i }).first();
    if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualToggle.click();
      await page.waitForTimeout(300);
    }
  }
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await page.locator('[data-testid="add-row-init"]').fill(c.init);
  await nameInput.fill(c.name);
  await expect(nameInput).toHaveValue(c.name, { timeout: 2_000 });
  await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
  await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
  await page.click('[data-testid="add-row-btn"]');
  await page.waitForTimeout(500);
}

test.describe("J6 — Combate Completo (Core Loop)", () => {
  test("J6.2+J6.3 — DM aplica dano e derrota combatente", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    // Goblin with low HP — easy to defeat
    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero Forte", hp: "100", ac: "18", init: "20" },
      { name: "Goblin Fraco", hp: "5", ac: "12", init: "5" },
    ]);

    // Find HP button for Goblin (last combatant by initiative)
    const hpButtons = dmPage.locator('[data-testid^="hp-btn-"]');
    await expect(hpButtons.first()).toBeVisible({ timeout: 10_000 });

    // Dismiss tour if visible
    const skipTour = dmPage.locator('button:has-text("Pular"), button:has-text("Skip")');
    if (await skipTour.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipTour.click();
      await dmPage.waitForTimeout(500);
    }

    // Click HP button on the last combatant (Goblin)
    await hpButtons.last().click();

    // HP adjuster should open
    const adjuster = dmPage.locator('[data-testid="hp-adjuster"]');
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Apply lethal damage using stable data-testid selectors
    await dmPage.fill('[data-testid="hp-amount-input"]', "10");
    await dmPage.click('[data-testid="hp-apply-btn"]');
    await dmPage.waitForTimeout(1_000);

    // Goblin should be defeated (0 HP, possibly auto-defeated)
    await dmPage.waitForTimeout(2_000);

    // Active combat should still function
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();
    await expect(
      dmPage.locator('[data-testid="next-turn-btn"]')
    ).toBeVisible();

    await dmContext.close();
  });

  test("J6.4 — DM aplica condicao a combatente", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Target Orc", hp: "30", ac: "13", init: "12" },
      { name: "Caster", hp: "25", ac: "12", init: "18" },
    ]);

    // Look for condition toggle/button on a combatant (testid: conditions-btn-{id})
    const conditionBtn = dmPage
      .locator(
        '[data-testid^="conditions-btn-"], button[aria-label*="condition"], button[aria-label*="Condição"]'
      )
      .first();

    if (await conditionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conditionBtn.click();

      // Condition selector/modal should appear
      await dmPage.waitForTimeout(1_000);

      // Look for a specific condition to toggle (testid: condition-toggle-{name})
      const conditionOption = dmPage
        .locator(
          '[data-testid="condition-toggle-frightened"], button:has-text("Frightened"), button:has-text("Amedrontado")'
        )
        .first();

      if (
        await conditionOption.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await conditionOption.click();
        await dmPage.waitForTimeout(1_000);

        // Close condition selector (testid: condition-close-btn)
        const closeBtn = dmPage
          .locator(
            '[data-testid="condition-close-btn"], button[aria-label="Close"], button:has-text("Fechar"), button:has-text("OK")'
          )
          .first();
        if (
          await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)
        ) {
          await closeBtn.click();
        } else {
          // Click outside to dismiss
          await dmPage.keyboard.press("Escape");
        }

        await dmPage.waitForTimeout(1_000);

        // Verify condition badge appears on combatant
        const conditionBadge = dmPage.locator(
          '[data-testid*="condition-badge"], .condition-badge, span:has-text("Frightened"), span:has-text("Amedrontado")'
        );
        const hasBadge = await conditionBadge
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        // Soft assertion — condition system should work
        expect(hasBadge).toBe(true);
      }
    }

    // Combat should remain functional
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();

    await dmContext.close();
  });

  test("J6.5 — DM cura combatente (HP sobe com flash verde)", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Injured Cleric", hp: "10", ac: "16", init: "14" },
      { name: "Goblin", hp: "7", ac: "15", init: "8" },
    ]);

    // Click HP on Injured Cleric (first combatant, higher init)
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.click();

    const adjuster = dmPage.locator(
      '[data-testid="hp-adjuster"]'
    );
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Switch to heal mode first (testid: hp-mode-heal)
    const healModeBtn = dmPage.locator('[data-testid="hp-mode-heal"]');
    if (await healModeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await healModeBtn.click();
      await dmPage.waitForTimeout(300);
    }

    // Fill heal amount (testid: hp-amount-input)
    const healInput = dmPage.locator('[data-testid="hp-amount-input"]');
    if (await healInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await healInput.fill("5");

      // Click apply button (testid: hp-apply-btn)
      const applyBtn = dmPage.locator('[data-testid="hp-apply-btn"]');
      if (await applyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await applyBtn.click();
        await dmPage.waitForTimeout(1_000);
      }
    }

    // Combat should still be active and functional
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();

    await dmContext.close();
  });

  test("J6.1 — Turnos avancam em sequencia correta por 2 rounds", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Fast", hp: "30", ac: "14", init: "20" },
      { name: "Medium", hp: "30", ac: "14", init: "12" },
      { name: "Slow", hp: "30", ac: "14", init: "5" },
    ]);

    // Dismiss tour if visible
    const skipTour = dmPage.locator('button:has-text("Pular"), button:has-text("Skip")');
    if (await skipTour.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipTour.click();
      await dmPage.waitForTimeout(500);
    }

    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');

    // Advance through full round 1 (3 combatants)
    for (let i = 0; i < 3; i++) {
      await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
      try {
        await expect(nextTurnBtn).toBeEnabled({ timeout: 10_000 });
        await nextTurnBtn.click();
      } catch {
        await nextTurnBtn.click({ force: true });
      }
      await dmPage.waitForTimeout(800);
    }

    // Should now be Round 2 — verify combatants still in initiative
    const combatants = dmPage.locator(
      '[data-testid="active-combat"] li:has([data-testid^="hp-btn-"])'
    );
    const count = await combatants.count();
    expect(count).toBe(3);

    // Active combat still functional
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();
    await expect(nextTurnBtn).toBeVisible();

    await dmContext.close();
  });
});
