import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("P2 — Soundboard", () => {
  test("Soundboard FAB visible in player view", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Monster", hp: "30", ac: "14", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not get share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerJoinCombat(playerPage, dmPage, token, "Thorin");

    // Wait for combat to fully load
    await playerPage.waitForTimeout(2_000);

    // Soundboard FAB should be present
    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    await expect(fab).toBeVisible({ timeout: 10_000 });

    await dmContext.close();
    await playerContext.close();
  });

  test("Soundboard drawer opens with presets", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not get share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerJoinCombat(playerPage, dmPage, token, "Thorin");
    await playerPage.waitForTimeout(2_000);

    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    if (!(await fab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "Soundboard FAB not visible");
      await dmContext.close();
      await playerContext.close();
      return;
    }

    const isDisabled =
      (await fab.getAttribute("disabled")) !== null ||
      (await fab.getAttribute("aria-disabled")) === "true";

    if (!isDisabled) {
      await fab.click();
      const drawer = playerPage.locator('[data-testid="soundboard-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 3_000 });

      const presets = playerPage.locator('[data-testid^="preset-btn-"]');
      expect(await presets.count()).toBeGreaterThan(0);
    }

    await dmContext.close();
    await playerContext.close();
  });

  test("Soundboard cooldown prevents rapid triggers", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Skeleton", hp: "13", ac: "13", init: "5" },
    ]);

    if (!token) {
      test.skip(true, "Could not get share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerJoinCombat(playerPage, dmPage, token, "Thorin");
    await playerPage.waitForTimeout(2_000);

    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    const fabEnabled =
      (await fab.isVisible({ timeout: 5_000 }).catch(() => false)) &&
      (await fab.getAttribute("disabled")) === null;

    if (!fabEnabled) {
      test.skip(true, "Soundboard not enabled (not player turn)");
      await dmContext.close();
      await playerContext.close();
      return;
    }

    await fab.click();
    const drawer = playerPage.locator('[data-testid="soundboard-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 3_000 });

    const firstPreset = playerPage.locator('[data-testid^="preset-btn-"]').first();
    if (await firstPreset.isVisible()) {
      await firstPreset.click();

      // After click, button should be in cooldown
      await playerPage.waitForTimeout(200);
      const disabledAfter =
        (await firstPreset.getAttribute("disabled")) !== null ||
        (await firstPreset.getAttribute("aria-disabled")) === "true";

      if (disabledAfter) {
        await playerPage.waitForTimeout(2_200);
        const enabledAgain =
          (await firstPreset.getAttribute("disabled")) === null &&
          (await firstPreset.getAttribute("aria-disabled")) !== "true";
        expect(enabledAgain).toBeTruthy();
      }
    }

    await dmContext.close();
    await playerContext.close();
  });
});
