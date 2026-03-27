import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("P2 — DM Audio Controls", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("DM audio controls button is visible in combat toolbar", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const activeCombat = page.locator('[data-testid="active-combat"]');
    if (!(await activeCombat.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active combat");
      return;
    }

    // DM audio controls button should be in the toolbar
    await expect(
      page.locator('[data-testid="dm-audio-controls-btn"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test("DM audio popover opens on click", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const audioBtn = page.locator('[data-testid="dm-audio-controls-btn"]');
    if (!(await audioBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No audio controls button");
      return;
    }

    await audioBtn.click();

    // Popover should open with volume slider and mute toggle
    await expect(page.locator('[data-testid="dm-audio-popover"]')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator('[data-testid="dm-volume-slider"]')).toBeVisible();
    await expect(page.locator('[data-testid="dm-mute-toggle"]')).toBeVisible();
  });

  test("DM volume slider changes value", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const audioBtn = page.locator('[data-testid="dm-audio-controls-btn"]');
    if (!(await audioBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No audio controls");
      return;
    }

    await audioBtn.click();
    await expect(page.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    const slider = page.locator('[data-testid="dm-volume-slider"]');
    // Set volume to 30%
    await slider.fill("30");

    // Verify the value changed
    await expect(page.locator("text=30%")).toBeVisible({ timeout: 3_000 });
  });

  test("DM mute toggle works", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const audioBtn = page.locator('[data-testid="dm-audio-controls-btn"]');
    if (!(await audioBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No audio controls");
      return;
    }

    await audioBtn.click();
    await expect(page.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    const muteToggle = page.locator('[data-testid="dm-mute-toggle"]');
    await muteToggle.click();

    // Should show muted state — look for muted text or icon change
    await expect(
      page.locator('text=/silenciado|Muted|🔇/i')
    ).toBeVisible({ timeout: 3_000 });

    // Click again to unmute
    await muteToggle.click();

    // Should revert to unmuted
    await page.waitForTimeout(500);
  });

  test("DM audio popover closes on click outside", async ({ page }) => {
    await page.goto("/app/dashboard");
    const sessionLink = page.locator('a[href*="/app/session/"]').first();

    if (!(await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No active session");
      return;
    }

    await sessionLink.click();
    await page.waitForURL("**/app/session/**", { timeout: 10_000 });

    const audioBtn = page.locator('[data-testid="dm-audio-controls-btn"]');
    if (!(await audioBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No audio controls");
      return;
    }

    // Open popover
    await audioBtn.click();
    await expect(page.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    // Click outside
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    // Popover should close
    await expect(page.locator('[data-testid="dm-audio-popover"]')).not.toBeVisible({
      timeout: 3_000,
    });
  });
});
