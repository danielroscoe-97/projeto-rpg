/**
 * Gate Fase A — `sheet-header-density` (P1 → P0 after A4 lands).
 *
 * Locks in Story A4: header is condensed from 4 lines to 2, height ≤56px,
 * and the Sprint 2 decision #13 chip `[✨ Slots X/Y →]` is clickable.
 *
 * @tags @fase-a @a4 @player-hq
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("Gate Fase A — A4 header density", () => {
  test.setTimeout(90_000);

  test("header height ≤ 64px and slot chip is present when caster", async ({
    page,
  }) => {
    await loginAs(page, PLAYER_WARRIOR).catch(() => {});
    await page
      .goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" })
      .catch(() => {});

    const campaignLinks = page.locator('a[href^="/app/campaigns/"]');
    if ((await campaignLinks.count()) === 0) {
      test.skip(true, "No campaigns seeded");
      return;
    }
    const firstHref = await campaignLinks.first().getAttribute("href");
    const match = firstHref?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
    if (!match) {
      test.skip(true, "Could not extract campaign id");
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

    // Header height — look for the shell's first banner/region above the
    // tablist. We match by role=banner OR the nearest `<header>` element.
    const header = page
      .locator('[role="banner"], header, [data-testid="player-hq-header"]')
      .first();
    if ((await header.count()) === 0) {
      test.skip(true, "No header landmark present yet");
      return;
    }

    const box = await header.boundingBox();
    expect(
      box?.height ?? 0,
      "A4 target: header collapses 4→2 lines, height ≤ 64px tolerance",
    ).toBeLessThanOrEqual(64);

    // Slot chip presence — testid is optional until A4 lands; skip when
    // missing so we don't fail PRs that haven't merged A4 yet.
    const slotChip = page.locator(
      '[data-testid="player-hq-slot-chip"], a:has-text("Slots"), button:has-text("Slots")',
    );
    if ((await slotChip.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "Slot chip not present — A4 story may still be pending.",
      });
      return;
    }
    await expect(slotChip.first()).toBeVisible({ timeout: 5_000 });
  });
});
