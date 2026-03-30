/**
 * Player Mobile Journey
 *
 * Two browser contexts — DM (desktop) + Player (mobile iPhone 14).
 * Tests the full flow: DM creates session, player joins on mobile,
 * verifies visibility rules (no numeric HP for monsters), turn updates.
 */
import { test, expect, devices } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import {
  goToNewSession,
  getShareToken,
  playerJoinCombat,
} from "../helpers/session";
import {
  addManualCombatant,
  startCombat,
  advanceTurn,
} from "../helpers/combat";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("Player Mobile Journey", () => {
  test("Player joins on mobile, sees initiative board, no numeric monster HP", async ({
    browser,
  }) => {
    // Create two browser contexts: desktop DM + mobile player
    const dmContext = await browser.newContext({
      ...devices["Desktop Chrome"],
    });
    const playerContext = await browser.newContext({
      ...devices["iPhone 14"],
    });

    const dmPage = await dmContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      // 1. DM: Login, create session, add combatants, start combat
      await loginAs(dmPage, DM_PRIMARY);
      await goToNewSession(dmPage);

      await dmPage.fill('[data-testid="encounter-name-input"]', "E2E Mobile Player");

      // Add a monster and a PC
      await addManualCombatant(dmPage, {
        name: "Goblin",
        hp: "7",
        ac: "15",
        initiative: "12",
      });
      await addManualCombatant(dmPage, {
        name: "Paladin",
        hp: "45",
        ac: "18",
        initiative: "15",
      });

      // 2. DM: Get session share token
      const token = await getShareToken(dmPage);
      expect(token).toBeTruthy();

      // Start combat
      await startCombat(dmPage);
      await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({
        timeout: 20_000,
      });

      // 3. Player: Open join link on mobile viewport
      // 4. Player: Fill lobby form and join
      await playerJoinCombat(playerPage, dmPage, token!, PLAYER_WARRIOR.displayName, {
        initiative: "15",
        hp: "45",
        ac: "18",
      });

      // 5. Player: Verify initiative board visible
      const initiativeBoard = playerPage.locator('[data-testid="player-initiative-board"]');
      await expect(initiativeBoard).toBeVisible({ timeout: 15_000 });

      // 6. DM: Apply damage to monster (Goblin)
      const dmCombatantRows = dmPage.locator('[data-testid^="combatant-row-"]');
      let goblinId = "";
      const rowCount = await dmCombatantRows.count();
      for (let i = 0; i < rowCount; i++) {
        const rowText = await dmCombatantRows.nth(i).textContent();
        if (rowText?.includes("Goblin")) {
          const testId = await dmCombatantRows.nth(i).getAttribute("data-testid");
          goblinId = testId?.replace("combatant-row-", "") ?? "";
          break;
        }
      }

      if (goblinId) {
        const hpBtn = dmPage.locator(`[data-testid="hp-btn-${goblinId}"]`);
        await hpBtn.click();
        await expect(dmPage.locator('[data-testid="hp-adjuster"]')).toBeVisible({ timeout: 5_000 });
        await dmPage.fill('[data-testid="hp-amount-input"]', "3");
        await dmPage.click('[data-testid="hp-apply-btn"]');
        await dmPage.waitForTimeout(1_000);
      }

      // 7. Player: Wait for realtime update and verify HP status changed
      // Player should see a status label (LIGHT/MODERATE/HEAVY/CRITICAL), not numeric HP
      await playerPage.waitForTimeout(3_000);

      // 8. Player: Verify NO numeric monster HP visible (anti-metagaming rule)
      const playerBoard = playerPage.locator('[data-testid="player-initiative-board"]');
      const boardText = await playerBoard.textContent();
      // Goblin's exact HP "X / 7" must NEVER appear in the player view
      const hasNumericGoblinHp = /\d+\s*\/\s*7/.test(boardText ?? "");
      expect(hasNumericGoblinHp).toBe(false);

      // Player SHOULD see a status label for the monster (LIGHT, MODERATE, etc.)
      const statusText = await playerBoard.textContent();
      const hasStatusLabel = /light|moderate|heavy|critical|leve|moderado|grave|crítico/i.test(statusText ?? "");
      expect(hasStatusLabel).toBe(true);

      // 9. DM: Advance turn
      await advanceTurn(dmPage);

      // 10. Player: Verify turn indicator updated
      await playerPage.waitForTimeout(2_000);
      const turnBanner = playerPage.locator('[data-testid="turn-indicator-banner"]');
      const dmTurnIndicator = playerPage.locator('[data-testid="dm-turn-indicator"]');
      await expect(turnBanner.or(dmTurnIndicator)).toBeVisible({ timeout: 10_000 });

      // 11. Player: Open spell oracle and search "Fireball"
      const oracleBtn = playerPage.locator('[data-testid="player-oracle-btn"]');
      await expect(oracleBtn).toBeVisible({ timeout: 5_000 });
      await oracleBtn.click();

      const oraclePanel = playerPage.locator('[data-testid="player-oracle"]');
      await expect(oraclePanel).toBeVisible({ timeout: 5_000 });

      // 12. Player: Verify spell search works on mobile
      const spellSearch = oraclePanel.locator('input[type="text"], input[type="search"]').first();
      if (await spellSearch.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await spellSearch.fill("Fireball");
        // Verify results appear
        await playerPage.waitForTimeout(1_000);
        const oracleText = await oraclePanel.textContent();
        expect(oracleText?.toLowerCase()).toContain("fireball");
      }
    } finally {
      await dmContext.close();
      await playerContext.close();
    }
  });
});
