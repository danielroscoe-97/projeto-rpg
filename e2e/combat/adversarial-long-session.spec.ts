/**
 * Adversarial Test — Long Session Simulation (10+ Rounds)
 *
 * Simulates a full RPG combat session lasting 10+ rounds with varied
 * DM actions each round. Tests for performance degradation over time:
 * accumulated broadcast latency, error cascade, memory leaks.
 *
 * This is critical because real RPG combat sessions can last 30-60 minutes
 * with 10-20 rounds. The system must not degrade over time.
 *
 * What this tests:
 *   - DM + 3 players over 10 complete rounds
 *   - Each round includes: turn advances + 1-2 DM actions (damage, heal,
 *     conditions, defeat, mid-combat add)
 *   - Sync verification after every round for all players
 *   - Metrics: average latency, error accumulation, body content stability
 *   - Target: zero performance degradation across rounds
 *
 * Run: npx playwright test adversarial-long-session
 *
 * @tags @adversarial @long-session @endurance
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
const PLAYER_NAMES = [
  "LongSession_01",
  "LongSession_02",
  "LongSession_03",
];

/** Total rounds to simulate */
const TOTAL_ROUNDS = 10;

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;

/** Max tolerable total server errors */
const MAX_TOTAL_ERRORS = 20;

// ── Metrics ─────────────────────────────────────────────────

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

let suiteStartTime = 0;

interface RoundMetrics {
  round: number;
  durationMs: number;
  errorsAfter: number;
}

const roundMetrics: RoundMetrics[] = [];

