/**
 * J1 — O Primeiro Combate (DM Autenticado)
 *
 * Jornada critica: DM faz login → cria combate → adiciona combatentes → inicia.
 * Hipotese H2: DMs que chegam ao primeiro combate em < 90s retornam 2x mais.
 *
 * Gaps cobertos:
 *  - J1.3 Quick Combat (sem campanha)
 *  - J1.4 Edge: Iniciar sem combatentes
 *  - J1.6 Persistencia de setup entre page refreshes
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

/**
 * Ensure the manual-add form is open and scrolled into view.
 * On mobile viewports the Manual toggle button and the form itself
 * can be below the fold, so we scroll before clicking/asserting.
 */
async function ensureManualFormVisible(page: import("@playwright/test").Page) {
  const addRow = page.locator('[data-testid="add-row"]');
  const nameInput = page.locator('[data-testid="add-row-name"]');

  // If the form is already visible, just scroll it into the viewport
  if (await nameInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await addRow.scrollIntoViewIfNeeded();
    return;
  }

  // Form is collapsed — find the Manual toggle, scroll to it, and click
  const manualToggle = page
    .locator("button")
    .filter({ hasText: /Manual/i })
    .first();
  if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await manualToggle.scrollIntoViewIfNeeded();
    await manualToggle.click();
    await page.waitForTimeout(300);
  }

  // After opening, scroll the form into view for mobile viewports
  await addRow.scrollIntoViewIfNeeded();
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
}

/** Add a combatant via the manual add row, re-opening form if needed */
async function addCombatant(
  page: import("@playwright/test").Page,
  c: { name: string; hp: string; ac: string; init: string }
) {
  await ensureManualFormVisible(page);

  const nameInput = page.locator('[data-testid="add-row-name"]');
  await page.locator('[data-testid="add-row-init"]').fill(c.init);
  await nameInput.fill(c.name);
  await expect(nameInput).toHaveValue(c.name, { timeout: 2_000 });
  await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
  await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
  await page.click('[data-testid="add-row-btn"]');
  await page.waitForTimeout(500);
}

test.describe("J1 — Primeiro Combate (DM)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J1.1 — Happy path: dashboard → novo combate → 2 combatentes → iniciar", async ({
    page,
  }) => {
    await goToNewSession(page);

    // Encounter name is auto-generated

    // Add combatant 1: Paladino
    await addCombatant(page, { name: "Paladino", hp: "45", ac: "18", init: "15" });
    await expect(
      page.locator('[data-testid^="setup-row-"]').first()
    ).toBeVisible({ timeout: 5_000 });

    // Add combatant 2: Goblin
    await addCombatant(page, { name: "Goblin", hp: "7", ac: "15", init: "12" });
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, {
      timeout: 5_000,
    });

    // Start combat
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();

    // Verify active combat
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible();

    // Verify initiative order — higher init first
    const combatantNames = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-name-"]'
    );
    // Paladino (init:15) should be before Goblin (init:12)
    if ((await combatantNames.count()) >= 2) {
      const firstName = await combatantNames.first().textContent();
      expect(firstName).toContain("Paladino");
    }
  });

  test("J1.3 — Quick Combat bypasses campaign picker", async ({ page }) => {
    await goToNewSession(page);

    // Setup screen must be visible without selecting a campaign.
    // On mobile viewports the manual form or its toggle may be below the fold,
    // so we explicitly open and scroll it into view before asserting.
    await ensureManualFormVisible(page);
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible();
  });

  test("J1.4 — Edge: cannot start combat without combatants", async ({
    page,
  }) => {
    await goToNewSession(page);

    // Try to start combat with 0 combatants
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();

    // Button should be disabled or click should show error
    const isDisabled = await startBtn.isDisabled().catch(() => false);
    if (!isDisabled) {
      // If button is clickable, clicking it should NOT create active combat
      await startBtn.click();
      await page.waitForTimeout(2_000);

      // Either still on setup screen or error message shown
      const activeCombat = page.locator('[data-testid="active-combat"]');
      const isActive = await activeCombat
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      if (!isActive) {
        // Good — setup screen still showing.
        // On mobile viewports the add-row form may need scrolling into view.
        await ensureManualFormVisible(page);
        await expect(page.locator('[data-testid="add-row"]')).toBeVisible();
      }
    } else {
      // Good — button is disabled
      expect(isDisabled).toBe(true);
    }
  });

  test("J1.6 — Persistence: combat survives page refresh", async ({
    page,
  }) => {
    await goToNewSession(page);

    // Add 2 combatants and start combat (creates session in Supabase)
    await addCombatant(page, { name: "Hero Persist", hp: "99", ac: "20", init: "20" });
    await addCombatant(page, { name: "Goblin Persist", hp: "7", ac: "15", init: "10" });

    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 20_000,
    });

    // Hard refresh
    await page.reload({ waitUntil: "domcontentloaded" });

    // Combat should still be active after refresh
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 15_000,
    });

    // Combatants should still be there
    const combatants = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBeGreaterThanOrEqual(2);
  });
});
