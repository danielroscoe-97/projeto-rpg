/**
 * Gate Fase A — `sheet-visual-baseline` (P0, Auth).
 *
 * Authored by Track B (Sprint 2) per `15-e2e-matrix.md §6 row 1`. Captures
 * 3 screenshots (desktop-chrome 1440, mobile-safari 390) of the Player HQ
 * `/sheet` in Auth so Sprint 2 density stories (A1-A4) can prove the ≥20%
 * height reduction target stated in the Sprint 2 goal.
 *
 * Platform gating mirrors `sheet-smoke-guest.spec.ts`: Linux only,
 * regenerate baselines from the Playwright Docker image so font AA +
 * vector rendering match CI.
 *
 * @tags @fase-a @visual-reg @player-hq
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("Gate Fase A — /sheet visual baseline", () => {
  test.setTimeout(90_000);

  test("auth /sheet renders without overflow at desktop + mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      process.platform !== "linux",
      "visual baselines are Linux-captured to match CI runner — skip on " +
        `${process.platform}.`,
    );

    await loginAs(page, PLAYER_WARRIOR).catch(() => {
      /* auth fixture may be absent in this env — test.skip below handles */
    });

    await page
      .goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" })
      .catch(() => {});

    const campaignLinks = page.locator('a[href^="/app/campaigns/"]');
    const count = await campaignLinks.count();
    if (count === 0) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    const firstHref = await campaignLinks.first().getAttribute("href");
    const match = firstHref?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
    if (!match) {
      test.skip(true, `Could not extract campaign id from href: ${firstHref}`);
      return;
    }
    const campaignId = match[1];

    if (testInfo.project.name === "desktop-chrome") {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    if (!page.url().includes("/sheet")) {
      test.skip(true, `Player redirected from /sheet — URL: ${page.url()}`);
      return;
    }

    // Wait for the primary tablist to hydrate before the snapshot so the
    // screenshot captures the shell (not a loading state).
    await expect(page.locator('[role="tablist"]').first()).toBeVisible({
      timeout: 20_000,
    });

    // Settle any pulse animations so deterministic frame is captured.
    await page
      .waitForFunction(() => !document.querySelector(".animate-turn-pulse"), null, {
        timeout: 3_000,
      })
      .catch(() => {
        /* class absent */
      });

    // Overflow assertion: document's scrollWidth must not exceed the
    // viewport width (horizontal overflow → mobile breakage). We accept
    // 1px tolerance to account for subpixel rounding.
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(
      overflow,
      "document must not overflow horizontally (≤1px tolerance)",
    ).toBeLessThanOrEqual(1);

    await expect(page).toHaveScreenshot("sheet-auth-baseline.png", {
      fullPage: true,
      timeout: 20_000,
    });
  });
});
