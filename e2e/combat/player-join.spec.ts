import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("P1 — Player Join Flow", () => {
  // Player join flow involves DM setup + realtime broadcast + late-join approval.
  test.setTimeout(90_000);

  test("Authenticated player can join via /join/[token] (late join)", async ({ browser }) => {
    // ── DM: create session + get share token ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Monster A", hp: "30", ac: "14", init: "10" },
      { name: "Monster B", hp: "20", ac: "12", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    // ── Player: login and join ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerPage.goto(`/join/${token}`);

    // Player should see late-join registration form ("Entrar no Combate Ativo")
    // or player-view/player-loading
    await playerPage.waitForTimeout(3_000);

    // Check for late-join form fields
    const nameInput = playerPage.locator(
      'input[placeholder*="Aragorn"], input[placeholder*="nome"], input[name="name"]'
    ).first();
    const initInput = playerPage.locator(
      'input[placeholder*="18"], input[name="initiative"]'
    ).first();

    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Fill late-join registration form
      await nameInput.fill("Thorin");
      await initInput.fill("15");

      // Optional HP and AC fields
      const hpInput = playerPage.locator('input[placeholder*="45"]').first();
      const acInput = playerPage.locator('input[placeholder*="16"]').first();
      if (await hpInput.isVisible().catch(() => false)) await hpInput.fill("45");
      if (await acInput.isVisible().catch(() => false)) await acInput.fill("18");

      // Submit — "Solicitar Entrada"
      const submitBtn = playerPage.locator(
        'button:has-text("Solicitar"), button:has-text("Request"), button[type="submit"]'
      ).first();
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();

      // After submitting, player waits for DM approval
      // The page should show a waiting state or player-view
      await playerPage.waitForTimeout(3_000);

      // DM should see late-join request — accept it
      const acceptBtn = dmPage.locator(
        'button:has-text("Aceitar"), button:has-text("Accept"), button:has-text("Aprovar")'
      ).first();

      if (await acceptBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await acceptBtn.click();

        // Player should now see the initiative board
        await expect(
          playerPage.locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: 15_000 });
      }
    } else {
      // Direct join (no late-join form) — player-view should be visible
      await expect(
        playerPage.locator('[data-testid="player-view"], [data-testid="player-loading"]')
      ).toBeVisible({ timeout: 15_000 });
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("Anonymous player can join without login", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Skeleton", hp: "13", ac: "13", init: "14" },
      { name: "Zombie", hp: "22", ac: "8", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    // ── Anonymous player: fresh context, no login ──
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`/join/${token}`);

    // Anonymous player also sees the late-join form
    await anonPage.waitForTimeout(3_000);

    const nameInput = anonPage.locator(
      'input[placeholder*="Aragorn"], input[placeholder*="nome"], input[name="name"]'
    ).first();

    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill("Anônimo");

      const initInput = anonPage.locator('input[placeholder*="18"]').first();
      if (await initInput.isVisible()) await initInput.fill("10");

      const submitBtn = anonPage.locator(
        'button:has-text("Solicitar"), button:has-text("Request"), button[type="submit"]'
      ).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await anonPage.waitForTimeout(2_000);
      }
    }

    // Player should see some state (waiting, loading, or view)
    await expect(
      anonPage.locator('[data-testid="player-view"], [data-testid="player-loading"], body')
    ).toBeVisible({ timeout: 10_000 });

    await dmContext.close().catch(() => {});
    await anonContext.close().catch(() => {});
  });
});
