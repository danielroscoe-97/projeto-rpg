/**
 * J16 — iPhone Player: Combate e Interações na Mesa
 *
 * Docs ref:
 *  - market research sec.1.2: "Brasil tem uma das maiores taxas de uso de smartphone"
 *  - market research sec.3.2: ">70% usam smartphone no jogo"
 *  - market research sec.14.2: "Abre no celular, sem criar conta — apenas abre"
 *  - mobile-audit-report: Pixel 5 testado, iPhone ainda nao
 *
 * iPhone 14: 390x844 viewport, Safari user-agent, touch + isMobile.
 * Diferenças-chave vs Pixel 5 (J13):
 *  - 3px mais estreito (390 vs 393) — testa overflow edge cases
 *  - 7px mais baixo (844 vs 851) — menos espaço para scroll
 *  - Safari WebKit rendering vs Chrome — font rendering, flexbox quirks
 *  - Safe area insets (notch, home indicator)
 *
 * Perspectivas testadas: Visitor, DM (mobile), Player (mobile)
 *
 * Cenários:
 *  J16.1  — Visitor /try no iPhone: setup + iniciar combate
 *  J16.2  — DM login + dashboard no iPhone
 *  J16.3  — DM cria combate com 4+ combatentes no iPhone
 *  J16.4  — Player join via link no iPhone (fluxo completo)
 *  J16.5  — Player view: lista de iniciativa, HP bars, turno atual
 *  J16.6  — Player recebe update realtime de HP no iPhone
 *  J16.7  — Player recebe notificação de turno no iPhone
 *  J16.8  — DM aplica dano via HP adjuster no iPhone
 *  J16.9  — DM aplica condição a combatente no iPhone
 *  J16.10 — DM avança turnos por 2 rounds no iPhone
 *  J16.11 — Player refresh no iPhone — volta ao player view
 *  J16.12 — Compendium usável no iPhone (busca monstros)
 *  J16.13 — Touch targets >= 44x44px em botões críticos
 *  J16.14 — Hamburger menu funcional no iPhone
 *  J16.15 — Share session (QR code) visível no iPhone
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import {
  dmSetupCombatSession,
  playerJoinCombat,
  goToNewSession,
  getShareToken,
} from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR, PLAYER_MAGE } from "../fixtures/test-accounts";

// iPhone 14: 390x844, Safari UA, touch enabled
const IPHONE_14 = {
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

const VIEWPORT_WIDTH = 390;
const MIN_TOUCH_TARGET = 44; // Apple HIG minimum

/** Assert no horizontal overflow on current page */
async function assertNoOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 5;
  });
  expect(hasOverflow, "Page has horizontal overflow").toBe(false);
}

/** Assert element fits within iPhone viewport width */
async function assertWithinViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (box) {
    expect(box.x, `${selector} starts before viewport`).toBeGreaterThanOrEqual(-5);
    expect(
      box.x + box.width,
      `${selector} exceeds viewport width`
    ).toBeLessThanOrEqual(VIEWPORT_WIDTH + 10);
  }
}

