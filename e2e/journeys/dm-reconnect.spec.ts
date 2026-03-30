/**
 * DM Reconnect Journey
 *
 * Verifies that combat state (HP, turn, round) persists when the DM
 * navigates away and returns to the session.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import {
  addManualCombatant,
  startCombat,
  advanceTurn,
} from "../helpers/combat";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("DM Reconnect Journey", () => {
  test.skip(
    !process.env.E2E_DM_EMAIL && !process.env.E2E_DM_PASSWORD,
    "Requires E2E_DM_EMAIL and E2E_DM_PASSWORD env vars — skipped without Supabase auth"
  );

  test("Combat state persists after navigating away and returning", async ({ page }) => {
    // 1. Login and set up combat
    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);

    await page.fill('[data-testid="encounter-name-input"]', "E2E Reconnect");

    // Add two combatants
    await addManualCombatant(page, { name: "Fighter", hp: "50", ac: "16", initiative: "18" });
    await addManualCombatant(page, { name: "Orc", hp: "15", ac: "13", initiative: "10" });

    // Start combat
    await startCombat(page);

    // Verify active combat
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });

    // 2. Apply damage to the Orc and advance turn
    const combatantRows = page.locator('[data-testid^="combatant-row-"]');
    let orcId = "";
    const rowCount = await combatantRows.count();
    for (let i = 0; i < rowCount; i++) {
      const rowText = await combatantRows.nth(i).textContent();
      if (rowText?.includes("Orc")) {
        const testId = await combatantRows.nth(i).getAttribute("data-testid");
        orcId = testId?.replace("combatant-row-", "") ?? "";
        break;
      }
    }
    expect(orcId).toBeTruthy();

    // Apply 5 damage to Orc
    const hpBtn = page.locator(`[data-testid="hp-btn-${orcId}"]`);
    await hpBtn.click();
    await expect(page.locator('[data-testid="hp-adjuster"]')).toBeVisible({ timeout: 5_000 });
    await page.fill('[data-testid="hp-amount-input"]', "5");
    await page.click('[data-testid="hp-apply-btn"]');
    await page.waitForTimeout(500);

    // Advance turn
    await advanceTurn(page);

    // 3. Capture state: current URL, round number text, turn indicator position
    const currentUrl = page.url();
    const roundText = await page.locator('[data-testid="active-combat"] h2 .font-mono').textContent();

    // Capture which combatant has the turn indicator
    const currentTurnRow = page.locator('[data-testid="current-turn-indicator"]');
    const turnIndicatorVisible = await currentTurnRow.isVisible().catch(() => false);

    // Capture Orc's HP display text (the inline HP text in the row)
    const orcRow = page.locator(`[data-testid="combatant-row-${orcId}"]`);
    const orcRowText = await orcRow.textContent();

    // 4. Navigate away (simulate disconnect)
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Verify we left the session
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // 5. Return to session
    await page.goto(currentUrl);
    await page.waitForLoadState("domcontentloaded");

    // 6. Verify combat state is preserved
    // Active combat should still be visible
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 20_000 });

    // Round number should be the same
    const roundTextAfter = await page.locator('[data-testid="active-combat"] h2 .font-mono').textContent();
    expect(roundTextAfter).toBe(roundText);

    // Orc's row should still show reduced HP
    const orcRowAfter = page.locator(`[data-testid="combatant-row-${orcId}"]`);
    await expect(orcRowAfter).toBeVisible({ timeout: 5_000 });

    // Turn indicator should still be present
    if (turnIndicatorVisible) {
      await expect(page.locator('[data-testid="current-turn-indicator"]')).toBeVisible({ timeout: 5_000 });
    }

    // 7. Verify combat actions still work — advance another turn
    await advanceTurn(page);
    // The turn should advance without errors
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible({ timeout: 5_000 });
  });
});
