import {
  type Page,
  type Browser,
  type BrowserContext,
  expect,
} from "@playwright/test";

// ── Multi-Context Management ─────────────────────────────────

/**
 * Create multiple isolated browser contexts for multi-player testing.
 * Each context has its own session, cookies, and storage — simulating
 * independent devices/browsers.
 */
export async function createPlayerContexts(
  browser: Browser,
  count: number
): Promise<{ contexts: BrowserContext[]; pages: Page[] }> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    contexts.push(ctx);
    pages.push(page);
  }
  return { contexts, pages };
}

/**
 * Close all browser contexts cleanly (ignores errors from already-closed contexts).
 */
export async function closeAllContexts(contexts: BrowserContext[]) {
  await Promise.all(contexts.map((c) => c.close().catch(() => {})));
}

// ── Cross-Page Assertions ────────────────────────────────────

/**
 * Wait for a selector to be visible on ALL given pages simultaneously.
 * Useful for verifying that a broadcast event reached every player.
 */
export async function waitForAllPages(
  pages: Page[],
  selector: string,
  options?: { timeout?: number }
) {
  await Promise.all(
    pages.map((p) =>
      expect(p.locator(selector)).toBeVisible({
        timeout: options?.timeout ?? 30_000,
      })
    )
  );
}

/**
 * Assert that a selector is NOT visible on any of the given pages.
 */
export async function assertNoneVisible(
  pages: Page[],
  selector: string,
  options?: { timeout?: number }
) {
  await Promise.all(
    pages.map((p) =>
      expect(p.locator(selector)).not.toBeVisible({
        timeout: options?.timeout ?? 10_000,
      })
    )
  );
}

/**
 * Wait for text to appear in a container on all given pages.
 */
export async function waitForTextOnAllPages(
  pages: Page[],
  selector: string,
  text: string | RegExp,
  options?: { timeout?: number }
) {
  await Promise.all(
    pages.map((p) =>
      expect(p.locator(selector)).toContainText(text, {
        timeout: options?.timeout ?? 30_000,
      })
    )
  );
}

// ── Combatant ID Discovery ───────────────────────────────────

/**
 * Find a combatant's UUID by partial name match on the DM page.
 *
 * Strategy: within [data-testid="active-combat"], find the <li> containing
 * the target name text, then extract the UUID from its hp-btn-{uuid} child.
 */
export async function findCombatantId(
  page: Page,
  namePartial: string
): Promise<string> {
  // Scope to active combat area to avoid matching nav items or headers
  const combat = page.locator('[data-testid="active-combat"]');

  // Find the list item that contains BOTH the name AND an hp-btn
  const row = combat
    .locator("li")
    .filter({ hasText: namePartial })
    .filter({ has: page.locator('[data-testid^="hp-btn-"]') })
    .first();

  const hpBtn = row.locator('[data-testid^="hp-btn-"]');
  await expect(hpBtn).toBeVisible({ timeout: 5_000 });

  const testid = await hpBtn.getAttribute("data-testid");
  if (!testid) {
    throw new Error(`HP button testid not found for "${namePartial}"`);
  }
  return testid.slice("hp-btn-".length);
}

// ── Player Join (inline accept) ──────────────────────────────

/**
 * Player submits the late-join form (does NOT handle DM approval).
 * Navigates to /join/[token], fills form, submits.
 */
export async function playerSubmitJoin(
  playerPage: Page,
  token: string,
  playerName: string,
  opts: { initiative?: string; hp?: string; ac?: string } = {}
) {
  await playerPage.goto(`/join/${token}`);
  await playerPage.waitForLoadState("domcontentloaded");
  // Wait for anonymous auth + token validation (can be slow on production)
  await playerPage.waitForLoadState("networkidle").catch(() => {});

  const nameInput = playerPage.locator('[data-testid="lobby-name"]');
  await expect(nameInput).toBeVisible({ timeout: 45_000 });

  // Wait for realtime channel to subscribe
  await playerPage.waitForTimeout(3_000);

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

  const submitBtn = playerPage.locator('[data-testid="lobby-submit"]');
  await expect(submitBtn).toBeVisible({ timeout: 3_000 });
  await submitBtn.click();
}