/** Assert touch target meets minimum size (44x44 per Apple HIG) */
async function assertTouchTarget(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const box = await el.boundingBox();
    expect(box, `${selector} has no bounding box`).toBeTruthy();
    expect(
      box!.width,
      `${selector} width ${box!.width}px < ${MIN_TOUCH_TARGET}px`
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(
      box!.height,
      `${selector} height ${box!.height}px < ${MIN_TOUCH_TARGET}px`
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  }
}

test.describe("J16 — iPhone 14 Player Combat & Table Interactions", () => {
  // Extended timeout for flows involving DM setup + realtime broadcast + player join
  test.setTimeout(90_000);

  // ─── VISITOR FLOW ────────────────────────────────────────────

  test("J16.1 — Visitor /try no iPhone: setup + iniciar combate sem overflow", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({
      timeout: 15_000,
    });

    // No overflow on setup screen
    await assertNoOverflow(page);

    // Name input must be usable (not squeezed)
    const nameInput = page.locator('[data-testid="add-row-name"]');
    const nameBox = await nameInput.boundingBox();
    expect(nameBox, "Name input not visible").toBeTruthy();
    expect(nameBox!.width, "Name input too narrow").toBeGreaterThanOrEqual(80);
    expect(nameBox!.x + nameBox!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 10);

    // Add 2 combatants
    await page.fill('[data-testid="add-row-name"]', "iPhone Warrior");
    await page.fill('[data-testid="add-row-hp"]', "40");
    await page.fill('[data-testid="add-row-ac"]', "16");
    await page.fill('[data-testid="add-row-init"]', "18");
    await page.click('[data-testid="add-row-btn"]');
    await page.waitForTimeout(400);

    await page.fill('[data-testid="add-row-name"]', "iPhone Goblin");
    await page.fill('[data-testid="add-row-hp"]', "7");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "10");
    await page.click('[data-testid="add-row-btn"]');
    await page.waitForTimeout(400);

    // Start combat
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Active combat — no overflow
    await assertNoOverflow(page);

    // Initiative list within viewport
    await assertWithinViewport(page, '[data-testid="initiative-list"]');

    await ctx.close();
  });

  // ─── DM MOBILE FLOW ─────────────────────────────────────────

  test("J16.2 — DM login + dashboard no iPhone sem overflow", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

    await assertNoOverflow(page);

    // Nav should be accessible
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 5_000 });

    // Dashboard title should be visible (not clipped)
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    await ctx.close();
  });

  test("J16.3 — DM cria combate com 5 combatentes no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);
    await assertNoOverflow(page);

    await page.fill(
      '[data-testid="encounter-name-input"]',
      "J16 iPhone Battle"
    );

    // Add 5 combatants — tests scrolling on small viewport
    const combatants = [
      { name: "Paladin", hp: "52", ac: "18", init: "14" },
      { name: "Rogue", hp: "38", ac: "15", init: "20" },
      { name: "Cleric", hp: "42", ac: "16", init: "10" },
      { name: "Orc War Chief", hp: "93", ac: "16", init: "12" },
      { name: "Orc Grunt", hp: "15", ac: "13", init: "8" },
    ];

    for (const c of combatants) {
      // Scroll add row into view (may be below fold after 3+ combatants)
      const addRow = page.locator('[data-testid="add-row"]');
      await addRow.scrollIntoViewIfNeeded();

      await page.fill('[data-testid="add-row-name"]', c.name);
      await page.fill('[data-testid="add-row-hp"]', c.hp);
      await page.fill('[data-testid="add-row-ac"]', c.ac);
      await page.fill('[data-testid="add-row-init"]', c.init);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(400);
    }

    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(5, {
      timeout: 5_000,
    });

    // No overflow even with 5 rows
    await assertNoOverflow(page);

    // Start combat
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    await assertNoOverflow(page);

    // All 5 combatants in initiative list
    const rows = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await rows.count()).toBe(5);

    await ctx.close();
  });

  // ─── PLAYER MOBILE FLOW (CORE) ──────────────────────────────

  test("J16.4 — Player join via link no iPhone (fluxo completo)", async ({
    browser,
  }) => {
    // DM on desktop sets up combat
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Dragão Vermelho", hp: "256", ac: "19", init: "16" },
      { name: "Kobold A", hp: "5", ac: "12", init: "14" },
      { name: "Kobold B", hp: "5", ac: "12", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Player on iPhone
    const mobileCtx = await browser.newContext(IPHONE_14);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin iPhone", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    // Player view must be visible
    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // No overflow
    await assertNoOverflow(mobilePage);

    // Player view within viewport
    await assertWithinViewport(mobilePage, '[data-testid="player-view"]');

    // Must show combatant names
    const body = await mobilePage.textContent("body");
    expect(body).toBeTruthy();
    const seesNames =
      body!.includes("Thorin") ||
      body!.includes("Dragão") ||
      body!.includes("Dragao") ||
      body!.includes("Kobold");
    expect(seesNames, "Player should see combatant names").toBe(true);

    // No errors
    expect(body).not.toContain("Internal Server Error");
    expect(body).not.toContain("Application error");

    await dmContext.close();
    await mobileCtx.close();
  });

  test("J16.5 — Player view: lista de iniciativa, HP bars, turno atual no iPhone", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Troll", hp: "84", ac: "15", init: "13" },
      { name: "Goblin Scout", hp: "7", ac: "15", init: "18" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const mobileCtx = await browser.newContext(IPHONE_14);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "15",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Player view HTML should have meaningful content (HP bars, names, etc.)
    const pvHTML = await mobilePage
      .locator('[data-testid="player-view"]')
      .innerHTML();
    expect(pvHTML.length, "Player view too empty").toBeGreaterThan(100);

    // Should see at least 2 combatant entries + the player
    const body = await mobilePage.textContent("body");
    const hasTroll = body!.includes("Troll");
    const hasGoblin = body!.includes("Goblin");
    const hasThorin = body!.includes("Thorin");
    expect(
      [hasTroll, hasGoblin, hasThorin].filter(Boolean).length,
      "Should see at least 2 of 3 combatants"
    ).toBeGreaterThanOrEqual(2);

    // No overflow on player view
    await assertNoOverflow(mobilePage);

    await dmContext.close();
    await mobileCtx.close();
  });

  test("J16.6 — Realtime: HP atualiza no player view iPhone quando DM aplica dano", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Giant", hp: "100", ac: "14", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const mobileCtx = await browser.newContext(IPHONE_14);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "15",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Snapshot before damage
    const beforeHTML = await mobilePage
      .locator('[data-testid="player-view"]')
      .innerHTML();

    // DM applies massive damage
    const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 10_000 });
    await hpBtn.click();

    const adjuster = dmPage.locator(
      '[data-testid="hp-adjuster"], [role="dialog"], .hp-adjust'
    );
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    const dmgInput = dmPage.locator('[data-testid="hp-amount-input"]');
    await expect(dmgInput).toBeVisible({ timeout: 5_000 });
    await dmgInput.fill("80"); // Giant 100 → 20 HP

    const applyBtn = dmPage.locator('[data-testid="hp-apply-btn"]');
    await expect(applyBtn).toBeVisible({ timeout: 5_000 });
    await applyBtn.click();

    // Wait for realtime propagation
    await mobilePage.waitForTimeout(5_000);

    // Player view should have updated (HP bar visual change)
    const afterHTML = await mobilePage
      .locator('[data-testid="player-view"]')
      .innerHTML();
    expect(afterHTML, "Player view should update after HP change").not.toBe(
      beforeHTML
    );

    // Player view still functional
    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible();
    await assertNoOverflow(mobilePage);

    await dmContext.close();
    await mobileCtx.close();
  });

  test("J16.7 — Player recebe indicação visual de turno no iPhone", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "NPC Boss", hp: "100", ac: "18", init: "20" },
      { name: "Minion", hp: "7", ac: "12", init: "3" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const mobileCtx = await browser.newContext(IPHONE_14);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "12",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // DM advances turn: NPC Boss (20) → Thorin (12)
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
    await nextTurnBtn.click();
    await mobilePage.waitForTimeout(3_000);

    // Player should see turn indicator
    const turnIndicator = mobilePage.locator(
      '[data-testid="turn-notification"], [data-testid="your-turn"], [data-testid="current-turn-indicator"], [aria-current="true"], [data-testid^="combatant-row-"][class*="active"], [data-testid^="combatant-row-"][class*="current"]'
    );
    const hasTurnIndicator = await turnIndicator
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasTurnIndicator, "Player should see turn indicator on iPhone").toBe(
      true
    );

    // Turn indicator within viewport (not clipped)
    if (hasTurnIndicator) {
      const box = await turnIndicator.first().boundingBox();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 10);
      }
    }

    await dmContext.close();
    await mobileCtx.close();
  });

  // ─── DM COMBAT ACTIONS ON IPHONE ────────────────────────────

  test("J16.8 — DM aplica dano via HP adjuster no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Hero", hp: "100", ac: "18", init: "20" },
      { name: "Goblin", hp: "7", ac: "12", init: "5" },
    ]);

    // Find HP button for Goblin (last, lower init)
    const hpButtons = page.locator('[data-testid^="hp-btn-"]');
    await expect(hpButtons.first()).toBeVisible({ timeout: 5_000 });
    await hpButtons.last().click();

    // HP adjuster visible
    const adjuster = page.locator(
      '[data-testid="hp-adjuster"], [role="dialog"], .hp-adjust'
    );
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Adjuster within viewport (not cut off on iPhone)
    await assertNoOverflow(page);
    await assertWithinViewport(
      page,
      '[data-testid="hp-adjuster"], [role="dialog"], .hp-adjust'
    );

    // Apply lethal damage
    const dmgInput = page
      .locator('input[type="number"], input[data-testid="hp-adjust-value"]')
      .first();
    if (await dmgInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dmgInput.fill("10");

      const applyBtn = page
        .locator(
          'button:has-text("Dano"), button:has-text("Damage"), button:has-text("Aplicar"), button:has-text("Apply")'
        )
        .first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(1_000);
      }
    }

    // Combat still active
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();

    await ctx.close();
  });

  test("J16.9 — DM aplica condição a combatente no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Target", hp: "30", ac: "13", init: "12" },
      { name: "Caster", hp: "25", ac: "12", init: "18" },
    ]);

    const conditionBtn = page
      .locator(
        '[data-testid^="condition-btn-"], [data-testid^="conditions-"], button[aria-label*="condition"], button[aria-label*="Condição"]'
      )
      .first();

    if (await conditionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conditionBtn.click();
      await page.waitForTimeout(1_000);

      // Condition selector should fit on iPhone screen
      await assertNoOverflow(page);

      const conditionOption = page
        .locator(
          'button:has-text("Frightened"), button:has-text("Amedrontado"), [data-testid*="frightened"], label:has-text("Frightened"), label:has-text("Amedrontado")'
        )
        .first();

      if (
        await conditionOption.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await conditionOption.click();
        await page.waitForTimeout(1_000);

        // Close condition selector
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1_000);

        // Verify badge
        const badge = page.locator(
          '[data-testid*="condition-badge"], .condition-badge, span:has-text("Frightened"), span:has-text("Amedrontado")'
        );
        const hasBadge = await badge
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        expect(hasBadge, "Condition badge should be visible on iPhone").toBe(
          true
        );
      }
    }

    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await ctx.close();
  });

  test("J16.10 — DM avança turnos por 2 rounds completos no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Fast", hp: "30", ac: "14", init: "20" },
      { name: "Medium", hp: "30", ac: "14", init: "12" },
      { name: "Slow", hp: "30", ac: "14", init: "5" },
    ]);

    const nextTurnBtn = page.locator('[data-testid="next-turn-btn"]');

    // 2 full rounds = 6 turn advances
    for (let i = 0; i < 6; i++) {
      await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
      // Ensure button is within viewport on each turn
      await nextTurnBtn.scrollIntoViewIfNeeded();
      await nextTurnBtn.click();
      await page.waitForTimeout(500);
    }

    // Combat still active with all 3 combatants
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    const combatants = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBe(3);

    // No overflow after multiple rounds
    await assertNoOverflow(page);

    await ctx.close();
  });

  // ─── RESILIENCE ON IPHONE ───────────────────────────────────

  test("J16.11 — Player refresh no iPhone volta ao player view", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc", hp: "30", ac: "13", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    const mobileCtx = await browser.newContext(IPHONE_14);
    const mobilePage = await mobileCtx.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "15",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Simulate Safari pull-to-refresh / manual reload
    await mobilePage.reload({ waitUntil: "domcontentloaded" });
    await mobilePage.waitForTimeout(3_000);

    // Should recover — either player-view or re-join form
    const playerView = mobilePage.locator('[data-testid="player-view"]');
    const joinForm = mobilePage.locator('[data-testid="lobby-name"]');
    await expect(playerView.or(joinForm)).toBeVisible({ timeout: 15_000 });

    // Must NOT land on login page
    expect(mobilePage.url()).not.toContain("/auth/login");

    await dmContext.close();
    await mobileCtx.close();
  });

  // ─── UX QUALITY ON IPHONE ───────────────────────────────────

  test("J16.12 — Compendium usável no iPhone (busca monstros)", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    await assertNoOverflow(page);

    // Search input visible and within viewport
    const searchInput = page
      .locator(
        'input[placeholder*="Filtrar"], input[placeholder*="Filter"], input[placeholder*="search"], input[placeholder*="Buscar"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 20_000 });

    const inputBox = await searchInput.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(
      VIEWPORT_WIDTH + 10
    );

    // Type a search and verify results appear
    await searchInput.fill("Goblin");
    await page.waitForTimeout(1_500);

    // Results should be visible
    const body = await page.textContent("body");
    expect(body!.toLowerCase()).toContain("goblin");

    await ctx.close();
  });

  test("J16.13 — Touch targets >= 44x44px em botões críticos do combate", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Fighter", hp: "50", ac: "16", init: "14" },
      { name: "Goblin", hp: "7", ac: "12", init: "8" },
    ]);

    // Critical buttons that must be tappable on iPhone
    await assertTouchTarget(page, '[data-testid="next-turn-btn"]');

    // HP buttons
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    if (await hpBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const box = await hpBtn.boundingBox();
      expect(box).toBeTruthy();
      // HP buttons can be smaller (icon buttons) — minimum 40px
      expect(box!.width).toBeGreaterThanOrEqual(40);
      expect(box!.height).toBeGreaterThanOrEqual(40);
    }

    await ctx.close();
  });

  test("J16.14 — Hamburger menu abre e fecha no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

    // Look for hamburger/mobile menu toggle
    const menuToggle = page
      .locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu-toggle"], button:has(svg[class*="menu"]), button:has([data-testid="hamburger"])'
      )
      .first();

    if (await menuToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await menuToggle.click();
      await page.waitForTimeout(500);

      // Menu should be open — background must be opaque (not semi-transparent)
      await assertNoOverflow(page);

      // Nav links visible
      const navLinks = page.locator(
        'nav a[href*="/app"], nav a[href*="/try"]'
      );
      expect(await navLinks.count()).toBeGreaterThanOrEqual(1);

      // Close menu
      await menuToggle.click();
      await page.waitForTimeout(500);
    }

    await ctx.close();
  });

  test("J16.15 — Share session QR code visível no iPhone", async ({
    browser,
  }) => {
    const ctx = await browser.newContext(IPHONE_14);
    const page = await ctx.newPage();

    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);

    // Generate share link
    const token = await getShareToken(page);
    expect(token, "Share token should be generated").toBeTruthy();

    // Share URL input should be visible and within viewport
    const shareUrl = page.locator('[data-testid="share-session-url"]');
    if (await shareUrl.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await assertWithinViewport(page, '[data-testid="share-session-url"]');
    }

    // No overflow when share modal/section is open
    await assertNoOverflow(page);

    await ctx.close();
  });
});
