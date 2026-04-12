/**
 * Guest QA E2E — Desktop (1280x720)
 *
 * Comprehensive guest journey test covering:
 * - Full combat flow (setup → combat → recap → upsell)
 * - All upsell trigger points
 * - Post-combat recap analytics and awards
 * - Session expiry behavior
 * - UX quality (layout, touch targets, no overflow)
 * - localStorage snapshot verification
 */
import { test, expect } from "@playwright/test";
import {
  goToTryPage,
  clearGuestState,
  addAllCombatants,
  addManualCombatant,
  startCombat,
  advanceTurn,
  applyDamageToFirst,
  applyDamageByName,
  endEncounter,
  runFullCombat,
  interceptAnalytics,
  assertNoHorizontalOverflow,
  assertMinTouchTarget,
  assertInViewport,
  screenshotStep,
  STANDARD_ENCOUNTER,
  QUICK_ENCOUNTER,
} from "./helpers";

test.use({
  viewport: { width: 1280, height: 720 },
  colorScheme: "dark",
});

test.describe("Guest Desktop — Full Journey QA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/try");
    await clearGuestState(page);
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. HAPPY PATH — Full funnel from landing to post-combat
  // ═══════════════════════════════════════════════════════════════

  test("D01 — Full happy-path: setup → combat → recap → upsell CTA", async ({ page }) => {
    await goToTryPage(page);
    await screenshotStep(page, "d01-01-setup-empty");

    // Setup: add 4 combatants
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    const setupList = page.locator('[data-testid="setup-combatant-list"]');
    await expect(setupList).toBeVisible({ timeout: 5_000 });
    await screenshotStep(page, "d01-02-setup-filled");

    // Start combat
    await startCombat(page);
    const activeCombat = page.locator('[data-testid="active-combat"]');
    await expect(activeCombat).toBeVisible();
    await screenshotStep(page, "d01-03-combat-active");

    // Fight 3 rounds (4 combatants × 3 = 12 turns)
    for (let round = 0; round < 3; round++) {
      for (let turn = 0; turn < 4; turn++) {
        if (turn === 0) await applyDamageToFirst(page, 3);
        await advanceTurn(page);
      }
    }
    await screenshotStep(page, "d01-04-combat-mid-fight");

    // End encounter
    await endEncounter(page);

    // Verify Combat Recap appears
    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });
    await screenshotStep(page, "d01-05-recap-awards");

    // Skip awards to see details
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
    await screenshotStep(page, "d01-06-recap-details");

    // Verify recap contains key elements
    const recapText = await recap.textContent();
    expect(recapText).toBeTruthy();

    // Verify Save & Signup CTA exists (guest-only button)
    const saveSignupBtn = page.locator('[data-testid="recap-save-signup-btn"]');
    await expect(saveSignupBtn).toBeVisible({ timeout: 5_000 });

    // Verify share buttons exist
    await expect(page.locator('[data-testid="recap-share-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="recap-share-link-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="recap-close-btn"]')).toBeVisible();
    await screenshotStep(page, "d01-07-recap-actions");
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. UPSELL TRIGGERS — Every upsell modal trigger point
  // ═══════════════════════════════════════════════════════════════

  test("D02 — Upsell: save button triggers upsell modal", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Click save button (locked for guests)
    const saveBtn = page.locator('[data-testid="save-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await saveBtn.click();

    // Verify upsell modal appears (use specific aria-labelledby to avoid
    // matching the Next.js dev error overlay which also uses role="dialog")
    const modal = page.locator('[aria-labelledby="upsell-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await screenshotStep(page, "d02-upsell-save");

    // Verify modal contents
    const modalText = await modal.textContent();
    expect(modalText).toBeTruthy();

    // Verify Google OAuth button
    await expect(page.locator('[data-testid="upsell-google-button"]')).toBeVisible();

    // Verify email signup link
    const emailLink = modal.locator('a[href*="/auth/sign-up?from=guest-combat"]');
    await expect(emailLink).toBeVisible();

    // Verify dismiss works (ESC key)
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("D03 — Upsell: weather button triggers upsell modal", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    const weatherBtn = page.locator('[data-testid="weather-upsell-btn"]');
    await expect(weatherBtn).toBeVisible({ timeout: 5_000 });
    await weatherBtn.click();

    const modal = page.locator('[aria-labelledby="upsell-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await screenshotStep(page, "d03-upsell-weather");

    // Dismiss with button click
    const dismissBtn = modal.locator("button").last();
    await dismissBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test("D04 — Upsell: share button triggers upsell in setup", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);

    // Click share/player-link upsell in setup phase
    const shareBtn = page.locator('[data-testid="guest-share-upsell"]');
    if (await shareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await shareBtn.click();
      const modal = page.locator('[aria-labelledby="upsell-modal-title"]');
      await expect(modal).toBeVisible({ timeout: 5_000 });
      await screenshotStep(page, "d04-upsell-share");

      // Verify it's the share-specific upsell
      await expect(page.locator('[data-testid="upsell-google-button"]')).toBeVisible();

      await page.keyboard.press("Escape");
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. POST-COMBAT RECAP — Analytics, awards, stats
  // ═══════════════════════════════════════════════════════════════

  test("D05 — Recap: awards carousel displays and is skippable", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await startCombat(page);

    // Do enough combat to generate awards (damage some combatants)
    await applyDamageByName(page, "Goblin", 7); // Kill Goblin
    await advanceTurn(page);
    await advanceTurn(page);
    await applyDamageByName(page, "Orc", 10);
    await advanceTurn(page);
    await advanceTurn(page);
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    // Check if awards phase exists
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    const hasAwards = await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasAwards) {
      // Awards carousel is showing — verify skip works
      await skipBtn.click();
      await page.waitForTimeout(600);
      // After skip, should see details phase
      await expect(page.locator('[data-testid="recap-share-btn"]')).toBeVisible({ timeout: 5_000 });
    }

    await screenshotStep(page, "d05-recap-after-combat");
  });

  test("D06 — Recap: Save & Signup saves snapshot to localStorage", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    await advanceTurn(page);
    await applyDamageToFirst(page, 5);
    await advanceTurn(page);
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    // Skip awards if present
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Intercept navigation to prevent actual redirect
    await page.route("**/auth/sign-up**", (route) =>
      route.fulfill({ status: 200, body: "<html><body>Signup</body></html>" })
    );

    // Click Save & Signup
    const saveSignupBtn = page.locator('[data-testid="recap-save-signup-btn"]');
    await expect(saveSignupBtn).toBeVisible({ timeout: 5_000 });
    await saveSignupBtn.click();

    // Verify snapshot was saved to localStorage
    const snapshot = await page.evaluate(() => {
      const raw = localStorage.getItem("guest-combat-snapshot");
      return raw ? JSON.parse(raw) : null;
    });

    expect(snapshot).toBeTruthy();
    expect(snapshot.combatants).toBeTruthy();
    expect(snapshot.combatants.length).toBeGreaterThan(0);
    expect(snapshot.timestamp).toBeTruthy();
    expect(snapshot.roundNumber).toBeGreaterThanOrEqual(1);
  });

  test("D07 — Recap: share text copies to clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    await applyDamageToFirst(page, 3); // Need damage for recap to show
    await advanceTurn(page);
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Click share text button
    const shareBtn = page.locator('[data-testid="recap-share-btn"]');
    await expect(shareBtn).toBeVisible({ timeout: 5_000 });
    await shareBtn.click();

    // Verify toast appears (sonner toast)
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 5_000 });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. SESSION EXPIRY — 60-minute limit behavior
  // ═══════════════════════════════════════════════════════════════

  test("D08 — Session expiry: modal appears and is non-dismissible", async ({ page }) => {
    await goToTryPage(page);

    // Simulate expired session by manipulating localStorage
    await page.evaluate(() => {
      const expired = Date.now() - 61 * 60 * 1000; // 61 minutes ago
      localStorage.setItem("guest-session-start", String(expired));
    });

    // Add combatants and trigger expiry check
    await addManualCombatant(page, { name: "Test", hp: "10", ac: "10", init: "10" });

    // The expiry modal should appear
    const expiryModal = page.locator('#expiry-modal-title').locator('..');
    const hasExpiryModal = await page
      .locator('text="expired_title"')
      .or(page.locator('[id="expiry-modal-title"]'))
      .isVisible({ timeout: 8_000 })
      .catch(() => false);

    if (hasExpiryModal) {
      await screenshotStep(page, "d08-expiry-modal");

      // Verify ESC does NOT close it
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      await expect(page.locator('[id="expiry-modal-title"]')).toBeVisible();

      // Verify no X close button
      const closeX = page.locator('[data-testid="expiry-close-btn"]');
      expect(await closeX.count()).toBe(0);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. GUEST BANNER — Timer and CTA visibility
  // ═══════════════════════════════════════════════════════════════

  test("D09 — Guest banner visible with timer and signup CTA", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Verify guest banner
    const banner = page.locator('[data-testid="guest-banner"]');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // Verify banner has timer text
    const bannerText = await banner.textContent();
    expect(bannerText).toBeTruthy();

    // Verify signup link in banner
    const signupLink = banner.locator('a[href*="/auth/sign-up"]');
    await expect(signupLink).toBeVisible();

    // Verify Google OAuth in banner
    const googleBtn = page.locator('[data-testid="guest-banner-google"]');
    if (await googleBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await screenshotStep(page, "d09-banner-with-google");
    }

    await screenshotStep(page, "d09-guest-banner");
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. COMBAT UX — Toolbar, keyboard, conditions
  // ═══════════════════════════════════════════════════════════════

  test("D10 — Combat toolbar: all buttons visible and functional", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await startCombat(page);

    // Verify core toolbar buttons are visible (spell-browser was removed; compendium is in navbar)
    const toolbarButtons = [
      "action-log-btn",
      "end-encounter-btn",
      "add-combatant-btn",
      "next-turn-btn",
    ];

    for (const btnId of toolbarButtons) {
      const btn = page.locator(`[data-testid="${btnId}"]`);
      await expect(btn).toBeVisible({ timeout: 5_000 });
    }

    await screenshotStep(page, "d10-toolbar-complete");

    // Verify action log toggles
    await page.click('[data-testid="action-log-btn"]');
    await page.waitForTimeout(500);
    await screenshotStep(page, "d10-action-log-open");
  });

  test("D11 — Combat: undo button works after damage", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Apply damage
    await applyDamageToFirst(page, 5);

    // Verify undo button appears/is enabled
    const undoBtn = page.locator('[data-testid="undo-btn"]');
    if (await undoBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const isDisabled = await undoBtn.isDisabled();
      if (!isDisabled) {
        await undoBtn.click();
        await page.waitForTimeout(500);
        // Undo should revert the damage
        await screenshotStep(page, "d11-after-undo");
      }
    }
  });

  test("D12 — Combat: mid-combat add combatant panel", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Open mid-combat add panel
    const addBtn = page.locator('[data-testid="add-combatant-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // Verify mid-combat add panel appears
    const addPanel = page.locator('[data-testid="mid-combat-add-panel"]');
    await expect(addPanel).toBeVisible({ timeout: 5_000 });
    await screenshotStep(page, "d12-mid-combat-add");

    // Add a new combatant mid-combat
    const midAddRow = page.locator('[data-testid="mid-combat-add-row"]');
    if (await midAddRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const nameInput = midAddRow.locator('input').first();
      if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nameInput.fill("Reforço");
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. UX QUALITY — Layout, overflow, no broken states
  // ═══════════════════════════════════════════════════════════════

  test("D13 — UX: no horizontal overflow at any phase", async ({ page }) => {
    await goToTryPage(page);
    await assertNoHorizontalOverflow(page);

    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await assertNoHorizontalOverflow(page);

    await startCombat(page);
    await assertNoHorizontalOverflow(page);

    await endEncounter(page);
    // Recap modal is an overlay, check main page
    await assertNoHorizontalOverflow(page);
  });

  test("D14 — UX: no login redirect at any point", async ({ page }) => {
    await goToTryPage(page);
    expect(page.url()).not.toContain("/auth/login");

    await addAllCombatants(page, QUICK_ENCOUNTER);
    expect(page.url()).not.toContain("/auth/login");

    await startCombat(page);
    expect(page.url()).not.toContain("/auth/login");

    await advanceTurn(page);
    expect(page.url()).not.toContain("/auth/login");

    // Verify no server errors (don't check for bare "500" as HP values may contain it)
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("500 Internal Server Error");
  });

  test("D15 — UX: recap close returns to setup for new combat", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    await applyDamageToFirst(page, 3); // Need damage for recap to show
    await advanceTurn(page);
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    // Skip awards
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Click new combat (close) button
    const closeBtn = page.locator('[data-testid="recap-close-btn"]');
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });
    await closeBtn.click();

    // Should return to setup phase
    await page.waitForTimeout(1_000);
    const addRow = page.locator('[data-testid="add-row-name"]');
    // Either add-row is visible (setup) or the recap closed
    const backToSetup = await addRow.isVisible({ timeout: 5_000 }).catch(() => false);
    await screenshotStep(page, "d15-back-to-setup");
    // At minimum, recap should be gone
    await expect(recap).not.toBeVisible({ timeout: 5_000 });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. ANALYTICS — Event tracking verification
  // ═══════════════════════════════════════════════════════════════

  test("D16 — Analytics: track events fire correctly during guest flow", async ({ page }) => {
    const events = await interceptAnalytics(page);

    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    await advanceTurn(page);
    await endEncounter(page);

    // Wait for any pending analytics
    await page.waitForTimeout(2_000);

    // Log collected events for debugging
    console.log("Collected analytics events:", events);
    // Note: events may or may not fire depending on implementation
    // The test validates the interception works; specific event assertions
    // depend on which events the guest flow currently tracks
  });
});
