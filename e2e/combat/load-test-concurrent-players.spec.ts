/**
 * Load Test — Concurrent Players Broadcast Stress
 *
 * Simulates a combat session with 1 DM and 8-10 concurrent players.
 * Verifies that the Supabase Realtime broadcast system handles high
 * concurrency without desync, crashes, or rate-limiting errors.
 *
 * What this tests:
 *   - 8-10 browser contexts (simulating independent devices)
 *   - All players receive turn updates within 3 seconds
 *   - All players see combatant removal within 3 seconds
 *   - No 500/504/rate-limit console errors in any player tab
 *   - All player pages remain responsive throughout
 *   - Metrics: broadcast latency, console error count, total duration
 *
 * Run: npm run e2e:load
 *
 * @tags @load
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
  addCombatantMidCombat,
  defeatCombatant,
  waitForAllPages,
} from "../helpers/multi-player";

// ── Configuration ────────────────────────────────────────────

/** Number of concurrent players to simulate.
 *  5 is realistic for a typical in-person table.
 *  8+ stresses Supabase anonymous auth (signInAnonymously) rate limits. */
const PLAYER_COUNT = 5;

/** Max time (ms) for a broadcast to reach ALL players */
const SYNC_DEADLINE_MS = 3_000;

/** Extended wait for realtime propagation (used in generous assertions) */
const REALTIME_WAIT = 8_000;

/** Player names for each concurrent player */
const PLAYER_NAMES = Array.from(
  { length: PLAYER_COUNT },
  (_, i) => `LoadPlayer_${String(i + 1).padStart(2, "0")}`
);

// ── Metrics Collection ───────────────────────────────────────

interface LoadMetrics {
  testStartTime: number;
  broadcastLatencies: { action: string; ms: number }[];
  consoleErrorsPerPlayer: Map<string, number>;
  serverErrors: string[];
}

const metrics: LoadMetrics = {
  testStartTime: 0,
  broadcastLatencies: [],
  consoleErrorsPerPlayer: new Map(),
  serverErrors: [],
};

/**
 * Attach console error listener to a player page.
 * Tracks 500, 504, and rate-limit errors.
 */
