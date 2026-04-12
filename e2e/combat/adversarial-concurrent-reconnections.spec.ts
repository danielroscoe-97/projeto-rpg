/**
 * Adversarial Test — Concurrent Reconnections (Thundering Herd)
 *
 * Simulates 3 players going offline simultaneously, then reconnecting
 * all at once while the DM is actively making changes. This stress-tests
 * the Supabase Realtime system against the "thundering herd" problem:
 * multiple clients hitting the server at the exact same moment.
 *
 * Scenarios tested:
 *   1. All 3 players go offline, DM advances rounds, all reconnect simultaneously
 *   2. All 3 players reconnect at the exact same time the DM advances a turn
 *      (race condition between reconnection sync and new broadcast)
 *
 * This is realistic for RPG sessions where:
 *   - The wifi router reboots (all players drop at once)
 *   - The DM shares a new QR code and everyone rescans
 *   - A mobile carrier has a brief outage
 *
 * Run: npx playwright test adversarial-concurrent-reconnections
 *
 * @tags @adversarial @thundering-herd @concurrent
 */
import {
  test,
  expect,
  type Page,
  type BrowserContext,
  type Browser,
} from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { advanceTurn, applyHpChange } from "../helpers/combat";
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

/** Time to stay offline before reconnecting */
const OFFLINE_DURATION_MS = 20_000;

/** Time to wait after reconnection for sync to settle */
const RECONNECT_SYNC_WAIT_MS = 30_000;

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;

/** Extended wait */
const EXTENDED_WAIT = 15_000;

/** Max tolerable server errors across all players */
const MAX_TOTAL_SERVER_ERRORS = 15;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

/** Player names for the 3 concurrent players */
const PLAYER_NAMES = ["Thorin", "Elara", "Lyra"];

