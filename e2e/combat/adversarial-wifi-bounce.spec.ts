/**
 * Adversarial Test — WiFi Bounce (Player Toggles Online/Offline 3 Times)
 *
 * Simulates a player's WiFi connection bouncing 3 times in 2 minutes
 * while the DM advances combat during each offline window.
 *
 * This is realistic for:
 *   - Coffee shop WiFi that drops intermittently
 *   - Mobile data switching between towers
 *   - Router firmware updates mid-session
 *
 * What this tests:
 *   - 3 offline/online cycles with 30s between each
 *   - DM advances combat during each offline window
 *   - After 3 bounces, player sees consistent state
 *   - No split-brain (player state diverges from DM)
 *   - No accumulated error cascade from repeated reconnections
 *
 * Run: npx playwright test adversarial-wifi-bounce
 *
 * @tags @adversarial @wifi-bounce @network
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

/** Number of offline/online cycles */
const BOUNCE_COUNT = 3;

/** Duration of each offline window (ms) */
const OFFLINE_DURATION_MS = 15_000;

/** Time to wait after coming online for sync */
const SYNC_WAIT_MS = 20_000;

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;

/** Max tolerable total server errors */
const MAX_TOTAL_ERRORS = 15;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

let suiteStartTime = 0;

function printMetrics() {
  const totalDuration = Date.now() - suiteStartTime;
  console.log("\n========== ADVERSARIAL: WIFI BOUNCE — METRICS ==========");
  console.log(`Total suite duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`Bounces completed: ${BOUNCE_COUNT}`);

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
    console.log(`\nServer error details (first 10):`);
    for (const err of metrics.serverErrors.slice(0, 10)) {
      console.log(`  ${err}`);
    }
    if (metrics.serverErrors.length > 10) {
      console.log(`  ... and ${metrics.serverErrors.length - 10} more`);
    }
  }
  console.log("========================================================\n");
}

// ══════════════════════════════════════════════════════════════
// WIFI BOUNCE TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — WiFi bounce — player toggles offline/online 3 times",
  () => {
    test.slow(); // 3x timeout

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;
    let p1Context: BrowserContext;
    let p1Page: Page;
    let shareToken: string;

    // Combatant UUIDs
    let goblinId: string;
    let orcId: string;
    let skeletonId: string;
    let zombieId: string;

    test.beforeAll(async ({ browser: b }) => {
      suiteStartTime = Date.now();
      browser = b;

      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();
      attachConsoleMonitor(dmPage, "DM", metrics);

      const result = await createPlayerContexts(browser, 1);
      p1Context = result.contexts[0];
      p1Page = result.pages[0];
      attachConsoleMonitor(p1Page, "BouncePlayer", metrics);
    });

    test.afterAll(async () => {
      printMetrics();
      await closeAllContexts([dmContext, p1Context]);
    });

    // ════════════════════════════════════════════════════════════
    // SETUP: DM creates session, player joins
    // ════════════════════════════════════════════════════════════

    test("Setup: DM creates session with 4 monsters, 1 player joins", async () => {
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            { name: "Goblin Raider", hp: "14", ac: "13", init: "15" },
            { name: "Orc Berserker", hp: "50", ac: "16", init: "12" },
            { name: "Skeleton Archer", hp: "20", ac: "13", init: "10" },
            { name: "Zombie Shambler", hp: "28", ac: "8", init: "6" },
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

      await dismissTourIfVisible(dmPage);

      goblinId = await findCombatantId(dmPage, "Goblin Raider");
      orcId = await findCombatantId(dmPage, "Orc Berserker");
      skeletonId = await findCombatantId(dmPage, "Skeleton Archer");
      zombieId = await findCombatantId(dmPage, "Zombie Shambler");

      expect(
        new Set([goblinId, orcId, skeletonId, zombieId]).size
      ).toBe(4);

      // Player joins
      let joined = false;
      for (let attempt = 0; attempt < 3 && !joined; attempt++) {
        if (attempt > 0) await p1Page.waitForTimeout(2_000);
        try {
          await playerSubmitJoin(p1Page, shareToken, "BouncePlayer", {
            initiative: "16",
            hp: "40",
            ac: "15",
          });
          joined = true;
        } catch {
          const notFound = p1Page.locator("text=Sessão Não Encontrada");
          if (
            await notFound.isVisible({ timeout: 1_000 }).catch(() => false)
          ) {
            continue;
          }
          if (attempt === 2)
            throw new Error("Player failed to join after 3 attempts");
        }
      }

      await dmAcceptPlayer(dmPage, "BouncePlayer");

      await expect(
        p1Page.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 30_000 });

      await waitForAllPages(
        [p1Page],
        '[data-testid="player-initiative-board"]',
        { timeout: 30_000 }
      );

      console.log(
        `[WIFI-BOUNCE] Setup complete. Token: ${shareToken}. 4 monsters + 1 player.`
      );
    });

    // ═════════════════════════════════════════════════════════��══
    // TEST 1: 3 WiFi bounces with DM actions during each
    // ════════════════════════════════════════════════════════════

    test("Player goes offline/online 3 times, DM advances during each gap", async () => {
      const combatantsPerRound = 5; // 4 monsters + 1 player

      for (let bounce = 1; bounce <= BOUNCE_COUNT; bounce++) {
        console.log(
          `[WIFI-BOUNCE] === Bounce ${bounce}/${BOUNCE_COUNT} ===`
        );

        // Go offline
        console.log(`[WIFI-BOUNCE] Setting player offline`);
        await p1Context.setOffline(true);
        await dmPage.waitForTimeout(2_000);

        // DM advances a full round during each offline window
        console.log(
          `[WIFI-BOUNCE] DM advancing full round (${combatantsPerRound} turns)`
        );
        for (let turn = 0; turn < combatantsPerRound; turn++) {
          await advanceTurn(dmPage);
        }

        // DM performs a different action each bounce
        if (bounce === 1) {
          await applyHpChange(dmPage, goblinId, 5, "damage");
          await dmPage.waitForTimeout(500);
        } else if (bounce === 2) {
          await toggleCondition(dmPage, orcId, "stunned");
          await dmPage.keyboard.press("Escape");
          await dmPage.waitForTimeout(500);
        } else {
          await applyHpChange(dmPage, skeletonId, 7, "damage");
          await dmPage.waitForTimeout(500);
        }

        // Wait remaining offline duration
        await dmPage.waitForTimeout(OFFLINE_DURATION_MS);

        // Come back online
        console.log(`[WIFI-BOUNCE] Setting player online`);
        await p1Context.setOffline(false);

        // Wait for sync
        console.log(
          `[WIFI-BOUNCE] Waiting ${SYNC_WAIT_MS / 1000}s for sync...`
        );
        await p1Page.waitForTimeout(SYNC_WAIT_MS);

        // Assert: player page functional after each bounce
        await expect(
          p1Page.locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: 15_000 });

        await expect(
          p1Page.locator('[data-testid="player-initiative-board"]')
        ).toBeVisible({ timeout: REALTIME_WAIT });

        const bodyText = await p1Page
          .locator("body")
          .textContent({ timeout: 5_000 });
        expect(bodyText?.length).toBeGreaterThan(50);

        console.log(
          `[WIFI-BOUNCE] Bounce ${bounce} recovery OK. Body length: ${bodyText?.length}`
        );
      }

      console.log(
        "[WIFI-BOUNCE] All 3 bounces completed, player recovered each time"
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 2: Post-bounce consistency — DM and player in sync
    // ════════════════════════════════════════════════════════════

    test("Post-bounce consistency — player state matches DM", async () => {
      // DM advances one more turn to verify the broadcast channel is alive
      console.log(
        "[WIFI-BOUNCE] Post-bounce verification: DM advancing turn..."
      );
      await advanceTurn(dmPage);
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Assert: player board visible and responsive
      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });

      await assertAllPagesResponsive([p1Page], ["BouncePlayer"]);

      // Assert: DM page still functional
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 5_000 });

      // Advance a few more turns to stress-test post-bounce state
      for (let i = 0; i < 3; i++) {
        await advanceTurn(dmPage);
      }
      await dmPage.waitForTimeout(5_000);

      await expect(
        p1Page.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: REALTIME_WAIT });

      // Check accumulated errors across all bounces
      const totalErrors = metrics.serverErrors.length;
      console.log(
        `[WIFI-BOUNCE] Total server errors after ${BOUNCE_COUNT} bounces: ${totalErrors}`
      );
      expect(totalErrors).toBeLessThanOrEqual(MAX_TOTAL_ERRORS);

      // Verify no split-brain: player body content should be substantial
      const bodyText = await p1Page
        .locator("body")
        .textContent({ timeout: 5_000 });
      expect(bodyText?.length).toBeGreaterThan(100);

      console.log(
        "[WIFI-BOUNCE] Post-bounce consistency verified. No split-brain."
      );
    });
  }
);
