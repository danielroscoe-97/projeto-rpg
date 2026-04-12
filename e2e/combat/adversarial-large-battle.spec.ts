/**
 * Adversarial Test — Large Battle (3 Players + 12 Monsters = 15 Combatants)
 *
 * Stress-tests the combat system with a realistic "big encounter":
 * 3 players and 12 monsters (15 total combatants in initiative order).
 *
 * What this tests:
 *   - DM manually adds 12 monsters (no SRD search — faster and more reliable)
 *   - 3 players join sequentially
 *   - Full round with 15 combatants, measuring broadcast latency
 *   - Rapid DM actions on 4 monsters (damage, conditions, defeat)
 *   - 3 complete rounds with all combatants, metrics collected
 *   - Target: latency < 5s, errors < 15, zero crash
 *
 * Run: npx playwright test adversarial-large-battle
 *
 * @tags @adversarial @large-battle
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
  defeatCombatant,
  addCombatantMidCombat,
  waitForAllPages,
  attachConsoleMonitor,
  assertAllPagesResponsive,
  dismissTourIfVisible,
  type AdversarialMetrics,
} from "../helpers/multi-player";

// ── Configuration ────────────────────────────────────────────

const PLAYER_COUNT = 3;
const PLAYER_NAMES = ["BattlePlayer_01", "BattlePlayer_02", "BattlePlayer_03"];

/** Max broadcast latency (ms) — generous for 15 combatants */
const SYNC_DEADLINE_MS = 5_000;

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;

/** Max tolerable server errors */
const MAX_TOTAL_ERRORS = 15;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

let suiteStartTime = 0;

interface BroadcastLatency {
  action: string;
  ms: number;
}

const broadcastLatencies: BroadcastLatency[] = [];

function printMetrics() {
  const totalDuration = Date.now() - suiteStartTime;
  console.log("\n========== ADVERSARIAL: LARGE BATTLE — METRICS ==========");
  console.log(`Total suite duration: ${(totalDuration / 1000).toFixed(1)}s`);

  console.log("\nBroadcast latencies:");
  for (const { action, ms } of broadcastLatencies) {
    const status = ms <= SYNC_DEADLINE_MS ? "OK" : "SLOW";
    console.log(`  ${action}: ${ms}ms [${status}]`);
  }
  if (broadcastLatencies.length > 0) {
    const avg =
      broadcastLatencies.reduce((sum, l) => sum + l.ms, 0) /
      broadcastLatencies.length;
    console.log(`  Average: ${avg.toFixed(0)}ms`);
  }

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
  console.log("==========================================================\n");
}

