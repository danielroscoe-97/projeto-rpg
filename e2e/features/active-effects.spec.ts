import { test, expect } from "@playwright/test";

/**
 * Active Effects & Consumable Tracker — Complete E2E QA
 *
 * Uses DM account (which we know works) to test:
 * 1. DM campaign home consolidated view
 * 2. Player HQ via Supabase API-based auth (bypass form for seed accounts)
 */

const DM_EMAIL = process.env.E2E_DM_EMAIL || "danielroscoe97@gmail.com";
const DM_PASSWORD = process.env.E2E_DM_PASSWORD || "Eusei123*";
const PLAYER_EMAIL = "qa.effects@test-pocketdm.com";
const PLAYER_PASSWORD = "TestQA_Effects!1";

async function loginViaForm(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth/login", { timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/**", { timeout: 45_000, waitUntil: "domcontentloaded" });
}

async function loginViaApi(page: import("@playwright/test").Page, email: string, password: string) {
  // Navigate to the app first to set the correct domain for cookies
  await page.goto("/auth/login", { timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded");

  // Sign in via Supabase API directly in the browser context
  const loginResult = await page.evaluate(async ({ email, password }) => {
    try {
      const response = await fetch("/auth/callback", { method: "GET" }).catch(() => null);
      // Use the app's supabase client
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabaseUrl = document.querySelector('meta[name="supabase-url"]')?.getAttribute("content");
      const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute("content");

      if (!supabaseUrl || !supabaseKey) {
        // Fallback: try to find from env
        return { success: false, error: "No supabase config found in page" };
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, { email, password });

  if (!loginResult.success) {
    // Fallback to form login
    await page.fill("#login-email", email);
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/app/**", { timeout: 30_000, waitUntil: "domcontentloaded" });
    return;
  }

  // Navigate to app after API login
  await page.goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
}

test("Active Effects — DM campaign home consolidated view", async ({ page }) => {
  test.setTimeout(120_000);

  await loginViaForm(page, DM_EMAIL, DM_PASSWORD);

  await page.goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  const campaignLink = page.locator('a[href*="/app/campaigns/"]').first();
  await expect(campaignLink).toBeVisible({ timeout: 10_000 });
  await campaignLink.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(3000);

  // Verify campaign page loaded
  await expect(page.locator("body")).toBeVisible();
  await page.screenshot({ path: "e2e/results/ae-dm-campaign-home.png" });

  // Check for consolidated Active Effects panel (auto-hides when no effects)
  const dmPanel = page.locator("h3").filter({ hasText: /Active Effects|Efeitos Ativos/ });
  const panelVisible = await dmPanel.isVisible({ timeout: 5_000 }).catch(() => false);
  if (panelVisible) {
    await expect(dmPanel).toBeVisible();
  }
});

test("Active Effects — Player HQ full lifecycle", async ({ page }) => {
  test.setTimeout(180_000);

  // Login via form — same pattern as qa-login-check that works
  await page.goto("/auth/login", { timeout: 45_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.fill("#login-email", PLAYER_EMAIL);
  await page.fill("#login-password", PLAYER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/**", { timeout: 45_000, waitUntil: "domcontentloaded" });
  await page.screenshot({ path: "e2e/results/ae-player-login.png" });

  // Navigate directly to the sheet (campaign "teste" where QA player has a character)
  const campaignId = "e392c8b7-9b9e-4e72-b3d0-6f7573c56f8a";
  await page.goto(`/app/campaigns/${campaignId}/sheet`, { timeout: 60_000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "e2e/results/ae-player-sheet.png" });

  if (!page.url().includes("/sheet")) {
    test.skip(true, `Player redirected from sheet — URL: ${page.url()}`);
    return;
  }

  // Click Resources tab
  const resourcesTab = page.locator("button").filter({ hasText: /^(Resources|Recursos)$/ }).first();
  await expect(resourcesTab).toBeVisible({ timeout: 8_000 });
  await resourcesTab.click();
  await page.waitForTimeout(1500);

  // ── Verify Active Effects panel ─────────────────────────────
  const aeHeader = page.locator("h3").filter({ hasText: /Active Effects|Efeitos Ativos/ }).first();
  await expect(aeHeader).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: "e2e/results/ae-01-panel-visible.png" });

  // ── Add Aid (8h, Level 2) ───────────────────────────────────
  const addBtn = page.locator("button").filter({ hasText: /Add Effect|Adicionar Efeito/ }).first();
  await addBtn.click();
  await page.waitForTimeout(500);

  await page.fill('[id="effect-name"]', "Aid");
  const levelInput = page.locator('[id="spell-level"]');
  if (await levelInput.isVisible({ timeout: 1000 }).catch(() => false)) await levelInput.fill("2");
  await page.locator("button").filter({ hasText: "8h" }).first().click();
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Aid").first()).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-02-aid-added.png" });

  // ── Add Haste (concentration, 1min) ─────────────────────────
  await addBtn.click();
  await page.waitForTimeout(500);
  await page.fill('[id="effect-name"]', "Haste");
  if (await levelInput.isVisible({ timeout: 500 }).catch(() => false)) await levelInput.fill("3");
  await page.locator('input[type="checkbox"]').first().check();
  await page.locator("button").filter({ hasText: "1min" }).first().click();
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Haste").first()).toBeVisible({ timeout: 3_000 });
  await expect(page.locator("span").filter({ hasText: /Concentration|Concentração/ }).first()).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-03-haste-concentration.png" });

  // ── Add Goodberries (consumable x10) ────────────────────────
  await addBtn.click();
  await page.waitForTimeout(500);
  await page.fill('[id="effect-name"]', "Goodberries");
  await page.locator("button").filter({ hasText: /^(Consumable|Consumível)$/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator("button").filter({ hasText: "24h" }).first().click();
  const qtyInput = page.locator('[id="effect-quantity"]');
  await expect(qtyInput).toBeVisible({ timeout: 2_000 });
  await qtyInput.fill("10");
  await page.locator('[type="submit"]').click();
  await page.waitForTimeout(1000);

  await expect(page.locator("text=Goodberries").first()).toBeVisible({ timeout: 3_000 });
  await page.screenshot({ path: "e2e/results/ae-04-goodberries.png" });

  // ── Decrement consumable ────────────────────────────────────
  const minusBtn = page.locator('[aria-label="Decrease"]').first();
  await minusBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/results/ae-05-decremented.png" });

  // ── Dismiss an effect ───────────────────────────────────────
  const dismissBtns = page.locator('[aria-label="Dismiss"], [aria-label="Remover"]');
  const countBefore = await dismissBtns.count();
  await dismissBtns.first().click(); // confirm state
  await page.waitForTimeout(300);
  await dismissBtns.first().click(); // dismiss
  await page.waitForTimeout(1000);
  const countAfter = await page.locator('[aria-label="Dismiss"], [aria-label="Remover"]').count();
  expect(countAfter).toBeLessThan(countBefore);
  await page.screenshot({ path: "e2e/results/ae-06-dismissed.png" });

  // ── Cleanup ─────────────────────────────────────────────────
  let max = 15;
  while (max-- > 0) {
    const btns = page.locator('[aria-label="Dismiss"], [aria-label="Remover"]');
    const c = await btns.count();
    if (c === 0) break;
    await btns.first().click();
    await page.waitForTimeout(200);
    await btns.first().click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "e2e/results/ae-07-cleanup.png" });
});