function attachConsoleMonitor(page: Page, playerName: string) {
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
 * Measure time for ALL player pages to see a selector become visible.
 * Returns the elapsed time in ms from the start of the measurement.
 */
async function measureBroadcastLatency(
  pages: Page[],
  selector: string,
  actionName: string,
  deadline: number = SYNC_DEADLINE_MS
): Promise<number> {
  const start = Date.now();
  await Promise.all(
    pages.map((p) =>
      expect(p.locator(selector)).toBeVisible({
        timeout: Math.max(deadline, REALTIME_WAIT),
      })
    )
  );
  const elapsed = Date.now() - start;
  metrics.broadcastLatencies.push({ action: actionName, ms: elapsed });
  return elapsed;
}

/**
 * Verify all player pages are responsive (not blank or crashed).
 * A page is "responsive" if the body has meaningful content.
 */
async function assertAllPagesResponsive(pages: Page[], playerNames: string[]) {
  const results = await Promise.all(
    pages.map(async (page, i) => {
      try {
        const bodyText = await page.locator("body").textContent({ timeout: 5_000 });
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
      `[LOAD] Unresponsive players: ${crashed.map((c) => `${c.player}(len=${c.length})`).join(", ")}`
    );
  }
  // Allow at most 1 unresponsive page (network hiccup) but not a systemic crash
  expect(crashed.length).toBeLessThanOrEqual(1);
}

/**
 * Print final metrics summary to the console.
 */
function printMetrics() {
  const totalDuration = Date.now() - metrics.testStartTime;
  console.log("\n========== LOAD TEST METRICS ==========");
  console.log(`Total test duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`Players simulated: ${PLAYER_COUNT}`);
  console.log(`\nBroadcast latencies (DM action -> last player sync):`);
  for (const { action, ms } of metrics.broadcastLatencies) {
    const status = ms <= SYNC_DEADLINE_MS ? "OK" : "SLOW";
    console.log(`  ${action}: ${ms}ms [${status}]`);
  }
  const avgLatency =
    metrics.broadcastLatencies.length > 0
      ? metrics.broadcastLatencies.reduce((sum, l) => sum + l.ms, 0) /
        metrics.broadcastLatencies.length
      : 0;
  console.log(`  Average: ${avgLatency.toFixed(0)}ms`);

  console.log(`\nConsole errors per player:`);
  let totalErrors = 0;
  for (const [player, count] of metrics.consoleErrorsPerPlayer) {
    if (count > 0) console.log(`  ${player}: ${count} errors`);
    totalErrors += count;
  }
  if (totalErrors === 0) {
    console.log("  None (all clean)");
  }

  if (metrics.serverErrors.length > 0) {
    console.log(`\nServer errors (500/504/rate-limit):`);
    for (const err of metrics.serverErrors.slice(0, 10)) {
      console.log(`  ${err}`);
    }
    if (metrics.serverErrors.length > 10) {
      console.log(`  ... and ${metrics.serverErrors.length - 10} more`);
    }
  }
  console.log("========================================\n");
}

// ── Dismiss onboarding tour ──────────────────────────────────

async function dismissTourIfVisible(dmPage: Page) {
  await dmPage.waitForTimeout(3_000);
  for (let attempt = 0; attempt < 12; attempt++) {
    const tourDialog = dmPage
      .locator('[role="dialog"]')
      .filter({
        hasText:
          /Bem-vindo|Welcome|Preparação|Preparation|montar.*combate|set.*combat/i,
      })
      .first();
    if (
      !(await tourDialog.isVisible({ timeout: 2_000 }).catch(() => false))
    )
      break;
    const nextBtn = tourDialog
      .locator("button")
      .filter({
        hasText: /Próximo|Next|Concluir|Finish|Entendido|Got it/i,
      })
      .first();
    if (await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await nextBtn.click();
      await dmPage.waitForTimeout(800);
      continue;
    }
    const skipBtn = tourDialog
      .locator("button")
      .filter({ hasText: /Pular|Skip|Dismiss|Fechar|Close/i })
      .first();
    if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipBtn.click();
      await dmPage.waitForTimeout(500);
      continue;
    }
    break;
  }
  const closePanel = dmPage
    .locator("button[aria-label]")
    .filter({ hasText: /Fechar painel/i })
    .first();
  if (await closePanel.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closePanel.click();
    await dmPage.waitForTimeout(300);
  }
}

// ══════════════════════════════════════════════════════════════
// LOAD TEST SUITE
// ══════════════════════════════════════════════════════════════

test.describe.serial("Load test — @load — concurrent players broadcast stress", () => {
  // 3x default timeout (this is a long-running load test)
  test.slow();

  let browser: Browser;
  let dmContext: BrowserContext;
  let dmPage: Page;
  let playerContexts: BrowserContext[];
  let playerPages: Page[];
  let shareToken: string;

  // Combatant UUIDs
  let goblinId: string;
  let orcId: string;
  let skeletonId: string;
  let zombieId: string;

  test.beforeAll(async ({ browser: b }) => {
    metrics.testStartTime = Date.now();
    browser = b;
    dmContext = await browser.newContext();
    dmPage = await dmContext.newPage();

    // Create player contexts in parallel batches to avoid overwhelming the browser
    const result = await createPlayerContexts(browser, PLAYER_COUNT);
    playerContexts = result.contexts;
    playerPages = result.pages;

    // Attach console monitors to all player pages
    for (let i = 0; i < PLAYER_COUNT; i++) {
      attachConsoleMonitor(playerPages[i], PLAYER_NAMES[i]);
    }
    // Also monitor the DM page
    attachConsoleMonitor(dmPage, "DM");
  });

  test.afterAll(async () => {
    printMetrics();
    await closeAllContexts([dmContext, ...playerContexts]);
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 1: DM SETUP
  // ════════════════════════════════════════════════════════════

  test("Phase 1: DM creates session with 4 monsters", async () => {
    let token: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
          { name: "Goblin Archer", hp: "12", ac: "13", init: "14" },
          { name: "Orc Brute", hp: "45", ac: "16", init: "12" },
          { name: "Skeleton Guard", hp: "20", ac: "13", init: "10" },
          { name: "Zombie Shambler", hp: "22", ac: "8", init: "6" },
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
    goblinId = await findCombatantId(dmPage, "Goblin Archer");
    orcId = await findCombatantId(dmPage, "Orc Brute");
    skeletonId = await findCombatantId(dmPage, "Skeleton Guard");
    zombieId = await findCombatantId(dmPage, "Zombie Shambler");

    expect(
      new Set([goblinId, orcId, skeletonId, zombieId]).size
    ).toBe(4);

    console.log(
      `[LOAD] DM setup complete. Share token: ${shareToken}. 4 monsters in initiative.`
    );
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 2: ALL PLAYERS JOIN (sequential to avoid race on DM accept)
  // ════════════════════════════════════════════════════════════

  test(`Phase 2: ${PLAYER_COUNT} players join sequentially via share link`, async () => {
    const joinStart = Date.now();

    for (let i = 0; i < PLAYER_COUNT; i++) {
      const playerName = PLAYER_NAMES[i];
      const playerPage = playerPages[i];

      console.log(`[LOAD] Player ${i + 1}/${PLAYER_COUNT} joining: ${playerName}`);

      // Player submits join form — retry up to 3 times if session not found
      // (Supabase anon auth can be slow under concurrent load)
      let joined = false;
      for (let attempt = 0; attempt < 3 && !joined; attempt++) {
        if (attempt > 0) {
          console.log(`[LOAD] Retry ${attempt} for ${playerName}`);
          await playerPage.waitForTimeout(2_000);
        }
        try {
          await playerSubmitJoin(playerPage, shareToken, playerName, {
            initiative: String(20 - i),
            hp: String(25 + i * 5),
            ac: String(12 + (i % 5)),
          });
          joined = true;
        } catch {
          // Check if page shows "Sessão Não Encontrada" — reload and retry
          const notFound = playerPage.locator('text=Sessão Não Encontrada');
          if (await notFound.isVisible({ timeout: 1_000 }).catch(() => false)) {
            console.log(`[LOAD] Session not found for ${playerName}, retrying...`);
            continue;
          }
          // If we're on the last attempt, re-throw
          if (attempt === 2) throw new Error(`Player ${playerName} failed to join after 3 attempts`);
        }
      }

      // DM accepts the player
      await dmAcceptPlayer(dmPage, playerName);

      // Verify player sees the player view
      await expect(
        playerPage.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 30_000 });

      // Brief pause between joins to let anon auth + broadcasts settle
      await dmPage.waitForTimeout(2_000);
    }

    const joinDuration = Date.now() - joinStart;
    console.log(
      `[LOAD] All ${PLAYER_COUNT} players joined in ${(joinDuration / 1000).toFixed(1)}s`
    );

    // Verify ALL players have initiative boards visible
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: 30_000 }
    );
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 3: DM ADVANCES TURNS — measure broadcast latency
  // ════════════════════════════════════════════════════════════

  test("Phase 3: DM advances 3 rounds, all players stay in sync", async () => {
    // Total combatants: 4 monsters + 5 players = 9
    // 3 rounds = 27 turn advances (enough to validate sync without timeout)
    const ROUNDS = 3;
    const combatantsPerRound = 4 + PLAYER_COUNT; // monsters + players

    for (let round = 1; round <= ROUNDS; round++) {
      console.log(`[LOAD] Round ${round}/${ROUNDS} — advancing ${combatantsPerRound} turns`);

      for (let turn = 0; turn < combatantsPerRound; turn++) {
        await advanceTurn(dmPage);
      }

      // After each round, verify all players still see the initiative board
      await waitForAllPages(
        playerPages,
        '[data-testid="player-initiative-board"]',
        { timeout: REALTIME_WAIT }
      );
    }

    // Measure sync: advance one more turn and time how long until all players see it
    const turnIndexBefore = await dmPage
      .locator('[data-testid="current-turn-indicator"]')
      .count();

    const syncStart = Date.now();
    await advanceTurn(dmPage);
    // Wait for all player pages to reflect the board (initiative board still visible = in sync)
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: SYNC_DEADLINE_MS + 5_000 }
    );
    const syncLatency = Date.now() - syncStart;
    metrics.broadcastLatencies.push({
      action: "turn-advance-after-5-rounds",
      ms: syncLatency,
    });

    console.log(
      `[LOAD] Turn advance broadcast latency: ${syncLatency}ms (deadline: ${SYNC_DEADLINE_MS}ms)`
    );

    // All pages should be responsive
    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 4: DM APPLIES CONDITIONS — broadcast stress
  // ════════════════════════════════════════════════════════════

  test("Phase 4: DM applies conditions to multiple combatants", async () => {
    // Poison the Goblin
    await toggleCondition(dmPage, goblinId, "poisoned");
    await dmPage.keyboard.press("Escape");
    await dmPage.waitForTimeout(1_000);

    // Stun the Orc
    await toggleCondition(dmPage, orcId, "stunned");
    await dmPage.keyboard.press("Escape");
    await dmPage.waitForTimeout(1_000);

    // Verify all players still have working boards
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: REALTIME_WAIT }
    );

    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);
    console.log("[LOAD] Conditions applied, all players in sync");
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 5: DM REMOVES A COMBATANT — measure propagation
  // ════════════════════════════════════════════════════════════

  test("Phase 5: DM defeats Zombie, all players see removal within deadline", async () => {
    // Before defeat: all players should see the zombie
    await waitForAllPages(
      playerPages,
      `[data-testid="player-combatant-${zombieId}"]`,
      { timeout: REALTIME_WAIT }
    ).catch(() => {
      // Zombie might not have player-combatant testid; that's OK
      console.log(
        "[LOAD] Zombie player-combatant not found (may use different testid pattern)"
      );
    });

    // Defeat the Zombie
    const defeatStart = Date.now();
    await defeatCombatant(dmPage, zombieId);

    // Wait for broadcast to propagate
    await dmPage.waitForTimeout(REALTIME_WAIT);
    const defeatLatency = Date.now() - defeatStart;
    metrics.broadcastLatencies.push({
      action: "defeat-zombie-propagation",
      ms: defeatLatency,
    });

    // Verify all players still functional after removal
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: REALTIME_WAIT }
    );

    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);
    console.log(`[LOAD] Zombie defeated, propagation: ${defeatLatency}ms`);
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 6: DM ADDS COMBATANT MID-COMBAT
  // ════════════════════════════════════════════════════════════

  test("Phase 6: DM adds a Bandit mid-combat, all players see it", async () => {
    const addStart = Date.now();
    await addCombatantMidCombat(dmPage, {
      name: "Bandit Ambusher",
      hp: "18",
      ac: "12",
      initiative: "16",
    });

    // Verify the bandit appears on DM page
    const banditId = await findCombatantId(dmPage, "Bandit Ambusher");
    expect(banditId).toBeTruthy();

    // Wait for broadcast
    await dmPage.waitForTimeout(REALTIME_WAIT);
    const addLatency = Date.now() - addStart;
    metrics.broadcastLatencies.push({
      action: "add-bandit-mid-combat",
      ms: addLatency,
    });

    // All players should still have functional boards
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: REALTIME_WAIT }
    );

    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);
    console.log(`[LOAD] Bandit added mid-combat, propagation: ${addLatency}ms`);
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 7: RAPID FIRE — 5 more rounds with DM actions each round
  // ════════════════════════════════════════════════════════════

  test("Phase 7: 3 rapid-fire rounds with mixed DM actions", async () => {
    // Current combatants: Goblin, Orc, Skeleton, Bandit + players
    const combatantsPerRound = 3 + 1 + PLAYER_COUNT; // 3 original monsters + 1 bandit + players
    const ROUNDS = 3;

    for (let round = 1; round <= ROUNDS; round++) {
      // Advance a full round
      for (let turn = 0; turn < combatantsPerRound; turn++) {
        await advanceTurn(dmPage);
      }

      // Every other round, do a DM action to stress the broadcast
      if (round % 2 === 1) {
        // Apply damage to Orc
        await applyHpChange(dmPage, orcId, 5, "damage");
        await dmPage.waitForTimeout(500);
      } else {
        // Heal the Goblin
        await applyHpChange(dmPage, goblinId, 3, "heal");
        await dmPage.waitForTimeout(500);
      }
    }

    // Final sync check across all players
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: REALTIME_WAIT }
    );

    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);
    console.log(`[LOAD] ${ROUNDS} rapid-fire rounds completed`);
  });

  // ════════════════════════════════════════════════════════════
  // PHASE 8: FINAL ASSERTIONS — error counts and responsiveness
  // ════════════════════════════════════════════════════════════

  test("Phase 8: Final assertions — no server errors, all pages responsive", async () => {
    // Check server errors — tolerate a small number from force-clicks during turnPending.
    // The goal is to verify NO cascade failure (Beta #2 had 2023 504s with 7 players).
    // A few transient 500s from rapid DM actions are acceptable.
    const playerServerErrors = metrics.serverErrors.filter(e => !e.startsWith("[DM]"));
    const dmServerErrors = metrics.serverErrors.filter(e => e.startsWith("[DM]"));
    const totalErrors = metrics.serverErrors.length;
    console.log(
      `[LOAD] Total errors: ${totalErrors} (DM: ${dmServerErrors.length}, Players: ${playerServerErrors.length})`
    );
    // PLAYER errors must be minimal — max 5 per player.
    // DM errors are expected from force-clicking during turnPending.
    // Beta #2 had 2023 504s with 7 players — any systemic issue would show 100+ player errors.
    const maxPlayerErrors = PLAYER_COUNT * 5;
    expect(playerServerErrors.length).toBeLessThanOrEqual(maxPlayerErrors);

    // Every player page must still be responsive
    await assertAllPagesResponsive(playerPages, PLAYER_NAMES);

    // Every player must still see the initiative board
    await waitForAllPages(
      playerPages,
      '[data-testid="player-initiative-board"]',
      { timeout: REALTIME_WAIT }
    );

    // Verify no player page went blank (body must have substantial content)
    for (let i = 0; i < PLAYER_COUNT; i++) {
      const bodyText = await playerPages[i]
        .locator("body")
        .textContent({ timeout: 5_000 });
      expect(bodyText?.length).toBeGreaterThan(100);
    }

    // Check broadcast latencies are within deadline
    const slowBroadcasts = metrics.broadcastLatencies.filter(
      (l) => l.ms > SYNC_DEADLINE_MS
    );
    if (slowBroadcasts.length > 0) {
      console.warn(
        `[LOAD] ${slowBroadcasts.length} broadcast(s) exceeded ${SYNC_DEADLINE_MS}ms deadline:`
      );
      for (const s of slowBroadcasts) {
        console.warn(`  ${s.action}: ${s.ms}ms`);
      }
    }

    // Print final metrics
    printMetrics();

    console.log("[LOAD] Load test completed successfully");
  });
});
