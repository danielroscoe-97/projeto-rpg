import { type Page, type BrowserContext, expect } from "@playwright/test";
import { loginAs } from "./auth";
import type { TestAccount } from "../fixtures/test-accounts";

/**
 * Navigate to /app/session/new, handle campaign picker if shown.
 * Waits for either the campaign picker or the setup form, then proceeds.
 */
export async function goToNewSession(page: Page) {
  await page.goto("/app/session/new");
  await page.waitForLoadState("domcontentloaded");

  // Wait for either the add-row (already past picker) or Quick Combat button
  const addRow = page.locator('[data-testid="add-row"]');
  const quickBtn = page.locator(
    'button:has-text("Combate Rápido"), button:has-text("Quick Combat")'
  );

  // Race: whichever appears first
  await expect(addRow.or(quickBtn)).toBeVisible({ timeout: 15_000 });

  // If Quick Combat button is visible, click it to get to setup
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
  try {
    // Step 1: On /session/new, click share-prepare-btn to create session
    const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
    await prepareBtn.scrollIntoViewIfNeeded();
    await expect(prepareBtn).toBeVisible({ timeout: 5_000 });
    await prepareBtn.click();
    await page.waitForTimeout(2_000);

    // Step 2: Now ShareSessionButton appears — click generate
    const generateBtn = page.locator('[data-testid="share-session-generate"]');
    await generateBtn.scrollIntoViewIfNeeded();
    await expect(generateBtn).toBeVisible({ timeout: 5_000 });
    await generateBtn.click();
    await page.waitForTimeout(2_000);

    // Step 3: Get the share URL
    const shareUrl = page.locator('[data-testid="share-session-url"]');
    await expect(shareUrl).toBeVisible({ timeout: 5_000 });
    const value = await shareUrl.inputValue();
    const match = value.match(/\/join\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  } catch {
    // Fall through to fallback
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

  // Start combat (scroll into view for mobile viewports where button may be below fold)
  const startBtn = page.locator('[data-testid="start-combat-btn"]');
  await startBtn.scrollIntoViewIfNeeded();
  await startBtn.click();
  // Starting combat triggers server calls + possible Next.js router.replace navigation.
  // Retry click if first attempt was swallowed by a concurrent re-render.
  try {
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 20_000 });
  } catch {
    const retryBtn = page.locator('[data-testid="start-combat-btn"]');
    if (await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await retryBtn.click();
    }
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 15_000 });
  }

  return token;
}

/**
 * Player joins via /join/[token], handles late-join form + DM approval.
 * Returns when player-view is visible.
 *
 * Uses stable data-testid selectors from PlayerLobby component.
 * DM approval button is inside a Sonner toast — requires [data-sonner-toaster] selector.
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
  await playerPage.waitForLoadState("domcontentloaded");

  // Wait for auth + lobby form to render (PlayerLobby uses data-testid="lobby-name")
  const nameInput = playerPage.locator('[data-testid="lobby-name"]');
  await expect(nameInput).toBeVisible({ timeout: 15_000 });

  // Allow realtime channel to fully subscribe before interacting with the form.
  // The channel is created when authReady=true (which triggers form render),
  // but Supabase Realtime subscription is async — needs a moment to connect.
  await playerPage.waitForTimeout(3_000);

  // Fill the late-join registration form
  await nameInput.fill(playerName);

  const initInput = playerPage.locator('[data-testid="lobby-initiative"]');
  await expect(initInput).toBeVisible({ timeout: 3_000 });
  await initInput.fill(opts.initiative ?? "15");

  const hpInput = playerPage.locator('[data-testid="lobby-hp"]');
  if (await hpInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await hpInput.fill(opts.hp ?? "45");
  }

  const acInput = playerPage.locator('[data-testid="lobby-ac"]');
  if (await acInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await acInput.fill(opts.ac ?? "18");
  }

  // Submit late-join request
  const submitBtn = playerPage.locator('[data-testid="lobby-submit"]');
  await expect(submitBtn).toBeVisible({ timeout: 3_000 });
  await submitBtn.click();

  // DM accepts the late-join request via Sonner toast action button
  // The toast renders inside [data-sonner-toaster] with text "Aceitar" (pt-BR) or "Accept" (en)
  const toastAcceptBtn = dmPage
    .locator('[data-sonner-toaster] button')
    .filter({ hasText: /Aceitar|Accept/ })
    .first();
  await expect(toastAcceptBtn).toBeVisible({ timeout: 15_000 });
  await toastAcceptBtn.click();

  // Player detects acceptance via combat:combatant_add broadcast or polling fallback.
  // The polling checks every 5s if the DM has added a combatant matching the player's name.
  await expect(
    playerPage.locator('[data-testid="player-view"]')
  ).toBeVisible({ timeout: 30_000 });
}
