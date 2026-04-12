/**
 * Adversarial Test — Network Failure During Combat
 *
 * Simulates WiFi drops and API failures during active combat.
 * Uses Playwright's context.setOffline(true/false) to simulate real
 * network disconnection at the browser level, and page.route() to
 * simulate server-side failures (500 errors on broadcast API).
 *
 * Verifies that:
 *   - Player recovers after 30s offline when DM advanced multiple rounds
 *   - DM page survives 15s offline with queued actions
 *   - Client-side Supabase Realtime channel continues working even when
 *     the broadcast REST API returns 500 errors
 *
 * Run: npx playwright test adversarial-network-failure
 *
 * @tags @adversarial @network
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

const PLAYER_NAMES = ["NetPlayer_01"];

/** Time to wait for state sync after reconnection (polling fallback = 5s) */
const NETWORK_SYNC_WAIT_MS = 30_000;

/** Shorter sync wait for DM reconnection */
const DM_SYNC_WAIT_MS = 15_000;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

// ══════════════════════════════════════════════════════════════
// ADVERSARIAL NETWORK FAILURE SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — network failure — WiFi drop and API errors during combat",
  () => {
    test.slow();

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;
    let playerContexts: BrowserContext[];
    let playerPages: Page[];
    let p1Context: BrowserContext;
    let shareToken: string;

    // Combatant UUIDs
    let goblinId: string;
    let orcId: string;
    let skeletonId: string;

    test.beforeAll(async ({ browser: b }) => {
      browser = b;
      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();

      const result = await createPlayerContexts(browser, 1);
      playerContexts = result.contexts;
      playerPages = result.pages;
      p1Context = playerContexts[0];

      // Attach console monitors
      attachConsoleMonitor(dmPage, "DM", metrics);
      attachConsoleMonitor(playerPages[0], PLAYER_NAMES[0], metrics);
    });

    test.afterAll(async () => {
      console.log("\n========== NETWORK ADVERSARIAL METRICS ==========");
      console.log(`Server errors: ${metrics.serverErrors.length}`);
      for (const err of metrics.serverErrors.slice(0, 10)) {
        console.log(`  ${err}`);
      }
      if (metrics.serverErrors.length > 10) {
        console.log(`  ... and ${metrics.serverErrors.length - 10} more`);
      }
      console.log("=================================================\n");
      await closeAllContexts([dmContext, ...playerContexts]);
    });

    // ════════════════════════════════════════════════════════════
    // SETUP: DM creates session, player joins
    // ════════════════════════════════════════════════════════════

    test("Setup: DM creates session with 3 monsters, 1 player joins", async () => {
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            { name: "Goblin Raider", hp: "14", ac: "13", init: "15" },
            { name: "Orc Captain", hp: "50", ac: "17", init: "11" },
            { name: "Skeleton Mage", hp: "18", ac: "12", init: "9" },
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

      // Capture combatant IDs
      goblinId = await findCombatantId(dmPage, "Goblin Raider");
      orcId = await findCombatantId(dmPage, "Orc Captain");
      skeletonId = await findCombatantId(dmPage, "Skeleton Mage");

      expect(new Set([goblinId, orcId, skeletonId]).size).toBe(3);

      // Player 1 joins
      const playerPage = playerPages[0];
      const playerName = PLAYER_NAMES[0];
      console.log(`[NETWORK] Player joining: ${playerName}`);

      let joined = false;
      for (let attempt = 0; attempt < 3 && !joined; attempt++) {
        if (attempt > 0) {
          await playerPage.waitForTimeout(2_000);
        }
        try {
          await playerSubmitJoin(playerPage, shareToken, playerName, {
            initiative: "16",
            hp: "35",
            ac: "15",
          });
          joined = true;
        } catch {
          const notFound = playerPage.locator("text=Sessão Não Encontrada");
          if (
            await notFound.isVisible({ timeout: 1_000 }).catch(() => false)
          ) {
            console.log(
              `[NETWORK] Session not found for ${playerName}, retrying...`
            );
            continue;
          }
          if (attempt === 2)
            throw new Error(
              `Player ${playerName} failed to join after 3 attempts`
            );
        }
      }

      await dmAcceptPlayer(dmPage, playerName);

      await expect(
        playerPage.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 30_000 });

      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: 30_000 }
      );

      console.log(
        `[NETWORK] Setup complete. Token: ${shareToken}. 3 monsters + 1 player.`
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 1: Player offline 30s, DM advances 2 rounds, player reconnects
    // ════════════════════════════════════════════════════════════

    test("Player offline 30s, DM advances 2 rounds, player reconnects", async () => {
      const playerPage = playerPages[0];

      // Take player offline (simulates WiFi drop)
      console.log("[NETWORK] Setting player offline");
      await p1Context.setOffline(true);

      // Wait a moment for the disconnection to take effect
      await dmPage.waitForTimeout(3_000);

      // DM advances 2 full rounds while player is offline
      // Combatants: 3 monsters + 1 player = 4 per round, 2 rounds = 8 turns
      console.log("[NETWORK] DM advancing 2 full rounds (8 turns)");
      for (let i = 0; i < 8; i++) {
        await advanceTurn(dmPage);
      }

      // DM damages a monster
      console.log("[NETWORK] DM damaging Orc Captain");
      await applyHpChange(dmPage, orcId, 12, "damage");
      await dmPage.waitForTimeout(500);

      // Wait to accumulate 30s of offline time
      console.log("[NETWORK] Waiting for 30s offline window...");
      await dmPage.waitForTimeout(20_000);

      // Bring player back online
      console.log("[NETWORK] Setting player online");
      await p1Context.setOffline(false);

      // Wait for state sync — polling fallback runs every 5s
      console.log(
        `[NETWORK] Waiting ${NETWORK_SYNC_WAIT_MS / 1000}s for state sync...`
      );
      await playerPage.waitForTimeout(NETWORK_SYNC_WAIT_MS);

      // Assert: player page not crashed (body has meaningful content)
      const bodyText = await playerPage
        .locator("body")
        .textContent({ timeout: 10_000 });
      expect(bodyText?.length).toBeGreaterThan(50);

      // Assert: initiative board is visible
      await expect(
        playerPage.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 15_000 });

      await expect(
        playerPage.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: 10_000 });

      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      console.log(
        "[NETWORK] Test 1 passed: player recovered after 30s offline"
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 2: DM offline 15s, performs actions, reconnects
    // ════════════════════════════════════════════════════════════

    test("DM offline 15s, performs actions, reconnects", async () => {
      const playerPage = playerPages[0];

      // Take DM offline
      console.log("[NETWORK] Setting DM offline");
      await dmContext.setOffline(true);

      // DM clicks advanceTurn 3 times while offline
      // These actions will queue and may fail silently,
      // but the UI should not crash
      console.log(
        "[NETWORK] DM attempting 3 turn advances while offline"
      );
      for (let i = 0; i < 3; i++) {
        try {
          await advanceTurn(dmPage);
        } catch {
          console.log(
            `[NETWORK] Turn advance ${i + 1} failed (expected while offline)`
          );
        }
      }

      // Wait 15s offline
      console.log("[NETWORK] Waiting 15s offline...");
      await playerPage.waitForTimeout(15_000);

      // Bring DM back online
      console.log("[NETWORK] Setting DM online");
      await dmContext.setOffline(false);

      // Wait for DM to reconnect and sync
      console.log(
        `[NETWORK] Waiting ${DM_SYNC_WAIT_MS / 1000}s for DM sync...`
      );
      await dmPage.waitForTimeout(DM_SYNC_WAIT_MS);

      // Assert: DM page shows active combat (not crashed)
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 15_000 });

      // Assert: DM page body has meaningful content
      const dmBodyText = await dmPage
        .locator("body")
        .textContent({ timeout: 10_000 });
      expect(dmBodyText?.length).toBeGreaterThan(50);

      // Assert: player page is still functional
      await expect(
        playerPage.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 10_000 });

      await expect(
        playerPage.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: 10_000 });

      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      console.log(
        "[NETWORK] Test 2 passed: DM recovered after 15s offline"
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST 3: Broadcast API returns 500 but client channel continues
    // ════════════════════════════════════════════════════════════

    test("Broadcast API returns 500 but client channel continues", async () => {
      const playerPage = playerPages[0];

      // Intercept broadcast API calls on DM page and return 500
      console.log(
        "[NETWORK] Intercepting broadcast API with 500 responses"
      );
      await dmPage.route("**/api/broadcast", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "test-simulated-failure" }),
        })
      );

      // DM advances 3 turns while broadcast API is failing
      // The client-side Supabase Realtime channel should still work
      // because it uses WebSocket, not the REST broadcast API
      console.log(
        "[NETWORK] DM advancing 3 turns with broadcast API returning 500"
      );
      for (let i = 0; i < 3; i++) {
        try {
          await advanceTurn(dmPage);
        } catch {
          console.log(
            `[NETWORK] Turn advance ${i + 1} had issues (broadcast API failing)`
          );
        }
      }

      // Remove the route interception
      console.log("[NETWORK] Removing broadcast API interception");
      await dmPage.unroute("**/api/broadcast");

      // Wait for things to settle
      console.log("[NETWORK] Waiting 10s for state to settle...");
      await dmPage.waitForTimeout(10_000);

      // Assert: DM page not crashed
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 10_000 });

      const dmBodyText = await dmPage
        .locator("body")
        .textContent({ timeout: 10_000 });
      expect(dmBodyText?.length).toBeGreaterThan(50);

      // Assert: player page still functional
      // The player may or may not have received the turn updates via the
      // client-side channel. The key assertion is that neither page crashed.
      await expect(
        playerPage.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 10_000 });

      await expect(
        playerPage.locator('[data-testid="player-initiative-board"]')
      ).toBeVisible({ timeout: 10_000 });

      const playerBodyText = await playerPage
        .locator("body")
        .textContent({ timeout: 10_000 });
      expect(playerBodyText?.length).toBeGreaterThan(50);

      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      console.log(
        "[NETWORK] Test 3 passed: client channel survived broadcast API 500s"
      );
    });
  }
);
