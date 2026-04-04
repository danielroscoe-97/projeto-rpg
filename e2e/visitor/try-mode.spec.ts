import { test, expect } from "@playwright/test";
import { waitForSrdReady } from "../helpers/combat";

test.describe("P0 — Visitor Try Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-set tour as completed before page load via localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        "guided-tour-v1",
        JSON.stringify({
          state: { isActive: false, isCompleted: true, currentStep: 0 },
          version: 0,
        })
      );
    });

    // After navigation, re-dispatch storage event to force Zustand to re-hydrate.
    // Needed because Zustand persist reads localStorage after first render (SSR mismatch).
    // The TourProvider fix (reading useTourStore.getState() in the 800ms timer) also guards this.
    page.on("load", async () => {
      await page.evaluate(() => {
        const val = localStorage.getItem("guided-tour-v1");
        if (val) {
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "guided-tour-v1",
              newValue: val,
              storageArea: localStorage,
            })
          );
        }
      }).catch(() => {/* ignore if page context is gone */});
    });
  });

  test("Visitor can access /try and see encounter setup", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");

    // Encounter setup shows add-row form (visible in DOM even during SRD loading)
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 15_000 });
    // No interaction needed — just visibility check, inert state is irrelevant here
  });

  test("Visitor can add combatant manually", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    // Wait for SRD to finish loading — children are wrapped in `inert` during load,
    // which blocks form submissions even with force:true
    await waitForSrdReady(page);
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });

    // Fill in combatant details
    await page.fill('[data-testid="add-row-name"]', "Goblin");
    await page.fill('[data-testid="add-row-hp"]', "7");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "12");

    // Submit via button click — only the name input has Enter handler
    await page.click('[data-testid="add-row-btn"]');

    // Combatant row should appear in the setup list
    await expect(
      page.locator('[data-testid^="setup-row-"]').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Visitor can add 2 combatants and start combat", async ({ page }) => {
    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    // Wait for SRD — children are inert during loading, blocking form interactions
    await waitForSrdReady(page);
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });

    // Add combatant 1 — submit via button click
    await page.fill('[data-testid="add-row-name"]', "Fighter");
    await page.fill('[data-testid="add-row-hp"]', "45");
    await page.fill('[data-testid="add-row-ac"]', "18");
    await page.fill('[data-testid="add-row-init"]', "15");
    await page.click('[data-testid="add-row-btn"]');
    await expect(page.locator('[data-testid^="setup-row-"]').first()).toBeVisible({ timeout: 5_000 });

    // Re-open manual form (closes after add)
    const addRowName2 = page.locator('[data-testid="add-row-name"]');
    if (!(await addRowName2.isVisible({ timeout: 1_000 }).catch(() => false))) {
      await page.locator('button').filter({ hasText: /Manual/i }).first().click();
      await expect(addRowName2).toBeVisible({ timeout: 3_000 });
    }

    // Add combatant 2
    await page.fill('[data-testid="add-row-name"]', "Mage");
    await page.fill('[data-testid="add-row-hp"]', "30");
    await page.fill('[data-testid="add-row-ac"]', "12");
    await page.fill('[data-testid="add-row-init"]', "10");
    await page.click('[data-testid="add-row-btn"]');

    // Should now have 2 combatant rows
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, { timeout: 5_000 });

    // Start combat — use native DOM click to bypass floating UI overlays
    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled({ timeout: 3_000 });
    await startBtn.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      (document.querySelector('[data-testid="start-combat-btn"]') as HTMLButtonElement)?.click();
    });

    // Active combat should appear
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
  });

  test("Visitor /try does not require login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/try");
    await page.waitForTimeout(3_000);
    expect(page.url()).not.toContain("/auth/login");
    expect(page.url()).toContain("/try");
  });
});
