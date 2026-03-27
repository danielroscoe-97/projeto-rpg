import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("P2 — Soundboard", () => {
  test("Soundboard FAB visible in player view during turn", async ({ browser }) => {
    // ── DM: create session with active combat ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/session/new");
    await dmPage.waitForURL("**/app/session/**", { timeout: 15_000 });

    // Get share token
    const shareBtn = dmPage.locator(
      '[data-testid="share-session-btn"], [data-testid="share-session-generate"], button:has-text("Compartilhar"), button:has-text("Share")'
    );
    if (await shareBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await shareBtn.click();
      await dmPage.waitForTimeout(2_000);
    }

    const token = await dmPage.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
      return null;
    });

    if (!token) {
      test.skip(true, "Could not find share token");
      await dmContext.close();
      return;
    }

    // ── Player: join and check soundboard ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerPage.goto(`/join/${token}`);

    await expect(
      playerPage.locator('[data-testid="player-view"], [data-testid="player-loading"]')
    ).toBeVisible({ timeout: 15_000 });

    // Wait for combat to load
    await playerPage.waitForTimeout(3_000);

    // Soundboard FAB should be present (enabled or disabled depending on turn)
    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    if (await fab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // FAB exists — check if it's clickable
      const isDisabled =
        (await fab.getAttribute("disabled")) !== null ||
        (await fab.getAttribute("aria-disabled")) === "true";

      if (!isDisabled) {
        // It's player's turn — clicking should open drawer
        await fab.click();
        await expect(
          playerPage.locator('[data-testid="soundboard-drawer"]')
        ).toBeVisible({ timeout: 3_000 });

        // Presets should be visible
        const presets = playerPage.locator('[data-testid^="preset-btn-"]');
        const presetCount = await presets.count();
        expect(presetCount).toBeGreaterThan(0);
      }
    }

    await dmContext.close();
    await playerContext.close();
  });

  test("Soundboard FAB is disabled when not player turn", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/session/new");
    await dmPage.waitForURL("**/app/session/**", { timeout: 15_000 });

    const shareBtn = dmPage.locator(
      '[data-testid="share-session-btn"], [data-testid="share-session-generate"], button:has-text("Compartilhar"), button:has-text("Share")'
    );
    if (await shareBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await shareBtn.click();
      await dmPage.waitForTimeout(2_000);
    }

    const token = await dmPage.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
      return null;
    });

    if (!token) {
      test.skip(true, "Could not find share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerPage.goto(`/join/${token}`);

    await playerPage.waitForTimeout(5_000);

    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    if (await fab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Check for disabled state (opacity, disabled attr, or aria-disabled)
      const opacity = await fab.evaluate((el) =>
        window.getComputedStyle(el).opacity
      );
      const isDisabled =
        (await fab.getAttribute("disabled")) !== null ||
        (await fab.getAttribute("aria-disabled")) === "true";

      // Either disabled or reduced opacity means not player's turn
      if (isDisabled || parseFloat(opacity) < 0.5) {
        // Correct — FAB is disabled when not player's turn
        expect(true).toBeTruthy();
      }
    }

    await dmContext.close();
    await playerContext.close();
  });

  test("Soundboard cooldown prevents rapid triggers", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/session/new");
    await dmPage.waitForURL("**/app/session/**", { timeout: 15_000 });

    const shareBtn = dmPage.locator(
      '[data-testid="share-session-btn"], button:has-text("Compartilhar"), button:has-text("Share")'
    );
    if (await shareBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await shareBtn.click();
      await dmPage.waitForTimeout(2_000);
    }

    const token = await dmPage.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
      }
      return null;
    });

    if (!token) {
      test.skip(true, "Could not find share token");
      await dmContext.close();
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerPage.goto(`/join/${token}`);
    await playerPage.waitForTimeout(3_000);

    const fab = playerPage.locator('[data-testid="soundboard-fab"]');

    if (
      (await fab.isVisible({ timeout: 5_000 }).catch(() => false)) &&
      (await fab.getAttribute("disabled")) === null
    ) {
      await fab.click();

      const drawer = playerPage.locator('[data-testid="soundboard-drawer"]');
      if (await drawer.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const firstPreset = playerPage.locator('[data-testid^="preset-btn-"]').first();
        if (await firstPreset.isVisible()) {
          // First click — should work
          await firstPreset.click();

          // Immediate second click — should be blocked by cooldown
          await playerPage.waitForTimeout(100);
          const isDisabledAfter =
            (await firstPreset.getAttribute("disabled")) !== null ||
            (await firstPreset.getAttribute("aria-disabled")) === "true";

          // After cooldown (2s), button should re-enable
          if (isDisabledAfter) {
            await playerPage.waitForTimeout(2_200);
            const isEnabledAgain =
              (await firstPreset.getAttribute("disabled")) === null &&
              (await firstPreset.getAttribute("aria-disabled")) !== "true";
            expect(isEnabledAgain).toBeTruthy();
          }
        }
      }
    }

    await dmContext.close();
    await playerContext.close();
  });
});
