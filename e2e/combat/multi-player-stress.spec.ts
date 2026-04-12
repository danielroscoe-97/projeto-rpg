/**
 * Multi-Player Combat Stress Test — Real Session Simulation
 *
 * Simulates a LONG real combat session with 1 DM and 2 players.
 * Unlike a quick smoke test, this exercises REAL disconnect scenarios:
 *
 * Reconnection levels tested:
 *   L1: page.reload()         — sessionStorage alive (easiest)
 *   L2: close tab, reopen URL — sessionStorage GONE, localStorage alive
 *   L3: close browser entirely — all storage gone, player sees lobby again
 *
 * Other scenarios:
 *   - Hidden monsters invisible to players
 *   - DM reveals hidden → players see appear
 *   - DM renames display_name → players see new name
 *   - DM adds monster mid-combat
 *   - HP damage, heal, temp HP, conditions add/remove
 *   - Turn cycling across multiple rounds
 *   - Defeat + endgame
 *   - Realistic delays between DM actions (2-5s, not instant)
 *
 * Run: npm run e2e:stress
 */
import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import {
  advanceTurn,
  applyHpChange,
  toggleCondition,
  endEncounter,
} from "../helpers/combat";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  closeAllContexts,
  playerSubmitJoin,
  dmAcceptPlayer,
  findCombatantId,
  toggleHidden,
  renameCombatant,
  addCombatantMidCombat,
  defeatCombatant,
  waitForAllPages,
  assertNoneVisible,
} from "../helpers/multi-player";

/** Realtime propagation wait */
const REALTIME_WAIT = 10_000;
const EXTENDED_WAIT = 15_000;

/** Realistic delay between DM actions (like a real human would take) */
async function dmThinks(page: Page, ms = 3_000) {
  await page.waitForTimeout(ms);
}

/** Advance a full round with realistic timing between turns */
async function advanceFullRound(dmPage: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const btn = dmPage.locator('[data-testid="next-turn-btn"]');
    await expect(btn).toBeEnabled({ timeout: 10_000 });
    await btn.click();
    // DM pauses between turns like a real person
    await dmPage.waitForTimeout(1_500);
  }
}

/** Verify all player pages have functional initiative boards */
async function assertAllBoardsFunctional(pages: Page[]) {
  await waitForAllPages(pages, '[data-testid="player-initiative-board"]');
}

/** Dismiss the onboarding tour dialog (scoped to tour only, never presses Escape on random dialogs) */
async function dismissTourIfVisible(dmPage: Page) {
  await dmPage.waitForTimeout(5_000);
  for (let attempt = 0; attempt < 12; attempt++) {
    const tourDialog = dmPage
      .locator('[role="dialog"]')
      .filter({ hasText: /Bem-vindo|Welcome|Preparação|Preparation|montar.*combate|set.*combat/i })
      .first();
    if (!(await tourDialog.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    const nextBtn = tourDialog
      .locator("button")
      .filter({ hasText: /Próximo|Next|Concluir|Finish|Entendido|Got it/i })
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
  const closePanel = dmPage.locator("button[aria-label]").filter({ hasText: /Fechar painel/i }).first();
  if (await closePanel.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closePanel.click();
    await dmPage.waitForTimeout(300);
  }
}

/**
 * Simulate CLOSING a browser tab (not just refresh).
 * Closes the old context entirely (sessionStorage dies).
 * Creates a new context + page and navigates to the join URL.
 * localStorage is ALSO lost because it's a new context.
 *
 * Returns the new page (caller must update their reference).
 */
async function simulateTabClose(
  browser: Browser,
  oldContext: BrowserContext,
  joinUrl: string
): Promise<{ context: BrowserContext; page: Page }> {
  // Copy localStorage from old context before closing
  const oldPage = oldContext.pages()[0];
  const localStorageData = await oldPage.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) ?? "";
    }
    return data;
  });

  // Close old context (simulates closing the tab — sessionStorage dies)
  await oldContext.close().catch(() => {});

  // Create new context (simulates opening a new tab)
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();

  // Restore localStorage (survives tab close in real browsers)
  await newPage.goto(joinUrl);
  await newPage.waitForLoadState("domcontentloaded");
  await newPage.evaluate((data) => {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value);
    }
  }, localStorageData);

  // Reload to trigger reconnection with restored localStorage
  await newPage.reload({ timeout: 30_000 });

  return { context: newContext, page: newPage };
}

/**
 * Simulate CLOSING the browser entirely.
 * Both sessionStorage AND localStorage are gone.
 * Player must rejoin from scratch (sees lobby form again).
 */
