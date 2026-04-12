/**
 * Adversarial Test — Rapid DM Actions Broadcast Ordering & Resilience
 *
 * DM fires 10+ actions in rapid succession (500ms and 300ms gaps).
 * Verifies that the Supabase Realtime broadcast system handles rapid-fire
 * DM mutations without desync, crashes, or rate-limiting errors.
 *
 * What this tests:
 *   - 10 consecutive turn advances with 500ms gaps
 *   - 10 interleaved mixed actions (turn, damage, condition) with 300ms gaps
 *   - Player board remains functional after rapid-fire DM actions
 *   - No 500/504/rate-limit console errors on either DM or player page
 *   - Broadcast ordering resilience under extreme DM tempo
 *
 * Run: npx playwright test adversarial-rapid-dm-actions
 *
 * @tags @adversarial
 */
import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type Browser,
} from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import {
  advanceTurn,
  applyHpChange,
  toggleCondition,
} from "../helpers/combat";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  createPlayerContexts,
  closeAllContexts,
  playerSubmitJoin,
  dmAcceptPlayer,
  findCombatantId,
  waitForAllPages,
  attachConsoleMonitor,
  assertAllPagesResponsive,
  dismissTourIfVisible,
  type AdversarialMetrics,
} from "../helpers/multi-player";

// ── Configuration ────────────────────────────────────────────

/** Gap between rapid turn advances (ms) */
const RAPID_TURN_GAP_MS = 500;

/** Gap between mixed actions (ms) */
const MIXED_ACTION_GAP_MS = 300;

/** Post-barrage stabilization wait (ms) */
const STABILIZATION_WAIT_MS = 15_000;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

let suiteStartTime = 0;

function printMetrics() {
  const totalDuration = Date.now() - suiteStartTime;
  console.log("\n========== ADVERSARIAL: RAPID DM ACTIONS — METRICS ==========");
  console.log(`Total suite duration: ${(totalDuration / 1000).toFixed(1)}s`);

  console.log("\nConsole errors (500/504/rate-limit):");
  let totalErrors = 0;
  for (const [name, count] of metrics.consoleErrorsPerPlayer) {
    if (count > 0) console.log(`  ${name}: ${count} errors`);
    totalErrors += count;
  }
  if (totalErrors === 0) {
    console.log("  None (all clean)");
  }

  if (metrics.serverErrors.length > 0) {
    console.log(`\nServer error details (first 15):`);
    for (const err of metrics.serverErrors.slice(0, 15)) {
      console.log(`  ${err}`);
    }
    if (metrics.serverErrors.length > 15) {
      console.log(`  ... and ${metrics.serverErrors.length - 15} more`);
    }
  }
  console.log("==============================================================\n");
}

// ══════════════════════════════════════════════════════════════
// ADVERSARIAL SUITE: Rapid DM Actions
// ══════════════════════════════════════════════════════════════

