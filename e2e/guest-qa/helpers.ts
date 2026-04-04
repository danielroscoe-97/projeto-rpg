import { type Page, type Locator, expect } from "@playwright/test";

// ─── Dev Overlay Helpers ─────────────────────────────────────────

/**
 * Remove the Next.js dev overlay portal that intercepts pointer events.
 * In dev mode, `<nextjs-portal>` can sit on top of buttons and block clicks,
 * especially on small (mobile) viewports.
 */
export async function dismissNextjsOverlay(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll("nextjs-portal")
      .forEach((el) => el.remove());
  });
}

// ─── Setup Helpers ────────────────────────────────────────────────

/** Skip guided tour by setting localStorage before page load */
export async function skipGuidedTour(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      "guided-tour-v1",
      JSON.stringify({
        state: { currentStep: 0, isActive: false, isCompleted: true },
        version: 0,
      })
    );
  });
}

/** Clear all guest state (cookies, storage) for a fresh session */
export async function clearGuestState(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Navigate to /try, skip tour, wait for SRD ready */
export async function goToTryPage(page: Page) {
  await page.goto("/try");
  await skipGuidedTour(page);
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await dismissNextjsOverlay(page);
  await waitForSrdReady(page);
}

/** Wait for SRD loading screen to finish */
export async function waitForSrdReady(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="srd-status"]');
      return el?.getAttribute("data-ready") === "true";
    },
    undefined,
    { timeout: 30_000 }
  );
}

// ─── Combatant Helpers ────────────────────────────────────────────

export interface ManualCombatant {
  name: string;
  hp?: string;
  ac?: string;
  init?: string;
  role?: "player" | "monster" | "npc";
}

/** Add a combatant via the manual add row */
export async function addManualCombatant(page: Page, c: ManualCombatant) {
  const nameInput = page.locator('[data-testid="add-row-name"]');

  // Open the manual-add form if it's not already visible (collapsed by default)
  if (!(await nameInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
    if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualToggle.click();
      await page.waitForTimeout(300);
    }
  }

  await expect(nameInput).toBeVisible({ timeout: 5_000 });

  if (c.init) await page.locator('[data-testid="add-row-init"]').fill(c.init);
  await nameInput.fill(c.name);
  await expect(nameInput).toHaveValue(c.name, { timeout: 2_000 });
  if (c.hp) await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
  if (c.ac) await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
  await page.click('[data-testid="add-row-btn"]');
  await page.waitForTimeout(400);
}

/** Standard test encounter: 2 PCs + 2 Monsters */
export const STANDARD_ENCOUNTER: ManualCombatant[] = [
  { name: "Paladino", hp: "52", ac: "18", init: "14" },
  { name: "Mago", hp: "28", ac: "12", init: "19" },
  { name: "Goblin", hp: "7", ac: "15", init: "12" },
  { name: "Orc", hp: "15", ac: "13", init: "8" },
];

/** Quick 2-combatant setup for fast tests */
export const QUICK_ENCOUNTER: ManualCombatant[] = [
  { name: "Hero", hp: "40", ac: "16", init: "18" },
  { name: "Goblin", hp: "7", ac: "15", init: "10" },
];

/** Add all combatants from array */
export async function addAllCombatants(page: Page, combatants: ManualCombatant[]) {
  for (const c of combatants) {
    await addManualCombatant(page, c);
  }
}

// ─── Combat Flow Helpers ──────────────────────────────────────────

/** Click start combat and wait for active combat view */
export async function startCombat(page: Page) {
  // Remove dev overlay that may intercept clicks (especially on mobile viewports)
  await dismissNextjsOverlay(page);
  const startBtn = page.locator('[data-testid="start-combat-btn"]');
  await startBtn.scrollIntoViewIfNeeded();
  await expect(startBtn).toBeVisible({ timeout: 5_000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
    timeout: 20_000,
  });
}

/** Advance to next turn */
export async function advanceTurn(page: Page) {
  const btn = page.locator('[data-testid="next-turn-btn"]');
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
  await page.waitForTimeout(400);
}

/**
 * Scroll element to viewport center to clear the sticky combat toolbar (72px).
 * `scrollIntoViewIfNeeded` scrolls to the edge which lands behind the toolbar.
 */
async function scrollToCenter(loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  // Small settle for any layout shift
  await loc.page().waitForTimeout(200);
}

/**
 * Temporarily hide mobile overlay elements (sticky toolbar + FAB) that intercept
 * pointer events, run the callback, then restore them.
 */
async function withoutMobileOverlays<T>(page: Page, fn: () => Promise<T>): Promise<T> {
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid="next-turn-fab"], [data-testid="next-turn-btn"]').forEach(el => {
      (el as HTMLElement).style.pointerEvents = "none";
    });
    // Also disable pointer events on the sticky combat toolbar
    const sticky = document.querySelector('.sticky.z-30, [class*="sticky"][class*="z-30"]');
    if (sticky) (sticky as HTMLElement).style.pointerEvents = "none";
  });
  try {
    return await fn();
  } finally {
    await page.evaluate(() => {
      document.querySelectorAll('[data-testid="next-turn-fab"], [data-testid="next-turn-btn"]').forEach(el => {
        (el as HTMLElement).style.pointerEvents = "";
      });
      const sticky = document.querySelector('.sticky.z-30, [class*="sticky"][class*="z-30"]');
      if (sticky) (sticky as HTMLElement).style.pointerEvents = "";
    });
  }
}

