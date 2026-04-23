import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

/**
 * Player HQ — Auth smoke baseline (EP-INFRA.4, Sprint 1 Track B).
 *
 * Pre-refactor baseline for the 7-tab Player HQ shell at
 * `/app/campaigns/[id]/sheet`. Captures the current V1 behavior so
 * Sprint 2+ can detect regressions once `NEXT_PUBLIC_PLAYER_HQ_V2`
 * starts gating a new 4-tab shell (Herói / Arsenal / Diário / Mapa).
 *
 * What this spec DOES assert:
 *   - `/app/campaigns/[id]/sheet` is reachable after player login
 *   - Tab list is rendered with `role="tablist"`
 *   - All 7 V1 tab buttons (map/sheet/resources/abilities/inventory/notes/
 *     quests) render, each with `role="tab"` and id `tab-{key}`
 *   - Default active tab is `map` (Tab state in PlayerHqShell.tsx:129)
 *   - A screenshot is captured for visual-regression baseline later
 *
 * What this spec does NOT assert (intentional — see e2e/player-hq/README.md):
 *   - Tab switching interaction (reserved for Sprint 2 B4/B5 stories)
 *   - Content correctness inside each tab (owned by active-effects /
 *     j21-player-ui-panels / j19-player-combat-actions)
 *   - Feature-flag gating (no call sites yet)
 *
 * Skip behavior: if the player account has no character seeded for any
 * campaign in the current environment, the spec emits `test.skip` with
 * a clear message rather than failing. This keeps CI green on fresh
 * deploys where the test-account fixtures aren't yet seeded.
 */

const TAB_KEYS = [
  "map",
  "sheet",
  "resources",
  "abilities",
  "inventory",
  "notes",
  "quests",
] as const;

test.describe("Player HQ — Auth smoke (7-tab shell baseline)", () => {
  test.setTimeout(90_000);

  test("authenticated player lands on /sheet with 7 tabs rendered", async ({ page }) => {
    await loginAs(page, PLAYER_WARRIOR);

    // Find a campaign the player is a member of. The dashboard lists
    // campaigns as links to /app/campaigns/[id].
    await page.goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    const campaignLinks = page.locator('a[href^="/app/campaigns/"]');
    const count = await campaignLinks.count();
    if (count === 0) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR in this environment");
      return;
    }

    // Extract campaign id from the first link. The sheet route is
    // `/app/campaigns/{id}/sheet` — navigate there directly.
    const firstHref = await campaignLinks.first().getAttribute("href");
    expect(firstHref).toBeTruthy();
    const match = firstHref?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
    if (!match) {
      test.skip(true, `Could not extract campaign id from href: ${firstHref}`);
      return;
    }
    const campaignId = match[1];

    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");

    // Sheet server component redirects when the user isn't a player with a
    // seeded character. If that happens, skip — we don't want to fail
    // baseline tests in environments missing test seed data.
    if (!page.url().includes("/sheet")) {
      test.skip(true, `Player redirected from /sheet — URL: ${page.url()}`);
      return;
    }

    // Tab list is the foundational assertion. If this fails, the shell is
    // broken — which is exactly what we want baseline tests to catch.
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible({ timeout: 15_000 });

    // All 7 V1 tabs exist by id — if any of these disappear silently during
    // the refactor, the diff from baseline will flag it before merge.
    for (const key of TAB_KEYS) {
      const tab = page.locator(`#tab-${key}`);
      await expect(tab, `tab-${key} should be rendered in the V1 shell`).toBeVisible({
        timeout: 5_000,
      });
      await expect(tab).toHaveAttribute("role", "tab");
    }

    // Default activeTab is `map` per PlayerHqShell.tsx:129 (`useState<Tab>("map")`).
    // Note: this default MAY change in Sprint 2 B4 — the baseline will force
    // an explicit decision about whether the change is intentional.
    const mapTab = page.locator("#tab-map");
    await expect(mapTab).toHaveAttribute("aria-selected", "true");

    // Baseline screenshot for visual-regression once Sprint 2 starts
    // producing post-refactor snapshots. Name prefix `pre-refactor-` makes
    // the before/after comparison obvious in code review.
    await page.screenshot({
      path: "e2e/results/pre-refactor-sheet-auth-baseline.png",
      fullPage: true,
    });
  });
});
