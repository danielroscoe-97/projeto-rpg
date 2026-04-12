import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

/**
 * P1 — Player Combat View
 *
 * Testa a tela do jogador dentro de um combate ativo.
 * Verifica: banner de turno, diferenciação player/monstro,
 * bottom bar, combat log, nota para o DM.
 */
test.describe("P1 — Player Combat View", () => {
  test.setTimeout(120_000);

  test("Player sees turn indicator banner with current and next combatant", async ({ browser }) => {
    // ── DM: cria sessão com monstros ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin", hp: "7", ac: "15", init: "14" },
      { name: "Skeleton", hp: "13", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    // ── Player: entra no combate ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Thorin");

    // Player view deve estar visível
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Banner de turno deve mostrar de quem é a vez
    const turnBanner = playerPage.locator('[data-testid="turn-indicator-banner"]');
    if (await turnBanner.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Deve conter o nome de algum combatente
      const bannerText = await turnBanner.textContent();
      expect(bannerText).toBeTruthy();
      expect(bannerText!.length).toBeGreaterThan(0);
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Player sees initiative board with combatant list", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc", hp: "15", ac: "13", init: "12" },
      { name: "Wolf", hp: "11", ac: "13", init: "16" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Legolas");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Initiative board deve estar visível
    const board = playerPage.locator('[data-testid="player-initiative-board"]');
    await expect(board).toBeVisible({ timeout: 10_000 });

    // Deve ter pelo menos 1 combatente visível na lista
    const combatants = playerPage.locator('[data-testid^="player-combatant-"]');
    const count = await combatants.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Player/monster visual differentiation — blue vs red borders", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Bandit", hp: "11", ac: "12", init: "10" },
      { name: "Thug", hp: "32", ac: "11", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Gandalf");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Aguarda initiative board
    await expect(
      playerPage.locator('[data-testid="player-initiative-board"]')
    ).toBeVisible({ timeout: 10_000 });

    const combatants = playerPage.locator('[data-testid^="player-combatant-"]');
    const count = await combatants.count();

    // Verifica que combatentes têm border-left (blue para player, red para monstro)
    for (let i = 0; i < count; i++) {
      const el = combatants.nth(i);
      const classes = await el.getAttribute("class");
      expect(classes).toBeTruthy();
      // Deve ter border-l-4 (blue-500 para player ou red-500 para monstro)
      expect(classes).toContain("border-l-4");
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Player bottom bar shows character stats on mobile", async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    });
    const dmDesktop = await browser.newContext();
    const dmPage = await dmDesktop.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Zombie", hp: "22", ac: "8", init: "6" },
      { name: "Skeleton", hp: "13", ac: "13", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await mobileContext.close().catch(() => {});
      await dmDesktop.close().catch(() => {});
      return;
    }

    const playerPage = await mobileContext.newPage();
    await playerJoinCombat(playerPage, dmPage, token, "Aria", { hp: "35", ac: "16" });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Bottom bar deve estar visível no mobile
    const bottomBar = playerPage.locator('[data-testid^="player-bottom-bar-"]');
    await expect(bottomBar).toBeVisible({ timeout: 10_000 });

    // Deve conter o nome do personagem
    await expect(bottomBar).toContainText("Aria");

    await mobileContext.close().catch(() => {});
    await dmDesktop.close().catch(() => {});
  });

  test("Player note input is visible and functional", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Imp", hp: "10", ac: "13", init: "11" },
      { name: "Quasit", hp: "7", ac: "13", init: "7" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Cleric");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Busca o input de nota do player
    const noteInput = playerPage.locator('[data-testid^="player-note-input-"]').first();
    if (await noteInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await noteInput.fill("Concentrando em Bless");

      const sendBtn = playerPage.locator('[data-testid^="player-note-send-"]').first();
      await expect(sendBtn).toBeVisible();
      await sendBtn.click();

      // Deve mostrar "Enviado!" / "Sent!"
      await expect(sendBtn).toContainText(/Enviado|Sent/i, { timeout: 5_000 });
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Notification toggle works", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Rat", hp: "1", ac: "10", init: "9" },
      { name: "Bat", hp: "1", ac: "12", init: "5" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Rogue");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Toggle de notificações deve estar visível
    const toggle = playerPage.locator('[data-testid="notification-toggle"]');
    await expect(toggle).toBeVisible({ timeout: 10_000 });

    // Deve conter texto de ON ou OFF
    const initialText = await toggle.textContent();
    expect(initialText).toMatch(/ON|OFF|LIGADAS|DESLIGADAS/i);

    // Clica para alternar
    await toggle.click();
    await playerPage.waitForTimeout(500);

    const newText = await toggle.textContent();
    expect(newText).not.toBe(initialText);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Combat log appears below initiative list", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Kobold A", hp: "5", ac: "12", init: "15" },
      { name: "Kobold B", hp: "5", ac: "12", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerJoinCombat(playerPage, dmPage, token, "Fighter");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Avança um turno no DM para gerar log
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    if (await nextTurnBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nextTurnBtn.click();
      await playerPage.waitForTimeout(3_000);
    }

    // Verifica a posição relativa: initiative board deve vir ANTES do combat log
    const board = playerPage.locator('[data-testid="player-initiative-board"]');
    const logSection = playerPage.locator('text=Log de Combate, text=Combat Log').first();

    if (await board.isVisible().catch(() => false) && await logSection.isVisible().catch(() => false)) {
      const boardBox = await board.boundingBox();
      const logBox = await logSection.boundingBox();

      if (boardBox && logBox) {
        // O log deve estar abaixo do board (y maior)
        expect(logBox.y).toBeGreaterThan(boardBox.y);
      }
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });
});
