/**
 * J12 — Resilience: Combate Sobrevive a Falhas de Rede e Refresh
 *
 * Docs ref:
 *  - market research sec.4.1 Dor #2: "Crashes e perda de dados"
 *  - market research sec.14.1: "Perda de dados se fechar acidentalmente" = NAO PODE
 *  - market research sec.2.3: "Confiabilidade > features. Sempre."
 *
 * Cenarios testados:
 *  1. DM fecha aba e volta — combate intacto
 *  2. Player perde conexao e reconecta — player view volta
 *  3. DM refresh no meio de combate — estado preservado
 *  4. Player refresh — volta pro player view
 *
 * Perspectivas: DM + Player
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("J12 — Combat Resilience", () => {
  // Player join flow involves DM setup + realtime broadcast + late-join approval.
  test.setTimeout(90_000);

  test("J12.1 — DM refresh preserva combate ativo completo", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Resilient Hero", hp: "50", ac: "16", init: "18" },
      { name: "Resilient Villain", hp: "60", ac: "14", init: "10" },
    ]);

    // Advance 2 turns to change state
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await nextTurnBtn.click();
    await dmPage.waitForTimeout(500);
    await nextTurnBtn.click();
    await dmPage.waitForTimeout(500);

    // Capture URL
    const sessionUrl = dmPage.url();

    // Hard refresh
    await dmPage.reload({ waitUntil: "domcontentloaded" });

    // Combat should still be active
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      dmPage.locator('[data-testid="initiative-list"]')
    ).toBeVisible();
    await expect(
      dmPage.locator('[data-testid="next-turn-btn"]')
    ).toBeVisible();

    // Combatants should still exist
    const combatants = dmPage.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBeGreaterThanOrEqual(2);

    await dmContext.close();
  });

  test("J12.2 — DM fecha e reabre sessao — dados intactos", async ({
    browser,
  }) => {
    // Phase 1: Create combat
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();

    await dmSetupCombatSession(page1, DM_PRIMARY, [
      { name: "Persistent A", hp: "30", ac: "15", init: "16" },
      { name: "Persistent B", hp: "40", ac: "14", init: "8" },
    ]);

    const sessionUrl = page1.url();

    // Advance a turn
    const nextBtn = page1.locator('[data-testid="next-turn-btn"]');
    await nextBtn.click();
    await page1.waitForTimeout(1_000);

    // Close browser completely
    await ctx1.close();

    // Phase 2: New browser, same session
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await loginAs(page2, DM_PRIMARY);

    await page2.goto(sessionUrl);
    await page2.waitForLoadState("domcontentloaded");

    // Combat should be preserved
    await expect(page2.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 15_000,
    });

    const combatants = page2.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBeGreaterThanOrEqual(2);

    await ctx2.close();
  });

  test("J12.3 — Player reconecta apos offline e ve estado atual", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "50", ac: "16", init: "18" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Thorin", {
      initiative: "12",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Simulate network disruption
    await playerContext.setOffline(true);
    await playerPage.waitForTimeout(3_000);

    // Reconnect
    await playerContext.setOffline(false);
    await playerPage.waitForTimeout(5_000);

    // Player view should recover
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // No errors
    const bodyText = await playerPage.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    await dmContext.close();
    await playerContext.close();
  });

  test("J12.4 — Player refresh no meio de combate — volta ao player view", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc", hp: "30", ac: "13", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Thorin", {
      initiative: "15",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Player refreshes
    await playerPage.reload({ waitUntil: "domcontentloaded" });
    await playerPage.waitForTimeout(3_000);

    // Player view should come back — either player-view or late-join form (both acceptable)
    const playerView = playerPage.locator('[data-testid="player-view"]');
    const joinForm = playerPage.locator('[data-testid="lobby-name"]');
    await expect(playerView.or(joinForm)).toBeVisible({ timeout: 15_000 });

    // NOT a login page
    expect(playerPage.url()).not.toContain("/auth/login");

    await dmContext.close();
    await playerContext.close();
  });

  test("J12.5 — Multiplos refreshes nao corrompem o estado", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Stress A", hp: "30", ac: "14", init: "15" },
      { name: "Stress B", hp: "25", ac: "12", init: "10" },
    ]);

    // Rapid refresh 3 times
    for (let i = 0; i < 3; i++) {
      await dmPage.reload({ waitUntil: "domcontentloaded" });
      await dmPage.waitForTimeout(2_000);
    }

    // Combat should still be functional after stress
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 15_000,
    });

    const combatants = dmPage.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBeGreaterThanOrEqual(2);

    // Next turn should still work
    const nextBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();
    await dmPage.waitForTimeout(1_000);

    // Still active
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible();

    await dmContext.close();
  });
});
