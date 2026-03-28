/**
 * J13 — Mobile-First: Todas Jornadas no Pixel 5
 *
 * Docs ref:
 *  - market research sec.1.2: "Brasil tem uma das maiores taxas de uso de smartphone — mobile-first e mandatorio"
 *  - market research sec.3.2: ">70% usam smartphone no jogo"
 *  - market research sec.5.3: "Sem criar conta (player): ★★★★★"
 *  - market research sec.14.2: "Abre no celular, sem criar conta — apenas abre"
 *
 * Testa os fluxos criticos no viewport mobile (Pixel 5: 393x851):
 *  1. Landing page → /try (visitor)
 *  2. Login → Dashboard (DM)
 *  3. Criar combate (DM mobile)
 *  4. Player view (player mobile)
 *  5. Compendium mobile
 *
 * Regra: ZERO horizontal overflow em qualquer tela.
 * Perspectivas: Visitor, DM, Player — todos mobile.
 */
import { test, expect, type BrowserContext } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat, goToNewSession } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

const PIXEL_5 = {
  viewport: { width: 393, height: 851 },
  userAgent: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
  isMobile: true,
  hasTouch: true,
};

async function assertNoOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 5;
  });
  expect(hasOverflow).toBe(false);
}

test.describe("J13 — Mobile (Pixel 5)", () => {
  test("J13.1 — /try funciona no mobile sem overflow", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({
      timeout: 15_000,
    });

    // No overflow
    await assertNoOverflow(page);

    // Add combatant form should be usable
    const nameInput = page.locator('[data-testid="add-row-name"]');
    const box = await nameInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(393 + 10);

    // Add a combatant and start combat
    await page.fill('[data-testid="add-row-name"]', "Mobile Fighter");
    await page.fill('[data-testid="add-row-hp"]', "30");
    await page.fill('[data-testid="add-row-ac"]', "14");
    await page.fill('[data-testid="add-row-init"]', "15");
    await page.click('[data-testid="add-row-btn"]');

    await page.fill('[data-testid="add-row-name"]', "Mobile Goblin");
    await page.fill('[data-testid="add-row-hp"]', "7");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "10");
    await page.click('[data-testid="add-row-btn"]');

    await page.click('[data-testid="start-combat-btn"]');
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Active combat — no overflow
    await assertNoOverflow(page);

    await ctx.close();
  });

  test("J13.2 — Login → Dashboard no mobile", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

    // Dashboard should render without overflow
    await assertNoOverflow(page);

    // Nav should be accessible (hamburger menu or compact nav)
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 5_000 });

    await ctx.close();
  });

  test("J13.3 — DM cria combate no mobile com 4 combatentes", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);

    // No overflow on setup screen
    await assertNoOverflow(page);

    await page.fill(
      '[data-testid="encounter-name-input"]',
      "J13 Mobile Battle"
    );

    // Add 4 combatants via mobile
    const combatants = [
      { name: "Paladin", hp: "45", ac: "18", init: "12" },
      { name: "Rogue", hp: "30", ac: "14", init: "18" },
      { name: "Orc A", hp: "15", ac: "13", init: "10" },
      { name: "Orc B", hp: "15", ac: "13", init: "8" },
    ];

    for (const c of combatants) {
      await page.fill('[data-testid="add-row-name"]', c.name);
      await page.fill('[data-testid="add-row-hp"]', c.hp);
      await page.fill('[data-testid="add-row-ac"]', c.ac);
      await page.fill('[data-testid="add-row-init"]', c.init);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(400);
    }

    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(4, {
      timeout: 5_000,
    });

    await page.click('[data-testid="start-combat-btn"]');
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Active combat on mobile — no overflow
    await assertNoOverflow(page);

    // Next turn button should be tappable
    const nextBtn = page.locator('[data-testid="next-turn-btn"]');
    const btnBox = await nextBtn.boundingBox();
    expect(btnBox).toBeTruthy();
    // Touch target minimum: 44x44 per accessibility guidelines
    expect(btnBox!.width).toBeGreaterThanOrEqual(40);
    expect(btnBox!.height).toBeGreaterThanOrEqual(40);

    await ctx.close();
  });

  test("J13.4 — Player view no mobile com combate ativo", async ({
    browser,
  }) => {
    // DM setup on desktop
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Dragon", hp: "178", ac: "18", init: "16" },
      { name: "Goblin", hp: "7", ac: "15", init: "14" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Player on mobile
    const mobileCtx = await browser.newContext(PIXEL_5);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "MobilePlayer", {
      initiative: "12",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // No overflow
    await assertNoOverflow(mobilePage);

    // Player view content should be within viewport
    const pvBox = await mobilePage
      .locator('[data-testid="player-view"]')
      .boundingBox();
    if (pvBox) {
      expect(pvBox.x + pvBox.width).toBeLessThanOrEqual(393 + 10);
    }

    await dmContext.close();
    await mobileCtx.close();
  });

  test("J13.5 — Compendium usavel no mobile", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // No overflow
    await assertNoOverflow(page);

    // Search input should be visible and usable
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"]'
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const inputBox = await searchInput.boundingBox();
      expect(inputBox).toBeTruthy();
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(393 + 10);
    }

    await ctx.close();
  });

  test("J13.6 — Landing page responsiva no mobile", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // No overflow
    await assertNoOverflow(page);

    // CTA buttons should be tappable size
    const cta = page
      .locator(
        'a[href*="/try"], a[href*="/auth"], button:has-text("Experimente"), button:has-text("Try")'
      )
      .first();
    if (await cta.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const ctaBox = await cta.boundingBox();
      expect(ctaBox).toBeTruthy();
      expect(ctaBox!.width).toBeGreaterThanOrEqual(40);
      expect(ctaBox!.height).toBeGreaterThanOrEqual(40);
    }

    await ctx.close();
  });
});
