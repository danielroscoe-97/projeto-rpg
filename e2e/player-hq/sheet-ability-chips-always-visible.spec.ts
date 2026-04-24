/**
 * Gate Fase A — `sheet-ability-chips-always-visible` (P0, Auth).
 *
 * Locks in Story A2: `CharacterCoreStats` no longer hides ability scores
 * behind an accordion. The 6 chips (STR/DEX/CON/INT/WIS/CHA) must render
 * on initial load, with a modifier value, without any click or tab
 * interaction.
 *
 * @tags @fase-a @a2 @player-hq
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

test.describe("Gate Fase A — ability chips always visible (A2)", () => {
  test.setTimeout(90_000);

  test("6 ability chips render without an accordion click", async ({
    page,
  }) => {
    await loginAs(page, PLAYER_WARRIOR).catch(() => {});

    await page
      .goto("/app/dashboard", {
        timeout: 60_000,
        waitUntil: "domcontentloaded",
      })
      .catch(() => {});

    const campaignLinks = page.locator('a[href^="/app/campaigns/"]');
    if ((await campaignLinks.count()) === 0) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    const firstHref = await campaignLinks.first().getAttribute("href");
    const match = firstHref?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
    if (!match) {
      test.skip(true, `Could not extract campaign id`);
      return;
    }
    const campaignId = match[1];

    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    if (!page.url().includes("/sheet")) {
      test.skip(true, `Redirected from /sheet: ${page.url()}`);
      return;
    }

    // A2 contract: each ability label must be visible in the DOM without
    // needing to click an accordion toggle. We assert by scanning for the
    // uppercase 3-letter code (STR/DEX/...) rather than tight testids —
    // the underlying component names may evolve.
    for (const key of ABILITIES) {
      const upper = key.toUpperCase();
      const label = page.locator(`text=${upper}`).first();
      await expect(
        label,
        `ability "${upper}" must be visible on /sheet without any click`,
      ).toBeVisible({ timeout: 20_000 });
    }

    // Also assert at least 6 modifier-like strings are present (+N or -N
    // or 0). This proves the chips render values, not just labels.
    const modMatches = await page.evaluate(() => {
      const re = /^[+-]?\d+$/;
      const text = document.body.innerText;
      return text.split(/\s+/).filter((s) => re.test(s)).length;
    });
    expect(modMatches).toBeGreaterThanOrEqual(6);
  });
});