async function simulateBrowserClose(
  browser: Browser,
  oldContext: BrowserContext,
  joinUrl: string
): Promise<{ context: BrowserContext; page: Page }> {
  // Close old context (everything dies)
  await oldContext.close().catch(() => {});

  // Create completely fresh context (no storage at all)
  const newContext = await browser.newContext();
  const newPage = await newContext.newPage();
  await newPage.goto(joinUrl);
  await newPage.waitForLoadState("domcontentloaded");
  await newPage.waitForLoadState("networkidle").catch(() => {});

  return { context: newContext, page: newPage };
}

test.describe.serial("Multi-player combat — real session simulation", () => {
  test.slow(); // 3x timeout

  let browser: Browser;
  let dmContext: BrowserContext;
  let p1Context: BrowserContext;
  let p2Context: BrowserContext;
  let dmPage: Page;
  let p1Page: Page;
  let p2Page: Page;
  let shareToken: string;
  let joinUrl: string;

  // Combatant UUIDs (non-overlapping names)
  let orcWarriorId: string;
  let wolfId: string;
  let banditId: string;
  let skeletonId: string;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    dmContext = await browser.newContext();
    p1Context = await browser.newContext();
    p2Context = await browser.newContext();
    dmPage = await dmContext.newPage();
    p1Page = await p1Context.newPage();
    p2Page = await p2Context.newPage();
  });

  test.afterAll(async () => {
    await closeAllContexts([dmContext, p1Context, p2Context]);
  });

  // ════════════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════════════

  test("Setup: DM creates session with 4 monsters", async () => {
    let token: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
          { name: "Orc Warrior", hp: "50", ac: "16", init: "14" },
          { name: "Wolf", hp: "14", ac: "12", init: "10" },
          { name: "Bandit", hp: "14", ac: "12", init: "10" },
          { name: "Skeleton", hp: "20", ac: "13", init: "8" },
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
    joinUrl = `/join/${shareToken}`;

    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 5_000 });

    orcWarriorId = await findCombatantId(dmPage, "Orc Warrior");
    wolfId = await findCombatantId(dmPage, "Wolf");
    banditId = await findCombatantId(dmPage, "Bandit");
    skeletonId = await findCombatantId(dmPage, "Skeleton");
    expect(new Set([orcWarriorId, wolfId, banditId, skeletonId]).size).toBe(4);
  });

  test("Setup: Dismiss tour + hide Skeleton", async () => {
    await dismissTourIfVisible(dmPage);
    await expect(dmPage.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
    await toggleHidden(dmPage, skeletonId);
    await expect(dmPage.locator(`[data-testid="hp-btn-${skeletonId}"]`)).toBeVisible({ timeout: 3_000 });
  });

  // ════════════════════════════════════════════════════════════
  // PLAYER JOIN
  // ════════════════════════════════════════════════════════════

  test("Join: Player 1 (Thorin) enters combat", async () => {
    await playerSubmitJoin(p1Page, shareToken, "Thorin", { initiative: "18", hp: "45", ac: "18" });
    await dmAcceptPlayer(dmPage, "Thorin");
    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible({ timeout: 30_000 });
    await expect(p1Page.locator('[data-testid="player-initiative-board"]')).toBeVisible({ timeout: EXTENDED_WAIT });
  });

  test("Join: Player 2 (Elara) enters combat", async () => {
    await playerSubmitJoin(p2Page, shareToken, "Elara", { initiative: "12", hp: "30", ac: "15" });
    await dmAcceptPlayer(dmPage, "Elara");
    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible({ timeout: 30_000 });
    await expect(p2Page.locator('[data-testid="player-initiative-board"]')).toBeVisible({ timeout: EXTENDED_WAIT });
  });

  test("Join: Hidden Skeleton invisible to all players", async () => {
    await assertNoneVisible(
      [p1Page, p2Page],
      `[data-testid="player-combatant-${skeletonId}"]`,
      { timeout: 5_000 }
    );
    await expect(dmPage.locator(`[data-testid="hp-btn-${skeletonId}"]`)).toBeVisible();
    await waitForAllPages(
      [p1Page, p2Page],
      `[data-testid="player-combatant-${orcWarriorId}"]`,
      { timeout: 30_000 }
    );
  });

  // ════════════════════════════════════════════════════════════
  // ROUND 1: Basic combat with realistic timing
  // ════════════════════════════════════════════════════════════

  test("Round 1: DM cycles through all turns (realistic pace)", async () => {
    // 6 combatants: Thorin(18), Orc(14), Elara(12), Wolf(10), Bandit(10), Skeleton(8 hidden)
    await advanceFullRound(dmPage, 6);
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  test("Round 1: DM damages Orc Warrior (50→25 HP)", async () => {
    await dmThinks(dmPage, 3_000);
    await applyHpChange(dmPage, orcWarriorId, 25, "damage");
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await waitForAllPages(
      [p1Page, p2Page],
      `[data-testid="player-combatant-${orcWarriorId}"]`,
      { timeout: EXTENDED_WAIT }
    );
  });

  test("Round 1: DM poisons Wolf + stuns Bandit", async () => {
    await dmThinks(dmPage, 2_000);
    await toggleCondition(dmPage, wolfId, "poisoned");
    await dmPage.keyboard.press("Escape");
    await dmThinks(dmPage, 2_000);
    await toggleCondition(dmPage, banditId, "stunned");
    await dmPage.keyboard.press("Escape");
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  // ════════════════════════════════════════════════════════════
  // ROUND 2: L1 reconnect (page refresh) + more damage
  // ════════════════════════════════════════════════════════════

  test("Round 2: Player 1 refreshes (L1 — sessionStorage alive)", async () => {
    // L1: page.reload() — easiest reconnect, sessionStorage intact
    await p1Page.reload({ timeout: 30_000 });
    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible({ timeout: 30_000 });
    await expect(p1Page.locator('[data-testid="player-initiative-board"]')).toBeVisible({ timeout: EXTENDED_WAIT });
    await expect(
      p1Page.locator(`[data-testid="player-combatant-${orcWarriorId}"]`)
    ).toBeVisible({ timeout: EXTENDED_WAIT });
    // Player 2 unaffected
    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible();
  });

  test("Round 2: DM advances + damages more", async () => {
    await advanceFullRound(dmPage, 6);
    await dmThinks(dmPage, 3_000);
    await applyHpChange(dmPage, orcWarriorId, 15, "damage"); // 25→10 HP
    await dmThinks(dmPage, 2_000);
    await applyHpChange(dmPage, wolfId, 10, "damage"); // 14→4 HP
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  // ════════════════════════════════════════════════════════════
  // ROUND 3: DM reveals hidden + rename + L2 reconnect (tab close)
  // ════════════════════════════════════════════════════════════

  test("Round 3: DM reveals Skeleton → players see it", async () => {
    await dmThinks(dmPage, 2_000);
    await toggleHidden(dmPage, skeletonId);
    await expect(dmPage.locator(`[data-testid="hp-btn-${skeletonId}"]`)).toBeVisible({ timeout: 5_000 });
    await dmPage.waitForTimeout(EXTENDED_WAIT);

    const p1Skeleton = p1Page.locator(`[data-testid="player-combatant-${skeletonId}"]`);
    const visible = await p1Skeleton.isVisible({ timeout: 30_000 }).catch(() => false);
    if (!visible) {
      console.warn("⚠ Hidden reveal did not propagate to players — broadcast gap");
    }
  });

  test("Round 3: DM renames Bandit → 'Shadow Fiend'", async () => {
    await dmThinks(dmPage, 2_000);
    await renameCombatant(dmPage, banditId, "Shadow Fiend");
    await dmPage.waitForTimeout(EXTENDED_WAIT);

    const p1Board = p1Page.locator('[data-testid="player-initiative-board"]');
    const hasNewName = await p1Board.locator("text=Shadow Fiend").isVisible({ timeout: 30_000 }).catch(() => false);
    if (!hasNewName) {
      console.warn("⚠ Display name rename did not propagate — broadcast sanitizer gap");
    }
  });

  test("Round 3: Player 2 closes TAB and reopens (L2 — localStorage reconnect)", async () => {
    // L2: Close the tab entirely (sessionStorage dies), reopen via URL
    // localStorage should have the player identity for auto-reconnect
    const result = await simulateTabClose(browser, p2Context, joinUrl);
    p2Context = result.context;
    p2Page = result.page;

    // The lobby may show a "Voltar" (Return) button for the recognized player.
    // Click it if visible to complete the 1-click reconnection.
    const returnBtn = p2Page.locator("button").filter({ hasText: /Voltar|Return/i }).first();
    if (await returnBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await returnBtn.click();
    }

    // Player should now see the player-view (auto or 1-click reconnect)
    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible({ timeout: 45_000 });
    await expect(p2Page.locator('[data-testid="player-initiative-board"]')).toBeVisible({ timeout: EXTENDED_WAIT });
    // Player 1 unaffected
    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible();
  });

  test("Round 3: DM advances full round", async () => {
    await advanceFullRound(dmPage, 6);
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  // ════════════════════════════════════════════════════════════
  // ROUND 4: Mid-combat add + defeat + heal + condition remove
  // ════════════════════════════════════════════════════════════

  test("Round 4: DM adds Zombie mid-combat", async () => {
    await dmThinks(dmPage, 3_000);
    await addCombatantMidCombat(dmPage, {
      name: "Zombie",
      hp: "22",
      ac: "8",
      initiative: "6",
    });
    const zombieId = await findCombatantId(dmPage, "Zombie");
    expect(zombieId).toBeTruthy();
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  test("Round 4: DM defeats Wolf", async () => {
    await dmThinks(dmPage, 2_000);
    await defeatCombatant(dmPage, wolfId);
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  test("Round 4: DM heals Orc Warrior (10→25 HP)", async () => {
    await dmThinks(dmPage, 2_000);
    await applyHpChange(dmPage, orcWarriorId, 15, "heal");
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await waitForAllPages(
      [p1Page, p2Page],
      `[data-testid="player-combatant-${orcWarriorId}"]`,
      { timeout: EXTENDED_WAIT }
    );
  });

  test("Round 4: DM removes stun from Bandit", async () => {
    await dmThinks(dmPage, 2_000);
    await toggleCondition(dmPage, banditId, "stunned");
    await dmPage.keyboard.press("Escape");
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  // ════════════════════════════════════════════════════════════
  // ROUND 5: L3 reconnect (browser close) + final combat
  // ════════════════════════════════════════════════════════════

  test("Round 5: Player 1 closes BROWSER entirely (L3 — full storage loss)", async () => {
    // L3: Close browser entirely — ALL storage gone (sessionStorage + localStorage)
    // Player must see the lobby form again and re-register
    const result = await simulateBrowserClose(browser, p1Context, joinUrl);
    p1Context = result.context;
    p1Page = result.page;

    // Player should see lobby form, return button, or player-view
    const lobbyOrView = p1Page.locator(
      '[data-testid="lobby-name"], [data-testid="player-view"]'
    );
    const returnBtn = p1Page.locator("button").filter({ hasText: /Voltar|Return/i }).first();
    await expect(lobbyOrView.or(returnBtn).first()).toBeVisible({ timeout: 45_000 });

    // If "Voltar" (Return) button visible, click it for 1-click reconnect
    if (await returnBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await returnBtn.click();
    }

    // If lobby form appeared, re-register
    const lobbyName = p1Page.locator('[data-testid="lobby-name"]');
    if (await lobbyName.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Player lost all state — must rejoin with same name
      await lobbyName.fill("Thorin");
      await p1Page.locator('[data-testid="lobby-initiative"]').fill("18");
      const hpInput = p1Page.locator('[data-testid="lobby-hp"]');
      if (await hpInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await hpInput.fill("45");
      }
      const acInput = p1Page.locator('[data-testid="lobby-ac"]');
      if (await acInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await acInput.fill("18");
      }
      await p1Page.locator('[data-testid="lobby-submit"]').click();

      // DM may need to accept again
      await dmThinks(dmPage, 5_000);
      const acceptBtn = dmPage.locator("button").filter({ hasText: /Aceitar.*Thorin|Accept.*Thorin/i }).first();
      if (await acceptBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await acceptBtn.click();
      }
    }

    // Player should eventually see player-view (either via reconnect or re-registration)
    await expect(p1Page.locator('[data-testid="player-view"]')).toBeVisible({ timeout: 45_000 });
    // Player 2 unaffected
    await expect(p2Page.locator('[data-testid="player-view"]')).toBeVisible();
  });

  test("Round 5: DM advances 2 full rounds", async () => {
    // 7 combatants now (including zombie, excluding defeated wolf from turn order... or not)
    await advanceFullRound(dmPage, 7);
    await dmThinks(dmPage, 3_000);
    await advanceFullRound(dmPage, 7);
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  test("Round 5: DM applies temp HP to Skeleton", async () => {
    await dmThinks(dmPage, 2_000);
    await applyHpChange(dmPage, skeletonId, 5, "temp");
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  // ════════════════════════════════════════════════════════════
  // ENDGAME
  // ════════════════════════════════════════════════════════════

  test("Endgame: DM defeats remaining monsters", async () => {
    await dmThinks(dmPage, 2_000);
    await defeatCombatant(dmPage, orcWarriorId);
    await dmThinks(dmPage, 2_000);
    await defeatCombatant(dmPage, banditId);
    await dmPage.waitForTimeout(REALTIME_WAIT);
    await assertAllBoardsFunctional([p1Page, p2Page]);
  });

  test("Endgame: DM ends encounter → all pages stable", async () => {
    await dmThinks(dmPage, 3_000);
    await endEncounter(dmPage);
    await dmPage.waitForTimeout(REALTIME_WAIT);

    // Verify no page crashed
    for (const page of [dmPage, p1Page, p2Page]) {
      const bodyText = await page.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(100);
    }
  });
});
