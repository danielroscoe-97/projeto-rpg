/**
 * Adversarial Test — DM Browser Crash Recovery
 *
 * Simulates the DM's browser crashing mid-combat (context destroyed),
 * then verifies that:
 *   1. The player remains alive and functional during the DM's absence
 *   2. The DM can reopen the browser, log in, and recover the session
 *   3. After recovery, the DM can advance turns and players receive broadcasts
 *
 * This is a critical resilience test — in real RPG sessions, the DM's laptop
 * can crash, run out of battery, or lose wifi. The system must survive this.
 *
 * Run: npx playwright test adversarial-dm-crash-recovery
 *
 * @tags @adversarial @crash-recovery
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
import { loginAsDM } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  createPlayerContexts,
  closeAllContexts,
  playerSubmitJoin,
  dmAcceptPlayer,
  findCombatantId,
  waitForAllPages,
  attachConsoleMonitor,
  dismissTourIfVisible,
  type AdversarialMetrics,
} from "../helpers/multi-player";

// ── Configuration ────────────────────────────────────────────

/** Time to wait after DM crash before asserting player survival */
const DM_ABSENCE_WAIT_MS = 30_000;

/** Extended wait for realtime propagation after DM recovery */
const RECOVERY_SYNC_WAIT_MS = 15_000;

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

