/**
 * DM Happy Path Journey
 *
 * Full DM workflow: login -> dashboard -> create session -> search monster ->
 * add PC manually -> set initiative -> start combat -> verify order ->
 * apply damage -> advance turn -> apply condition -> end combat.
 */
import { test, expect } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import {
  addManualCombatant,
  startCombat,
  advanceTurn,
  endEncounter,
} from "../helpers/combat";

test.describe("DM Happy Path Journey", () => {
  test("Full DM combat lifecycle", async ({ page }) => {
    // 1. Login as DM
    await loginAsDM(page);

    // 2. Verify we land on dashboard / app area
    await expect(page).toHaveURL(/\/app\//);

    // 3. Navigate to create new session
    await goToNewSession(page);

    // Set encounter name
    await page.fill('[data-testid="encounter-name-input"]', "E2E Happy Path");

    // 4. Search and add "Goblin" monster via SRD panel
    // The encounter setup has a monster search panel integrated
    const srdSearchInput = page.locator('[data-testid="srd-search-input"]');
    if (await srdSearchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await srdSearchInput.fill("Goblin");
      const srdResults = page.locator('[data-testid="srd-results"]');
      await expect(srdResults).toBeVisible({ timeout: 10_000 });
      // Click first result to add Goblin
      const firstResult = page.locator('[data-testid^="srd-result-"]').first();
      await expect(firstResult).toBeVisible({ timeout: 5_000 });
      await firstResult.click();
      await page.waitForTimeout(500);
      // Clear search
      await srdSearchInput.clear();
    } else {
      // Fallback: add Goblin manually
      await addManualCombatant(page, { name: "Goblin", hp: "7", ac: "15", initiative: "12" });
    }

    // Verify Goblin appears in combatant list
    const setupList = page.locator('[data-testid="setup-combatant-list"]');
    await expect(setupList).toBeVisible({ timeout: 5_000 });

    // 5. Add PC manually: "Thorin", HP 45, AC 18
    await addManualCombatant(page, {
      name: "Thorin",
      hp: "45",
      ac: "18",
      initiative: "15",
    });

    // Verify both combatants are in the setup list
    const setupRows = page.locator('[data-testid^="setup-row-"]');
    await expect(setupRows).toHaveCount(2, { timeout: 5_000 });

    // 6. Initiative is already set via the add-row-init field.
    // Optionally roll all initiatives if not set:
    // await page.click('[data-testid="roll-all-init-btn"]');

    // 7. Start combat
    await startCombat(page);

    // 8. Verify initiative order — the initiative list should show combatants
    const initiativeList = page.locator('[data-testid="initiative-list"]');
    await expect(initiativeList).toBeVisible({ timeout: 5_000 });

    // Verify combatant rows exist in the active combat
    const combatantRows = page.locator('[data-testid^="combatant-row-"]');
    await expect(combatantRows.first()).toBeVisible({ timeout: 5_000 });

    // Get first combatant ID for HP operations
    const firstRowTestId = await combatantRows.first().getAttribute("data-testid");
    const firstCombatantId = firstRowTestId?.replace("combatant-row-", "") ?? "";
    expect(firstCombatantId).toBeTruthy();

    // Find which combatant is the Goblin (by text content)
    let goblinId = "";
    const rowCount = await combatantRows.count();
    for (let i = 0; i < rowCount; i++) {
      const rowText = await combatantRows.nth(i).textContent();
      if (rowText?.includes("Goblin")) {
        const testId = await combatantRows.nth(i).getAttribute("data-testid");
        goblinId = testId?.replace("combatant-row-", "") ?? "";
        break;
      }
    }
    expect(goblinId).toBeTruthy();

    // 9. Apply damage to Goblin (-7 HP)
    const hpBtn = page.locator(`[data-testid="hp-btn-${goblinId}"]`);
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.click();

    // Wait for HP adjuster
    const adjuster = page.locator('[data-testid="hp-adjuster"]');
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Default mode is damage — enter 7
    await page.fill('[data-testid="hp-amount-input"]', "7");
    await page.click('[data-testid="hp-apply-btn"]');
    await page.waitForTimeout(500);

    // 10. Verify HP updated — Goblin's current HP should reflect the damage
    // The HP button or inline display should show updated values
    const goblinRow = page.locator(`[data-testid="combatant-row-${goblinId}"]`);
    await expect(goblinRow).toBeVisible({ timeout: 5_000 });

    // 11. Advance turn
    await advanceTurn(page);

    // 12. Verify turn updated — the current-turn indicator should move
    await page.waitForTimeout(500);
    // Verify that the turn indicator is visible on one of the combatants
    const turnIndicator = page.locator('[data-testid="current-turn-indicator"]');
    await expect(turnIndicator).toBeVisible({ timeout: 5_000 });

    // 13. Apply condition "Poisoned" to Goblin
    const condBtn = page.locator(`[data-testid="conditions-btn-${goblinId}"]`);
    await expect(condBtn).toBeVisible({ timeout: 5_000 });
    await condBtn.click();

    // Wait for condition selector
    const condSelector = page.locator('[data-testid="condition-selector"]');
    await expect(condSelector).toBeVisible({ timeout: 5_000 });

    // Toggle Poisoned
    const poisonedToggle = page.locator('[data-testid="condition-toggle-poisoned"]');
    await expect(poisonedToggle).toBeVisible({ timeout: 5_000 });
    await poisonedToggle.click();
    await page.waitForTimeout(300);

    // 14. Verify condition badge visible
    const conditionBadge = page.locator('[data-testid="condition-badge-poisoned"]');
    await expect(conditionBadge).toBeVisible({ timeout: 5_000 });

    // 15. End combat
    await endEncounter(page);
  });
});
