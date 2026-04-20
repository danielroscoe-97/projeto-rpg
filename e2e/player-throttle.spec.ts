/**
 * E2E — Fetch orchestrator throttle (C2 / Beta 4 fix)
 *
 * Verifies the invariant that a burst of visibility-change events on the
 * player page does NOT translate into a proportional burst of network
 * requests to /api/session/[id]/state. The regression guarded against is
 * the 2026-04-17 beta 3 429 storm (90 × 429 in 2min), where a combination
 * of bypassed orchestrator call sites and multi-tab amplification overran
 * the endpoint's rate-limit.
 *
 * Scope (deliberately narrow):
 * - Each tab (page) exercises the REAL PlayerJoinClient code path via a
 *   mocked session endpoint (page.route). The orchestrator runs unmodified.
 * - Asserts: within any single tab, 10 rapid visibilitychange:visible
 *   events produce AT MOST ~2 /state requests in a 5s window (1 for the
 *   first event, 0 more until the orchestrator's "high" 2s interval
 *   elapses, so at most a second one if timing edges line up).
 * - Asserts: 4 tabs running the burst concurrently produce at most
 *   N * max_per_tab requests total — i.e. no cross-tab amplification.
 *
 * This test depends on a running Next.js dev server (`pnpm dev`) or a
 * deployed BASE_URL. If neither is available it is skipped with a clear
 * message so CI doesn't block on infra setup. In that mode the unit and
 * integration tests in lib/realtime/__tests__/ remain the authoritative
 * coverage for the orchestrator's contract.
 *
 * Ref: docs/spec-fetch-orchestrator-audit.md § Testes / E2E
 *
 * Run: npx playwright test e2e/player-throttle.spec.ts
 *
 * @tags @orchestrator @throttle
 */
import { test, expect, type Page, type BrowserContext, type Route } from "@playwright/test";

// How many tabs to simulate in the multi-tab burst. Spec calls for 4.
const TAB_COUNT = 4;

// Number of visibility-change events to fire per tab in one burst.
const BURST_SIZE = 10;

// Orchestrator's "high" priority min-interval is 2s. Give 5s to catch any
// stragglers (retries, queued emergencies).
const POST_BURST_SETTLE_MS = 5_000;

// Expected per-tab ceiling: the orchestrator collapses the burst via in-flight
// coalescing (1 request) and the post-coalesce ask (1 more once the in-flight
// resolves, if throttle window has passed). Allow 3 as a defensive upper bound
// to absorb retries from transient routing timing.
const MAX_REQUESTS_PER_TAB_IN_WINDOW = 3;

/**
 * Fake session token + encounter id. The test mocks the join flow with
 * page.route() so no real Supabase state is created.
 */
const TEST_TOKEN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TEST_SESSION_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

/**
 * Standard mocked /state payload. The encounter is_active=false so the
 * client stays in lobby mode (no heavy combat UI to render).
 */
function makeStatePayload() {
  return {
    data: {
      encounter: {
        id: TEST_SESSION_ID,
        is_active: false,
        round_number: 1,
        current_turn_index: 0,
      },
      combatants: [],
      token_owner: "test-user-anon",
      dm_last_seen_at: new Date().toISOString(),
      lobby_players: [],
    },
  };
}

/**
 * Register all the routes needed for a basic /join flow to render, mocked.
 * Counts /state requests into the provided counter and exposes them via the
 * returned helper.
 */
async function installMocks(context: BrowserContext): Promise<{
  stateRequests: number;
  history: Array<{ url: string; at: number }>;
}> {
  const bag = { stateRequests: 0, history: [] as Array<{ url: string; at: number }> };

  // /state — the hot endpoint we care about. Matches both `.../state` and
  // `.../state?token_id=…` variants. Prefer a URL predicate over a regex to
  // sidestep ReDoS linter flags.
  await context.route(
    (url) => /\/api\/session\/[^/]+\/state$/.test(url.pathname),
    async (route: Route) => {
      bag.stateRequests++;
      bag.history.push({ url: route.request().url(), at: Date.now() });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeStatePayload()),
      });
    },
  );

  // /dm-presence — also mocked so the polling loop doesn't 404.
  await context.route(
    (url) => /\/api\/session\/[^/]+\/dm-presence$/.test(url.pathname),
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ dm_last_seen_at: new Date().toISOString() }),
      });
    },
  );

  // /latest-recap — rarely hit, mock empty.
  await context.route(
    (url) => /\/api\/session\/[^/]+\/latest-recap$/.test(url.pathname),
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: null }),
      });
    },
  );

  return bag;
}