/** Apply damage to first visible combatant */
export async function applyDamageToFirst(page: Page, amount: number) {
  await withoutMobileOverlays(page, async () => {
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await scrollToCenter(hpBtn);
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.click();

    const adjuster = page.locator('[data-testid="hp-adjuster"]');
    await scrollToCenter(adjuster);
    await expect(adjuster).toBeVisible({ timeout: 5_000 });
    const amountInput = page.locator('[data-testid="hp-amount-input"]');
    await scrollToCenter(amountInput);
    await amountInput.fill(String(amount));
    const applyBtn = page.locator('[data-testid="hp-apply-btn"]');
    await scrollToCenter(applyBtn);
    await applyBtn.click();
    await page.waitForTimeout(400);
  });
}

/** Apply damage to a combatant by partial name match */
export async function applyDamageByName(page: Page, namePartial: string, amount: number) {
  // Find the combatant row containing the name
  const rows = page.locator('[data-testid^="combatant-row-"]');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent();
    if (text?.includes(namePartial)) {
      const testId = await rows.nth(i).getAttribute("data-testid");
      const id = testId?.replace("combatant-row-", "") ?? "";
      if (id) {
        const hpBtn = page.locator(`[data-testid="hp-btn-${id}"]`);
        await scrollToCenter(hpBtn);
        await hpBtn.click({ force: true });
        const adjuster = page.locator('[data-testid="hp-adjuster"]');
        await scrollToCenter(adjuster);
        await expect(adjuster).toBeVisible({ timeout: 5_000 });
        const amtInput = page.locator('[data-testid="hp-amount-input"]');
        await scrollToCenter(amtInput);
        await amtInput.fill(String(amount));
        const applyBtn = page.locator('[data-testid="hp-apply-btn"]');
        await scrollToCenter(applyBtn);
        await applyBtn.click({ force: true });
        await page.waitForTimeout(400);
        return;
      }
    }
  }
}

/** End encounter via the end button + confirm */
export async function endEncounter(page: Page) {
  const endBtn = page.locator('[data-testid="end-encounter-btn"]');
  await expect(endBtn).toBeVisible({ timeout: 5_000 });
  await endBtn.click();

  // Handle AlertDialog confirmation
  const confirmBtn = page
    .locator(
      'button:has-text("Confirmar"), button:has-text("Confirm"), [role="alertdialog"] button:last-child'
    )
    .first();
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(500);
}

/** Run a full combat: add combatants, start, fight N rounds, end */
export async function runFullCombat(
  page: Page,
  combatants: ManualCombatant[],
  rounds: number = 3
) {
  await addAllCombatants(page, combatants);
  await startCombat(page);

  // Fight rounds: advance turns and apply damage
  const totalTurns = combatants.length * rounds;
  for (let i = 0; i < totalTurns; i++) {
    // Apply damage on odd turns for variety
    if (i % 2 === 1) {
      await applyDamageToFirst(page, 3);
    }
    await advanceTurn(page);
  }

  await endEncounter(page);
}

// ─── Analytics Helpers ────────────────────────────────────────────

/** Intercept /api/track requests and collect events */
export async function interceptAnalytics(page: Page): Promise<string[]> {
  const events: string[] = [];
  await page.route("**/api/track", async (route) => {
    try {
      const body = route.request().postDataJSON();
      if (body?.event) events.push(body.event);
    } catch {
      // sendBeacon may not have parseable JSON
    }
    await route.fulfill({ status: 200, body: "{}" });
  });
  return events;
}

// ─── UX Assertion Helpers ─────────────────────────────────────────

/** Check that a button has minimum touch target size (44x44px) */
export async function assertMinTouchTarget(locator: Locator, minSize = 44) {
  const box = await locator.boundingBox();
  expect(box).toBeTruthy();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minSize);
    expect(box.height).toBeGreaterThanOrEqual(minSize);
  }
}

/** Check that an element is within viewport */
export async function assertInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).toBeTruthy();
  expect(viewport).toBeTruthy();
  if (box && viewport) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(-10); // small tolerance for sticky headers
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
    // Don't check bottom bound - may need scroll
  }
}

/** Assert no horizontal overflow (common mobile issue) */
export async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

/** Assert element has no text truncation (via CSS overflow) */
export async function assertNoTextTruncation(locator: Locator) {
  const isClipped = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.overflow === "hidden" && el.scrollWidth > el.clientWidth;
  });
  expect(isClipped).toBe(false);
}

/** Take a named screenshot for visual review */
export async function screenshotStep(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/guest-qa/screenshots/${name}.png`,
    fullPage: false,
  });
}
