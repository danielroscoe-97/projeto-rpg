/**
 * Lair Actions E2E Tests (Guest Mode)
 *
 * Validates the synthetic "Lair Actions" entry in initiative order:
 * auto-add, deduplication, expand/collapse, auto-cleanup, manual removal,
 * tie-breaking, monster groups, and encounter generator integration.
 *
 * All scenarios run in /try (guest mode) — no auth required.
 */
import { test, expect, type Page } from "@playwright/test";
import { waitForSrdReady } from "../helpers/combat";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate to /try, skip guided tour, clear previous combat state, wait for SRD ready */
async function guestSetup(page: Page) {
  await page.goto("/try");
  await page.evaluate(() => {
    // Skip guided tour
    localStorage.setItem(
      "guided-tour-v1",
      JSON.stringify({
        state: { currentStep: 0, isActive: false, isCompleted: true },
        version: 0,
      })
    );
    // Clear any persisted guest combat state from previous tests
    localStorage.removeItem("guest-combat-v1");
    localStorage.removeItem("guest-combat-snapshot");
    localStorage.removeItem("guest-session-start");
    localStorage.removeItem("guest-banner-dismissed");
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await waitForSrdReady(page);
  // Wait for Fuse.js index to build after SRD JSON fetch
  await page.waitForTimeout(2_000);
  await expect(page.locator('[data-testid="srd-search-input"]')).toBeVisible({
    timeout: 15_000,
  });
}

/** Search and add a monster via SRD panel with retry logic */
async function addMonster(page: Page, name: string) {
  const searchInput = page.locator('[data-testid="srd-search-input"]');

  // Retry loop: SRD Fuse index loads async after page mount
  for (let attempt = 0; attempt < 4; attempt++) {
    await searchInput.clear();
    await searchInput.fill(name);

    try {
      await page
        .locator('[data-testid="srd-results"]')
        .waitFor({ state: "visible", timeout: 8_000 });
      break;
    } catch {
      if (attempt === 3)
        throw new Error(`SRD results never appeared for "${name}"`);
      await page.waitForTimeout(2_000);
    }
  }

  // Click the first result's "Add" button
  const firstResult = page.locator('[data-testid^="srd-result-"]').first();
  await expect(firstResult).toBeVisible({ timeout: 5_000 });
  const addBtn = firstResult.locator("button", { hasText: /Adicionar|Add/ });
  await expect(addBtn).toBeVisible({ timeout: 3_000 });
  await addBtn.click();
  await page.waitForTimeout(500);
  await searchInput.clear();
}

/** Add a monster GROUP via the SRD panel qty selector */
async function addMonsterGroup(page: Page, name: string, qty: number) {
  const searchInput = page.locator('[data-testid="srd-search-input"]');

  // Search and wait for results
  for (let attempt = 0; attempt < 4; attempt++) {
    await searchInput.clear();
    await searchInput.fill(name);
    try {
      await page
        .locator('[data-testid="srd-results"]')
        .waitFor({ state: "visible", timeout: 8_000 });
      break;
    } catch {
      if (attempt === 3)
        throw new Error(`SRD results never appeared for "${name}"`);
      await page.waitForTimeout(2_000);
    }
  }

  // Get the first result's monster ID for the group button
  const firstResult = page.locator('[data-testid^="srd-result-"]').first();
  const testId = await firstResult.getAttribute("data-testid");
  const monsterId = testId?.replace("srd-result-", "") ?? "";

  // Adjust quantity via +/- buttons to reach desired qty (default is 2)
  const plusBtn = firstResult.locator('button:has-text("+")').first();
  for (let i = 2; i < qty; i++) {
    await plusBtn.click();
    await page.waitForTimeout(100);
  }

  // Click the group add button (e.g. "+3 grupo")
  const groupBtn = page.locator(`[data-testid="add-group-${monsterId}"]`);
  await expect(groupBtn).toBeVisible({ timeout: 3_000 });
  await groupBtn.click();
  await page.waitForTimeout(500);
  await searchInput.clear();
}

/** Add a manual combatant (PC) via the inline add row */
async function addManual(
  page: Page,
  opts: { name: string; hp?: string; ac?: string; init?: string }
) {
  const nameInput = page.locator('[data-testid="add-row-name"]');
  if (!(await nameInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const toggle = page
      .locator("button")
      .filter({ hasText: /Manual/i })
      .first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(300);
    }
  }
  await nameInput.fill(opts.name);
  if (opts.hp) await page.locator('[data-testid="add-row-hp"]').fill(opts.hp);
  if (opts.ac) await page.locator('[data-testid="add-row-ac"]').fill(opts.ac);
  if (opts.init)
    await page.locator('[data-testid="add-row-init"]').fill(opts.init);
  await page.click('[data-testid="add-row-btn"]');
  await page.waitForTimeout(500);
}

/** Locate lair rows in setup by matching rows containing the castle emoji */
function lairSetupRows(page: Page) {
  return page
    .locator('[data-testid^="setup-row-"]')
    .filter({ hasText: "🏰" });
}

/**
 * Locate the lair row in active combat.
 * LairActionRow has no data-testid — find it by 🏰 inside the initiative list.
 */
function lairCombatRow(page: Page) {
  return page
    .locator('[data-testid="initiative-list"] > div')
    .filter({ hasText: "🏰" });
}

/** Start combat from setup phase (guest mode — no URL redirect) */
async function startGuestCombat(page: Page) {
  const startBtn = page.locator('[data-testid="start-combat-btn"]');
  await startBtn.scrollIntoViewIfNeeded();
  await expect(startBtn).toBeVisible({ timeout: 5_000 });
  await startBtn.click();
  await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
    timeout: 20_000,
  });
}

