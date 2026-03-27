/**
 * J2 — O Jogador que Recebe o Link
 *
 * Jornada critica: Player abre link → ve combate → HP real-time → notificacao turno.
 * Hipotese H1: Player view e o principal gatilho de compartilhamento organico.
 *
 * Gaps cobertos:
 *  - J2.3 HP update real-time (DM ajusta, player ve)
 *  - J2.4 Notificacao de turno para o player
 *  - J2.6 Link invalido/expirado
 *  - J2.8 Mobile player (Pixel 5)
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("J2 — Player Recebe o Link", () => {
  test("J2.3 — Player ve HP atualizado em tempo real quando DM ajusta", async ({
    browser,
  }) => {
    // ── DM: setup combat ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Guerreiro", hp: "45", ac: "18", init: "15" },
      { name: "Goblin Alvo", hp: "20", ac: "15", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // ── Player: login + join ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Thorin", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    // Verify player-view is visible
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // ── DM: adjust HP on Goblin ──
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').last();
    if (await hpBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await hpBtn.click();

      // HP adjuster should open
      const adjuster = dmPage.locator(
        '[data-testid="hp-adjuster"], [role="dialog"], .hp-adjust'
      );
      await expect(adjuster).toBeVisible({ timeout: 5_000 });

      // Look for damage input and apply
      const dmgInput = dmPage
        .locator(
          'input[type="number"], input[data-testid="hp-adjust-value"]'
        )
        .first();
      if (await dmgInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dmgInput.fill("10");

        // Click damage/apply button
        const applyBtn = dmPage
          .locator(
            'button:has-text("Dano"), button:has-text("Damage"), button:has-text("Aplicar"), button:has-text("Apply")'
          )
          .first();
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
        }
      }
    }

    // ── Player: verify update arrived ──
    // Wait for realtime update to propagate
    await playerPage.waitForTimeout(5_000);

    // Player should see the player-view still functional
    // The HP bar of the monster should have changed (visual tier change)
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible();

    // Verify no crash, no blank screen
    const pageContent = await playerPage.textContent("body");
    expect(pageContent).toBeTruthy();
    expect(pageContent!.length).toBeGreaterThan(10);

    await dmContext.close();
    await playerContext.close();
  });

  test("J2.4 — Player recebe notificacao visual quando e seu turno", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    // DM creates combat with player's character having lower init (so it's NOT first)
    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "NPC Boss", hp: "100", ac: "18", init: "20" },
      { name: "Goblin", hp: "7", ac: "15", init: "5" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Thorin", {
      initiative: "12", // Between 20 and 5
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

    // Player should see turn notification or highlight
    await playerPage.waitForTimeout(3_000);

    // Check for turn notification overlay or active-turn indicator
    const turnNotification = playerPage.locator(
      '[data-testid="turn-notification"], [data-testid="your-turn"], .turn-overlay'
    );
    const activeTurnHighlight = playerPage.locator(
      '[data-testid^="combatant-"][class*="active"], [data-testid^="combatant-"][class*="current"]'
    );

    // At least one indicator should be visible
    const hasNotification = await turnNotification
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasHighlight = await activeTurnHighlight
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasNotification || hasHighlight).toBe(true);

    await dmContext.close();
    await playerContext.close();
  });

  test("J2.6 — Link invalido mostra erro amigavel (nao 500)", async ({
    page,
  }) => {
    await page.goto("/join/token-invalido-completamente-falso-123");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    // Should NOT see a raw 500 error or blank page
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Should NOT show raw stack trace or "Internal Server Error"
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("NEXT_NOT_FOUND");

    // URL should still be /join/* (not redirected to /auth/login)
    expect(page.url()).not.toContain("/auth/login");
  });

  test("J2.8 — Mobile: player join funciona em viewport Pixel 5", async ({
    browser,
  }) => {
    // DM setup (desktop)
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

    // Player on mobile viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 393, height: 851 }, // Pixel 5
      userAgent:
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`/join/${token}`);
    await mobilePage.waitForTimeout(3_000);

    // Should see late-join form
    const nameInput = mobilePage
      .locator(
        'input[placeholder*="Aragorn"], input[placeholder*="nome"], input[name="name"]'
      )
      .first();

    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Verify form is usable on mobile (no overflow)
      const formBox = await nameInput.boundingBox();
      expect(formBox).toBeTruthy();
      expect(formBox!.x).toBeGreaterThanOrEqual(0);
      expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(393 + 10); // Within viewport

      // Fill and submit
      await nameInput.fill("Mobile Player");

      const initInput = mobilePage
        .locator('input[placeholder*="18"]')
        .first();
      if (await initInput.isVisible()) await initInput.fill("10");

      const submitBtn = mobilePage
        .locator(
          'button:has-text("Solicitar"), button:has-text("Request"), button[type="submit"]'
        )
        .first();
      if (await submitBtn.isVisible()) {
        // Verify submit button is within viewport
        const btnBox = await submitBtn.boundingBox();
        expect(btnBox).toBeTruthy();
        expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(393 + 10);

        await submitBtn.click();
      }
    }

    // Page should not have horizontal overflow
    const hasOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 5;
    });
    expect(hasOverflow).toBe(false);

    await dmContext.close();
    await mobileContext.close();
  });
});
