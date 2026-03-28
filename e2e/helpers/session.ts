import { type Page, type BrowserContext, expect } from "@playwright/test";
import { loginAs } from "./auth";
import type { TestAccount } from "../fixtures/test-accounts";

/**
 * Navigate to /app/session/new, handle campaign picker if shown.
 */
export async function goToNewSession(page: Page) {
  await page.goto("/app/session/new");
  await page.waitForLoadState("domcontentloaded");

  const addRow = page.locator('[data-testid="add-row"]');
  const quickBtn = page.locator(
    'button:has-text("Combate Rápido"), button:has-text("Quick Combat")'
  );

  await expect(addRow.or(quickBtn)).toBeVisible({ timeout: 15_000 });

  if (await quickBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await quickBtn.click();
    await expect(addRow).toBeVisible({ timeout: 10_000 });
  }
}

/**
 * Generate share token on /session/new page.
 * Flow: share-prepare-btn (creates session) → share-session-generate → share-session-url
 */
export async function getShareToken(page: Page): Promise<string | null> {
  // Step 1: On /session/new, click share-prepare-btn to create session
  const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
  if (await prepareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await prepareBtn.click();
    await page.waitForTimeout(2_000);
  }

  // Step 2: Now ShareSessionButton appears — click generate
  const generateBtn = page.locator('[data-testid="share-session-generate"]');
  if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await generateBtn.click();
    await page.waitForTimeout(2_000);
  }

  // Step 3: Get the share URL
  const shareUrl = page.locator('[data-testid="share-session-url"]');
  if (await shareUrl.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const value = await shareUrl.inputValue();
    const match = value.match(/\/join\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }

  // Fallback: search all inputs
  return await page.evaluate(() => {
    const inputs = document.querySelectorAll("input");
    for (const input of inputs) {
      const m = input.value.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
    }
    return null;
  });
}

/**
 * Full DM setup: login → new session → generate share link → add combatants → start combat.
 * Returns the share token.
 */
export async function dmSetupCombatSession(
  page: Page,
  dmAccount: TestAccount,
  combatants: Array<{ name: string; hp: string; ac: string; init: string }>
): Promise<string | null> {
  await loginAs(page, dmAccount);
  await goToNewSession(page);

  // Generate share token FIRST (before adding combatants)
  const token = await getShareToken(page);

  // Set encounter name (required to start combat)
  await page.fill('[data-testid="encounter-name-input"]', "E2E Combat Session");

  // Add combatants
  for (const c of combatants) {
    await page.fill('[data-testid="add-row-name"]', c.name);
    await page.fill('[data-testid="add-row-hp"]', c.hp);
    await page.fill('[data-testid="add-row-ac"]', c.ac);
    await page.fill('[data-testid="add-row-init"]', c.init);
    await page.click('[data-testid="add-row-btn"]');
    await page.waitForTimeout(500);
  }

  // Start combat
  await page.click('[data-testid="start-combat-btn"]');
  await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });

  return token;
}

/**
 * Player joins via /join/[token], handles late-join form + DM approval.
 * Returns when player-view is visible.
 *
 * @param playerPage - Player's page (already logged in or anonymous)
 * @param dmPage - DM's page (in active combat, to accept late-join request)
 * @param token - Share token
 * @param playerName - Name for the late-join form
 */
export async function playerJoinCombat(
  playerPage: Page,
  dmPage: Page,
  token: string,
  playerName: string = "TestPlayer",
  opts: { initiative?: string; hp?: string; ac?: string } = {}
) {
  await playerPage.goto(`/join/${token}`);
  await playerPage.waitForTimeout(3_000);

  // Check for late-join registration form
  const nameInput = playerPage.locator(
    'input[placeholder*="Aragorn"], input[placeholder*="nome"], input[name="name"]'
  ).first();

  if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await nameInput.fill(playerName);

    const initInput = playerPage.locator('input[placeholder*="18"]').first();
    if (await initInput.isVisible()) await initInput.fill(opts.initiative ?? "15");

    const hpInput = playerPage.locator('input[placeholder*="45"]').first();
    if (await hpInput.isVisible()) await hpInput.fill(opts.hp ?? "45");

    const acInput = playerPage.locator('input[placeholder*="16"]').first();
    if (await acInput.isVisible()) await acInput.fill(opts.ac ?? "18");

    // Submit late-join request
    const submitBtn = playerPage.locator(
      'button:has-text("Solicitar"), button:has-text("Request"), button[type="submit"]'
    ).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await playerPage.waitForTimeout(2_000);
    }

    // DM accepts the late-join request
    const acceptBtn = dmPage.locator(
      'button:has-text("Aceitar"), button:has-text("Accept"), button:has-text("Aprovar")'
    ).first();
    if (await acceptBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await acceptBtn.click();
    }
  }

  // Wait for player-view to appear
  await expect(
    playerPage.locator('[data-testid="player-view"]')
  ).toBeVisible({ timeout: 20_000 });
}
