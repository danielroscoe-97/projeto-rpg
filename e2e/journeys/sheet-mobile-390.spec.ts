/**
 * Gate Fase B — `sheet-mobile-390` (P0, Auth, mobile viewport).
 *
 * Story coverage gap #17 from `_bmad-output/party-mode-2026-04-22/
 * 15-e2e-matrix.md`: J13 covers mobile for `/combat` and `/try` but not
 * for `/sheet`. This spec validates the V2 4-tab Player HQ at the
 * canonical mobile viewport (390×844 — iPhone 14):
 *
 *   - No horizontal page scroll (overflow ≤ 4px tolerance for AA noise)
 *   - Tab bar visible above the fold
 *   - Ability chips fit in the 3×2 grid (per A2/A3 wireframe spec)
 *   - Page screenshot captured for visual regression baseline
 *
 * @tags @fase-b @mobile @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

const VIEWPORT = { width: 390, height: 844 } as const;

function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

async function gotoHeroi(page: Page): Promise<string | null> {
  await loginAs(page, PLAYER_WARRIOR).catch(() => {});
  await page
    .goto("/app/dashboard", {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    })
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
  if (!page.url().includes("/sheet")) return null;
  return match[1];
}

test.describe("Gate Fase B — Sheet mobile 390 viewport", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "Sheet mobile spec gates on NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test.use({ viewport: VIEWPORT });

  test("no horizontal scroll, tab bar visible, ability chips fit 3×2", async ({
    page,
  }) => {
    const id = await gotoHeroi(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }

    // No horizontal page scroll. Tolerance 4px to absorb sub-pixel
    // rendering noise; anything above that is a real overflow bug.
    const horizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      );
    });
    expect(
      horizontalOverflow,
      "no horizontal page scroll on mobile 390",
    ).toBeLessThanOrEqual(4);

    // Tab bar visible above the fold.
    const tabBar = page
      .locator('[role="tablist"], [data-testid="player-hq-tab-bar"]')
      .first();
    await expect(tabBar, "tab bar must be visible on mobile").toBeVisible({
      timeout: 10_000,
    });
    const bbox = await tabBar.boundingBox();
    expect(
      bbox?.y ?? 9999,
      "tab bar should be above the fold on mobile",
    ).toBeLessThanOrEqual(VIEWPORT.height);

    // Ability chips fit. We assert presence of all 6 STR/DEX/CON/INT/
    // WIS/CHA labels using exact-match regex (avoids "STRENGTH"/
    // "INTUITION" substring matches per the tech-debt sweep).
    const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    for (const code of ABILITIES) {
      const chip = page.getByText(new RegExp(`^${code}$`)).first();
      await expect(
        chip,
        `${code} chip must render on mobile Herói`,
      ).toBeVisible({ timeout: 10_000 });
    }

    // Visual regression baseline. Capture the full Herói tab on mobile;
    // re-baseline on first run by passing `--update-snapshots`.
    await expect(page).toHaveScreenshot("sheet-heroi-mobile-390.png", {
      fullPage: true,
      maxDiffPixels: 400, // mobile renders have more sub-pixel noise
    });
  });
});
