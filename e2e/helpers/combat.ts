import { type Page, expect } from "@playwright/test";

/**
 * Wait for the SRD loading screen to stop blocking interactions.
 * The wrapper div ([data-testid="srd-loading"]) gets pointer-events:none immediately
 * when loading ends, before framer-motion exit animation completes.
 * Max wait: 20s (covers FALLBACK_TIMEOUT_MS=15s + buffer).
 */
export async function waitForSrdReady(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="srd-status"]');
      return el?.getAttribute("data-ready") === "true";
    },
    undefined, // arg (not used by the function)
    { timeout: 25_000 }
  );
}

/**
 * Search for a monster in the SRD search panel and add it to the encounter.
 * Assumes the monster search panel is already visible (via add-combatant-btn or setup flow).
 */
export async function searchAndAddMonster(page: Page, monsterName: string) {
  const searchInput = page.locator('[data-testid="srd-search-input"]');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(monsterName);

  // Wait for results to load
  const results = page.locator('[data-testid="srd-results"]');
  await expect(results).toBeVisible({ timeout: 10_000 });

  // Click the first matching result's add button
  const addBtn = page.locator(`[data-testid^="srd-result-"]`).first();
  await expect(addBtn).toBeVisible({ timeout: 5_000 });
  await addBtn.click();

  // Wait for the combatant to appear in the setup list
  await page.waitForTimeout(500);
}

/**
 * Create an encounter by searching and adding monsters from the SRD panel.
 * Navigates to the monster search panel in the encounter setup.
 */
export async function createEncounter(page: Page, monsters: string[]) {
  for (const monster of monsters) {
    await searchAndAddMonster(page, monster);
    // Clear search for next monster
    const searchInput = page.locator('[data-testid="srd-search-input"]');
    await searchInput.clear();
  }
}

/**
 * Add a combatant manually via the inline add row.
 * Fields: name (required), hp (optional), ac (optional), initiative (optional).
 */
export async function addManualCombatant(
  page: Page,
  opts: { name: string; hp?: string; ac?: string; initiative?: string }
) {
  // Wait for the add-row form to be ready
  const nameInput = page.locator('[data-testid="add-row-name"]');
  await expect(nameInput).toBeVisible({ timeout: 5_000 });

  // Fill fields with small delays to survive hydration re-renders
  if (opts.initiative) {
    await page.locator('[data-testid="add-row-init"]').fill(opts.initiative);
  }
  await nameInput.fill(opts.name);
  // Verify name was actually filled (hydration can wipe it)
  await expect(nameInput).toHaveValue(opts.name, { timeout: 2_000 });

  if (opts.hp) {
    await page.locator('[data-testid="add-row-hp"]').fill(opts.hp);
  }
  if (opts.ac) {
    await page.locator('[data-testid="add-row-ac"]').fill(opts.ac);
  }
  await page.click('[data-testid="add-row-btn"]');
  // Wait for combatant to appear in the list
  await expect(
    page.locator('[data-testid^="setup-row-"]').last()
  ).toBeVisible({ timeout: 5_000 });
}

/**
 * Start combat by clicking the start button.
 * Retries once if the button was swallowed by a re-render.
 */
export async function startCombat(page: Page) {
  const startBtn = page.locator('[data-testid="start-combat-btn"]');
  await startBtn.scrollIntoViewIfNeeded();
  await expect(startBtn).toBeVisible({ timeout: 5_000 });
  await startBtn.click();

  // Starting combat triggers: Supabase save → router.push(/app/combat/[id])
  // Wait for the redirect away from /session/new first
  await page.waitForURL(/\/app\/session\/(?!new)/, { timeout: 30_000, waitUntil: "domcontentloaded" }).catch(() => {});

  // Wait for active combat view to appear after redirect + SSR hydration
  try {
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 30_000 });
  } catch {
    // Retry click if first attempt was swallowed (still on setup page)
    const retryBtn = page.locator('[data-testid="start-combat-btn"]');
    if (await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await retryBtn.click();
      await page.waitForURL(/\/app\/session\/(?!new)/, { timeout: 30_000, waitUntil: "domcontentloaded" }).catch(() => {});
    }
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 30_000 });
  }
}