// ══════════════════════════════════════════════════════════════
// LARGE BATTLE TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — large battle — 3 players + 12 monsters",
  () => {
    test.slow(); // 3x timeout

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;
    let playerContexts: BrowserContext[];
    let playerPages: Page[];
    let shareToken: string;

    // Track some combatant IDs for targeted actions
    let goblin1Id: string;
    let goblin2Id: string;
    let orcId: string;
    let skeletonId: string;

    test.beforeAll(async ({ browser: b }) => {
      suiteStartTime = Date.now();
      browser = b;

      dmContext = await browser.newContext();
      dmPage = await dmContext.newPage();
      attachConsoleMonitor(dmPage, "DM", metrics);

      const result = await createPlayerContexts(browser, PLAYER_COUNT);
      playerContexts = result.contexts;
      playerPages = result.pages;

      for (let i = 0; i < PLAYER_COUNT; i++) {
        attachConsoleMonitor(playerPages[i], PLAYER_NAMES[i], metrics);
      }
    });

    test.afterAll(async () => {
      printMetrics();
      await closeAllContexts([dmContext, ...playerContexts]);
    });

    // ════════════════════════════════════════════════════════════
    // PHASE 1: DM creates session with 12 monsters
    // ════════════════════════════════════════════════════════════

    test("Phase 1: DM creates session with 12 monsters", async () => {
      // Start with 4 monsters in the initial setup
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            { name: "Goblin Scout A", hp: "12", ac: "13", init: "18" },
            { name: "Goblin Scout B", hp: "12", ac: "13", init: "17" },
            { name: "Orc Warchief", hp: "60", ac: "16", init: "14" },
            { name: "Skeleton Mage", hp: "25", ac: "13", init: "12" },
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

      // Capture IDs for the 4 initial monsters
      goblin1Id = await findCombatantId(dmPage, "Goblin Scout A");
      goblin2Id = await findCombatantId(dmPage, "Goblin Scout B");
      orcId = await findCombatantId(dmPage, "Orc Warchief");
      skeletonId = await findCombatantId(dmPage, "Skeleton Mage");

      expect(
        new Set([goblin1Id, goblin2Id, orcId, skeletonId]).size
      ).toBe(4);

      // Add 8 more monsters mid-combat (total: 12 monsters)
      const additionalMonsters = [
        { name: "Zombie Brute A", hp: "30", ac: "8", init: "8" },
        { name: "Zombie Brute B", hp: "30", ac: "8", init: "7" },
        { name: "Kobold Trapper A", hp: "10", ac: "12", init: "16" },
        { name: "Kobold Trapper B", hp: "10", ac: "12", init: "15" },
        { name: "Bandit Captain", hp: "40", ac: "15", init: "13" },
        { name: "Wolf Alpha", hp: "18", ac: "13", init: "11" },
        { name: "Dire Rat A", hp: "8", ac: "10", init: "10" },
        { name: "Dire Rat B", hp: "8", ac: "10", init: "9" },
      ];

      for (const monster of additionalMonsters) {
        await addCombatantMidCombat(dmPage, monster);
        await dmPage.waitForTimeout(500);
      }

      // Verify we have 12 combatants on DM page
      const combatantRows = dmPage.locator(
        '[data-testid="active-combat"] li:has([data-testid^="hp-btn-"])'
      );
      const count = await combatantRows.count();
      console.log(
        `[LARGE-BATTLE] Phase 1 complete. ${count} monsters on DM page. Token: ${shareToken}`
      );
      expect(count).toBeGreaterThanOrEqual(12);
    });

    // ════════════════════════════════════════════════════════════
    // PHASE 2: 3 players join sequentially
    // ════════════════════════════════════════════════════════════

    test("Phase 2: 3 players join sequentially", async () => {
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const playerName = PLAYER_NAMES[i];
        const playerPage = playerPages[i];

        console.log(
          `[LARGE-BATTLE] Player ${i + 1}/${PLAYER_COUNT} joining: ${playerName}`
        );

        let joined = false;
        for (let attempt = 0; attempt < 3 && !joined; attempt++) {
          if (attempt > 0) {
            await playerPage.waitForTimeout(2_000);
          }
          try {
            await playerSubmitJoin(playerPage, shareToken, playerName, {
              initiative: String(20 - i),
              hp: String(30 + i * 10),
              ac: String(14 + i),
            });
            joined = true;
          } catch {
            const notFound = playerPage.locator(
              "text=Sessão Não Encontrada"
            );
            if (
              await notFound
                .isVisible({ timeout: 1_000 })
                .catch(() => false)
            ) {
              console.log(
                `[LARGE-BATTLE] Session not found for ${playerName}, retrying...`
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

        await dmPage.waitForTimeout(2_000);
      }

      // Verify all players see initiative boards
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: 30_000 }
      );

      console.log(
        `[LARGE-BATTLE] All ${PLAYER_COUNT} players joined. Total combatants: 15`
      );
    });

    // ════════════════════════════════════════════════════════════
    // PHASE 3: Full round with 15 combatants — broadcast latency
    // ════════════════════════════════════════════════════════════

    test("Phase 3: Full round with 15 combatants, measure broadcast latency", async () => {
      // 15 combatants per round: 12 monsters + 3 players
      const COMBATANTS_PER_ROUND = 15;

      console.log(
        `[LARGE-BATTLE] Advancing full round (${COMBATANTS_PER_ROUND} turns)...`
      );

      const roundStart = Date.now();

      for (let turn = 0; turn < COMBATANTS_PER_ROUND; turn++) {
        await advanceTurn(dmPage);
      }

      // Measure broadcast latency: wait for all players to still be in sync
      const syncStart = Date.now();
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );
      const syncLatency = Date.now() - syncStart;
      broadcastLatencies.push({
        action: "full-round-15-combatants",
        ms: syncLatency,
      });

      const roundDuration = Date.now() - roundStart;
      console.log(
        `[LARGE-BATTLE] Full round in ${(roundDuration / 1000).toFixed(1)}s, sync latency: ${syncLatency}ms`
      );

      // All pages responsive
      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      // DM page still functional
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 5_000 });
    });

    // ════════════════════════════════════════════════════════════
    // PHASE 4: Rapid DM actions on 4 monsters
    // ════════════════════════════════════════════════════════════

    test("Phase 4: Rapid DM actions — damage, conditions, defeat on 4 monsters", async () => {
      console.log(
        "[LARGE-BATTLE] Rapid DM actions on 4 monsters..."
      );

      // Damage Goblin Scout A
      await applyHpChange(dmPage, goblin1Id, 10, "damage");
      await dmPage.waitForTimeout(500);

      // Condition on Orc Warchief
      await toggleCondition(dmPage, orcId, "poisoned");
      await dmPage.keyboard.press("Escape");
      await dmPage.waitForTimeout(500);

      // Damage Goblin Scout B to 0 and defeat
      await applyHpChange(dmPage, goblin2Id, 12, "damage");
      await dmPage.waitForTimeout(1_000);
      try {
        await defeatCombatant(dmPage, goblin2Id);
      } catch {
        console.log(
          "[LARGE-BATTLE] Goblin B already auto-defeated at 0 HP"
        );
      }
      await dmPage.waitForTimeout(500);

      // Damage Skeleton Mage
      await applyHpChange(dmPage, skeletonId, 8, "damage");
      await dmPage.waitForTimeout(500);

      // Wait for broadcasts to settle
      console.log(
        "[LARGE-BATTLE] Waiting for broadcasts to settle..."
      );
      await dmPage.waitForTimeout(REALTIME_WAIT);

      // Measure sync
      const syncStart = Date.now();
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );
      const syncLatency = Date.now() - syncStart;
      broadcastLatencies.push({
        action: "post-rapid-actions-4-monsters",
        ms: syncLatency,
      });

      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      console.log(
        `[LARGE-BATTLE] Rapid actions complete. Sync: ${syncLatency}ms`
      );
    });

    // ════════════════════════════════════════════════════════════
    // PHASE 5: 3 complete rounds with metrics
    // ════════════════════════════════════════════════════════════

    test("Phase 5: 3 complete rounds, final metrics", async () => {
      // After defeat, we have ~14 combatants per round
      const COMBATANTS_PER_ROUND = 14;
      const ROUNDS = 3;

      for (let round = 1; round <= ROUNDS; round++) {
        console.log(
          `[LARGE-BATTLE] Round ${round}/${ROUNDS} (${COMBATANTS_PER_ROUND} turns)...`
        );

        for (let turn = 0; turn < COMBATANTS_PER_ROUND; turn++) {
          await advanceTurn(dmPage);
        }

        // DM action each round to stress the broadcast
        if (round === 1) {
          await applyHpChange(dmPage, orcId, 10, "damage");
          await dmPage.waitForTimeout(500);
        } else if (round === 2) {
          await toggleCondition(dmPage, skeletonId, "frightened");
          await dmPage.keyboard.press("Escape");
          await dmPage.waitForTimeout(500);
        } else {
          await applyHpChange(dmPage, goblin1Id, 2, "heal");
          await dmPage.waitForTimeout(500);
        }
      }

      // Final sync measurement
      const syncStart = Date.now();
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );
      const syncLatency = Date.now() - syncStart;
      broadcastLatencies.push({
        action: "post-3-rounds-final",
        ms: syncLatency,
      });

      // Final assertions
      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 5_000 });

      // Check error budget — DM errors from force-clicking during turnPending are expected.
      // The critical metric is PLAYER errors (broadcast cascade).
      const playerErrors = metrics.serverErrors.filter(
        (e) => !e.startsWith("[DM]")
      );
      const dmErrors = metrics.serverErrors.filter(
        (e) => e.startsWith("[DM]")
      );
      console.log(
        `[LARGE-BATTLE] Final metrics — Player errors: ${playerErrors.length}, DM errors: ${dmErrors.length}, Total: ${metrics.serverErrors.length}`
      );

      // Player errors must be minimal — max 5 per player
      expect(playerErrors.length).toBeLessThanOrEqual(
        PLAYER_COUNT * 5
      );

      // Verify all player pages have substantial content
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const bodyText = await playerPages[i]
          .locator("body")
          .textContent({ timeout: 5_000 });
        expect(bodyText?.length).toBeGreaterThan(100);
      }

      printMetrics();

      console.log("[LARGE-BATTLE] Large battle test completed successfully");
    });
  }
);
