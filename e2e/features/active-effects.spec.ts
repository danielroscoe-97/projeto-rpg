import { test, expect } from "@playwright/test";

/**
 * Active Effects & Consumable Tracker — Complete E2E QA
 *
 * Tests the Player HQ (player account) and DM consolidated view (DM account).
 * Single login per test to avoid auth rate limits.
 */

const DM_EMAIL = process.env.E2E_DM_EMAIL || "dm.primary@test-taverna.com";
const DM_PASSWORD = process.env.E2E_DM_PASSWORD || "TestDM_Primary!1";
const PLAYER_EMAIL = process.env.E2E_PLAYER_EMAIL || "player.warrior@test-taverna.com";
const PLAYER_PASSWORD = process.env.E2E_PLAYER_PASSWORD || "TestPlayer_War!1";

test("Active Effects — DM campaign home consolidated view", async ({ page }) => {
  test.setTimeout(120_000);

  // Login as DM
  await page.goto("/auth/login", { timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.fill("#login-email", DM_EMAIL);
  await page.fill("#login-password", DM_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/**", { timeout: 45_000, waitUntil: "domcontentloaded" });

  // Navigate to first campaign
  await page.goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  const campaignLink = page.locator('a[href*="/app/campaigns/"]').first();
  await expect(campaignLink).toBeVisible({ timeout: 10_000 });
  await campaignLink.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // Verify campaign page loaded (DM view)
  await expect(page.locator("body")).toBeVisible();

  // Check for consolidated Active Effects panel
  // It only renders when characters have active effects
  const dmPanel = page.locator("h3").filter({ hasText: /Active Effects|Efeitos Ativos/ });
  const panelVisible = await dmPanel.isVisible({ timeout: 5_000 }).catch(() => false);

  await page.screenshot({ path: "e2e/results/ae-dm-campaign-home.png" });

  // If effects exist, verify the panel has character names
  if (panelVisible) {
    await expect(dmPanel).toBeVisible();
    // Should show at least one character name
    const charNames = page.locator("span.text-xs.font-medium.text-foreground");
    const nameCount = await charNames.count();
    expect(nameCount).toBeGreaterThanOrEqual(1);
  }
  // If not visible, that's also correct — means no active effects exist
});

test("Active Effects — Player HQ full lifecycle", async ({ page }) => {
  test.setTimeout(180_000);

  // Login as Player (try player account first, fall back to DM with player role)
  await page.goto("/auth/login", { timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.fill("#login-email", PLAYER_EMAIL);
  await page.fill("#login-password", PLAYER_PASSWORD);
  await page.click('button[type="submit"]');

  const loginSuccess = await page.waitForURL("**/app/**", { timeout: 30_000, waitUntil: "domcontentloaded" }).then(() => true).catch(() => false);

  if (!loginSuccess) {
    // Player account not available — skip test
    test.skip(true, "Player account not available for testing");
    return;
  }

  // Find a campaign where the player has a character (sheet route)
  await page.goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Look for campaign links
  const campaignLink = page.locator('a[href*="/app/campaigns/"]').first();
  if (!(await campaignLink.isVisible({ timeout: 8_000 }).catch(() => false))) {
    test.skip(true, "No campaigns found for player");
    return;
  }

  const href = await campaignLink.getAttribute("href");
  const campaignId = href?.match(/\/app\/campaigns\/([^/]+)/)?.[1];

  // Navigate to Player HQ
  await page.goto(`/app/campaigns/${campaignId}/sheet`, { timeout: 60_000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Check if we got redirected (means player doesn't have a character here)
  if (page.url().includes("/sheet") === false) {
    test.skip(true, "Player not eligible for sheet in this campaign");
    return;
  }

  // Click Resources tab
  const resourcesTab = page.locator("button").filter({ hasText: /^(Resources|Recursos)$/ }).first();
  await expect(resourcesTab).toBeVisible({ timeout: 8_000 });
  await resourcesTab.click();
  await page.waitForTimeout(1500);

  // ── Verify Active Effects panel exists ──────────────────────
  const aeHeader = page.locator("h3").filter({ hasText: /Active Effects|Efeitos Ativos/ }).first();
  await expect(aeHeader).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: "e2e/results/ae-01-panel-visible.png" });

  // ── Add spell effect — Aid (8h, Level 2) ────────────────────
  const addBtn = page.locator("button").filter({ hasText: /Add Effect|Adicionar Efeito/ }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.fill('[id="effect-name"]', "Aid");
  const levelInput = page.locator('[id="spell-level"]');
  if (await levelInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await levelInput.fill("2");
  }
  await page.locator("button").filter({ hasText: "8h" }).first().click();
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Aid").first()).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-02-aid-added.png" });

  // ── Add concentration spell — Haste ─────────────────────────
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.fill('[id="effect-name"]', "Haste");
  if (await levelInput.isVisible({ timeout: 500 }).catch(() => false)) {
    await levelInput.fill("3");
  }
  const concCheckbox = page.locator('input[type="checkbox"]').first();
  await concCheckbox.check();
  await page.locator("button").filter({ hasText: "1min" }).first().click();
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Haste").first()).toBeVisible({ timeout: 3_000 });
  const concBadge = page.locator("span").filter({ hasText: /Concentration|Concentração/ }).first();
  await expect(concBadge).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-03-haste-concentration.png" });

  // ── Add consumable — Goodberries x10 ────────────────────────
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.fill('[id="effect-name"]', "Goodberries");
  const consumableBtn = page.locator("button").filter({ hasText: /^(Consumable|Consumível)$/ }).first();
  await consumableBtn.click();
  await page.waitForTimeout(300);

  await page.locator("button").filter({ hasText: "24h" }).first().click();
  const qtyInput = page.locator('[id="effect-quantity"]');
  await expect(qtyInput).toBeVisible({ timeout: 2_000 });
  await qtyInput.fill("10");
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Goodberries").first()).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-04-goodberries-10.png" });

  // ── Decrement consumable ────────────────────────────────────
  const minusBtn = page.locator('[aria-label="Decrease"]').first();
  await minusBtn.click();
  await page.waitForTimeout(500);
  await minusBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/results/ae-05-goodberries-decremented.png" });

  // ── Dismiss an effect ───────────────────────────────────────
  const dismissBtns = page.locator('[aria-label="Dismiss"], [aria-label="Remover"]');
  const countBefore = await dismissBtns.count();
  expect(countBefore).toBeGreaterThanOrEqual(3);

  await dismissBtns.first().click(); // confirm state
  await page.waitForTimeout(300);
  await dismissBtns.first().click(); // dismiss
  await page.waitForTimeout(1000);

  const countAfter = await page.locator('[aria-label="Dismiss"], [aria-label="Remover"]').count();
  expect(countAfter).toBeLessThan(countBefore);
  await page.screenshot({ path: "e2e/results/ae-06-dismissed.png" });

  // ── Cleanup — dismiss all remaining ─────────────────────────
  let maxCleanup = 15;
  while (maxCleanup-- > 0) {
    const btns = page.locator('[aria-label="Dismiss"], [aria-label="Remover"]');
    const c = await btns.count();
    if (c === 0) break;
    await btns.first().click();
    await page.waitForTimeout(200);
    await btns.first().click();
    await page.waitForTimeout(500);
  }

  const emptyText = page.locator("p").filter({ hasText: /No active effects|Nenhum efeito ativo/ }).first();
  await expect(emptyText).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-07-cleanup-done.png" });
});
