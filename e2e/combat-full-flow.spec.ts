import { test, expect } from "@playwright/test";

/**
 * E2E: Full DM -> Player -> Combat lifecycle
 *
 * Prerequisites (see e2e/helpers/db.ts for setup details):
 *   - A running Next.js dev server (handled by playwright.config.ts webServer)
 *   - Supabase instance (local or staging) with a seeded test DM user
 *   - Environment variables:
 *       E2E_DM_EMAIL, E2E_DM_PASSWORD          — DM credentials
 *       NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — for cleanup
 */

test.describe("Combat full flow", () => {
  // ---------------------------------------------------------------
  // Step 1 — DM navigates to login page
  // ---------------------------------------------------------------
  test("Step 1: DM can see the login page", async ({ page }) => {
    await page.goto("/auth/login");

    // The login form should be visible
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Step 2 — DM logs in and reaches the dashboard
  // ---------------------------------------------------------------
  test("Step 2: DM logs in and reaches the dashboard", async ({ page }) => {
    // TODO: Replace with real test credentials via env vars
    const email = process.env.E2E_DM_EMAIL ?? "dm-test@example.com";
    const password = process.env.E2E_DM_PASSWORD ?? "test-password-123";

    await page.goto("/auth/login");
    await page.fill("#login-email", email);
    await page.fill("#login-password", password);
    await page.click('button[type="submit"]');

    // After successful login the DM should land on the dashboard
    await page.waitForURL("**/app/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  // ---------------------------------------------------------------
  // Step 3 — DM creates / accesses a session
  // ---------------------------------------------------------------
  test("Step 3: DM creates a new session", async ({ page }) => {
    // TODO: Ensure DM is logged in (use auth helper or storageState)
    await page.goto("/app/session/new");

    // The new-session page should have a form or an auto-created session
    // that redirects to /app/session/<uuid>
    await page.waitForURL("**/app/session/**", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/app\/session\//);
  });

  // ---------------------------------------------------------------
  // Step 4 — DM adds combatants
  // ---------------------------------------------------------------
  test("Step 4: DM adds combatants to the encounter", async ({ page }) => {
    // TODO: Navigate to an existing session (use session ID from Step 3 or fixture)
    // await page.goto("/app/session/<SESSION_ID>");

    // Open the "Add Combatant" form
    const addBtn = page.locator('[data-testid="add-combatant-btn"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // The add-combatant form/dialog should appear
    await expect(
      page.locator('[data-testid="add-combatant-form"], [data-testid="add-combatant-dialog"]')
    ).toBeVisible();

    // TODO: Fill combatant details (name, HP, AC, initiative)
    // These selectors depend on the AddCombatantForm component:
    //   await page.fill('[data-testid="combatant-name-input"]', "Goblin");
    //   await page.fill('[data-testid="combatant-hp-input"]', "7");
    //   await page.fill('[data-testid="combatant-ac-input"]', "15");
    //   await page.click('[data-testid="combatant-submit-btn"]');

    // Verify the combatant appears in the initiative list
    // await expect(page.locator('[data-testid="initiative-list"]')).toContainText("Goblin");
  });

  // ---------------------------------------------------------------
  // Step 5 — DM starts combat
  // ---------------------------------------------------------------
  test("Step 5: DM starts combat", async ({ page }) => {
    // TODO: Navigate to session with combatants added
    // await page.goto("/app/session/<SESSION_ID>");

    // The encounter setup / start button should be visible
    const startBtn = page.locator('[data-testid="encounter-setup"], [data-testid="start-combat-btn"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // After starting, the active combat view should appear
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();

    // The initiative list should be present
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Step 6 — Player opens session link, sees initiative board
  // ---------------------------------------------------------------
  test("Step 6: Player joins via share link and sees the initiative board", async ({
    browser,
  }) => {
    // TODO: The share token would come from the DM generating a link
    // via ShareSessionButton (data-testid="share-session-generate").
    // For now, use a placeholder token.
    const shareToken = process.env.E2E_SHARE_TOKEN ?? "test-share-token";

    // Open a separate browser context to simulate the player
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerPage.goto(`/join/${shareToken}`);

    // The player should see the initiative / combat board
    // (PlayerJoinClient renders the player view once the token is valid)
    await expect(
      playerPage.locator('[data-testid="player-view"], [data-testid="initiative-list"]')
    ).toBeVisible({ timeout: 15_000 });

    await playerContext.close();
  });

  // ---------------------------------------------------------------
  // Step 7 — DM advances turn
  // ---------------------------------------------------------------
  test("Step 7: DM advances to the next turn", async ({ page }) => {
    // TODO: Navigate to an active combat session
    // await page.goto("/app/session/<SESSION_ID>");

    // The "Next Turn" button should be visible in active combat
    const nextTurnBtn = page.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible();
    await nextTurnBtn.click();

    // After clicking, the current-turn indicator should move.
    // The exact assertion depends on how the UI highlights the active combatant.
    // For example, the second combatant row might gain an "active" class:
    //   await expect(
    //     page.locator('[data-testid="initiative-list"] > :nth-child(2)')
    //   ).toHaveClass(/active|current/);

    // At minimum, the active-combat container should still be visible
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
  });

  // ---------------------------------------------------------------
  // Step 8 — DM applies damage
  // ---------------------------------------------------------------
  test("Step 8: DM applies damage to a combatant", async ({ page }) => {
    // TODO: Navigate to an active combat session
    // await page.goto("/app/session/<SESSION_ID>");

    // Click the HP button on the first combatant to open the damage modal
    // The CombatSessionClient uses data-testid="hp-btn-<id>" for HP buttons.
    // Since we don't know the exact combatant ID, target the first HP button:
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible();
    await hpBtn.click();

    // TODO: The HP adjustment modal/popover should appear.
    // Fill in damage amount and confirm:
    //   await page.fill('[data-testid="hp-adjust-input"]', "5");
    //   await page.click('[data-testid="hp-apply-damage-btn"]');

    // Verify the HP changed (the bar tier changes based on percentage —
    // LIGHT/MODERATE/HEAVY/CRITICAL at 70/40/10%)
    //   await expect(hpBtn).not.toContainText("<original-hp>");
  });

  // ---------------------------------------------------------------
  // Step 9 — DM ends combat
  // ---------------------------------------------------------------
  test("Step 9: DM ends the encounter", async ({ page }) => {
    // TODO: Navigate to an active combat session
    // await page.goto("/app/session/<SESSION_ID>");

    // Click "End Encounter"
    const endBtn = page.locator('[data-testid="end-encounter-btn"]');
    await expect(endBtn).toBeVisible();
    await endBtn.click();

    // A confirmation dialog may appear — confirm it
    // await page.click('[data-testid="confirm-end-encounter"]');

    // After ending, the active-combat view should disappear
    // and we should return to the session idle state
    await expect(page.locator('[data-testid="active-combat"]')).not.toBeVisible({
      timeout: 10_000,
    });
  });
});