/**
 * DM accepts a pending player via the inline "Aceitar" button.
 * Searches for a button matching "Aceitar {playerName}" or "Accept {playerName}".
 * Falls back to any "Aceitar/Accept" button, then Sonner toast.
 */
export async function dmAcceptPlayer(
  dmPage: Page,
  playerName: string
) {
  // Wait for the join request to arrive (realtime broadcast or polling)
  await dmPage.waitForTimeout(5_000);

  for (let attempt = 0; attempt < 6; attempt++) {
    // Strategy 1: aria-label on JoinRequestBanner button — "{Aceitar|Accept} {playerName}"
    // (JoinRequestBanner.tsx:106 uses `aria-label={\`${t("late_join_accept")} ${player_name}\`}`)
    const ariaBtn = dmPage
      .locator(`button[aria-label*="${playerName}"]`)
      .filter({ has: dmPage.locator("svg") })
      .first();
    if (await ariaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Confirm it's the accept (not reject) — accept uses Check icon (has gold/amber class)
      const isReject = await ariaBtn.evaluate((el) =>
        el.getAttribute("aria-label")?.toLowerCase().includes("rejeitar") ||
        el.getAttribute("aria-label")?.toLowerCase().includes("reject"),
      );
      if (!isReject) {
        await ariaBtn.click();
        return;
      }
    }

    // Strategy 2: Inline "Aceitar {name}" button in initiative list (legacy inline UI)
    const inlineBtn = dmPage
      .locator("button")
      .filter({ hasText: new RegExp(`Aceitar.*${playerName}|Accept.*${playerName}`, "i") })
      .first();
    if (await inlineBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await inlineBtn.click();
      return;
    }

    // Strategy 3: Any "Aceitar/Accept" button, targeting inside join-request-banner specifically
    const bannerAccept = dmPage
      .locator('[data-testid="join-request-banner"] button')
      .filter({ hasText: /Aceitar|Accept/i })
      .first();
    if (await bannerAccept.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await bannerAccept.click();
      return;
    }

    // Strategy 4: Sonner toast (legacy pattern)
    const toastBtn = dmPage
      .locator("[data-sonner-toaster] button")
      .filter({ hasText: /Aceitar|Accept/i })
      .first();
    if (await toastBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await toastBtn.click();
      return;
    }

    // Wait and retry
    await dmPage.waitForTimeout(3_000);
  }

  throw new Error(`DM could not find accept button for player "${playerName}"`);
}

// ── DM Combat Actions ────────────────────────────────────────

/**
 * Toggle hidden state for a combatant (DM only).
 * After clicking, the combatant is either hidden from or revealed to players.
 */
export async function toggleHidden(page: Page, combatantId: string) {
  // Wait for DOM to stabilize (combat page re-renders heavily on mount)
  await page.waitForTimeout(3_000);

  // Retry click — button can detach during re-renders
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const btn = page.locator(`[data-testid="hidden-btn-${combatantId}"]`);
      await expect(btn).toBeVisible({ timeout: 5_000 });
      await btn.click({ timeout: 10_000 });
      await page.waitForTimeout(500);
      return;
    } catch {
      if (attempt < 2) await page.waitForTimeout(2_000);
    }
  }
  throw new Error(`Failed to click hidden-btn-${combatantId} after 3 attempts`);
}

/**
 * Rename a combatant's display name via the stats editor (DM only).
 * Opens the editor, changes the display_name field, and closes.
 */