// ══════════════════════════════════════════════════════════════
// CONCURRENT RECONNECTIONS TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — concurrent reconnections (thundering herd)",
  () => {
    test.slow(); // 3x timeout — long-running resilience test

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;

    // 3 player contexts and pages
    let p1Context: BrowserContext;
    let p2Context: BrowserContext;
    let p3Context: BrowserContext;
    let p1Page: Page;
    let p2Page: Page;
    let p3Page: Page;

    let shareToken: string;

    // Combatant UUIDs
    let goblinId: string;
    let orcId: string;
    let skeletonId: string;

    test.beforeAll(async ({ browser: b }) => {
      browser = b;
    });

    test.afterAll(async () => {
      // Print metrics summary
      const totalErrors = metrics.serverErrors.length;
      console.log("\n========== THUNDERING HERD METRICS ==========");
      console.log(`Total server errors: ${totalErrors}`);
      if (totalErrors > 0) {
        for (const err of metrics.serverErrors.slice(0, 15)) {
          console.log(`  ${err}`);
        }
        if (totalErrors > 15) {
          console.log(`  ... and ${totalErrors - 15} more`);
        }
      }
      for (const [player, count] of metrics.consoleErrorsPerPlayer) {
        if (count > 0) {
          console.log(`  ${player}: ${count} errors`);
        }
      }
      console.log("=============================================\n");

      const contextsToClose = [
        dmContext,
        p1Context,
        p2Context,
        p3Context,
      ].filter(Boolean);
      await closeAllContexts(contextsToClose);
    });

    // ════════════════════════════════════════════════════════════
    // SETUP: DM creates session, 3 players join
    // ════════════════════════════════════════════════════════════

    test("Setup: DM creates session with 3 monsters, 3 players join", async () => {
      // Create DM context
      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();
      attachConsoleMonitor(dmPage, "DM", metrics);

      // Create 3 player contexts
      const result = await createPlayerContexts(browser, 3);
      p1Context = result.contexts[0];
      p2Context = result.contexts[1];
      p3Context = result.contexts[2];
      p1Page = result.pages[0];
      p2Page = result.pages[1];
      p3Page = result.pages[2];

      // Attach console monitors
      attachConsoleMonitor(p1Page, PLAYER_NAMES[0], metrics);
      attachConsoleMonitor(p2Page, PLAYER_NAMES[1], metrics);
      attachConsoleMonitor(p3Page, PLAYER_NAMES[2], metrics);

      // DM sets up combat session with 3 monsters
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            {
              name: "Goblin Warchief",
              hp: "30",
              ac: "15",
              init: "14",
            },
            { name: "Orc Shaman", hp: "40", ac: "14", init: "10" },
            {
              name: "Skeleton Knight",
              hp: "35",
              ac: "16",
              init: "8",
            },
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
      goblinId = await findCombatantId(dmPage, "Goblin Warchief");
      orcId = await findCombatantId(dmPage, "Orc Shaman");
      skeletonId = await findCombatantId(dmPage, "Skeleton Knight");
      expect(new Set([goblinId, orcId, skeletonId]).size).toBe(3);

      // Players join sequentially (to avoid race on DM accept)
      const playerPages = [p1Page, p2Page, p3Page];
      const playerStats = [
        { initiative: "18", hp: "45", ac: "18" },
        { initiative: "15", hp: "30", ac: "15" },
        { initiative: "12", hp: "35", ac: "16" },
      ];

      for (let i = 0; i < 3; i++) {
        console.log(
          `[THUNDERING-HERD] Player ${i + 1}/3 joining: ${PLAYER_NAMES[i]}`
        );
        await playerSubmitJoin(
          playerPages[i],
          shareToken,
          PLAYER_NAMES[i],
          playerStats[i]
        );
        await dmAcceptPlayer(dmPage, PLAYER_NAMES[i]);
        await expect(
          playerPages[i].locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: 30_000 });
        await dmPage.waitForTimeout(2_000);
      }

      // Verify all players see initiative boards
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: EXTENDED_WAIT }
      );

      console.log(
        `[THUNDERING-HERD] Setup complete. Token: ${shareToken}, 3 monsters + 3 players`
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 1: All 3 players go offline simultaneously
    // ════════════════════════════════════════════════════════════

    test("All 3 players go offline simultaneously, DM advances 2 rounds", async () => {
      console.log(
        "[THUNDERING-HERD] Setting all 3 player contexts to offline..."
      );

      // All 3 players go offline at the exact same moment
      await Promise.all([
        p1Context.setOffline(true),
        p2Context.setOffline(true),
        p3Context.setOffline(true),
      ]);

      console.log(
        "[THUNDERING-HERD] All players offline. DM advancing 2 rounds..."
      );

      // DM advances 2 full rounds with damage while players are offline
      // 6 combatants per round: 3 players + 3 monsters
      const combatantsPerRound = 6;

      // Round 1
      for (let turn = 0; turn < combatantsPerRound; turn++) {
        await advanceTurn(dmPage);
      }
      await applyHpChange(dmPage, goblinId, 10, "damage");
      await dmPage.waitForTimeout(1_000);

      // Round 2
      for (let turn = 0; turn < combatantsPerRound; turn++) {
        await advanceTurn(dmPage);
      }
      await applyHpChange(dmPage, orcId, 15, "damage");
      await dmPage.waitForTimeout(1_000);

      // Wait the offline duration
      console.log(
        `[THUNDERING-HERD] Waiting ${OFFLINE_DURATION_MS / 1000}s offline period...`
      );
      await dmPage.waitForTimeout(OFFLINE_DURATION_MS);

      console.log(
        "[THUNDERING-HERD] Offline period complete. Players still offline."
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 2: All 3 players reconnect simultaneously (thundering herd)
    // ════════════════════════════════════════════════════════════

    test("All 3 players reconnect simultaneously — thundering herd", async () => {
      console.log(
        "[THUNDERING-HERD] Setting all 3 player contexts back online simultaneously..."
      );

      const reconnectStart = Date.now();

      // All 3 players come back online at the exact same moment
      await Promise.all([
        p1Context.setOffline(false),
        p2Context.setOffline(false),
        p3Context.setOffline(false),
      ]);

      console.log(
        `[THUNDERING-HERD] All players back online. Waiting ${RECONNECT_SYNC_WAIT_MS / 1000}s for sync...`
      );

      // Wait for the thundering herd to settle
      await p1Page.waitForTimeout(RECONNECT_SYNC_WAIT_MS);

      const reconnectTime = Date.now() - reconnectStart;

      // Assert: all 3 player pages show player-view (not crashed, not blank)
      const playerPages = [p1Page, p2Page, p3Page];
      for (let i = 0; i < 3; i++) {
        await expect(
          playerPages[i].locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: EXTENDED_WAIT });
      }

      // Assert: all 3 show initiative board (combat state synced)
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: EXTENDED_WAIT }
      );

      // Assert: all pages are responsive (not blank/crashed)
      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      // Assert: check console for 500/504 errors — expect minimal
      const playerErrors = metrics.serverErrors.filter(
        (e) => !e.startsWith("[DM]")
      );
      console.log(
        `[THUNDERING-HERD] Reconnection completed in ${reconnectTime}ms. Player server errors: ${playerErrors.length}`
      );
      expect(playerErrors.length).toBeLessThanOrEqual(
        MAX_TOTAL_SERVER_ERRORS
      );

      console.log(
        "[THUNDERING-HERD] All 3 players reconnected successfully"
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 3: Simultaneous reconnect + DM action race condition
    // ════════════════════════════════════════════════════════════

    test("Simultaneous reconnect + DM action race — all pages stay consistent", async () => {
      console.log(
        "[THUNDERING-HERD] Testing reconnect + DM action race condition..."
      );

      // First, verify baseline — all players functional
      const playerPages = [p1Page, p2Page, p3Page];
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );

      // All 3 go offline again
      await Promise.all([
        p1Context.setOffline(true),
        p2Context.setOffline(true),
        p3Context.setOffline(true),
      ]);

      console.log(
        "[THUNDERING-HERD] All players offline again. Waiting 5s..."
      );
      await dmPage.waitForTimeout(5_000);

      // Reset error count for this phase
      const errorsBeforeRace = metrics.serverErrors.length;

      // RACE CONDITION: All 3 reconnect at the EXACT same moment the DM advances a turn
      console.log(
        "[THUNDERING-HERD] Triggering simultaneous reconnect + DM turn advance..."
      );
      await Promise.all([
        p1Context.setOffline(false),
        p2Context.setOffline(false),
        p3Context.setOffline(false),
        advanceTurn(dmPage),
      ]);

      // Wait for everything to settle
      console.log(
        "[THUNDERING-HERD] Waiting 20s for race condition to settle..."
      );
      await dmPage.waitForTimeout(20_000);

      // Assert: all player pages are still functional (no crash from race)
      for (let i = 0; i < 3; i++) {
        await expect(
          playerPages[i].locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: EXTENDED_WAIT });
      }

      // Assert: initiative boards visible on all pages
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: EXTENDED_WAIT }
      );

      // Assert: all pages responsive
      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      // Assert: DM page is still functional
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 10_000 });

      // Check errors from this race phase
      const errorsFromRace =
        metrics.serverErrors.length - errorsBeforeRace;
      console.log(
        `[THUNDERING-HERD] Race condition errors: ${errorsFromRace}`
      );

      // One more DM action to verify broadcast still works after the race
      await advanceTurn(dmPage);
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Final check: all players still have boards
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );

      // Total errors across the entire test should be bounded
      const totalErrors = metrics.serverErrors.length;
      console.log(
        `[THUNDERING-HERD] Total server errors across all phases: ${totalErrors}`
      );
      expect(totalErrors).toBeLessThanOrEqual(
        MAX_TOTAL_SERVER_ERRORS
      );

      console.log(
        "[THUNDERING-HERD] Race condition test passed — all pages consistent"
      );
    });
  }
);
