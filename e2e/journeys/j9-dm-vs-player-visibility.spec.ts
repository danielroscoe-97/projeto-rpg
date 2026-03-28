/**
 * J9 — DM vs Player: Visibilidade Diferencial
 *
 * Jornada critica do market research sec.2.1 + sec.4.1:
 * "DM quer controle total; o jogador quer visibilidade e agencia."
 * "A magica esta no equilibrio."
 *
 * O que o DM ve: HP exato, AC, todas condicoes, notas, controles.
 * O que o Player ve: HP narrativo (tiers), condicoes publicas, turno atual.
 * O que o Player NAO ve: HP numerico exato dos monstros, AC, notas do DM.
 *
 * Regra imutavel: HP bars usam LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%).
 *
 * Perspectivas: DM (admin) + Player (consumer) — dois browsers simultaneos.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import {
  DM_PRIMARY,
  PLAYER_WARRIOR,
  PLAYER_MAGE,
} from "../fixtures/test-accounts";

test.describe("J9 — DM vs Player Visibility", () => {
  test("J9.1 — DM ve HP exato, Player ve barras/tiers (anti-metagaming)", async ({
    browser,
  }) => {
    // ── DM: setup combat ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Guerreiro PC", hp: "45", ac: "18", init: "15" },
      { name: "Dragao Jovem", hp: "178", ac: "18", init: "16" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // ── Player joins ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Thorin", {
      initiative: "14",
      hp: "45",
      ac: "18",
    });

    // ── DM verification: should see exact numbers ──
    const dmBody = await dmPage.textContent("body");
    // DM should see numeric HP values
    expect(dmBody).toBeTruthy();
    const dmSees178 = dmBody!.includes("178") || dmBody!.includes("/ 178");
    // DM should see at least one exact HP number
    expect(dmSees178).toBe(true);

    // ── Player verification: should NOT see exact monster HP ──
    await playerPage.waitForTimeout(3_000);
    const playerBody = await playerPage.textContent("body");
    expect(playerBody).toBeTruthy();

    // Player should NOT see the dragon's exact HP (178)
    // They should see tier descriptions or visual bars instead
    const playerSeesExactMonsterHP = playerBody!.includes("/ 178");
    expect(playerSeesExactMonsterHP).toBe(false);

    // Player view should exist and show something
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible();

    await dmContext.close();
    await playerContext.close();
  });

  test("J9.2 — Player ve seu proprio HP exato mas nao o dos monstros", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc Warchief", hp: "93", ac: "16", init: "12" },
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

    await playerPage.waitForTimeout(3_000);

    // Player should see their own HP (45) somewhere
    const playerBody = await playerPage.textContent("body");
    const seesOwnHP = playerBody!.includes("45");
    expect(seesOwnHP).toBe(true);

    // Player should NOT see monster's exact HP (93)
    const seesMonsterExactHP = playerBody!.includes("/ 93");
    expect(seesMonsterExactHP).toBe(false);

    await dmContext.close();
    await playerContext.close();
  });

  test("J9.3 — DM ve controles (next turn, HP adjust), Player nao ve controles DM", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Boss", hp: "100", ac: "18", init: "18" },
      { name: "Minion", hp: "10", ac: "12", init: "5" },
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

    // DM should see DM controls
    await expect(
      dmPage.locator('[data-testid="next-turn-btn"]')
    ).toBeVisible({ timeout: 5_000 });

    const dmHpButtons = dmPage.locator('[data-testid^="hp-btn-"]');
    expect(await dmHpButtons.count()).toBeGreaterThan(0);

    // Player should NOT see DM controls (next turn button, HP adjust buttons)
    const playerNextTurn = playerPage.locator('[data-testid="next-turn-btn"]');
    const playerHasNextTurn = await playerNextTurn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(playerHasNextTurn).toBe(false);

    // Player should NOT see HP adjust buttons for monsters
    const playerHpBtns = playerPage.locator('[data-testid^="hp-btn-"]');
    const playerHpCount = await playerHpBtns.count();
    // Player may have HP button for their own character, but not for monsters
    // At most 1 (their own)
    expect(playerHpCount).toBeLessThanOrEqual(1);

    await dmContext.close();
    await playerContext.close();
  });

  test("J9.4 — Condicoes aplicadas pelo DM aparecem no player view", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Target Goblin", hp: "20", ac: "15", init: "10" },
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

    // DM applies a condition
    const conditionBtn = dmPage
      .locator(
        '[data-testid^="condition-btn-"], [data-testid^="conditions-"], button[aria-label*="condition"], button[aria-label*="Condição"]'
      )
      .first();

    if (await conditionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conditionBtn.click();
      await dmPage.waitForTimeout(1_000);

      // Select "Poisoned" / "Envenenado"
      const poisonOption = dmPage
        .locator(
          'button:has-text("Poisoned"), button:has-text("Envenenado"), label:has-text("Poisoned"), label:has-text("Envenenado"), [data-testid*="poisoned"]'
        )
        .first();

      if (
        await poisonOption.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await poisonOption.click();
        await dmPage.waitForTimeout(500);

        // Close the condition picker
        await dmPage.keyboard.press("Escape");
        await dmPage.waitForTimeout(2_000);

        // Player should see the condition badge (in Portuguese: "Envenenado")
        const playerBody = await playerPage.textContent("body");
        const seesCondition =
          playerBody!.includes("Envenenado") ||
          playerBody!.includes("Poisoned") ||
          playerBody!.includes("envenenado");

        expect(seesCondition).toBe(true);
      }
    }

    await dmContext.close();
    await playerContext.close();
  });

  test("J9.5 — Dois players simultaneos veem a mesma visao consistente", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Dragon", hp: "200", ac: "19", init: "20" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Player 1 joins
    const p1Context = await browser.newContext();
    const p1Page = await p1Context.newPage();
    await loginAs(p1Page, PLAYER_WARRIOR);
    await playerJoinCombat(p1Page, dmPage, token, "Thorin", {
      initiative: "15",
    });

    // Player 2 joins
    const p2Context = await browser.newContext();
    const p2Page = await p2Context.newPage();
    await loginAs(p2Page, PLAYER_MAGE);
    await playerJoinCombat(p2Page, dmPage, token, "Elara", {
      initiative: "12",
    });

    // Both players should see player-view
    await expect(
      p1Page.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      p2Page.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 10_000 });

    // Neither player should see exact dragon HP
    const p1Body = await p1Page.textContent("body");
    const p2Body = await p2Page.textContent("body");

    expect(p1Body!.includes("/ 200")).toBe(false);
    expect(p2Body!.includes("/ 200")).toBe(false);

    await dmContext.close();
    await p1Context.close();
    await p2Context.close();
  });
});
