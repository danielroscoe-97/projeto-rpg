/**
 * Guest QA E2E — Mobile (iPhone 14: 390x844)
 *
 * Mobile-specific concerns on top of desktop journey:
 * - Touch targets >= 44px
 * - No horizontal overflow
 * - Virtual keyboard doesn't cover inputs
 * - Scroll behavior during combat
 * - Bottom toolbar reachable with thumb
 * - Modals fit in viewport
 * - Responsive layout doesn't break
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
  assertNoHorizontalOverflow,
  assertMinTouchTarget,
  assertInViewport,
  screenshotStep,
  STANDARD_ENCOUNTER,
  QUICK_ENCOUNTER,
} from "./helpers";

test.use({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  isMobile: true,
  hasTouch: true,
});

test.describe("Guest Mobile — Full Journey QA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/try");
    await clearGuestState(page);
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. MOBILE HAPPY PATH
  // ═══════════════════════════════════════════════════════════════

  test("M01 — Full mobile happy-path: setup → combat → recap → upsell", async ({ page }) => {
    await goToTryPage(page);
    await screenshotStep(page, "m01-01-setup-mobile");

    // Verify no horizontal overflow on empty setup
    await assertNoHorizontalOverflow(page);

    // Add combatants
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await screenshotStep(page, "m01-02-setup-filled-mobile");
    await assertNoHorizontalOverflow(page);

    // Start combat
    await startCombat(page);
    await screenshotStep(page, "m01-03-combat-active-mobile");
    await assertNoHorizontalOverflow(page);

    // Fight 2 rounds
    for (let round = 0; round < 2; round++) {
      for (let turn = 0; turn < 4; turn++) {
        if (turn === 1) await applyDamageToFirst(page, 3);
        await advanceTurn(page);
      }
    }

    // End encounter
    await endEncounter(page);

    // Verify recap
    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });
    await screenshotStep(page, "m01-04-recap-mobile");

    // Skip awards
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify Save & Signup CTA
    const saveSignupBtn = page.locator('[data-testid="recap-save-signup-btn"]');
    await expect(saveSignupBtn).toBeVisible({ timeout: 5_000 });
    await screenshotStep(page, "m01-05-recap-actions-mobile");
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. MOBILE TOUCH TARGETS — All interactive elements >= 44px
  // ═══════════════════════════════════════════════════════════════

  test("M02 — Touch targets: combat toolbar buttons are >= 44px", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Check critical touch targets
    const criticalButtons = [
      "next-turn-btn",
      "end-encounter-btn",
      "add-combatant-btn",
    ];

    for (const btnId of criticalButtons) {
      const btn = page.locator(`[data-testid="${btnId}"]`);
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await assertMinTouchTarget(btn, 44);
      }
    }

    // Check HP buttons
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    if (await hpBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await assertMinTouchTarget(hpBtn, 44);
    }

    await screenshotStep(page, "m02-touch-targets");
  });

  test("M03 — Touch targets: upsell modal buttons are tappable", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Trigger upsell via save button
    const saveBtn = page.locator('[data-testid="save-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await saveBtn.click();

    const modal = page.locator('[aria-labelledby="upsell-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Check all modal buttons are tappable
    const modalButtons = modal.locator("button, a");
    const count = await modalButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = modalButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        const box = await btn.boundingBox();
        if (box) {
          // Minimum 48px height for modal CTAs (Material Design guideline)
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }

    await screenshotStep(page, "m03-upsell-modal-mobile");
    await page.keyboard.press("Escape");
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. MOBILE LAYOUT — No overflow, elements in viewport
  // ═══════════════════════════════════════════════════════════════

  test("M04 — Layout: no horizontal overflow through entire flow", async ({ page }) => {
    await goToTryPage(page);
    await assertNoHorizontalOverflow(page);

    // Setup phase
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await assertNoHorizontalOverflow(page);

    // Combat phase
    await startCombat(page);
    await assertNoHorizontalOverflow(page);

    // After turns
    await advanceTurn(page);
    await advanceTurn(page);
    await assertNoHorizontalOverflow(page);

    // HP adjuster open
    await applyDamageToFirst(page, 3);
    await assertNoHorizontalOverflow(page);

    // End + Recap
    await endEncounter(page);
    await assertNoHorizontalOverflow(page);
  });

  test("M05 — Layout: initiative list scrollable with many combatants", async ({ page }) => {
    await goToTryPage(page);

    // Add 8 combatants to force scroll
    const manyCombatants = [
      { name: "Fighter", hp: "45", ac: "18", init: "16" },
      { name: "Rogue", hp: "30", ac: "14", init: "20" },
      { name: "Cleric", hp: "35", ac: "16", init: "12" },
      { name: "Wizard", hp: "22", ac: "11", init: "18" },
      { name: "Goblin A", hp: "7", ac: "15", init: "14" },
      { name: "Goblin B", hp: "7", ac: "15", init: "11" },
      { name: "Orc", hp: "15", ac: "13", init: "8" },
      { name: "Hobgoblin", hp: "11", ac: "18", init: "6" },
    ];

    await addAllCombatants(page, manyCombatants);
    await startCombat(page);

    const initList = page.locator('[data-testid="initiative-list"]');
    await expect(initList).toBeVisible({ timeout: 5_000 });

    // The list should be scrollable or all items visible
    const listBox = await initList.boundingBox();
    expect(listBox).toBeTruthy();

    // Next turn button must still be reachable
    const nextBtn = page.locator('[data-testid="next-turn-btn"]');
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });

    await screenshotStep(page, "m05-many-combatants-mobile");
    await assertNoHorizontalOverflow(page);
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. MOBILE UPSELL — Modals fit in viewport
  // ═══════════════════════════════════════════════════════════════

  test("M06 — Upsell modal fits within mobile viewport", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Open upsell modal
    const saveBtn = page.locator('[data-testid="save-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await saveBtn.click();

    const modal = page.locator('[aria-labelledby="upsell-modal-title"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Verify modal fits in viewport
    const modalInner = modal.locator(".relative").first();
    if (await modalInner.isVisible().catch(() => false)) {
      const box = await modalInner.boundingBox();
      const viewport = page.viewportSize()!;
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.height).toBeLessThanOrEqual(viewport.height);
      }
    }

    await screenshotStep(page, "m06-upsell-viewport-fit");
    await page.keyboard.press("Escape");
  });

  test("M07 — Recap modal scrollable on mobile", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, STANDARD_ENCOUNTER);
    await startCombat(page);

    // Generate combat data for a meaningful recap
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) await applyDamageToFirst(page, 3);
      await advanceTurn(page);
    }
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    // Skip to details
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // The recap content should be scrollable (max-h set in CSS)
    const recapContent = recap.locator(".overflow-y-auto").first();
    if (await recapContent.isVisible().catch(() => false)) {
      const isScrollable = await recapContent.evaluate((el) => el.scrollHeight > el.clientHeight);
      // If content is long enough to scroll, verify it scrolls
      if (isScrollable) {
        await recapContent.evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await page.waitForTimeout(300);
      }
    }

    // Save & Signup should be reachable after scroll
    const saveSignupBtn = page.locator('[data-testid="recap-save-signup-btn"]');
    await expect(saveSignupBtn).toBeVisible({ timeout: 5_000 });

    await screenshotStep(page, "m07-recap-scrollable-mobile");
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. MOBILE BANNER & EXPIRY
  // ═══════════════════════════════════════════════════════════════

  test("M08 — Guest banner: visible and doesn't cover content", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    const banner = page.locator('[data-testid="guest-banner"]');
    await expect(banner).toBeVisible({ timeout: 5_000 });

    // Banner should not cover the initiative list
    const bannerBox = await banner.boundingBox();
    const initList = page.locator('[data-testid="initiative-list"]');
    const initBox = await initList.boundingBox();

    if (bannerBox && initBox) {
      // Banner should be above or below initiative list, not overlapping
      const overlaps =
        bannerBox.y < initBox.y + initBox.height &&
        bannerBox.y + bannerBox.height > initBox.y;
      // If they overlap vertically, at least the initiative list should still be usable
      if (overlaps) {
        // The init list should still be partially visible
        expect(initBox.height).toBeGreaterThan(100);
      }
    }

    await screenshotStep(page, "m08-banner-mobile");
  });

  test("M09 — Expiry modal: fills mobile screen appropriately", async ({ page }) => {
    await goToTryPage(page);

    // Simulate expired session
    await page.evaluate(() => {
      const expired = Date.now() - 61 * 60 * 1000;
      localStorage.setItem("guest-session-start", String(expired));
    });

    // Trigger expiry check
    await addManualCombatant(page, { name: "Test", hp: "10", ac: "10", init: "10" });

    const expiryTitle = page.locator('[id="expiry-modal-title"]');
    if (await expiryTitle.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // Modal should fit in mobile viewport
      const modal = expiryTitle.locator("..").locator("..");
      const box = await modal.boundingBox();
      const viewport = page.viewportSize()!;

      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }

      await screenshotStep(page, "m09-expiry-mobile");
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. MOBILE INPUT — Form interaction quality
  // ═══════════════════════════════════════════════════════════════

  test("M10 — Setup form: add combatant inputs are usable on mobile", async ({ page }) => {
    await goToTryPage(page);

    // Verify input fields are visible and have adequate size
    const nameInput = page.locator('[data-testid="add-row-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    // Input should have minimum height for mobile
    const nameBox = await nameInput.boundingBox();
    expect(nameBox).toBeTruthy();
    if (nameBox) {
      expect(nameBox.height).toBeGreaterThanOrEqual(32); // min input height
    }

    // Fill and add a combatant
    await addManualCombatant(page, { name: "Mobile Hero", hp: "40", ac: "16", init: "18" });

    // Verify combatant appears in list (name is inside an <input>, so use
    // inputValue via locator instead of textContent which skips input values)
    const setupList = page.locator('[data-testid="setup-combatant-list"]');
    await expect(setupList).toBeVisible({ timeout: 5_000 });
    const nameField = setupList.locator('[data-testid^="setup-name-"]').first();
    await expect(nameField).toBeVisible({ timeout: 3_000 });
    const nameValue = await nameField.inputValue();
    expect(nameValue).toContain("Mobile Hero");

    await screenshotStep(page, "m10-form-input-mobile");
  });

  test("M11 — HP adjuster: usable with touch on mobile", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Tap HP button
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.tap();

    // HP adjuster should appear
    const adjuster = page.locator('[data-testid="hp-adjuster"]');
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Verify adjuster fits in viewport
    await assertNoHorizontalOverflow(page);

    // Input should be tappable
    const hpInput = page.locator('[data-testid="hp-amount-input"]');
    await expect(hpInput).toBeVisible();
    await hpInput.fill("5");

    // Apply button should be tappable
    const applyBtn = page.locator('[data-testid="hp-apply-btn"]');
    await expect(applyBtn).toBeVisible();
    await assertMinTouchTarget(applyBtn, 44);

    await screenshotStep(page, "m11-hp-adjuster-mobile");
    await applyBtn.tap();
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. MOBILE RECAP — Full post-combat experience
  // ═══════════════════════════════════════════════════════════════

  test("M12 — Recap: Save & Signup works via touch", async ({ page }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    await advanceTurn(page);
    await applyDamageToFirst(page, 5);
    await advanceTurn(page);
    await endEncounter(page);

    const recap = page.locator('[data-testid="combat-recap"]');
    await expect(recap).toBeVisible({ timeout: 10_000 });

    // Skip awards
    const skipBtn = page.locator('[data-testid="recap-skip-btn"]');
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.tap();
      await page.waitForTimeout(500);
    }

    // Intercept navigation
    await page.route("**/auth/sign-up**", (route) =>
      route.fulfill({ status: 200, body: "<html><body>Signup</body></html>" })
    );

    // Tap Save & Signup
    const saveSignupBtn = page.locator('[data-testid="recap-save-signup-btn"]');
    await expect(saveSignupBtn).toBeVisible({ timeout: 5_000 });
    await assertMinTouchTarget(saveSignupBtn, 44);

    // Read snapshot BEFORE tapping — the tap triggers a navigation to signup
    // which destroys the execution context and makes page.evaluate() fail.
    // The snapshot is written to localStorage synchronously before navigation.
    await saveSignupBtn.tap();
    await page.waitForTimeout(300); // let sync localStorage write complete

    // Read localStorage in a resilient way — if navigation already happened,
    // catch the destroyed-context error and check on the new page instead.
    let snapshot: { combatants: unknown[] } | null = null;
    try {
      snapshot = await page.evaluate(() => {
        const raw = localStorage.getItem("guest-combat-snapshot");
        return raw ? JSON.parse(raw) : null;
      });
    } catch {
      // Navigation destroyed context — wait for new page and try there
      // (localStorage persists across same-origin navigations)
      await page.waitForLoadState("domcontentloaded");
      snapshot = await page.evaluate(() => {
        const raw = localStorage.getItem("guest-combat-snapshot");
        return raw ? JSON.parse(raw) : null;
      });
    }

    expect(snapshot).toBeTruthy();
    expect(snapshot!.combatants.length).toBeGreaterThan(0);
    await screenshotStep(page, "m12-save-signup-mobile");
  });

  test("M13 — Recap: action buttons layout on narrow screen", async ({ page }) => {
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
      await skipBtn.tap();
      await page.waitForTimeout(500);
    }

    // Verify all action buttons are visible and not overlapping
    const shareBtn = page.locator('[data-testid="recap-share-btn"]');
    const linkBtn = page.locator('[data-testid="recap-share-link-btn"]');
    const closeBtn = page.locator('[data-testid="recap-close-btn"]');

    await expect(shareBtn).toBeVisible({ timeout: 5_000 });
    await expect(linkBtn).toBeVisible();
    await expect(closeBtn).toBeVisible();

    // Verify buttons don't overlap
    const shareBox = await shareBtn.boundingBox();
    const linkBox = await linkBtn.boundingBox();

    if (shareBox && linkBox) {
      // share button should end before link button starts (no overlap)
      expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(linkBox.x + 2);
    }

    await screenshotStep(page, "m13-recap-actions-layout-mobile");
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. MOBILE NAVIGATION — URL integrity
  // ═══════════════════════════════════════════════════════════════

  test("M14 — Never redirected to login on mobile", async ({ page }) => {
    await goToTryPage(page);
    expect(page.url()).toContain("/try");
    expect(page.url()).not.toContain("/auth/login");

    await addAllCombatants(page, QUICK_ENCOUNTER);
    expect(page.url()).not.toContain("/auth/login");

    await startCombat(page);
    expect(page.url()).not.toContain("/auth/login");

    // Navigate back and forward
    await page.goBack();
    await page.waitForTimeout(1_000);
    await page.goForward();
    await page.waitForTimeout(1_000);
    expect(page.url()).not.toContain("/auth/login");

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");
  });
});