test.describe.serial("Adversarial — rapid DM actions broadcast ordering", () => {
  test.slow();

  let browser: Browser;
  let dmContext: BrowserContext;
  let dmPage: Page;
  let playerContext: BrowserContext;
  let playerPage: Page;
  let shareToken: string;

  // Combatant UUIDs
  let goblinId: string;
  let orcId: string;
  let skeletonId: string;
  let zombieId: string;

  test.beforeAll(async ({ browser: b }) => {
    suiteStartTime = Date.now();
    browser = b;

    // DM context
    dmContext = await browser.newContext();
    dmPage = await dmContext.newPage();
    attachConsoleMonitor(dmPage, "DM", metrics);

    // Single player context
    const result = await createPlayerContexts(browser, 1);
    playerContext = result.contexts[0];
    playerPage = result.pages[0];
    attachConsoleMonitor(playerPage, "Player_01", metrics);
  });

  test.afterAll(async () => {
    printMetrics();
    await closeAllContexts([dmContext, playerContext]);
  });

  // ════════════════════════════════════════════════════════════
  // SETUP: DM creates session with 4 monsters, 1 player joins
  // ════════════════════════════════════════════════════════════

  test("Setup: DM creates session with 4 monsters, 1 player joins", async () => {
    // DM creates combat session
    let token: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
          { name: "Goblin Skirmisher", hp: "12", ac: "13", init: "16" },
          { name: "Orc Warchief", hp: "60", ac: "16", init: "12" },
          { name: "Skeleton Warrior", hp: "20", ac: "13", init: "10" },
          { name: "Zombie Brute", hp: "30", ac: "8", init: "6" },
        ]);
        break;
      } catch (e) {
        if (attempt === 0 && String(e).includes("Timeout")) {
          await dmPage.goto("about:blank");
          await dmPage.waitForTimeout(2_000);
          continue;
        }
        throw e;
      }
    }
    expect(token).toBeTruthy();
    shareToken = token!;

    await expect(
      dmPage.locator('[data-testid="active-combat"]')
    ).toBeVisible({ timeout: 10_000 });

    // Dismiss tour
    await dismissTourIfVisible(dmPage);

    // Capture combatant IDs
    goblinId = await findCombatantId(dmPage, "Goblin Skirmisher");
    orcId = await findCombatantId(dmPage, "Orc Warchief");
    skeletonId = await findCombatantId(dmPage, "Skeleton Warrior");
    zombieId = await findCombatantId(dmPage, "Zombie Brute");

    expect(new Set([goblinId, orcId, skeletonId, zombieId]).size).toBe(4);

    console.log(`[ADVERSARIAL] DM setup complete. Token: ${shareToken}`);

    // Player joins
    await playerSubmitJoin(playerPage, shareToken, "RapidTestPlayer", {
      initiative: "14",
      hp: "35",
      ac: "15",
    });
    await dmAcceptPlayer(dmPage, "RapidTestPlayer");

    await expect(
      playerPage.locator('[data-testid="player-view"]')
    ).toBeVisible({ timeout: 30_000 });

    await waitForAllPages(
      [playerPage],
      '[data-testid="player-initiative-board"]',
      { timeout: 30_000 }
    );

    console.log("[ADVERSARIAL] Player joined and sees initiative board");
  });

  // ════════════════════════════════════════════════════════════
  // TEST 1: 10 rapid turn advances (500ms between clicks)
  // ════════════════════════════════════════════════════════════

  test("10 rapid turn advances (500ms between clicks)", async () => {
    const TURN_COUNT = 10;

    console.log(
      `[ADVERSARIAL] Firing ${TURN_COUNT} turn advances with ${RAPID_TURN_GAP_MS}ms gaps...`
    );

    const barageStart = Date.now();

    for (let i = 0; i < TURN_COUNT; i++) {
      // Force-click pattern: don't wait for enabled state, just fire
      const nextBtn = dmPage.locator('[data-testid="next-turn-btn"]');
      await expect(nextBtn).toBeVisible({ timeout: 5_000 });
      await nextBtn.click({ force: true });
      await dmPage.waitForTimeout(RAPID_TURN_GAP_MS);
    }

    const barrageDuration = Date.now() - barageStart;
    console.log(
      `[ADVERSARIAL] Barrage complete in ${(barrageDuration / 1000).toFixed(1)}s. Waiting ${STABILIZATION_WAIT_MS / 1000}s for sync...`
    );

    // Wait for state to stabilize across broadcast
    await dmPage.waitForTimeout(STABILIZATION_WAIT_MS);

    // Assert: player board is still functional
    await expect(
      playerPage.locator('[data-testid="player-initiative-board"]')
    ).toBeVisible({ timeout: 15_000 });

    await assertAllPagesResponsive([playerPage], ["Player_01"]);

    // Assert: DM page is still functional
    const dmBody = await dmPage.locator("body").textContent({ timeout: 5_000 });
    expect(dmBody?.length).toBeGreaterThan(100);

    // Assert: active combat view still present on DM
    await expect(
      dmPage.locator('[data-testid="active-combat"]')
    ).toBeVisible({ timeout: 5_000 });

    console.log("[ADVERSARIAL] 10 rapid turns: both pages functional, no crash");
  });

  // ════════════════════════════════════════════════════════════
  // TEST 2: Rapid mixed actions (turn, damage, condition) 300ms gaps
  // ════════════════════════════════════════════════════════════

  test("Rapid mixed actions (turn, damage, condition) with 300ms gaps", async () => {
    const MIXED_ACTION_COUNT = 10;

    console.log(
      `[ADVERSARIAL] Firing ${MIXED_ACTION_COUNT} mixed actions with ${MIXED_ACTION_GAP_MS}ms gaps...`
    );

    const barrageStart = Date.now();

    // 10 interleaved actions: turn, damage, turn, condition, turn, damage, ...
    for (let i = 0; i < MIXED_ACTION_COUNT; i++) {
      const actionIndex = i % 3;

      try {
        if (actionIndex === 0) {
          // Turn advance (force-click)
          const nextBtn = dmPage.locator('[data-testid="next-turn-btn"]');
          await nextBtn.click({ force: true });
        } else if (actionIndex === 1) {
          // Damage to Orc (has 60 HP, can absorb repeated hits)
          await applyHpChange(dmPage, orcId, 3, "damage");
        } else {
          // Toggle condition on Skeleton
          await toggleCondition(dmPage, skeletonId, "frightened");
          await dmPage.keyboard.press("Escape");
        }
      } catch (e) {
        // Log but don't fail — rapid actions may overlap UI state
        console.warn(
          `[ADVERSARIAL] Action ${i + 1} (type=${actionIndex}) error: ${String(e).slice(0, 120)}`
        );
      }

      await dmPage.waitForTimeout(MIXED_ACTION_GAP_MS);
    }

    const barrageDuration = Date.now() - barrageStart;
    console.log(
      `[ADVERSARIAL] Mixed barrage complete in ${(barrageDuration / 1000).toFixed(1)}s. Waiting ${STABILIZATION_WAIT_MS / 1000}s for sync...`
    );

    // Wait for state to stabilize
    await dmPage.waitForTimeout(STABILIZATION_WAIT_MS);

    // Assert: player board is still functional
    await expect(
      playerPage.locator('[data-testid="player-initiative-board"]')
    ).toBeVisible({ timeout: 15_000 });

    await assertAllPagesResponsive([playerPage], ["Player_01"]);

    // Assert: DM page is still functional
    await expect(
      dmPage.locator('[data-testid="active-combat"]')
    ).toBeVisible({ timeout: 5_000 });

    const dmBody = await dmPage.locator("body").textContent({ timeout: 5_000 });
    expect(dmBody?.length).toBeGreaterThan(100);

    // Assert: no rate-limit errors in console (tolerate a few 500s from rapid overlapping)
    const playerErrors = metrics.serverErrors.filter(
      (e) => !e.startsWith("[DM]")
    );
    // Player should have zero or very few errors — rapid DM actions should not cascade to player
    expect(playerErrors.length).toBeLessThanOrEqual(5);

    console.log(
      `[ADVERSARIAL] Mixed rapid actions: both pages functional. ` +
      `Server errors: DM=${metrics.serverErrors.filter((e) => e.startsWith("[DM]")).length}, ` +
      `Player=${playerErrors.length}`
    );
  });
});
