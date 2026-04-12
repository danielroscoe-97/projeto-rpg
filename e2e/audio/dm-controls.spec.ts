import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

// DmAudioControls is rendered on the SoundboardPageClient (/app/dashboard/soundboard),
// NOT inside CombatSessionClient. These tests incorrectly expect it in active combat.
// TODO: Rewrite to test on /app/dashboard/soundboard
test.describe.skip("P2 — DM Audio Controls", () => {
  test("DM audio controls button visible in active combat", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Fighter", hp: "45", ac: "18", init: "15" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]);

    await expect(
      dmPage.locator('[data-testid="dm-audio-controls-btn"]')
    ).toBeVisible({ timeout: 5_000 });

    await dmContext.close();
  });

  test("DM audio popover opens with volume and mute", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "40", ac: "16", init: "12" },
      { name: "Dummy", hp: "1", ac: "10", init: "1" },
    ]);

    const audioBtn = dmPage.locator('[data-testid="dm-audio-controls-btn"]');
    await expect(audioBtn).toBeVisible({ timeout: 5_000 });
    await audioBtn.click();

    await expect(dmPage.locator('[data-testid="dm-audio-popover"]')).toBeVisible({ timeout: 3_000 });
    await expect(dmPage.locator('[data-testid="dm-volume-slider"]')).toBeVisible();
    await expect(dmPage.locator('[data-testid="dm-mute-toggle"]')).toBeVisible();

    await dmContext.close();
  });

  test("DM volume slider changes value", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "NPC", hp: "20", ac: "12", init: "8" },
      { name: "Dummy", hp: "1", ac: "10", init: "1" },
    ]);

    const audioBtn = dmPage.locator('[data-testid="dm-audio-controls-btn"]');
    await audioBtn.click();
    await expect(dmPage.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    const slider = dmPage.locator('[data-testid="dm-volume-slider"]');
    await slider.fill("30");

    await expect(dmPage.locator("text=30%")).toBeVisible({ timeout: 3_000 });

    await dmContext.close();
  });

  test("DM mute toggle works", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Orc", hp: "15", ac: "13", init: "6" },
      { name: "Dummy", hp: "1", ac: "10", init: "1" },
    ]);

    const audioBtn = dmPage.locator('[data-testid="dm-audio-controls-btn"]');
    await audioBtn.click();
    await expect(dmPage.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    const muteToggle = dmPage.locator('[data-testid="dm-mute-toggle"]');
    await muteToggle.click();

    // Mute toggle button should show muted state text
    await expect(muteToggle).toContainText(/silenciado|Muted/i, { timeout: 3_000 });

    // Unmute
    await muteToggle.click();
    await dmPage.waitForTimeout(500);

    await dmContext.close();
  });

  test("Popover closes on click outside", async ({ browser }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Rat", hp: "4", ac: "10", init: "2" },
      { name: "Dummy", hp: "1", ac: "10", init: "1" },
    ]);

    const audioBtn = dmPage.locator('[data-testid="dm-audio-controls-btn"]');
    await audioBtn.click();
    await expect(dmPage.locator('[data-testid="dm-audio-popover"]')).toBeVisible();

    // Click outside
    await dmPage.locator('[data-testid="active-combat"]').click({ position: { x: 10, y: 10 } });

    await expect(dmPage.locator('[data-testid="dm-audio-popover"]')).not.toBeVisible({
      timeout: 3_000,
    });

    await dmContext.close();
  });
});
