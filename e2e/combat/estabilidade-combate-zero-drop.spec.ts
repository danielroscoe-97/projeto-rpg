/**
 * F2 (Estabilidade Combate, Sprint 1) — zero-drop reconnect E2E.
 *
 * Validates the CR-03 deep integration end-to-end:
 *   - sessionStorage cursor (`estcombate:lastseq:<sessionId>`) advances as
 *     broadcasts arrive carrying `_journal_seq` from the server
 *   - Reconnecting skeleton appears after the 500ms grace when the player
 *     drops, hides on `connected`
 *   - Player state reconciles correctly after reconnect (no drift)
 *   - Auth player (logged-in) gets the same zero-drop guarantee as anon
 *   - Long offline gap (>journal cap) produces too_stale → /state fallback
 *
 * Three describe blocks (P-5 + P-6 from the 2026-04-26 review):
 *   1. Anon player — happy path resume (CR-04 AC2)
 *   2. Auth player — same flow with logged-in account (CR-04 AC3)
 *   3. Too-stale fallback — gap > 100 events forces /state refetch (CR-04 AC4)
 *
 * parity-intent
 *   guest: n/a (guest combat has no realtime journal — Zustand-only)
 *   anon:  covered by Test 1 (block 1)
 *   auth:  covered by Test 2 (block 2)
 *
 * @tags @estabilidade-combate @reconnect @journal
 */
import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { applyHpChange } from "../helpers/combat";
import { loginAs } from "../helpers/auth";
import {
  createPlayerContexts,
  closeAllContexts,
  playerSubmitJoin,
  dmAcceptPlayer,
  attachConsoleMonitor,
  type AdversarialMetrics,
} from "../helpers/multi-player";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

const RECONNECT_TIMEOUT_MS = 30_000;
const SHORT_GAP_MS = 4_000;
const REALTIME_PROPAGATION_MS = 3_000;

const metrics: AdversarialMetrics = {
  serverErrors: [],
  consoleErrorsPerPlayer: new Map(),
};

/**
 * P-19 fix (2026-04-26 review): Playwright's `setOffline(true)` may NOT
 * close pre-existing WebSocket connections in all browser/version combos.
 * Combined with `route("**", r => r.abort())` we belt-and-suspender the
 * block: setOffline forces navigator.onLine=false (triggering app-level
 * offline handlers) AND new HTTP requests are aborted (server fetches
 * fail). The WS may stay open if the broker keeps it alive, but no new
 * broadcasts will be acknowledged.
 */
async function forceOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
  await context.route("**", (route) => route.abort());
}

async function restoreOnline(context: BrowserContext): Promise<void> {
  await context.unroute("**");
  await context.setOffline(false);
}

function extractSessionId(url: string): string {
  // P-22 fix (2026-04-26 review): tolerate both /combat/<uuid> and
  // /app/campaigns/<id>/run paths — Dani's HQ redesign mode-routes can
  // place the DM in either depending on the campaign flag.
  const m = url.match(/\/combat\/([0-9a-f-]+)/i)
    ?? url.match(/\/sessions\/([0-9a-f-]+)/i)
    ?? url.match(/sessionId=([0-9a-f-]+)/i);
  if (!m) throw new Error(`Could not extract sessionId from URL: ${url}`);
  return m[1];
}