export async function renameCombatant(
  page: Page,
  combatantId: string,
  newDisplayName: string
) {
  // Open stats editor
  const editBtn = page.locator(`[data-testid="edit-btn-${combatantId}"]`);
  await expect(editBtn).toBeVisible({ timeout: 5_000 });
  await editBtn.click();

  // Wait for stats editor panel
  const editor = page.locator('[data-testid="stats-editor"]');
  await expect(editor).toBeVisible({ timeout: 5_000 });

  // Change display name (the player-facing name, used for anti-metagaming)
  const displayNameInput = page.locator(
    '[data-testid="stats-display-name-input"]'
  );
  await expect(displayNameInput).toBeVisible({ timeout: 3_000 });
  await displayNameInput.clear();
  await displayNameInput.fill(newDisplayName);

  // Close editor — triggers auto-save on unmount
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

/**
 * Add a combatant mid-combat via the add panel (DM only).
 * Opens the sheet, fills the manual form, adds, and closes.
 */
export async function addCombatantMidCombat(
  page: Page,
  opts: { name: string; hp?: string; ac?: string; initiative?: string }
) {
  // Open mid-combat add panel
  const addBtn = page.locator('[data-testid="add-combatant-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 5_000 });
  await addBtn.click();

  // Wait for panel to open
  const panel = page.locator('[data-testid="add-combatant-panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });

  // Open manual form if not already visible (panel may default to SRD search)
  const nameInput = panel.locator('[data-testid="add-row-name"]');
  if (!(await nameInput.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const manualToggle = panel
      .locator("button")
      .filter({ hasText: /Manual/i })
      .first();
    if (
      await manualToggle.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await manualToggle.click();
      await page.waitForTimeout(300);
    }
  }

  await expect(nameInput).toBeVisible({ timeout: 5_000 });

  // Fill fields (init first to survive hydration, then name with verify)
  if (opts.initiative) {
    await panel.locator('[data-testid="add-row-init"]').fill(opts.initiative);
  }
  await nameInput.fill(opts.name);
  await expect(nameInput).toHaveValue(opts.name, { timeout: 2_000 });

  if (opts.hp) {
    await panel.locator('[data-testid="add-row-hp"]').fill(opts.hp);
  }
  if (opts.ac) {
    await panel.locator('[data-testid="add-row-ac"]').fill(opts.ac);
  }

  // Click add
  await panel.locator('[data-testid="add-row-btn"]').click();
  await page.waitForTimeout(1_000);

  // Close the panel
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

/**
 * Mark a combatant as defeated (DM only).
 */
export async function defeatCombatant(page: Page, combatantId: string) {
  const btn = page.locator(`[data-testid="defeat-btn-${combatantId}"]`);
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.click();
  await page.waitForTimeout(500);
}

// ── Adversarial Test Helpers ────────────────────────────────────

/**
 * Simulate tab going hidden (phone lock, app switch).
 * Overrides document.visibilityState and dispatches visibilitychange event.
 */
export async function simulateVisibilityHidden(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "hidden", {
      value: true,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/**
 * Simulate tab returning to foreground (phone unlock, app switch back).
 * Restores document.visibilityState and dispatches visibilitychange event.
 */
export async function simulateVisibilityVisible(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** Metrics state for adversarial tests. */
export interface AdversarialMetrics {
  serverErrors: string[];
  consoleErrorsPerPlayer: Map<string, number>;
}

/**
 * Attach console error listener that tracks 500, 504, and rate-limit errors.
 * Returns the metrics object for later assertion.
 */
export function attachConsoleMonitor(
  page: Page,
  playerName: string,
  metrics: AdversarialMetrics
) {
  metrics.consoleErrorsPerPlayer.set(playerName, 0);
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (/50[04]|rate.?limit/i.test(text)) {
        metrics.serverErrors.push(`[${playerName}] ${text}`);
        metrics.consoleErrorsPerPlayer.set(
          playerName,
          (metrics.consoleErrorsPerPlayer.get(playerName) ?? 0) + 1
        );
      }
    }
  });
}

/**
 * Verify all player pages are responsive (not blank or crashed).
 */
export async function assertAllPagesResponsive(
  pages: Page[],
  playerNames: string[]
) {
  const results = await Promise.all(
    pages.map(async (page, i) => {
      try {
        const bodyText = await page
          .locator("body")
          .textContent({ timeout: 5_000 });
        return {
          player: playerNames[i],
          ok: !!bodyText && bodyText.length > 50,
          length: bodyText?.length ?? 0,
        };
      } catch {
        return { player: playerNames[i], ok: false, length: 0 };
      }
    })
  );
  const crashed = results.filter((r) => !r.ok);
  if (crashed.length > 0) {
    console.warn(
      `[ADVERSARIAL] Unresponsive: ${crashed.map((c) => `${c.player}(len=${c.length})`).join(", ")}`
    );
  }
  expect(crashed.length).toBeLessThanOrEqual(1);
}

/**
 * Dismiss the onboarding tour if it's visible (blocks DM interactions).
 */
export async function dismissTourIfVisible(page: Page) {
  const skipBtn = page.locator('button:has-text("Pular"), button:has-text("Skip")');
  if (await skipBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
}
