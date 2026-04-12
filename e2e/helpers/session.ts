import { type Page, type BrowserContext, expect } from "@playwright/test";
import { loginAs } from "./auth";
import type { TestAccount } from "../fixtures/test-accounts";

/**
 * Navigate to /app/session/new, handle campaign picker if shown.
 * Waits for either the campaign picker or the setup form, then proceeds.
 * Also opens the manual-add form so data-testid="add-row" is visible.
 */
export async function goToNewSession(page: Page) {
  await page.goto("/app/session/new");
  await page.waitForLoadState("domcontentloaded");

  // Wait for either the setup area or Quick Combat button
  const quickBtn = page.locator(
    'button:has-text("Combate Rápido"), button:has-text("Quick Combat")'
  );
  const setupArea = page.locator('[data-testid="setup-combatant-list"]');

  // Race: whichever appears first
  await expect(setupArea.or(quickBtn)).toBeVisible({ timeout: 15_000 });

  // If Quick Combat button is visible, click it to get to setup
  if (await quickBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await quickBtn.click();
    await expect(setupArea).toBeVisible({ timeout: 10_000 });
  }

  // Wait for React hydration to complete — SSR hydration mismatch re-renders
  // the entire tree and can wipe values filled too early
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1_000);

  // Open the manual-add form (MonsterSearchPanel toggle) so add-row-* testids are reachable.
  // The button contains text matching the translation key "omnibar_manual_add"
  // (pt-BR: "Monstro/Jogador Manual", en: the equivalent).
  const addRowInput = page.locator('[data-testid="add-row-name"]');
  if (!(await addRowInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
    // Try to find and click the manual-add toggle button by partial text
    const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
    if (await manualToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await manualToggle.click();
      await page.waitForTimeout(300);
    }
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

  // Close the QR code panel if it stayed open after share token generation
  const closeQr = page.locator('button:has-text("Fechar"), button:has-text("✕")').first();
  if (await closeQr.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeQr.click();
    await page.waitForTimeout(300);
  }

  // Encounter name is auto-generated — no input needed

  // Add combatants — re-open manual form if closed (getShareToken may close it)
  for (const c of combatants) {
    const addRowName = page.locator('[data-testid="add-row-name"]');
    if (!(await addRowName.isVisible({ timeout: 1_000 }).catch(() => false))) {
      const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
      if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await manualToggle.scrollIntoViewIfNeeded();
        await manualToggle.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(addRowName).toBeVisible({ timeout: 5_000 });
    await addRowName.scrollIntoViewIfNeeded();
    await page.locator('[data-testid="add-row-init"]').fill(c.init);
    await addRowName.fill(c.name);
    await expect(addRowName).toHaveValue(c.name, { timeout: 2_000 });
    await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
    await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
    const addRowBtn = page.locator('[data-testid="add-row-btn"]');
    await addRowBtn.scrollIntoViewIfNeeded();
    await addRowBtn.click();
    await page.waitForTimeout(500);
  }

  // Start combat (scroll into view for mobile viewports where button may be below fold)
  // Button stays disabled while combatants are being saved — generous timeout + force-click fallback
  const startBtn = page.locator('[data-testid="start-combat-btn"]');
  await startBtn.scrollIntoViewIfNeeded();
  try {
    await expect(startBtn).toBeEnabled({ timeout: 15_000 });
  } catch {
    // Button still disabled (slow Supabase persist) — force click since the handler is idempotent
    await startBtn.click({ force: true });
  }
  await page.waitForTimeout(500); // Let the UI settle after adding combatants
  await startBtn.click({ force: true });
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
  // Production latency is higher, so we use 5s instead of 3s.
  await playerPage.waitForTimeout(5_000);

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

  // DM accepts the late-join request via Sonner toast action button.
  // The toast renders inside [data-sonner-toaster] with text "Aceitar" (pt-BR) or "Accept" (en).
  // In production, realtime broadcasts have higher latency — the toast may take
  // longer to appear or may auto-dismiss before we click it.  We retry up to 3
  // times with increasing wait windows to handle both cases.
  const toastSelector = '[data-sonner-toaster] button';
  const toastTextRe = /Aceitar|Accept/;
  let toastClicked = false;

  for (let attempt = 0; attempt < 3 && !toastClicked; attempt++) {
    const timeout = attempt === 0 ? 30_000 : 15_000;
    try {
      const toastAcceptBtn = dmPage
        .locator(toastSelector)
        .filter({ hasText: toastTextRe })
        .first();
      await expect(toastAcceptBtn).toBeVisible({ timeout });
      await toastAcceptBtn.click();
      toastClicked = true;
    } catch {
      // Toast may have auto-dismissed or not appeared yet.
      // Small pause before retry to let the next broadcast/toast arrive.
      if (attempt < 2) {
        await dmPage.waitForTimeout(2_000);
      }
    }
  }

  if (!toastClicked) {
    // Last-resort: the toast may have been accepted automatically or the
    // combatant was added via polling.  Check if the player-view already
    // appeared (which means approval happened through another path).
    const alreadyJoined = await playerPage
      .locator('[data-testid="player-view"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!alreadyJoined) {
      throw new Error(
        "DM approval toast was never visible after 3 attempts — late-join failed"
      );
    }
  }

  // Player detects acceptance via combat:combatant_add broadcast or polling fallback.
  // The polling checks every 5s if the DM has added a combatant matching the player's name.
  await expect(
    playerPage.locator('[data-testid="player-view"]')
  ).toBeVisible({ timeout: 30_000 });
}