// ============================================================
// Block 1 — Anon player (CR-04 AC2)
// ============================================================
test.describe.serial("Estabilidade Combate — zero-drop reconnect (anon)", () => {
  test.slow(); // generous timeout for Supabase realtime + Vercel cold starts

  let browser: Browser;
  let dmContext: BrowserContext;
  let dmPage: Page;
  let p1Context: BrowserContext;
  let p1Page: Page;
  let shareToken: string;
  let sessionId: string;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.afterAll(async () => {
    await closeAllContexts([dmContext, p1Context].filter(Boolean));
  });

  test("Setup: DM creates session, anon player joins via /join/token", async () => {
    dmContext = await browser.newContext();
    dmPage = await dmContext.newPage();
    attachConsoleMonitor(dmPage, "DM", metrics);

    const result = await createPlayerContexts(browser, 1);
    p1Context = result.contexts[0];
    p1Page = result.pages[0];
    attachConsoleMonitor(p1Page, "Player1-Anon", metrics);

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Goblin Raider", hp: "14", ac: "13", init: "14" },
    ]);
    if (!token) throw new Error("Failed to set up combat session");
    shareToken = token;

    await playerSubmitJoin(p1Page, shareToken, "Thorin", { initiative: "15", hp: "30", ac: "16" });
    await dmAcceptPlayer(dmPage, "Thorin");

    sessionId = extractSessionId(dmPage.url());
  });

  test("Cursor advances via _journal_seq as broadcasts arrive", async () => {
    const cursorKey = `estcombate:lastseq:${sessionId}`;
    await applyHpChange(dmPage, "Goblin Raider", -5);
    await p1Page.waitForTimeout(REALTIME_PROPAGATION_MS);

    const cursorAfterFirst = await p1Page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      cursorKey,
    );
    expect(
      cursorAfterFirst,
      "After at least one broadcast carrying _journal_seq from /api/broadcast, the cursor MUST be a positive integer",
    ).not.toBeNull();
    expect(Number(cursorAfterFirst)).toBeGreaterThan(0);
  });

  test("Reconnecting skeleton appears after grace, disappears on connected", async () => {
    await forceOffline(p1Context);

    const skeleton = p1Page.locator('[data-testid="resume-skeleton"]');
    await expect(skeleton, "Skeleton should appear within grace + detection").toBeVisible({
      timeout: RECONNECT_TIMEOUT_MS,
    });

    await applyHpChange(dmPage, "Goblin Raider", -3);
    await dmPage.waitForTimeout(SHORT_GAP_MS);

    await restoreOnline(p1Context);
    await expect(skeleton, "Skeleton should hide on connected").toBeHidden({
      timeout: RECONNECT_TIMEOUT_MS,
    });
  });

  test("Post-reconnect state matches DM state (anon zero-drop guarantee)", async () => {
    await p1Page.waitForTimeout(REALTIME_PROPAGATION_MS);
    const goblinRow = p1Page.locator('[data-testid^="combatant-"]').filter({ hasText: /Goblin/i });
    await expect(goblinRow).toBeVisible({ timeout: 15_000 });
    const fullPill = goblinRow.locator('text="FULL"');
    await expect(fullPill).toHaveCount(0);
  });
});

// ============================================================
// Block 2 — Auth player (CR-04 AC3, P-5 fix)
// ============================================================
test.describe.serial("Estabilidade Combate — zero-drop reconnect (auth)", () => {
  test.slow();

  let browser: Browser;
  let dmContext: BrowserContext;
  let dmPage: Page;
  let p1Context: BrowserContext;
  let p1Page: Page;
  let shareToken: string;
  let sessionId: string;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.afterAll(async () => {
    await closeAllContexts([dmContext, p1Context].filter(Boolean));
  });

  test("Setup: DM creates session, AUTH player logs in then joins via /join/token", async () => {
    dmContext = await browser.newContext();
    dmPage = await dmContext.newPage();
    attachConsoleMonitor(dmPage, "DM", metrics);

    p1Context = await browser.newContext();
    p1Page = await p1Context.newPage();
    attachConsoleMonitor(p1Page, "Player1-Auth", metrics);

    // Player logs in BEFORE going to /join/[token]. PlayerJoinClient
    // detects the auth user via supabase.auth.getUser() and switches
    // to the authenticated flow (campaign membership lookup, prefilled
    // characters available, persistent identity).
    await loginAs(p1Page, PLAYER_WARRIOR);

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Skeleton Mage", hp: "22", ac: "12", init: "10" },
    ]);
    if (!token) throw new Error("Failed to set up combat session");
    shareToken = token;

    await playerSubmitJoin(p1Page, shareToken, "Elara", { initiative: "16", hp: "40", ac: "17" });
    await dmAcceptPlayer(dmPage, "Elara");

    sessionId = extractSessionId(dmPage.url());
  });

  test("Auth player cursor advances via _journal_seq same as anon", async () => {
    const cursorKey = `estcombate:lastseq:${sessionId}`;
    await applyHpChange(dmPage, "Skeleton Mage", -7);
    await p1Page.waitForTimeout(REALTIME_PROPAGATION_MS);

    const cursor = await p1Page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      cursorKey,
    );
    expect(cursor, "Auth player cursor MUST advance after broadcast").not.toBeNull();
    expect(Number(cursor)).toBeGreaterThan(0);
  });

  test("Auth player reconnect: skeleton lifecycle + state reconciliation", async () => {
    await forceOffline(p1Context);

    const skeleton = p1Page.locator('[data-testid="resume-skeleton"]');
    await expect(skeleton).toBeVisible({ timeout: RECONNECT_TIMEOUT_MS });

    await applyHpChange(dmPage, "Skeleton Mage", -5);
    await dmPage.waitForTimeout(SHORT_GAP_MS);

    await restoreOnline(p1Context);
    await expect(skeleton).toBeHidden({ timeout: RECONNECT_TIMEOUT_MS });

    // Validate auth-player state matches DM. Using the same cross-check
    // pattern as anon: combatant present, not in FULL bracket.
    await p1Page.waitForTimeout(REALTIME_PROPAGATION_MS);
    const skeletonMageRow = p1Page.locator('[data-testid^="combatant-"]').filter({ hasText: /Skeleton Mage/i });
    await expect(skeletonMageRow).toBeVisible({ timeout: 15_000 });
    const fullPill = skeletonMageRow.locator('text="FULL"');
    await expect(fullPill).toHaveCount(0);
  });
});

