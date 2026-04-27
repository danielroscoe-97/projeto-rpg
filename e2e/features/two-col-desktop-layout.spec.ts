/**
 * Gate Fase C — `two-col-desktop-layout` (P1, Auth).
 *
 * Wave 3a Story C3 — HeroiTab 2-col grid responsive contract (per
 * `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §6 row 22).
 *
 * Locks the breakpoint behavior of the new layout:
 *   - At ≥1280px (xl): `<div data-testid="heroi-2col-grid">` uses
 *     `grid-template-columns` with TWO tracks.
 *   - At <1280px: the same wrapper collapses to ONE track.
 *
 * The two columns expose `data-testid="heroi-col-a"` and
 * `data-testid="heroi-col-b"` so screen-reader walkthroughs + future
 * DOM-order tests have stable anchors.
 *
 * @tags @fase-c @c3 @two-col @v2-only @auth
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

async function gotoFirstCampaignSheet(page: Page): Promise<string | null> {
  await loginAs(page, PLAYER_WARRIOR).catch(() => {});
  await page
    .goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" })
    .catch(() => {});
  const links = page.locator('a[href^="/app/campaigns/"]');
  if ((await links.count()) === 0) return null;
  const href = await links.first().getAttribute("href");
  const match = href?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
  if (!match) return null;
  await page.goto(`/app/campaigns/${match[1]}/sheet?tab=heroi`, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  return match[1];
}

function trackCount(template: string): number {
  // `grid-template-columns` resolves to a space-separated list of track
  // sizes. e.g. `"560px 560px"` → 2; `"none"` (when not a grid) → 0;
  // `"auto"` (when a single track) → 1.
  if (!template || template === "none") return 0;
  const trimmed = template.trim();
  if (!trimmed) return 0;
  // Split on whitespace BUT respect parentheses (minmax/repeat etc.) so
  // we don't double-count the inner args.
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of trimmed) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (buf) parts.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf) parts.push(buf);
  return parts.length;
}

test.describe("Gate Fase C — HeroiTab 2-col layout (C3)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "C3 specs require NEXT_PUBLIC_PLAYER_HQ_V2=true (V2 4-tab shell)",
  );
  test.setTimeout(90_000);

  test("desktop ≥1280px renders 2 tracks", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const cid = await gotoFirstCampaignSheet(page);
    test.skip(!cid, "no seeded campaign");

    const grid = page.locator('[data-testid="heroi-2col-grid"]');
    await expect(grid).toBeVisible({ timeout: 15_000 });

    const cols = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    expect(trackCount(cols)).toBe(2);

    // Both columns are addressable.
    await expect(page.locator('[data-testid="heroi-col-a"]')).toBeVisible();
    await expect(page.locator('[data-testid="heroi-col-b"]')).toBeVisible();
  });

  test("tablet/mobile <1280px collapses to 1 track", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    const cid = await gotoFirstCampaignSheet(page);
    test.skip(!cid, "no seeded campaign");

    const grid = page.locator('[data-testid="heroi-2col-grid"]');
    await expect(grid).toBeVisible({ timeout: 15_000 });

    const cols = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    expect(trackCount(cols)).toBe(1);

    // Both columns still mount in DOM order — they just stack vertically.
    await expect(page.locator('[data-testid="heroi-col-a"]')).toBeVisible();
    await expect(page.locator('[data-testid="heroi-col-b"]')).toBeVisible();
  });
});
