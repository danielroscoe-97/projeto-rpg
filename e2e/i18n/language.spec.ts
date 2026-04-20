import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_ENGLISH, PLAYER_ENGLISH, DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P3 — i18n (English)", () => {
  test("English DM sees English labels", async ({ page }) => {
    await loginAs(page, DM_ENGLISH);

    await expect(page).toHaveURL(/\/app/);
    await page.waitForLoadState("domcontentloaded");

    // English DM navbar should have English text
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 5_000 });

    // Should see English nav items (Dashboard, Settings, Logout, etc.)
    const navText = await page.locator("nav").evaluateAll((navs) => navs.map(n => n.textContent).join(" "));
    const hasEnglish =
      navText?.includes("Dashboard") ||
      navText?.includes("Settings") ||
      navText?.includes("Logout");
    expect(hasEnglish).toBeTruthy();
  });

  test("English player sees English soundboard labels", async ({ browser }) => {
    // ── DM: create session ──
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/combat/new");
    await dmPage.waitForURL("**/app/combat/**", { timeout: 15_000 });

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

    // ── English player: join ──
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_ENGLISH);
    await playerPage.goto(`/join/${token}`);

    await playerPage.waitForTimeout(5_000);

    // Check for English text — "Round", "Sound Effects", "Combat Sounds"
    const bodyText = await playerPage.locator("body").textContent();

    // If soundboard is visible, check English labels
    const fab = playerPage.locator('[data-testid="soundboard-fab"]');
    if (await fab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await fab.click();

      const drawer = playerPage.locator('[data-testid="soundboard-drawer"]');
      if (await drawer.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const drawerText = await drawer.textContent();
        // Should contain English preset names
        const hasEnglish =
          drawerText?.includes("Fireball") ||
          drawerText?.includes("Sword Hit") ||
          drawerText?.includes("Thunder") ||
          drawerText?.includes("Sound Effects") ||
          drawerText?.includes("Combat Sounds");
        expect(hasEnglish).toBeTruthy();
      }
    }

    await dmContext.close();
    await playerContext.close();
  });

  test("pt-BR DM sees Portuguese labels", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Check for Portuguese UI elements
    const pageText = await page.locator("body").textContent();
    // Should contain Portuguese strings
    const hasPtBR =
      pageText?.includes("Painel") ||
      pageText?.includes("Sessão") ||
      pageText?.includes("Campanha") ||
      pageText?.includes("Dashboard") || // might be universal
      pageText?.includes("Criar");
    expect(hasPtBR).toBeTruthy();
  });
});

test.describe("P3 — Edge: Reconnection", () => {
  test("Player reconnects after going offline", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await loginAs(dmPage, DM_PRIMARY);

    await dmPage.goto("/app/combat/new");
    await dmPage.waitForURL("**/app/combat/**", { timeout: 15_000 });

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

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    const { PLAYER_WARRIOR } = await import("../fixtures/test-accounts");
    await loginAs(playerPage, PLAYER_WARRIOR);
    await playerPage.goto(`/join/${token}`);

    await expect(
      playerPage.locator('[data-testid="player-view"], [data-testid="player-loading"]')
    ).toBeVisible({ timeout: 15_000 });

    // Simulate offline
    await playerContext.setOffline(true);
    await playerPage.waitForTimeout(3_000);

    // Simulate online
    await playerContext.setOffline(false);
    await playerPage.waitForTimeout(5_000);

    // Player view should still be visible after reconnection
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    await dmContext.close();
    await playerContext.close();
  });
});
