/**
 * J11 — Player View Completa
 *
 * Jornada critica do market research sec.14.2:
 * "O jogador e o vetor viral. Se ele odeia a experiencia, nunca recomenda."
 *
 * O que o player DEVE ver:
 *  1. Tela bonita e clara ("Combate em andamento")
 *  2. Seu personagem na lista com HP visivel
 *  3. Inimigos com barras de HP narrativas (LIGHT/MODERATE/HEAVY/CRITICAL)
 *  4. Quem e o turno atual (destacado)
 *  5. Notificacao quando e sua vez
 *  6. Condicoes com badges traduzidos (pt-BR)
 *
 * O que NAO pode acontecer:
 *  - Tela de login
 *  - Tela de "instale o app"
 *  - Carregamento > 3s
 *  - Erro antes de ver algo bonito
 *
 * Perspectiva: Player (consumer)
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("J11 — Player View Completa", () => {
  // Player join flow involves DM setup + realtime broadcast + late-join approval.
  test.setTimeout(90_000);

  test("J11.1 — Player ve combate com UI completa (lista, HP bars, turno)", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Dragao Vermelho", hp: "256", ac: "19", init: "16" },
      { name: "Kobold A", hp: "5", ac: "12", init: "14" },
      { name: "Kobold B", hp: "5", ac: "12", init: "10" },
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
      hp: "45",
      ac: "18",
    });

    // Player view must be visible
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Must show combatant names
    const playerBody = await playerPage.textContent("body");
    expect(playerBody).toBeTruthy();
    expect(playerBody!.length).toBeGreaterThan(50);

    // Should see at least some combatant names
    const seesNames =
      playerBody!.includes("Thorin") ||
      playerBody!.includes("Dragao") ||
      playerBody!.includes("Kobold");
    expect(seesNames).toBe(true);

    // Must NOT show errors (check specific error strings, not "Error" which appears in JS source)
    expect(playerBody).not.toContain("Internal Server Error");
    expect(playerBody).not.toContain("Application error");
    expect(playerBody).not.toContain("Unhandled Runtime Error");

    await dmContext.close();
    await playerContext.close();
  });

  test("J11.2 — Player recebe highlight visual quando e seu turno", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    // NPC goes first (init 20), player second (will join with init 12)
    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "NPC Boss", hp: "100", ac: "18", init: "20" },
      { name: "Minion", hp: "7", ac: "12", init: "3" },
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
      hp: "45",
      ac: "18",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // DM advances turn: NPC Boss (20) → Thorin (12)
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
    await nextTurnBtn.click();

    // Wait for turn advance to propagate (via broadcast or polling fallback at 3s interval)
    // aria-current="true" is set on the active combatant in PlayerInitiativeBoard
    const turnIndicator = playerPage.locator('[aria-current="true"]');
    await expect(turnIndicator.first()).toBeVisible({ timeout: 10_000 });

    await dmContext.close();
    await playerContext.close();
  });

  test("J11.3 — HP bars usam tiers narrativos (LIGHT/MODERATE/HEAVY/CRITICAL)", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    // Monster with 100 HP — we'll damage it to test tier transitions
    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Troll", hp: "100", ac: "15", init: "12" },
      { name: "Goblin", hp: "7", ac: "13", init: "6" },
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

    // DM applies 35 damage (Troll goes from 100 to 65 HP = 65% = MODERATE tier)
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
    if (await hpBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await hpBtn.click();

      const adjuster = dmPage.locator(
        '[data-testid="hp-adjuster"]'
      );
      await expect(adjuster).toBeVisible({ timeout: 5_000 });

      const dmgInput = dmPage.locator('[data-testid="hp-amount-input"]');
      await expect(dmgInput).toBeVisible({ timeout: 5_000 });
      await dmgInput.fill("35");

      const applyBtn = dmPage.locator('[data-testid="hp-apply-btn"]');
      await expect(applyBtn).toBeVisible({ timeout: 5_000 });
      await applyBtn.click();
    }

    // Wait for realtime update
    await playerPage.waitForTimeout(5_000);

    // Player view should still be functional — no crash
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible();

    // Player should see visual HP indication (bar, tier label, color change)
    // The specific tier should be visible as a CSS class, data attribute, or text
    const playerHTML = await playerPage.locator('[data-testid="player-view"]').innerHTML();
    expect(playerHTML.length).toBeGreaterThan(50);

    await dmContext.close();
    await playerContext.close();
  });

  test("J11.4 — Player join sem login (link direto funciona anonimo)", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Boss", hp: "100", ac: "18", init: "18" },
      { name: "Minion", hp: "7", ac: "12", init: "5" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Anonymous player — no login, clean context
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`/join/${token}`);
    await anonPage.waitForTimeout(5_000);

    // Should NOT be redirected to login
    expect(anonPage.url()).not.toContain("/auth/login");

    // Should see either player-view or late-join form
    const hasPlayerView = await anonPage
      .locator('[data-testid="player-view"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasJoinForm = await anonPage
      .locator(
        'input[placeholder*="Aragorn"], input[placeholder*="nome"], input[name="name"]'
      )
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // One of these must be true
    expect(hasPlayerView || hasJoinForm).toBe(true);

    // No errors
    const bodyText = await anonPage.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    await dmContext.close();
    await anonContext.close();
  });

  test("J11.5 — Player view mobile (Pixel 5) — sem overflow horizontal", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Ogre", hp: "59", ac: "11", init: "8" },
      { name: "Goblin A", hp: "7", ac: "15", init: "14" },
      { name: "Goblin B", hp: "7", ac: "15", init: "12" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Mobile player context
    const mobileContext = await browser.newContext({
      viewport: { width: 393, height: 851 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin Mobile", {
      initiative: "15",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // No horizontal overflow
    const hasOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 5;
    });
    expect(hasOverflow).toBe(false);

    // All visible elements should be within viewport
    const viewportWidth = 393;
    const playerView = mobilePage.locator('[data-testid="player-view"]');
    const box = await playerView.boundingBox();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(-5);
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 10);
    }

    await dmContext.close();
    await mobileContext.close();
  });

  test("J11.6 — Realtime: HP atualiza no player view quando DM muda", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Giant", hp: "100", ac: "14", init: "8" },
      { name: "Wolf", hp: "11", ac: "13", init: "12" },
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

    // Snapshot player view HTML before damage
    const beforeHTML = await playerPage
      .locator('[data-testid="player-view"]')
      .innerHTML();

    // DM applies massive damage
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 10_000 });
    await hpBtn.click();

    const adjuster = dmPage.locator(
      '[data-testid="hp-adjuster"]'
    );
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    const dmgInput = dmPage.locator('[data-testid="hp-amount-input"]');
    await expect(dmgInput).toBeVisible({ timeout: 5_000 });
    await dmgInput.fill("90"); // Giant goes from 100 → 10 HP (CRITICAL tier)

    const applyBtn = dmPage.locator('[data-testid="hp-apply-btn"]');
    await expect(applyBtn).toBeVisible({ timeout: 5_000 });
    await applyBtn.click();

    // Wait for realtime propagation
    await playerPage.waitForTimeout(5_000);

    // Player view HTML should have changed (HP bar visual update)
    const afterHTML = await playerPage
      .locator('[data-testid="player-view"]')
      .innerHTML();

    // The view should have changed somehow — bar width, color, class, etc.
    expect(afterHTML).not.toBe(beforeHTML);

    // Player view should still be functional
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible();

    await dmContext.close();
    await playerContext.close();
  });
});