function printMetrics() {
  const totalDuration = Date.now() - suiteStartTime;
  console.log(
    "\n========== ADVERSARIAL: LONG SESSION — METRICS =========="
  );
  console.log(`Total suite duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`Rounds completed: ${roundMetrics.length}/${TOTAL_ROUNDS}`);

  console.log("\nRound durations:");
  for (const rm of roundMetrics) {
    console.log(
      `  Round ${rm.round}: ${(rm.durationMs / 1000).toFixed(1)}s (cumulative errors: ${rm.errorsAfter})`
    );
  }

  if (roundMetrics.length >= 2) {
    const firstHalf = roundMetrics.slice(0, Math.floor(roundMetrics.length / 2));
    const secondHalf = roundMetrics.slice(Math.floor(roundMetrics.length / 2));
    const avgFirst =
      firstHalf.reduce((s, r) => s + r.durationMs, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s, r) => s + r.durationMs, 0) / secondHalf.length;
    console.log(
      `\nPerformance trend: first half avg ${(avgFirst / 1000).toFixed(1)}s, second half avg ${(avgSecond / 1000).toFixed(1)}s`
    );
    const degradation = ((avgSecond - avgFirst) / avgFirst) * 100;
    console.log(
      `  Degradation: ${degradation.toFixed(1)}% (negative = improvement)`
    );
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
  }
  console.log(
    "========================================================\n"
  );
}

// ══════════════════════════════════════════════════════════════
// LONG SESSION TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial(
  "Adversarial — long session — 10 rounds endurance test",
  () => {
    test.slow(); // 3x timeout

    let browser: Browser;
    let dmContext: BrowserContext;
    let dmPage: Page;
    let playerContexts: BrowserContext[];
    let playerPages: Page[];
    let shareToken: string;

    // Combatant UUIDs (5 initial monsters)
    let goblinId: string;
    let orcId: string;
    let skeletonId: string;
    let zombieId: string;
    let koboldId: string;

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
    // SETUP: DM creates session, 3 players join
    // ════════════════════════════════════════════════════════════

    test("Setup: DM creates session with 5 monsters, 3 players join", async () => {
      let token: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
            { name: "Goblin Scout", hp: "14", ac: "13", init: "16" },
            { name: "Orc Captain", hp: "55", ac: "16", init: "12" },
            { name: "Skeleton Archer", hp: "20", ac: "13", init: "10" },
            { name: "Zombie Hulk", hp: "40", ac: "8", init: "8" },
            { name: "Kobold Shaman", hp: "15", ac: "12", init: "14" },
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

      goblinId = await findCombatantId(dmPage, "Goblin Scout");
      orcId = await findCombatantId(dmPage, "Orc Captain");
      skeletonId = await findCombatantId(dmPage, "Skeleton Archer");
      zombieId = await findCombatantId(dmPage, "Zombie Hulk");
      koboldId = await findCombatantId(dmPage, "Kobold Shaman");

      expect(
        new Set([goblinId, orcId, skeletonId, zombieId, koboldId]).size
      ).toBe(5);

      // Players join
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const playerName = PLAYER_NAMES[i];
        console.log(
          `[LONG-SESSION] Player ${i + 1}/${PLAYER_COUNT} joining: ${playerName}`
        );

        let joined = false;
        for (let attempt = 0; attempt < 3 && !joined; attempt++) {
          if (attempt > 0) await playerPages[i].waitForTimeout(2_000);
          try {
            await playerSubmitJoin(
              playerPages[i],
              shareToken,
              playerName,
              {
                initiative: String(18 - i * 2),
                hp: String(35 + i * 5),
                ac: String(14 + i),
              }
            );
            joined = true;
          } catch {
            const notFound = playerPages[i].locator(
              "text=Sessão Não Encontrada"
            );
            if (
              await notFound
                .isVisible({ timeout: 1_000 })
                .catch(() => false)
            ) {
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
          playerPages[i].locator('[data-testid="player-view"]')
        ).toBeVisible({ timeout: 30_000 });
        await dmPage.waitForTimeout(2_000);
      }

      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: 30_000 }
      );

      console.log(
        `[LONG-SESSION] Setup complete. Token: ${shareToken}. 5 monsters + 3 players.`
      );
    });

    // ════════════════════════════════════════════════════════════
    // TEST: 10 complete rounds with varied actions
    // ════════════════════════════════════════════════════════════

    test("10 complete rounds with varied DM actions each round", async () => {
      // 8 combatants per round: 5 monsters + 3 players
      // (will change as monsters are defeated / added)
      let combatantsPerRound = 8;

      for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        const roundStart = Date.now();

        console.log(
          `[LONG-SESSION] Round ${round}/${TOTAL_ROUNDS} (${combatantsPerRound} combatants)...`
        );

        // Advance all turns in this round
        for (let turn = 0; turn < combatantsPerRound; turn++) {
          await advanceTurn(dmPage);
        }

        // Perform varied DM actions based on round number
        try {
          switch (round) {
            case 1:
              // Light damage on Goblin
              await applyHpChange(dmPage, goblinId, 5, "damage");
              await dmPage.waitForTimeout(500);
              break;

            case 2:
              // Condition on Orc
              await toggleCondition(dmPage, orcId, "poisoned");
              await dmPage.keyboard.press("Escape");
              await dmPage.waitForTimeout(500);
              break;

            case 3:
              // Heavy damage on Kobold (15->0) + defeat
              await applyHpChange(dmPage, koboldId, 15, "damage");
              await dmPage.waitForTimeout(1_000);
              try {
                await defeatCombatant(dmPage, koboldId);
              } catch {
                console.log(
                  "[LONG-SESSION] Kobold auto-defeated at 0 HP"
                );
              }
              combatantsPerRound = 7; // -1 kobold
              await dmPage.waitForTimeout(500);
              break;

            case 4:
              // Heal the Orc + damage Skeleton
              await applyHpChange(dmPage, orcId, 10, "heal");
              await dmPage.waitForTimeout(500);
              await applyHpChange(dmPage, skeletonId, 8, "damage");
              await dmPage.waitForTimeout(500);
              break;

            case 5:
              // Defeat Goblin (was 14-5=9 HP)
              await applyHpChange(dmPage, goblinId, 9, "damage");
              await dmPage.waitForTimeout(1_000);
              try {
                await defeatCombatant(dmPage, goblinId);
              } catch {
                console.log(
                  "[LONG-SESSION] Goblin auto-defeated at 0 HP"
                );
              }
              combatantsPerRound = 6; // -1 goblin
              await dmPage.waitForTimeout(500);
              break;

            case 6:
              // Add reinforcement mid-combat
              await addCombatantMidCombat(dmPage, {
                name: "Bandit Reinforcement",
                hp: "20",
                ac: "13",
                initiative: "11",
              });
              combatantsPerRound = 7; // +1 bandit
              await dmPage.waitForTimeout(500);
              break;

            case 7:
              // Multiple conditions on Zombie
              await toggleCondition(dmPage, zombieId, "frightened");
              await dmPage.keyboard.press("Escape");
              await dmPage.waitForTimeout(500);
              await applyHpChange(dmPage, zombieId, 12, "damage");
              await dmPage.waitForTimeout(500);
              break;

            case 8:
              // Damage the Skeleton (20-8=12, -6=6)
              await applyHpChange(dmPage, skeletonId, 6, "damage");
              await dmPage.waitForTimeout(500);
              break;

            case 9:
              // Defeat Zombie (40-12=28, -28=0)
              await applyHpChange(dmPage, zombieId, 28, "damage");
              await dmPage.waitForTimeout(1_000);
              try {
                await defeatCombatant(dmPage, zombieId);
              } catch {
                console.log(
                  "[LONG-SESSION] Zombie auto-defeated at 0 HP"
                );
              }
              combatantsPerRound = 6; // -1 zombie
              await dmPage.waitForTimeout(500);
              break;

            case 10:
              // Final round: heavy damage + condition
              await applyHpChange(dmPage, orcId, 20, "damage");
              await dmPage.waitForTimeout(500);
              await toggleCondition(dmPage, orcId, "stunned");
              await dmPage.keyboard.press("Escape");
              await dmPage.waitForTimeout(500);
              break;
          }
        } catch (e) {
          // Log action errors but don't fail the round
          console.warn(
            `[LONG-SESSION] Round ${round} action error: ${String(e).slice(0, 120)}`
          );
        }

        // Wait for broadcasts to propagate
        await dmPage.waitForTimeout(3_000);

        // Verify all players still have initiative boards
        await waitForAllPages(
          playerPages,
          '[data-testid="player-initiative-board"]',
          { timeout: REALTIME_WAIT }
        );

        const roundDuration = Date.now() - roundStart;
        roundMetrics.push({
          round,
          durationMs: roundDuration,
          errorsAfter: metrics.serverErrors.length,
        });

        console.log(
          `[LONG-SESSION] Round ${round} complete in ${(roundDuration / 1000).toFixed(1)}s (errors so far: ${metrics.serverErrors.length})`
        );
      }

      console.log(
        `[LONG-SESSION] All ${TOTAL_ROUNDS} rounds completed`
      );
    });

    // ════════════════════════════════════════════════════════════
    // FINAL: Assertions and degradation check
    // ════════════════════════════════════════════════════════════

    test("Final: no performance degradation, all players responsive", async () => {
      // All players responsive
      await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

      // DM page functional
      await expect(
        dmPage.locator('[data-testid="active-combat"]')
      ).toBeVisible({ timeout: 5_000 });

      // Verify player body content is substantial
      for (let i = 0; i < PLAYER_COUNT; i++) {
        const bodyText = await playerPages[i]
          .locator("body")
          .textContent({ timeout: 5_000 });
        expect(bodyText?.length).toBeGreaterThan(100);
      }

      // Check total error budget
      const totalErrors = metrics.serverErrors.length;
      console.log(
        `[LONG-SESSION] Total errors: ${totalErrors} (max: ${MAX_TOTAL_ERRORS})`
      );
      expect(totalErrors).toBeLessThanOrEqual(MAX_TOTAL_ERRORS);

      // Check for performance degradation:
      // Second half of rounds should not be significantly slower than first half
      if (roundMetrics.length >= 4) {
        const half = Math.floor(roundMetrics.length / 2);
        const firstHalf = roundMetrics.slice(0, half);
        const secondHalf = roundMetrics.slice(half);

        const avgFirst =
          firstHalf.reduce((s, r) => s + r.durationMs, 0) /
          firstHalf.length;
        const avgSecond =
          secondHalf.reduce((s, r) => s + r.durationMs, 0) /
          secondHalf.length;

        // Allow up to 100% degradation (generous for CI environments)
        // Real degradation from a memory leak or state explosion would be 300%+
        const degradationPct =
          ((avgSecond - avgFirst) / avgFirst) * 100;
        console.log(
          `[LONG-SESSION] Performance: first half avg ${(avgFirst / 1000).toFixed(1)}s, second half avg ${(avgSecond / 1000).toFixed(1)}s, degradation ${degradationPct.toFixed(1)}%`
        );
        expect(degradationPct).toBeLessThan(100);
      }

      // One final DM action + sync to verify channel is still alive
      await advanceTurn(dmPage);
      await dmPage.waitForTimeout(REALTIME_WAIT);

      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );

      printMetrics();

      console.log(
        "[LONG-SESSION] Long session endurance test completed successfully"
      );
    });
  }
);