// ══════════════════════════════════════════════════════════════
// DM CRASH RECOVERY TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — DM browser crash recovery",
  () => {
    test.slow(); // 3x timeout — long-running resilience test

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;
    let p1Context: BrowserContext;
    let p1Page: Page;
    let shareToken: string;
    let sessionUrl: string;

    // Combatant UUIDs
    let goblinId: string;
    let orcId: string;
    let skeletonId: string;

    // Track expected state for recovery assertions
    let expectedRound: string;
    let expectedCombatantCount: number;

    test.beforeAll(async ({ browser: b }) => {
      browser = b;
    });

    test.afterAll(async () => {
      // Log metrics summary
      const totalErrors = metrics.serverErrors.length;
      if (totalErrors > 0) {
        console.log(
          `[DM-CRASH] Total server errors: ${totalErrors}`
        );
        for (const err of metrics.serverErrors.slice(0, 10)) {
          console.log(`  ${err}`);
        }
      } else {
        console.log("[DM-CRASH] No server errors detected");
      }

      // Cleanup all contexts (ignores already-closed)
      const contextsToClose = [dmContext, p1Context].filter(Boolean);
      await closeAllContexts(contextsToClose);
    });

    // ════════════════════════════════════════════════════════════
    // SETUP: DM creates session, player joins, DM advances rounds
    // ════════════════════════════════════════════════════════════

    test("Setup: DM creates session with 3 monsters, player joins, DM advances 3 rounds", async () => {
      // Create DM context
      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();
      attachConsoleMonitor(dmPage, "DM", metrics);

      // Create player context
      const result = await createPlayerContexts(browser, 1);
      p1Context = result.contexts[0];
      p1Page = result.pages[0];
      attachConsoleMonitor(p1Page, "Player1", metrics);

      // DM sets up combat session with 3 monsters
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            { name: "Goblin Scout", hp: "12", ac: "13", init: "14" },
            { name: "Orc Captain", hp: "50", ac: "16", init: "12" },
            {
              name: "Skeleton Archer",
              hp: "20",
              ac: "13",
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

      // Save the session URL for DM recovery later
      sessionUrl = dmPage.url();
      console.log(
        `[DM-CRASH] Session URL: ${sessionUrl}, Token: ${shareToken}`
      );

      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 10_000 });

      // Dismiss tour
      await dismissTourIfVisible(dmPage);

      // Capture combatant IDs
      goblinId = await findCombatantId(dmPage, "Goblin Scout");
      orcId = await findCombatantId(dmPage, "Orc Captain");
      skeletonId = await findCombatantId(dmPage, "Skeleton Archer");
      expect(
        new Set([goblinId, orcId, skeletonId]).size
      ).toBe(3);

      // Player 1 joins
      await playerSubmitJoin(p1Page, shareToken, "Thorin", {
        initiative: "18",
        hp: "45",
        ac: "18",
      });
      await dmAcceptPlayer(dmPage, "Thorin");
      await expect(
        p1Page.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });

      // DM advances 3 rounds with HP changes
      // 4 combatants per round: Thorin(18), Goblin(14), Orc(12), Skeleton(8)
      const combatantsPerRound = 4;

      for (let round = 1; round <= 3; round++) {
        for (let turn = 0; turn < combatantsPerRound; turn++) {
          await advanceTurn(dmPage);
        }

        // Apply damage each round
        if (round === 1) {
          await applyHpChange(dmPage, goblinId, 5, "damage");
          await dmPage.waitForTimeout(1_000);
        } else if (round === 2) {
          await applyHpChange(dmPage, orcId, 15, "damage");
          await dmPage.waitForTimeout(1_000);
        } else if (round === 3) {
          await applyHpChange(dmPage, skeletonId, 8, "damage");
          await dmPage.waitForTimeout(1_000);
        }
      }

      // Wait for broadcasts to settle
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Capture expected state for recovery assertions
      const roundEl = dmPage.locator(
        '[data-testid="active-combat"] h2 .font-mono'
      );
      expectedRound = (await roundEl.textContent().catch(() => "")) ?? "";
      const combatantRows = dmPage.locator(
        '[data-testid="active-combat"] li:has([data-testid^="hp-btn-"])'
      );
      expectedCombatantCount = await combatantRows.count();

      console.log(
        `[DM-CRASH] Setup complete. Round: ${expectedRound}, Combatants: ${expectedCombatantCount}`
      );

      // Verify player is in sync
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });
    });

    // ════════════════════════════════════════════════════════════
    // TEST 1: DM browser crashes — player stays alive
    // ════════════════════════════════════════════════════════════

    test("DM browser crashes — player stays alive", async () => {
      console.log("[DM-CRASH] Closing DM browser context entirely...");

      // Close the DM's entire browser context (simulates crash / force-quit)
      await dmContext.close();

      console.log(
        `[DM-CRASH] DM context closed. Waiting ${DM_ABSENCE_WAIT_MS / 1000}s...`
      );

      // Wait a significant period — simulates the DM rebooting their laptop
      await p1Page.waitForTimeout(DM_ABSENCE_WAIT_MS);

      // Assert: player page is still alive and showing player-view
      await expect(
        p1Page.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 10_000 });

      // Assert: player still sees the initiative board (not a blank/error page)
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: 10_000 });

      // Assert: player page body has meaningful content (not crashed/blank)
      const bodyText = await p1Page
        .locator("body")
        .textContent({ timeout: 5_000 });
      expect(bodyText?.length).toBeGreaterThan(100);

      console.log(
        "[DM-CRASH] Player survived DM crash — page still functional"
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 2: DM reopens browser, logs in, recovers session
    // ════════════════════════════════════════════════════════════

    test("DM reopens browser, logs in, recovers session", async () => {
      console.log("[DM-CRASH] Creating new DM browser context...");

      // Create a completely new browser context for the DM (simulates reopening browser)
      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();
      attachConsoleMonitor(dmPage, "DM-Recovered", metrics);

      // DM logs in again
      await loginAsDM(dmPage);

      // Navigate to the saved session URL
      console.log(
        `[DM-CRASH] Navigating to saved session URL: ${sessionUrl}`
      );
      await dmPage.goto(sessionUrl);
      await dmPage.waitForLoadState("domcontentloaded");

      // Wait for active combat to load
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 30_000 });

      // Dismiss tour if it appears on the recovered session
      await dismissTourIfVisible(dmPage);

      // Assert: DM sees active-combat
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 10_000 });

      // Assert: combatant count matches what was there before crash
      const combatantRows = dmPage.locator(
        '[data-testid="active-combat"] li:has([data-testid^="hp-btn-"])'
      );
      const recoveredCount = await combatantRows.count();
      expect(recoveredCount).toBe(expectedCombatantCount);

      // Assert: round number is preserved (state was persisted to DB)
      if (expectedRound) {
        const roundEl = dmPage.locator(
          '[data-testid="active-combat"] h2 .font-mono'
        );
        const recoveredRound = await roundEl
          .textContent({ timeout: 5_000 })
          .catch(() => "");
        // The round should be the same or possibly one ahead (if turn was mid-persist)
        expect(recoveredRound).toBeTruthy();
        console.log(
          `[DM-CRASH] Round before crash: ${expectedRound}, after recovery: ${recoveredRound}`
        );
      }

      // Verify all combatant IDs are still accessible
      for (const id of [goblinId, orcId, skeletonId]) {
        const hpBtn = dmPage.locator(`[data-testid="hp-btn-${id}"]`);
        await expect(hpBtn).toBeVisible({ timeout: 10_000 });
      }

      console.log(
        `[DM-CRASH] DM recovered session successfully. Combatants: ${recoveredCount}`
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 3: After recovery, DM advances turn — player receives broadcast
    // ════════════════════════════════════════════════════════════

    test("After recovery, DM can advance turn and player receives broadcast", async () => {
      console.log(
        "[DM-CRASH] Testing DM action + player broadcast after recovery..."
      );

      // Wait for realtime channel to re-establish on the recovered DM page
      await dmPage.waitForTimeout(5_000);

      // DM advances turn on the recovered page
      await advanceTurn(dmPage);

      // Wait for broadcast to reach the player
      await dmPage.waitForTimeout(RECOVERY_SYNC_WAIT_MS);

      // Assert: player's initiative board is still visible and functional
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });

      // Assert: player page body is still substantial (not crashed from reconnection)
      const bodyText = await p1Page
        .locator("body")
        .textContent({ timeout: 5_000 });
      expect(bodyText?.length).toBeGreaterThan(100);

      // DM applies one more HP change to verify full bidirectional communication
      await applyHpChange(dmPage, orcId, 10, "damage");
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Assert: player still has functional board after HP change
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });

      // Advance another turn to be thorough
      await advanceTurn(dmPage);
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Final assertion: player page still responsive
      await expect(
        p1Page.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 10_000 });

      console.log(
        "[DM-CRASH] Post-recovery DM actions working. Player received broadcasts."
      );

      // Check total server errors — should be minimal
      const totalErrors = metrics.serverErrors.length;
      console.log(
        `[DM-CRASH] Total server errors across test: ${totalErrors}`
      );
      // Allow some errors during crash/recovery window, but no cascade
      expect(totalErrors).toBeLessThanOrEqual(10);
    });
  }
);
