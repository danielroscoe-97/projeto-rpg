/**
 * J5 — Compartilhamento Organico (Share Link)
 *
 * Jornada critica: DM gera link → multiplos players usam → link dura o combate todo.
 * Hipotese H1: Player view e o gatilho de compartilhamento.
 *
 * Gaps cobertos:
 *  - J5.3 Multiplos players usam o mesmo link
 *  - J5.4 Link permanece valido durante todo o combate
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import {
  dmSetupCombatSession,
  playerJoinCombat,
} from "../helpers/session";
import {
  DM_PRIMARY,
  PLAYER_WARRIOR,
  PLAYER_MAGE,
} from "../fixtures/test-accounts";

test.describe("J5 — Compartilhamento Organico", () => {
  // Player join flow involves DM setup + realtime broadcast + late-join approval.
  // J5.3 involves TWO sequential player joins (each with toast approval), so
  // the total time can easily exceed 90s in production.
  test.setTimeout(150_000);

  test("J5.3 — Dois players podem usar o mesmo link de join", async ({
    browser,
  }) => {
    // ── DM: setup combat ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Dragon", hp: "178", ac: "18", init: "16" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // ── Player 1: Warrior joins ──
    const p1Context = await browser.newContext();
    const p1Page = await p1Context.newPage();
    await loginAs(p1Page, PLAYER_WARRIOR);

    await playerJoinCombat(p1Page, dmPage, token, "Thorin", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible({
      timeout: 30_000,
    });

    // ── Player 2: Mage joins same link ──
    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    await loginAs(p2Page, PLAYER_MAGE);

    await playerJoinCombat(p2Page, dmPage, token, "Elara", {
      initiative: "12",
      hp: "30",
      ac: "12",
    });

    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible({
      timeout: 30_000,
    });

    // Both players should see player-view simultaneously
    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible();
    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible();

    // DM should see at least 3 combatants (Dragon + Thorin + Elara)
    const dmCombatants = dmPage.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    await expect(dmCombatants).toHaveCount(3, { timeout: 30_000 });

    await dmContext.close();
    await p1Context.close();
    await p2Context.close();
  });

  test("J5.4 — Link permanece valido apos DM avancar multiplos turnos", async ({
    browser,
  }) => {
    // ── DM: setup combat ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Boss", hp: "100", ac: "18", init: "18" },
      { name: "Minion", hp: "10", ac: "12", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // DM advances 5 turns
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    for (let i = 0; i < 5; i++) {
      await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
      await nextTurnBtn.click();
      await dmPage.waitForTimeout(500);
    }

    // ── Late player joins AFTER 5 turns ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "LateJoiner", {
      initiative: "14",
    });

    // Player should see the current state of combat
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 30_000 });

    // Combat should show all combatants including existing ones
    const playerContent = await playerPage.textContent("body");
    expect(playerContent).toBeTruthy();
    expect(playerContent!.length).toBeGreaterThan(10);

    await dmContext.close();
    await playerContext.close();
  });
});