/**
 * Advance to the next turn by clicking the next-turn button.
 * The button disables briefly during DB persist (turnPending state).
 * We wait up to 15s for it to be enabled, then click.
 * If it remains disabled (slow Supabase persist), force-click anyway
 * since handleAdvanceTurn is idempotent and the UI will catch up.
 */
export async function advanceTurn(page: Page) {
  const nextBtn = page.locator('[data-testid="next-turn-btn"]');
  await expect(nextBtn).toBeVisible({ timeout: 5_000 });
  try {
    await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
    await nextBtn.click();
  } catch {
    // Button still disabled (slow persist) — force click
    await nextBtn.click({ force: true });
  }
  // Allow state to propagate
  await page.waitForTimeout(800);
}

/**
 * Apply damage or healing to a combatant via the HP adjuster.
 * Opens the HP panel, enters the amount, and applies.
 *
 * @param combatantIndex - 0-based index of the combatant in the initiative list
 * @param amount - numeric HP amount
 * @param mode - "damage" | "heal" | "temp" (defaults to "damage")
 */
export async function applyHpChange(
  page: Page,
  combatantId: string,
  amount: number,
  mode: "damage" | "heal" | "temp" = "damage"
) {
  // Open HP adjuster for this combatant
  const hpBtn = page.locator(`[data-testid="hp-btn-${combatantId}"]`);
  await expect(hpBtn).toBeVisible({ timeout: 5_000 });
  await hpBtn.click();

  // Wait for the HP adjuster to appear
  const adjuster = page.locator('[data-testid="hp-adjuster"]');
  await expect(adjuster).toBeVisible({ timeout: 5_000 });

  // Select mode if not damage (damage is default)
  if (mode !== "damage") {
    await page.click(`[data-testid="hp-mode-${mode}"]`);
  }

  // Enter amount
  await page.fill('[data-testid="hp-amount-input"]', String(amount));

  // Apply
  await page.click('[data-testid="hp-apply-btn"]');
  await page.waitForTimeout(300);
}

/**
 * Toggle a condition on a combatant.
 */
export async function toggleCondition(
  page: Page,
  combatantId: string,
  conditionName: string
) {
  // Open conditions panel
  const condBtn = page.locator(`[data-testid="conditions-btn-${combatantId}"]`);
  await expect(condBtn).toBeVisible({ timeout: 5_000 });
  await condBtn.click();

  // Wait for condition selector
  const selector = page.locator('[data-testid="condition-selector"]');
  await expect(selector).toBeVisible({ timeout: 5_000 });

  // Toggle the specific condition
  const condToggle = page.locator(
    `[data-testid="condition-toggle-${conditionName.toLowerCase()}"]`
  );
  await expect(condToggle).toBeVisible({ timeout: 5_000 });
  await condToggle.click();
  await page.waitForTimeout(300);
}

/**
 * End the current encounter.
 */
export async function endEncounter(page: Page) {
  const endBtn = page.locator('[data-testid="end-encounter-btn"]');
  await expect(endBtn).toBeVisible({ timeout: 5_000 });
  await endBtn.click();

  // Handle confirmation dialog if present (AlertDialog)
  const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Confirm"), [role="alertdialog"] button:last-child');
  if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
}

/**
 * Get the current round number from the active combat header.
 */
export async function getRoundNumber(page: Page): Promise<string> {
  const roundEl = page.locator('[data-testid="active-combat"] h2 .font-mono');
  await expect(roundEl).toBeVisible({ timeout: 5_000 });
  return (await roundEl.textContent()) ?? "0";
}

/**
 * Get the name of the current-turn combatant (the one with aria-current="true").
 */
export async function getCurrentTurnName(page: Page): Promise<string> {
  const currentRow = page.locator('[data-testid="current-turn-indicator"]').locator('..');
  await expect(currentRow).toBeVisible({ timeout: 5_000 });
  // The name is in the row's text content
  const rowText = await currentRow.locator('..').textContent();
  return rowText?.trim() ?? "";
}