/** Remove a combatant in setup phase by name.
 *  Uses aria-label pattern "Remover {name}" / "Remove {name}".
 */
async function removeSetupCombatant(page: Page, namePattern: RegExp) {
  const btn = page
    .getByRole("button", {
      name: new RegExp(`(Remover|Remove).*${namePattern.source}`, "i"),
    })
    .first();
  await expect(btn).toBeVisible({ timeout: 3_000 });
  await btn.click();
  // Confirm removal dialog
  const confirmBtn = page
    .locator('[role="alertdialog"] button')
    .filter({ hasText: /Remover|Remove|Confirmar|Confirm/ })
    .first();
  if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(500);
}

/** Remove a combatant in active combat via data-testid remove button + confirm */
async function removeCombatCombatant(page: Page, combatantId: string) {
  const removeBtn = page.locator(`[data-testid="remove-btn-${combatantId}"]`);
  await expect(removeBtn).toBeVisible({ timeout: 3_000 });
  await removeBtn.click();
  // Confirm removal dialog
  const confirmBtn = page
    .locator('[role="alertdialog"] button')
    .filter({ hasText: /Remover|Remove|Confirmar|Confirm/ })
    .first();
  if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(500);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Lair Actions — Guest Combat", () => {
  test.describe.configure({ mode: "serial" });

  test("1. Auto-add: adding a lair monster creates the Lair Actions entry", async ({
    page,
  }) => {
    await guestSetup(page);
    await addMonster(page, "Adult Blue Dragon");

    // Lair Actions row should appear in setup list
    const lairRows = lairSetupRows(page);
    await expect(lairRows.first()).toBeVisible({ timeout: 5_000 });
    await expect(lairRows).toHaveCount(1);

    // Verify "20" badge is present (exact match to avoid "Init 20 (fixo)" text)
    await expect(
      lairRows.first().getByText("20", { exact: true })
    ).toBeVisible();
  });

  test("2. Deduplication: multiple lair monsters produce only 1 entry", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonster(page, "Adult Blue Dragon");
    await expect(lairSetupRows(page)).toHaveCount(1);

    await addMonster(page, "Ancient Red Dragon");
    await expect(lairSetupRows(page)).toHaveCount(1); // still 1

    await addMonster(page, "Goblin");
    await expect(lairSetupRows(page)).toHaveCount(1); // still 1
  });

  test("3. Expand/collapse lair actions in active combat", async ({ page }) => {
    await guestSetup(page);

    await addMonster(page, "Adult Blue Dragon");
    await addMonster(page, "Ancient Red Dragon");
    await addManual(page, { name: "Hero", hp: "30", ac: "16", init: "15" });

    await startGuestCombat(page);

    // Find the lair row in active combat (no data-testid on LairActionRow)
    const lairRow = lairCombatRow(page);
    await expect(lairRow).toBeVisible({ timeout: 5_000 });

    // Click header to expand
    await lairRow.locator(".cursor-pointer").first().click();

    // Should show lair action descriptions (one <ul> per lair monster)
    const expandedLists = lairRow.locator("ul");
    await expect(expandedLists.first()).toBeVisible({ timeout: 3_000 });
    // 2 lair monsters = 2 action lists
    await expect(expandedLists).toHaveCount(2);

    // Both dragon names should appear as section headers
    await expect(
      lairRow.getByText("Adult Blue Dragon", { exact: false })
    ).toBeVisible({ timeout: 3_000 });
    await expect(
      lairRow.getByText("Ancient Red Dragon", { exact: false })
    ).toBeVisible({ timeout: 3_000 });

    // Click header again to collapse
    await lairRow.locator(".cursor-pointer").first().click();
    await expect(expandedLists.first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("4. Auto-cleanup in combat: removing last lair monster removes lair entry", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonster(page, "Adult Blue Dragon");
    await addManual(page, { name: "Hero", hp: "30", ac: "16", init: "15" });

    await startGuestCombat(page);

    // Lair row should exist in active combat
    const lairRow = lairCombatRow(page);
    await expect(lairRow).toBeVisible({ timeout: 5_000 });

    // Find the dragon's combatant-row and extract its ID
    const dragonRow = page
      .locator('[data-testid^="combatant-row-"]')
      .filter({ hasText: /Adult Blue Dragon/i })
      .first();
    await expect(dragonRow).toBeVisible({ timeout: 3_000 });
    const dragonTestId = await dragonRow.getAttribute("data-testid");
    const dragonId = dragonTestId?.replace("combatant-row-", "") ?? "";

    await removeCombatCombatant(page, dragonId);

    // Lair entry should be auto-removed
    await expect(lairRow).not.toBeVisible({ timeout: 5_000 });

    // Hero should still be there
    await expect(
      page
        .locator('[data-testid^="combatant-row-"]')
        .filter({ hasText: /Hero/i })
        .first()
    ).toBeVisible();
  });

  test("5. Auto-cleanup in setup: removing last lair monster removes lair entry", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonster(page, "Aboleth");
    await addManual(page, { name: "Hero", hp: "7", ac: "15", init: "12" });

    // Lair entry should exist (Aboleth has lair actions)
    await expect(lairSetupRows(page)).toHaveCount(1);

    // 3 rows total: Aboleth + Lair Actions + Hero
    const allRows = page.locator('[data-testid^="setup-row-"]');
    await expect(allRows).toHaveCount(3, { timeout: 3_000 });

    // Remove the Aboleth via its "Remover" button
    const removeBtn = page.getByRole("button", {
      name: /Remover.*Aboleth/i,
    });
    await expect(removeBtn).toBeVisible({ timeout: 3_000 });
    await removeBtn.click();

    // Confirm in dialog
    const confirmBtn = page
      .locator('[role="alertdialog"]')
      .getByRole("button", { name: /Remover/i });
    await expect(confirmBtn).toBeVisible({ timeout: 2_000 });
    await confirmBtn.click();
    await page.waitForTimeout(500);

    // Lair entry should be auto-removed (only Hero remains)
    await expect(lairSetupRows(page)).toHaveCount(0);
    await expect(allRows).toHaveCount(1, { timeout: 3_000 });
  });

  test("6. Manual removal of Lair Actions entry via ✕ button", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonster(page, "Lich");

    // Lair entry should exist
    const lairRow = lairSetupRows(page).first();
    await expect(lairRow).toBeVisible({ timeout: 5_000 });

    // 2 rows: Lich + Lair Actions
    const allSetupRows = page.locator('[data-testid^="setup-row-"]');
    await expect(allSetupRows).toHaveCount(2, { timeout: 3_000 });

    // Click ✕ on the lair entry itself
    const removeBtn = lairRow.locator('button:has-text("✕")');
    await expect(removeBtn).toBeVisible({ timeout: 3_000 });
    await removeBtn.click();
    await page.waitForTimeout(500);

    // Lair entry removed, only Lich remains (1 row)
    await expect(lairSetupRows(page)).toHaveCount(0);
    await expect(allSetupRows).toHaveCount(1, { timeout: 3_000 });

    // Lich should still be present (check by "Remover Lich" button existence)
    await expect(
      page.getByRole("button", { name: /Remover.*Lich/i })
    ).toBeVisible();
  });

  test("7. Tie-breaking: Lair Actions at init 20 appears after combatants with init 20", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonster(page, "Adult Blue Dragon");
    await addManual(page, {
      name: "Fast Hero",
      hp: "30",
      ac: "16",
      init: "20",
    });

    await startGuestCombat(page);

    // Get all children in the initiative list
    const rows = page.locator('[data-testid="initiative-list"] > *');
    const count = await rows.count();

    // Find indices of "Fast Hero" and "Lair Actions" (🏰)
    let heroIdx = -1;
    let lairIdx = -1;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      if (text?.includes("Fast Hero")) heroIdx = i;
      if (text?.includes("🏰")) lairIdx = i;
    }

    expect(heroIdx).toBeGreaterThanOrEqual(0);
    expect(lairIdx).toBeGreaterThanOrEqual(0);
    // Lair Actions should come AFTER the hero at init 20 (tiebreak = 999)
    expect(lairIdx).toBeGreaterThan(heroIdx);
  });

  test("8. Monster group with lair: only 1 lair entry for group of 3", async ({
    page,
  }) => {
    await guestSetup(page);

    await addMonsterGroup(page, "Adult Blue Dragon", 3);

    // Should have 4 rows total: 3 dragons + 1 lair
    const allRows = page.locator('[data-testid^="setup-row-"]');
    await expect(allRows).toHaveCount(4, { timeout: 5_000 });

    // Only 1 lair entry
    await expect(lairSetupRows(page)).toHaveCount(1);

    // Remove dragons one by one (3 remove buttons matching "Adult Blue Dragon")
    for (let i = 0; i < 3; i++) {
      const btn = page
        .getByRole("button", { name: /Remover.*Adult Blue Dragon/i })
        .first();
      if (!(await btn.isVisible({ timeout: 2_000 }).catch(() => false))) break;
      await removeSetupCombatant(page, /Adult Blue Dragon/);
    }

    // After removing all dragons, lair entry should be gone too
    await expect(lairSetupRows(page)).toHaveCount(0);
    await expect(allRows).toHaveCount(0, { timeout: 3_000 });
  });
});
