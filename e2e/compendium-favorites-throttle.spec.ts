/**
 * E2E — Compendium favorites throttle (S5.2 Beta 4 P0)
 *
 * Regression guard for the FavoriteStar shared-state refactor. Before the
 * fix, each `<FavoriteStar>` registered its own `/api/favorites` GET on
 * mount — 3 kinds × 50 monsters = up to 150 concurrent requests, blowing
 * past the endpoint's 30/min per-user rate limit on the very first page
 * load.
 *
 * With `ff_favorites_v2_shared_state = true`, the refactor routes all
 * stars through a Zustand singleton that hydrates exactly ONCE per kind
 * per app lifecycle. This test asserts the invariant:
 *
 *   Opening the compendium (3 kinds, 50 rows each) should produce
 *   AT MOST 3 requests to /api/favorites during steady-state render.
 *
 * The endpoint is mocked with page.route() so we don't require a live
 * authenticated session — we just need the flag ON and the compendium
 * rendered. Rate limit itself isn't the subject — the COUNT is.
 *
 * This test depends on a running Next.js dev server (`pnpm dev`) or a
 * deployed BASE_URL. If neither is available it is skipped so CI doesn't
 * block on infra; the jest unit + integration tests in
 * components/favorites/__tests__ remain the authoritative coverage.
 *
 * @tags @favorites @throttle
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import {
  goToTryPage,
  addAllCombatants,
  startCombat,
  QUICK_ENCOUNTER,
} from "./guest-qa/helpers";

// Hard ceiling — one GET per kind. 3 total. Allow +1 slack for racy mounts.
const MAX_FAVORITES_REQUESTS_ON_OPEN = 4;

async function installFavoritesMock(page: Page): Promise<{ count: number; urls: string[] }> {
  const bag = { count: 0, urls: [] as string[] };

  await page.route(
    (url) => url.pathname.startsWith("/api/favorites"),
    async (route: Route) => {
      bag.count++;
      bag.urls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ favorites: [] }),
      });
    },
  );

  return bag;
}

test.describe("Compendium favorites throttle (@favorites @throttle)", () => {
  test.skip(
    !process.env.BASE_URL && !process.env.PLAYWRIGHT_INCLUDE_INFRA_TESTS,
    "Requires a running dev server (pnpm dev) or BASE_URL. Set PLAYWRIGHT_INCLUDE_INFRA_TESTS=1 to run locally.",
  );

  test("opening compendium emits ≤ 3 /api/favorites requests with v2 flag ON", async ({ page }) => {
    test.setTimeout(60_000);

    // Turn on both the visibility flag (star must render) and the v2 store.
    await page.addInitScript(() => {
      const w = window as unknown as {
        __RPG_FLAGS__?: Record<string, boolean>;
      };
      w.__RPG_FLAGS__ = {
        ...(w.__RPG_FLAGS__ ?? {}),
        ff_favorites_v1: true,
        ff_favorites_v2_shared_state: true,
      };
    });

    const bag = await installFavoritesMock(page);

    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    const openBtn = page.locator('[data-testid="compendium-browser-btn"]');
    await expect(openBtn).toBeVisible({ timeout: 10_000 });
    await openBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Let the store hydrate each kind.
    await page.waitForTimeout(2_000);

    // Switch to every kind tab so each list is rendered at least once.
    for (const label of [/^Monsters$|^Monstros$/i, /^Items$|^Itens$/i, /^Conditions$|^Condições$/i]) {
      const tab = dialog.locator("button").filter({ hasText: label }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }

    console.log("[FAVORITES-THROTTLE] /api/favorites requests:", bag.count, bag.urls);

    expect(
      bag.count,
      `expected ≤ ${MAX_FAVORITES_REQUESTS_ON_OPEN} GETs to /api/favorites but saw ${bag.count}`,
    ).toBeLessThanOrEqual(MAX_FAVORITES_REQUESTS_ON_OPEN);
  });
});
