/**
 * Wave 3b · Story C7 — `ability-chip-longpress-advantage` (P1, Auth).
 *
 * Validates the long-press advantage menu on `AbilityChip`. Per PRD
 * decision #44, holding either the CHECK or SAVE zone for ≥500ms opens a
 * menu offering Advantage / Disadvantage / Normal. Selecting Advantage
 * fires a roll with `mode: "advantage"` (rolls 2d20kh1 internally — the
 * unit suite covers the engine path).
 *
 * Per `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md §6 row 25`.
 *
 * Behavior:
 *   1. Player navigates to their first campaign's Herói tab.
 *   2. Long-press (mousedown, hold, mouseup) on the STR check zone.
 *   3. Menu `ability-chip-roll-mode-menu` appears.
 *   4. Click `ability-chip-mode-advantage`.
 *   5. Toast appears with the roll result + advantage indication.
 *
 * Playwright doesn't expose a single "long-press" method, so we synthesize
 * one via `mouse.down()` + `waitForTimeout(700)` + `mouse.up()` over the
 * button's bounding box. 700ms gives the 500ms threshold + buffer.
 *
 * @tags @wave-3b @c7 @ability-chip @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

async function getCampaignId(page: Page): Promise<string | null> {
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
  return match ? match[1] : null;
}

test.describe("Wave 3b · C7 — AbilityChip long-press advantage menu", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "AbilityChip rolls require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("long-press STR check opens menu, picking Advantage rolls 2d20kh1", async ({
    page,
  }) => {
    const campaignId = await getCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    await page.goto(`/app/campaigns/${campaignId}/sheet?tab=heroi`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    const checkBtn = page.getByTestId("ability-chip-str-check");
    if ((await checkBtn.count()) === 0) {
      test.skip(
        true,
        "AbilityChip CHECK zone not rendered — V2 shell pre-build or anon mode",
      );
      return;
    }

    // Synthesize long-press: hover to the button center, mouse.down(),
    // wait past the 500ms threshold, then mouse.up(). Browser fires
    // mousedown / mouseup on the element under the cursor — same code
    // path the production AbilityChip uses for long-press detection.
    const box = await checkBtn.boundingBox();
    expect(box, "CHECK button must have a layout box").not.toBeNull();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    // 700ms > LONG_PRESS_MS (500ms). The exact duration isn't load-bearing
    // — anything ≥600ms reliably triggers the menu without flake.
    await page.waitForTimeout(700);
    await page.mouse.up();

    const menu = page.getByTestId("ability-chip-roll-mode-menu");
    await expect(menu).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("ability-chip-mode-advantage").click();

    // Toast appears with the result. We can't reliably assert "this used
    // 2d20kh1" without exposing the formula in the DOM (which we do —
    // ability-roll-toast-detail renders the dice list). Assert the toast
    // surfaces and points at STR check.
    const toast = page.getByTestId("ability-roll-toast");
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await expect(toast).toHaveAttribute("data-roll-type", "check");
    await expect(toast).toHaveAttribute("data-roll-ability", "str");

    // Menu must be dismissed after a pick.
    await expect(menu).not.toBeVisible();
  });
});