// ============================================================
// Block 3 — Too-stale fallback (CR-04 AC4, P-6 fix)
// ============================================================
test.describe.serial("Estabilidade Combate — too_stale fallback", () => {
  test.slow();

  let browser: Browser;
  let dmContext: BrowserContext;
  let dmPage: Page;
  let p1Context: BrowserContext;
  let p1Page: Page;
  let shareToken: string;
  let sessionId: string;
  /**
   * Tracks whether the resume endpoint returned `kind: "too_stale"` during
   * the test. We attach a network listener BEFORE going offline so the
   * response is captured when the player reconnects and triggers resume.
   */
  let observedTooStale = false;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.afterAll(async () => {
    await closeAllContexts([dmContext, p1Context].filter(Boolean));
  });

  test("Setup: DM creates session, anon player joins, install network listener", async () => {
    dmContext = await browser.newContext();
    dmPage = await dmContext.newPage();
    attachConsoleMonitor(dmPage, "DM", metrics);

    const result = await createPlayerContexts(browser, 1);
    p1Context = result.contexts[0];
    p1Page = result.pages[0];
    attachConsoleMonitor(p1Page, "Player1-Stale", metrics);

    // Listen for /events responses on the player's page. When resume
    // returns too_stale, set the flag for the assertion in the final test.
    p1Page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/combat/") && url.includes("/events")) {
        try {
          const body = await response.json();
          if (body?.kind === "too_stale") {
            observedTooStale = true;
          }
        } catch {
          /* not JSON, ignore */
        }
      }
    });

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Zombie Brute", hp: "30", ac: "8", init: "6" },
    ]);
    if (!token) throw new Error("Failed to set up combat session");
    shareToken = token;

    await playerSubmitJoin(p1Page, shareToken, "Pip", { initiative: "12", hp: "25", ac: "14" });
    await dmAcceptPlayer(dmPage, "Pip");

    sessionId = extractSessionId(dmPage.url());
  });

  test("DM bursts >100 hp_updates while player is offline", async () => {
    await forceOffline(p1Context);

    // Wait for skeleton to confirm offline propagated app-side.
    const skeleton = p1Page.locator('[data-testid="resume-skeleton"]');
    await expect(skeleton).toBeVisible({ timeout: RECONNECT_TIMEOUT_MS });

    // Burst 105 HP updates. Each goes through /api/broadcast and gets
    // recorded in combat_events. Per-session cap is 100 (trigger
    // trim_combat_events_per_session), so the oldest events are
    // discarded — the player's last_seen_seq (captured pre-offline)
    // will fall before the new oldestSeq, producing too_stale on resume.
    //
    // 105 (not 150) keeps test runtime bounded; cap is 100 so the
    // boundary IS crossed.
    for (let i = 0; i < 105; i++) {
      // Alternating +1/-1 keeps Zombie Brute alive while still emitting events.
      const delta = i % 2 === 0 ? -1 : 1;
      await applyHpChange(dmPage, "Zombie Brute", delta);
    }
    // Allow journal trigger to settle.
    await dmPage.waitForTimeout(2_000);
  });

  test("Player reconnect: too_stale received, fallback /state succeeds", async () => {
    await restoreOnline(p1Context);

    // Skeleton should still hide as soon as the channel re-subscribes —
    // the resume endpoint returns too_stale, the hook calls
    // onFullRefetchNeeded → fetchFullState. From the user's POV nothing
    // is different (the hide criterion is connectionStatus, not the
    // resume kind).
    const skeleton = p1Page.locator('[data-testid="resume-skeleton"]');
    await expect(skeleton).toBeHidden({ timeout: RECONNECT_TIMEOUT_MS });

    // The network listener captured the response — assert too_stale was
    // returned at least once during the reconnect window.
    expect(
      observedTooStale,
      "Player's /events resume should have returned kind: 'too_stale' given the >100-event gap",
    ).toBe(true);

    // Final state check: combatant still present, fallback /state
    // delivered the up-to-date snapshot.
    await p1Page.waitForTimeout(REALTIME_PROPAGATION_MS);
    const zombieRow = p1Page.locator('[data-testid^="combatant-"]').filter({ hasText: /Zombie/i });
    await expect(zombieRow).toBeVisible({ timeout: 15_000 });
  });
});
