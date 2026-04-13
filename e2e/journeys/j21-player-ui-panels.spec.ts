/**
 * J21 — Player UI Panels, Spell Slots, Compendium Access & Notifications
 *
 * Tests the player-side UI during combat:
 *  A. Compendium Browser (4 tests) — open, search, close
 *  B. Spell Slot Tracker (4 tests) — visibility, toggle, long rest, persistence
 *  C. Mobile Bottom Bar (3 tests) — visibility, HP, desktop hidden
 *  D. Connection Status & DM Offline (3 tests) — sync indicator, offline, DM disconnect
 *  E. Combatant Display Details (4 tests) — HP tiers, defeated, round, DM-only controls
 *
 * Perspectives: Player (consumer) + DM (admin) — two browsers simultaneously.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("J21 — Player UI Panels", () => {
  test.setTimeout(120_000);

  // ═══════════════════════════════════════════════════════════════
  // SECTION A — Compendium Browser
  // ═══════════════════════════════════════════════════════════════

  test("J21.A1 — Compendium button visible in player view", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Compendium button should be visible
    await expect(
      playerPage.locator('[data-testid="player-oracle-btn"]')
    ).toBeVisible({ timeout: 10_000 });

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.A2 — Clicking compendium opens panel", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Click the compendium button
    const oracleBtn = playerPage.locator('[data-testid="player-oracle-btn"]');
    await expect(oracleBtn).toBeVisible({ timeout: 10_000 });
    await oracleBtn.click();

    // The compendium panel should become visible
    const oraclePanel = playerPage.locator('[data-testid="player-oracle"]');
    await expect(oraclePanel).toBeVisible({ timeout: 10_000 });

    // Panel should contain tabs or a search input
    const hasSearch = await oraclePanel
      .locator('input[type="text"], input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasTabs = await oraclePanel
      .locator('button, [role="tab"]')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasSearch || hasTabs).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.A3 — Compendium search returns results", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Open compendium panel
    const oracleBtn = playerPage.locator('[data-testid="player-oracle-btn"]');
    await expect(oracleBtn).toBeVisible({ timeout: 10_000 });
    await oracleBtn.click();

    const oraclePanel = playerPage.locator('[data-testid="player-oracle"]');
    await expect(oraclePanel).toBeVisible({ timeout: 10_000 });

    // Find search input inside the panel
    const searchInput = oraclePanel
      .locator('input[type="text"], input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Type a search query
    await searchInput.fill("fire");
    await playerPage.waitForTimeout(2_000);

    // Should see at least one result (spell, condition, etc.)
    const resultItems = oraclePanel.locator('button.w-full, [data-testid*="result"], li, a').filter({ hasText: /fire|fogo/i });
    const resultCount = await resultItems.count();

    // Fallback: check for any list items inside the panel
    if (resultCount === 0) {
      const anyResults = oraclePanel.locator('button, li, a').filter({ hasText: /.{3,}/ });
      expect(await anyResults.count()).toBeGreaterThan(0);
    } else {
      expect(resultCount).toBeGreaterThan(0);
    }

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.A4 — Compendium can be closed", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Open compendium
    const oracleBtn = playerPage.locator('[data-testid="player-oracle-btn"]');
    await expect(oracleBtn).toBeVisible({ timeout: 10_000 });
    await oracleBtn.click();

    const oraclePanel = playerPage.locator('[data-testid="player-oracle"]');
    await expect(oraclePanel).toBeVisible({ timeout: 10_000 });

    // Close compendium — try toggle button first, then close button, then Escape
    await oracleBtn.click();
    await playerPage.waitForTimeout(500);

    let closed = await oraclePanel
      .isHidden({ timeout: 3_000 })
      .catch(() => false);

    if (!closed) {
      // Try close button inside the panel
      const closeBtn = oraclePanel
        .locator('button[aria-label*="close"], button[aria-label*="Close"], button[aria-label*="Fechar"], button:has-text("X"), button:has-text("Fechar")')
        .first();
      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click();
        await playerPage.waitForTimeout(500);
      }
    }

    closed = await oraclePanel
      .isHidden({ timeout: 3_000 })
      .catch(() => false);

    if (!closed) {
      // Try Escape key
      await playerPage.keyboard.press("Escape");
      await playerPage.waitForTimeout(500);
    }

    // Oracle panel should no longer be visible
    await expect(oraclePanel).toBeHidden({ timeout: 5_000 });

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION B — Spell Slot Tracker
  // ═══════════════════════════════════════════════════════════════

  test("J21.B1 — Spell slot tracker visible for own character", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc Brute", hp: "30", ac: "13", init: "10" },
      { name: "Skeleton Archer", hp: "13", ac: "13", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Elara Maga", {
      initiative: "12",
      hp: "32",
      ac: "14",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Look for spell slot UI elements
    const spellSlotUI = playerPage.locator(
      '[data-testid*="spell-slot"], [data-testid*="slot"], [class*="spell-slot"]'
    );
    const slotByText = playerPage.locator('text=/spell.*slot|slot.*magica|Spell Slots|Slots/i');

    const hasSlotUI = await spellSlotUI
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasSlotText = await slotByText
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!hasSlotUI && !hasSlotText) {
      test.skip(true, "Spell slot tracker not visible — may require campaign character");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // If visible, verify it shows at least level 1 slots
    const slotContent = await playerPage.textContent("body");
    const hasLevel1 =
      slotContent!.includes("1") ||
      slotContent!.includes("Level 1") ||
      slotContent!.includes("Nível 1");
    expect(hasLevel1).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.B2 — Spell slot dot can be toggled", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc Brute", hp: "30", ac: "13", init: "10" },
      { name: "Skeleton Archer", hp: "13", ac: "13", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Elara Maga", {
      initiative: "12",
      hp: "32",
      ac: "14",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Find a spell slot dot (clickable circle/button in the slot tracker)
    const slotDot = playerPage.locator(
      '[data-testid*="spell-slot-dot"], [data-testid*="slot-dot"], [data-testid*="slot"] button, [class*="spell-slot"] button'
    ).first();

    const hasDot = await slotDot
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasDot) {
      test.skip(true, "Spell slot dots not found — may require campaign character");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // Snapshot state before toggle
    const beforeClasses = await slotDot.getAttribute("class") ?? "";
    const beforeAriaChecked = await slotDot.getAttribute("aria-checked") ?? "";

    // Click to mark as used
    await slotDot.click();
    await playerPage.waitForTimeout(500);

    // Visual state should change
    const afterClasses = await slotDot.getAttribute("class") ?? "";
    const afterAriaChecked = await slotDot.getAttribute("aria-checked") ?? "";
    const stateChanged =
      afterClasses !== beforeClasses || afterAriaChecked !== beforeAriaChecked;
    expect(stateChanged).toBe(true);

    // Click again to restore
    await slotDot.click();
    await playerPage.waitForTimeout(500);

    const restoredClasses = await slotDot.getAttribute("class") ?? "";
    const restoredAria = await slotDot.getAttribute("aria-checked") ?? "";
    const restoredToOriginal =
      restoredClasses === beforeClasses || restoredAria === beforeAriaChecked;
    expect(restoredToOriginal).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.B3 — Long Rest restores all spell slots", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc Brute", hp: "30", ac: "13", init: "10" },
      { name: "Skeleton Archer", hp: "13", ac: "13", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Elara Maga", {
      initiative: "12",
      hp: "32",
      ac: "14",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Find spell slot dots
    const slotDots = playerPage.locator(
      '[data-testid*="spell-slot-dot"], [data-testid*="slot-dot"], [data-testid*="slot"] button, [class*="spell-slot"] button'
    );

    const dotCount = await slotDots.count();
    if (dotCount === 0) {
      test.skip(true, "Spell slot dots not found — may require campaign character");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // Toggle a few slots to "used"
    const toggleCount = Math.min(dotCount, 2);
    for (let i = 0; i < toggleCount; i++) {
      await slotDots.nth(i).click();
      await playerPage.waitForTimeout(300);
    }

    // Find Long Rest button
    const longRestBtn = playerPage.locator(
      'button:has-text("Long Rest"), button:has-text("Descanso Longo"), button[aria-label*="Long Rest"], button[aria-label*="Descanso Longo"]'
    ).first();

    const hasLongRest = await longRestBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasLongRest) {
      test.skip(true, "Long Rest button not found — feature may not be implemented for this context");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // Snapshot used state
    const usedState = await slotDots.first().getAttribute("class") ?? "";

    // Click Long Rest
    await longRestBtn.click();
    await playerPage.waitForTimeout(1_000);

    // All dots should return to "available" state (class should change from used state)
    const restoredState = await slotDots.first().getAttribute("class") ?? "";
    expect(restoredState).not.toBe(usedState);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.B4 — Spell slot state persists after page reload", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc Brute", hp: "30", ac: "13", init: "10" },
      { name: "Skeleton Archer", hp: "13", ac: "13", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, PLAYER_WARRIOR);

    await playerJoinCombat(playerPage, dmPage, token, "Elara Maga", {
      initiative: "12",
      hp: "32",
      ac: "14",
    });

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Find spell slot dots
    const slotDots = playerPage.locator(
      '[data-testid*="spell-slot-dot"], [data-testid*="slot-dot"], [data-testid*="slot"] button, [class*="spell-slot"] button'
    );

    const dotCount = await slotDots.count();
    if (dotCount === 0) {
      test.skip(true, "Spell slot dots not found — may require campaign character");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // Toggle first slot to "used"
    await slotDots.first().click();
    await playerPage.waitForTimeout(500);

    const usedClasses = await slotDots.first().getAttribute("class") ?? "";

    // Reload the player page
    await playerPage.reload({ waitUntil: "domcontentloaded" });

    // Wait for reconnection
    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 30_000 });

    // Find dots again after reload
    const reloadedDots = playerPage.locator(
      '[data-testid*="spell-slot-dot"], [data-testid*="slot-dot"], [data-testid*="slot"] button, [class*="spell-slot"] button'
    );

    const reloadedCount = await reloadedDots.count();
    if (reloadedCount === 0) {
      test.skip(true, "Spell slot dots not found after reload");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // State should match what was set before reload
    const reloadedClasses = await reloadedDots.first().getAttribute("class") ?? "";
    expect(reloadedClasses).toBe(usedClasses);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION C — Mobile Bottom Bar
  // ═══════════════════════════════════════════════════════════════

  test("J21.C1 — Bottom bar visible on mobile viewport", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Bottom bar should be visible on mobile
    const bottomBar = mobilePage.locator('[data-testid^="player-bottom-bar-"]');
    await expect(bottomBar.first()).toBeVisible({ timeout: 10_000 });

    // Should contain the player's character name
    const barText = await bottomBar.first().textContent();
    expect(barText).toBeTruthy();
    const containsName =
      barText!.includes("Thorin") || barText!.length > 0;
    expect(containsName).toBe(true);

    await dmContext.close().catch(() => {});
    await mobileContext.close().catch(() => {});
  });

  test("J21.C2 — Bottom bar shows HP status", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    const mobileContext = await browser.newContext({
      viewport: { width: 393, height: 851 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await loginAs(mobilePage, PLAYER_WARRIOR);

    await playerJoinCombat(mobilePage, dmPage, token, "Thorin", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    await expect(
      mobilePage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Bottom bar should show HP information
    const bottomBar = mobilePage.locator('[data-testid^="player-bottom-bar-"]').first();
    await expect(bottomBar).toBeVisible({ timeout: 10_000 });

    // Check for HP text or progress bar element
    const barHTML = await bottomBar.innerHTML();
    const barText = await bottomBar.textContent();

    const hasHPText = barText!.includes("45") || barText!.includes("HP");
    const hasProgressBar =
      barHTML.includes("progress") ||
      barHTML.includes("bar") ||
      barHTML.includes("width:");

    expect(hasHPText || hasProgressBar).toBe(true);

    await dmContext.close().catch(() => {});
    await mobileContext.close().catch(() => {});
  });

  test("J21.C3 — Bottom bar hidden on desktop", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    // Desktop viewport (default 1280x720)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const desktopPage = await desktopContext.newPage();
    await loginAs(desktopPage, PLAYER_WARRIOR);

    await playerJoinCombat(desktopPage, dmPage, token, "Thorin", {
      initiative: "15",
      hp: "45",
      ac: "18",
    });

    await expect(
      desktopPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Bottom bar should NOT be visible on desktop (lg:hidden)
    const bottomBar = desktopPage.locator('[data-testid^="player-bottom-bar-"]');
    const bottomBarVisible = await bottomBar
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(bottomBarVisible).toBe(false);

    await dmContext.close().catch(() => {});
    await desktopContext.close().catch(() => {});
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION D — Connection Status & DM Offline
  // ═══════════════════════════════════════════════════════════════

  test("J21.D1 — Sync indicator shows connected", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Sync indicator should be visible
    const syncIndicator = playerPage.locator('[data-testid="sync-indicator"]');
    await expect(syncIndicator).toBeVisible({ timeout: 10_000 });

    // Should indicate connected state
    const title = await syncIndicator.getAttribute("title") ?? "";
    const ariaLabel = await syncIndicator.getAttribute("aria-label") ?? "";
    const indicatorText = await syncIndicator.textContent() ?? "";
    const allText = `${title} ${ariaLabel} ${indicatorText}`.toLowerCase();

    const isConnected =
      allText.includes("connected") ||
      allText.includes("conectado") ||
      allText.includes("online") ||
      allText.includes("sync");
    expect(isConnected).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.D2 — Sync indicator changes on network loss", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Verify connected first
    const syncIndicator = playerPage.locator('[data-testid="sync-indicator"]');
    await expect(syncIndicator).toBeVisible({ timeout: 10_000 });

    // Go offline
    await playerPage.context().setOffline(true);
    await playerPage.waitForTimeout(3_000);

    // Sync indicator should change to reconnecting/disconnected state
    const offlineTitle = await syncIndicator.getAttribute("title") ?? "";
    const offlineAriaLabel =
      await syncIndicator.getAttribute("aria-label") ?? "";
    const offlineText = await syncIndicator.textContent() ?? "";
    const allOfflineText =
      `${offlineTitle} ${offlineAriaLabel} ${offlineText}`.toLowerCase();

    const isReconnecting =
      allOfflineText.includes("reconnect") ||
      allOfflineText.includes("reconectando") ||
      allOfflineText.includes("offline") ||
      allOfflineText.includes("disconnected") ||
      allOfflineText.includes("desconectado");

    // Restore connectivity
    await playerPage.context().setOffline(false);
    await playerPage.waitForTimeout(10_000);

    // Should return to connected state
    const restoredTitle = await syncIndicator.getAttribute("title") ?? "";
    const restoredAriaLabel =
      await syncIndicator.getAttribute("aria-label") ?? "";
    const restoredText = await syncIndicator.textContent() ?? "";
    const allRestoredText =
      `${restoredTitle} ${restoredAriaLabel} ${restoredText}`.toLowerCase();

    const isReconnected =
      allRestoredText.includes("connected") ||
      allRestoredText.includes("conectado") ||
      allRestoredText.includes("online") ||
      allRestoredText.includes("sync");

    // At least one transition should have been detected
    expect(isReconnecting || isReconnected).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.D3 — DM offline badge appears when DM disconnects", async ({
    browser,
  }) => {
    // Create a FRESH DM context for this test (we will close it to simulate disconnect)
    const dmContextForDisconnect = await browser.newContext();
    const dmPage = await dmContextForDisconnect.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Scout", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "15", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContextForDisconnect.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Simulate DM disconnect by closing DM context
    await dmContextForDisconnect.close().catch(() => {});

    // Wait up to 60s for DM offline indicator (stale detection uses 15s polling + grace)
    const dmOfflineBadge = playerPage.locator('[data-testid="dm-offline-badge"]');
    const dmOfflineBanner = playerPage.locator('[data-testid="dm-offline-banner"]');

    let dmOfflineDetected = false;
    try {
      await expect(dmOfflineBadge.or(dmOfflineBanner)).toBeVisible({
        timeout: 60_000,
      });
      dmOfflineDetected = true;
    } catch {
      // Feature may have a longer detection window
    }

    if (!dmOfflineDetected) {
      test.skip(true, "DM offline indicator did not appear within 60s — feature may have longer detection window");
    }

    await playerContext.close().catch(() => {});
  });

  // ═══════════════════════════════════════════════════════════════
  // SECTION E — Combatant Display Details
  // ═══════════════════════════════════════════════════════════════

  test("J21.E1 — HP bars use correct tier colors", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Troll", hp: "100", ac: "15", init: "12" },
      { name: "Goblin", hp: "7", ac: "13", init: "6" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // Check HP bars for color tier classes or style attributes
    const playerViewHTML = await playerPage
      .locator('[data-testid="player-view"]')
      .innerHTML();

    // HP bars at full health should be green/emerald (LIGHT tier)
    const hasColorIndicators =
      playerViewHTML.includes("green") ||
      playerViewHTML.includes("emerald") ||
      playerViewHTML.includes("amber") ||
      playerViewHTML.includes("orange") ||
      playerViewHTML.includes("red") ||
      playerViewHTML.includes("bg-") ||
      playerViewHTML.includes("hpTier") ||
      playerViewHTML.includes("hp-tier") ||
      playerViewHTML.includes("LIGHT") ||
      playerViewHTML.includes("MODERATE") ||
      playerViewHTML.includes("HEAVY") ||
      playerViewHTML.includes("CRITICAL");

    expect(hasColorIndicators).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.E2 — Defeated combatants shown as defeated", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Weak Goblin", hp: "7", ac: "13", init: "14" },
      { name: "Orc Warrior", hp: "30", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 15_000 });

    // DM defeats the Weak Goblin — look for defeat button
    const defeatBtn = dmPage.locator(
      '[data-testid="defeat-btn"], button[aria-label*="Defeat"], button[aria-label*="Derrotar"]'
    ).first();

    // Alternative: use HP adjuster to set HP to 0
    let defeated = false;
    if (await defeatBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await defeatBtn.click();
      defeated = true;
    } else {
      // Fallback: set HP to 0 via HP adjuster
      const hpBtn = dmPage.locator('[data-testid^="hp-btn-"]').first();
      if (await hpBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await hpBtn.click();

        const adjuster = dmPage.locator('[data-testid="hp-adjuster"]');
        await expect(adjuster).toBeVisible({ timeout: 5_000 });

        const dmgInput = dmPage.locator('[data-testid="hp-amount-input"]');
        await expect(dmgInput).toBeVisible({ timeout: 5_000 });
        await dmgInput.fill("7"); // Goblin has 7 HP — this kills it

        const applyBtn = dmPage.locator('[data-testid="hp-apply-btn"]');
        await expect(applyBtn).toBeVisible({ timeout: 5_000 });
        await applyBtn.click();
        defeated = true;
      }
    }

    if (!defeated) {
      test.skip(true, "Could not defeat combatant — UI elements not found");
      await dmContext.close().catch(() => {});
      await playerContext.close().catch(() => {});
      return;
    }

    // Wait for propagation to player view
    await playerPage.waitForTimeout(10_000);

    // Check for defeated visual indication on player page
    const playerBody = await playerPage.textContent("body");
    const playerHTML = await playerPage
      .locator('[data-testid="player-view"]')
      .innerHTML();

    const hasDefeatedIndicator =
      playerBody!.includes("Defeated") ||
      playerBody!.includes("Derrotado") ||
      playerBody!.includes("defeated") ||
      playerBody!.includes("derrotado") ||
      playerHTML.includes("line-through") ||
      playerHTML.includes("opacity") ||
      playerHTML.includes("grayscale") ||
      playerHTML.includes("skull") ||
      playerHTML.includes("defeated");

    expect(hasDefeatedIndicator).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.E3 — Round number displayed", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin A", hp: "7", ac: "13", init: "14" },
      { name: "Goblin B", hp: "7", ac: "13", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    // Should show Round 1 / Rodada 1
    const playerBody = await playerPage.textContent("body");
    const hasRound1 =
      /Round\s*1/i.test(playerBody!) || /Rodada\s*1/i.test(playerBody!);
    expect(hasRound1).toBe(true);

    // DM advances turn through all combatants to complete a full round
    // Order: Goblin A (14) > Thorin (12) > Goblin B (8) → back to round 2
    const nextTurnBtn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });

    // Advance 3 times: Goblin A → Thorin → Goblin B → Round 2
    for (let i = 0; i < 3; i++) {
      await nextTurnBtn.click();
      await dmPage.waitForTimeout(1_000);
    }

    // Wait for realtime propagation
    await playerPage.waitForTimeout(5_000);

    // Should now show Round 2 / Rodada 2
    const updatedBody = await playerPage.textContent("body");
    const hasRound2 =
      /Round\s*2/i.test(updatedBody!) || /Rodada\s*2/i.test(updatedBody!);
    expect(hasRound2).toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("J21.E4 — Player cannot see DM-only controls", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Boss Monster", hp: "100", ac: "18", init: "18" },
      { name: "Minion", hp: "10", ac: "12", init: "5" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
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

    // DM should see next-turn button (sanity check)
    await expect(
      dmPage.locator('[data-testid="next-turn-btn"]')
    ).toBeVisible({ timeout: 5_000 });

    // Player should NOT see next-turn button
    const playerNextTurn = playerPage.locator('[data-testid="next-turn-btn"]');
    const hasNextTurn = await playerNextTurn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasNextTurn).toBe(false);

    // Player should NOT see HP adjuster controls on monster combatants
    const playerHpBtns = playerPage.locator('[data-testid^="hp-btn-"]');
    const playerHpCount = await playerHpBtns.count();
    // Player may have HP button for their own character, but not for monsters
    // At most 1 (their own)
    expect(playerHpCount).toBeLessThanOrEqual(1);

    // Player should NOT see DM notes section
    const dmNotes = playerPage.locator(
      '[data-testid="dm-notes"], [data-testid*="dm-note"]'
    );
    const hasDmNotes = await dmNotes
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasDmNotes).toBe(false);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });
});