/**
 * Fire `count` synthetic visibilitychange events on the page. Each cycle
 * is a hidden→visible pair so the "visible" handler (the one that issues
 * the token-ownership check) fires exactly `count` times.
 */
async function burstVisibility(page: Page, count: number): Promise<void> {
  await page.evaluate((n: number) => {
    for (let i = 0; i < n; i++) {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });
      Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });
      Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }
  }, count);
}

test.describe("Fetch orchestrator — multi-tab visibility burst throttle (@orchestrator)", () => {
  test.skip(
    !process.env.BASE_URL && !process.env.PLAYWRIGHT_INCLUDE_INFRA_TESTS,
    "Requires a running dev server (pnpm dev) or BASE_URL. Set PLAYWRIGHT_INCLUDE_INFRA_TESTS=1 to run locally.",
  );

  test(`${TAB_COUNT} tabs × ${BURST_SIZE}-event burst stays under per-tab ceiling`, async ({ browser }) => {
    test.setTimeout(60_000);

    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const mockBags: Array<{ stateRequests: number; history: Array<{ url: string; at: number }> }> = [];

    try {
      for (let i = 0; i < TAB_COUNT; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const bag = await installMocks(context);
        mockBags.push(bag);

        const page = await context.newPage();
        pages.push(page);

        // Navigate directly to /join/[token]. PlayerJoinClient boots, hits
        // the mocked /state, and settles into lobby mode. We don't need to
        // actually submit the join form — the orchestrator is already wired
        // up after initial mount, and the visibility-change handler is
        // installed regardless of registered state.
        await page.goto(`/join/${TEST_TOKEN}`, { waitUntil: "domcontentloaded" });

        // Give the initial mount a moment to settle (orchestrator constructs,
        // initial /state fetch fires). The exact count doesn't matter — we
        // snapshot the baseline just before the burst below.
        await page.waitForTimeout(1_000);
      }

      // Snapshot pre-burst counts.
      const beforeCounts = mockBags.map((b) => b.stateRequests);

      // Fire the burst on every tab in the same event-loop tick.
      await Promise.all(pages.map((p) => burstVisibility(p, BURST_SIZE)));

      // Let in-flight requests + the orchestrator's 2s throttle window settle.
      await new Promise((r) => setTimeout(r, POST_BURST_SETTLE_MS));

      const afterCounts = mockBags.map((b) => b.stateRequests);
      const burstCounts = afterCounts.map((after, i) => after - beforeCounts[i]);

      console.log(
        "[ORCHESTRATOR-THROTTLE] Per-tab burst counts:",
        burstCounts,
        "(max allowed per tab:",
        MAX_REQUESTS_PER_TAB_IN_WINDOW,
        ")",
      );

      // ASSERTION (b): each tab stays under the throttle ceiling.
      for (let i = 0; i < TAB_COUNT; i++) {
        expect(
          burstCounts[i],
          `tab ${i} exceeded max requests in 5s window`,
        ).toBeLessThanOrEqual(MAX_REQUESTS_PER_TAB_IN_WINDOW);
      }

      // ASSERTION (a): total across all tabs is bounded — no cross-tab
      // amplification. In the worst case a naive client would emit
      // TAB_COUNT * BURST_SIZE = 40 requests; the orchestrator holds
      // each tab to MAX_REQUESTS_PER_TAB_IN_WINDOW.
      const total = burstCounts.reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(TAB_COUNT * MAX_REQUESTS_PER_TAB_IN_WINDOW);
    } finally {
      for (const ctx of contexts) {
        await ctx.close().catch(() => {});
      }
    }
  });
});
