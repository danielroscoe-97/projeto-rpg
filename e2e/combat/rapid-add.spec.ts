/**
 * S1.2 — Rapid combatant add regression test (beta 3 Finding 2).
 *
 * Lucas added 3 Velociraptors in a 6-second window during beta test 3 and
 * players saw a broken turn order. The root cause was a race between two
 * broadcast types (`combat:combatant_add` + `session:state_sync`) each
 * dispatched by two senders (`broadcastViaServer` + direct channel) — up to
 * 12 messages with partial FIFO per 3 adds.
 *
 * This spec verifies:
 *  1. With `ff_combatant_add_reorder=true` on both DM and player, 3 rapid
 *     adds produce a consistent initiative order on the player view.
 *  2. With the flag OFF (default) the legacy path still works
 *     (backwards-compat regression).
 *
 * Run:
 *   npx playwright test e2e/combat/rapid-add.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import {
  addCombatantMidCombat,
  playerSubmitJoin,
  dmAcceptPlayer,
} from "../helpers/multi-player";

/** Inject the feature-flag runtime override before any app code runs. */
async function setFlagOn(page: Page, key: string, value: boolean) {
  await page.addInitScript(
    ({ key, value }) => {
      const w = window as unknown as { __RPG_FLAGS__?: Record<string, boolean> };
      w.__RPG_FLAGS__ = { ...(w.__RPG_FLAGS__ ?? {}), [key]: value };
    },
    { key, value },
  );
}

/** Extract combatant names in player-view initiative order. */
async function getPlayerCombatantNames(playerPage: Page): Promise<string[]> {
  // Scope to the initiative board; match any entry with the `player-combatant-` testid.
  const board = playerPage.locator('[data-testid="player-initiative-board"]');
  await expect(board).toBeVisible({ timeout: 10_000 });
  const items = board.locator('[data-testid^="player-combatant-"]');
  const count = await items.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const row = items.nth(i);
    const text = (await row.textContent()) ?? "";
    names.push(text.trim());
  }
  return names;
}

test.describe("S1.2 — Rapid combatant add (beta3 Finding 2)", () => {
  test("3 Velociraptors added in <6s produce consistent order on player (flag ON)", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // DM context — flag ON.
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    await setFlagOn(dmPage, "ff_combatant_add_reorder", true);

    // Player context — flag ON (both sides need it for the new handler).
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await setFlagOn(playerPage, "ff_combatant_add_reorder", true);

    // 1. DM sets up a session with 1 combatant (hero, init 12).
    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "50", ac: "18", init: "12" },
    ]);
    expect(token).toBeTruthy();

    // 2. Player joins.
    await playerSubmitJoin(playerPage, token!, "TestPlayer", {
      initiative: "10",
      hp: "40",
      ac: "16",
    });
    await dmAcceptPlayer(dmPage, "TestPlayer");
    await expect(playerPage.locator('[data-testid="player-initiative-board"]')).toBeVisible({
      timeout: 20_000,
    });

    // 3. DM rapidly adds 3 Velociraptors in <6s with varied initiatives.
    // Initiatives: 20 (first), 14 (mid), 5 (last) — testing non-sorted insertion.
    //
    // B-5 FIX: the old spec waited 5s after all adds and asserted final order.
    // That tests "functionality" (does the player eventually converge?) NOT
    // the race condition — after 5s of quiesce, even the broken legacy path
    // converges via state_sync. The original bug was observed DURING the
    // transient window, not after quiesce.
    //
    // New approach:
    //   a) Capture the elapsed time as before (sanity check the window),
    //   b) Poll for the expected UI state with a SHORT timeout budget — if
    //      the feature is broken, the expected order never appears within
    //      the window; the legacy race would fail this assertion,
    //   c) No fixed `waitForTimeout(5_000)` — we use Playwright's `expect.poll`
    //      which is deterministic (stops as soon as condition is met).
    const t0 = Date.now();
    await addCombatantMidCombat(dmPage, {
      name: "Velociraptor A",
      hp: "10",
      ac: "13",
      initiative: "20",
    });
    await addCombatantMidCombat(dmPage, {
      name: "Velociraptor B",
      hp: "10",
      ac: "13",
      initiative: "14",
    });
    await addCombatantMidCombat(dmPage, {
      name: "Velociraptor C",
      hp: "10",
      ac: "13",
      initiative: "5",
    });
    const elapsed = Date.now() - t0;
    if (elapsed > 8_000) {
      console.warn(`[rapid-add] 3 adds took ${elapsed}ms — wider than the 6s target window`);
    }

    // 4. Poll for correct order deterministically. Budget 2s — enough for
    // broadcast delivery + React commit, but well below the 5s legacy-flush
    // window so the race condition can't silently converge past us.
    await expect
      .poll(
        async () => {
          const names = await getPlayerCombatantNames(playerPage);
          const vA = names.findIndex((n) => /Velociraptor A/i.test(n));
          const vB = names.findIndex((n) => /Velociraptor B/i.test(n));
          const vC = names.findIndex((n) => /Velociraptor C/i.test(n));
          // All three must be present AND ordered by initiative.
          if (vA < 0 || vB < 0 || vC < 0) return false;
          return vA < vB && vB < vC;
        },
        {
          timeout: 2_000,
          intervals: [100, 150, 250],
          message:
            "Expected Velociraptors A, B, C ordered by initiative within 2s — " +
            "likely a broadcast race / reducer regression.",
        },
      )
      .toBe(true);

    // Sanity: one more read to fail with a helpful diff if somehow poll succeeded
    // but state mutated.
    const names = await getPlayerCombatantNames(playerPage);
    const vA = names.findIndex((n) => /Velociraptor A/i.test(n));
    const vB = names.findIndex((n) => /Velociraptor B/i.test(n));
    const vC = names.findIndex((n) => /Velociraptor C/i.test(n));
    expect(vA).toBeGreaterThanOrEqual(0);
    expect(vB).toBeGreaterThanOrEqual(0);
    expect(vC).toBeGreaterThanOrEqual(0);
    expect(vA).toBeLessThan(vB);
    expect(vB).toBeLessThan(vC);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });

  test("legacy combatant_add + state_sync path still works when flag is OFF (backwards compat)", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // No setFlagOn call — flag is OFF on both sides (default).
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "50", ac: "18", init: "12" },
    ]);
    expect(token).toBeTruthy();

    await playerSubmitJoin(playerPage, token!, "TestPlayer2", {
      initiative: "10",
      hp: "40",
      ac: "16",
    });
    await dmAcceptPlayer(dmPage, "TestPlayer2");
    await expect(playerPage.locator('[data-testid="player-initiative-board"]')).toBeVisible({
      timeout: 20_000,
    });

    // Single add — the critical thing is that the LEGACY pair still reaches the player.
    await addCombatantMidCombat(dmPage, {
      name: "Goblin",
      hp: "7",
      ac: "13",
      initiative: "15",
    });

    // B-5: deterministic poll (2s budget) instead of fixed 5s wait.
    await expect
      .poll(
        async () => {
          const names = await getPlayerCombatantNames(playerPage);
          return names.some((n) => /Goblin/i.test(n));
        },
        {
          timeout: 2_000,
          intervals: [100, 150, 250],
          message: "Expected Goblin to appear on player view within 2s (flag OFF path).",
        },
      )
      .toBe(true);

    await dmContext.close().catch(() => {});
    await playerContext.close().catch(() => {});
  });
});
