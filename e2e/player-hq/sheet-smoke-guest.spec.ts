import { test, expect } from "@playwright/test";

/**
 * Player HQ — Guest smoke baseline (EP-INFRA.4, Sprint 1 Track B).
 *
 * Documents that `/try` (Guest combat at `app/try/page.tsx` driven by
 * `components/guest/GuestCombatClient.tsx`) does NOT host or link to the
 * Player HQ shell at `/app/campaigns/[id]/sheet`. Guest has no persistent
 * user → no `campaign_members` row → no character → no sheet.
 *
 * This is intentional per the Combat Parity Rule. See CLAUDE.md:
 *   "Data persistence features (ratings, notas, spell slots) → Auth-only,
 *    documentar no bucket"
 * The full Player HQ surface hits that rule hard — it IS a persistence
 * feature. Guest users can only play combat, not the HQ.
 *
 * Why a guest-focused baseline is valuable:
 *   1. Sprint 2 A6 (post-combat redirect) may add a "guest → /sheet?tab=
 *      heroi" upsell path (decision #43). This spec becomes the checkpoint
 *      where we validate that change is intentional.
 *   2. If a future refactor accidentally wires `/try` to load or link to
 *      `/sheet`, this spec fails with a clear pointer.
 *
 * Skip behavior: the test runs purely against `/try` with no auth, no
 * seed data, no share tokens. Should be stable across all environments.
 */

test.describe("Player HQ — Guest smoke (no /sheet on /try baseline)", () => {
  test.setTimeout(45_000);

  test("guest /try session has no PlayerHqShell tablist", async ({ page }) => {
    await page.goto("/try", { timeout: 30_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Just confirm /try actually loaded — skip if the landing redirected
    // us (e.g. middleware blocking in an odd env).
    if (!page.url().includes("/try")) {
      test.skip(true, `/try redirected to ${page.url()} — cannot run guest baseline`);
      return;
    }

    // PlayerHqShell uses `role="tablist"` for its 7-tab shell. If that
    // ever renders in /try, something is very wrong — guest has no user,
    // no campaign, no character.
    const playerHqTablist = page.locator('[role="tablist"]').filter({
      has: page.locator("#tab-map"),
    });
    await expect(playerHqTablist).toHaveCount(0);

    // And none of the individual V1 tab buttons should render in /try.
    for (const key of ["map", "sheet", "resources", "abilities", "inventory", "notes", "quests"]) {
      const tab = page.locator(`#tab-${key}`);
      await expect(tab, `#tab-${key} must NOT render in /try`).toHaveCount(0);
    }
  });

  test("guest /try never link-leaks to /sheet routes", async ({ page }) => {
    await page.goto("/try", { timeout: 30_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    if (!page.url().includes("/try")) {
      test.skip(true, `/try redirected to ${page.url()}`);
      return;
    }

    // Scan all anchor hrefs on /try for sheet routes. The guest surface
    // should offer sign-up/login CTAs, never deep links into the auth
    // Player HQ. If Sprint 2 A6 adds such a link, update this assertion
    // to the specific expected route (e.g. `/sheet?tab=heroi`) and keep
    // the negative check for anything else.
    const links = page.locator("a[href]");
    const count = await links.count();
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }

    const sheetLinks = hrefs.filter((h) => /\/app\/campaigns\/[^/]+\/sheet\b/.test(h));
    expect(sheetLinks, `/try must not link to /sheet — got: ${sheetLinks.join(", ")}`).toEqual([]);
  });
});
