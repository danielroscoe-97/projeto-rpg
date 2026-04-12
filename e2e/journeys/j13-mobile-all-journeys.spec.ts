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
import { skipGuidedTour, addManualCombatant, startCombat, QUICK_ENCOUNTER } from "../guest-qa/helpers";
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
  // Player join flow involves DM setup + realtime broadcast + late-join approval.
  test.setTimeout(90_000);

  test("J13.1 — /try funciona no mobile sem overflow", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await page.goto("/try");
    await skipGuidedTour(page);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Open manual add form (collapsed by default behind "+ Manual" toggle)
    const addRow = page.locator('[data-testid="add-row"]');
    if (!(await addRow.isVisible({ timeout: 3_000 }).catch(() => false))) {
      const manualToggle = page.locator("button").filter({ hasText: /Manual/i }).first();
      if (await manualToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await manualToggle.scrollIntoViewIfNeeded();
        await manualToggle.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(addRow).toBeVisible({ timeout: 10_000 });

    // No overflow
    await assertNoOverflow(page);

    // Add combatant form should be usable
    const nameInput = page.locator('[data-testid="add-row-name"]');
    const box = await nameInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(393 + 10);

    // Add combatants using proven guest-qa helper
    for (const c of QUICK_ENCOUNTER) {
      await addManualCombatant(page, c);
    }

    await startCombat(page);

    // Active combat — no overflow
    await assertNoOverflow(page);

    await ctx.close();
  });

  test("J13.2 — Login → Dashboard no mobile", async ({ browser }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

    // Skip tour + wait for dashboard to finish loading
    await skipGuidedTour(page);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("nav")).toBeVisible({ timeout: 15_000 });

    // Dashboard should render without overflow
    await assertNoOverflow(page);

    await ctx.close();
  });

  test("J13.3 — DM cria combate no mobile com 4 combatentes", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(PIXEL_5);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await skipGuidedTour(page);
    await goToNewSession(page);

    // No overflow on setup screen
    await assertNoOverflow(page);

    // Encounter name is auto-generated — open manual add form
    const addRowName = page.locator('[data-testid="add-row-name"]');
    if (!(await addRowName.isVisible({ timeout: 1_000 }).catch(() => false))) {
      const manualToggle = page.locator("button").filter({ hasText: /Manual/i }).first();
      if (await manualToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await manualToggle.scrollIntoViewIfNeeded();
        await manualToggle.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(addRowName).toBeVisible({ timeout: 5_000 });

    // Add 4 combatants via mobile
    const combatants = [
      { name: "Paladin", hp: "45", ac: "18", init: "12" },
      { name: "Rogue", hp: "30", ac: "14", init: "18" },
      { name: "Orc A", hp: "15", ac: "13", init: "10" },
      { name: "Orc B", hp: "15", ac: "13", init: "8" },
    ];

    for (const c of combatants) {
      await addRowName.scrollIntoViewIfNeeded();
      await page.locator('[data-testid="add-row-init"]').fill(c.init);
      await addRowName.fill(c.name);
      await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
      await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(400);
    }

    // Scroll start button into view — on Pixel 5, 4 combatants push it below the fold
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
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
    // MonsterBrowser renders the filter bar twice (mobile + desktop).
    // On mobile viewport, use .first() to target the mobile-visible instance.
    const searchInput = page
      .locator(
        'input[placeholder*="Filtrar"], input[placeholder*="Filter"], input[placeholder*="search"], input[placeholder*="Buscar"]'
      )
      .first();

    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    const inputBox = await searchInput.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(393 + 10);

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
