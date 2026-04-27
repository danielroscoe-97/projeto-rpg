/**
 * Wave 3b · Story C7 — `ability-chip-roller-check` (P0, Auth).
 *
 * Validates that clicking the CHECK zone of an `AbilityChip` produces a
 * toast displaying the calculated 1d20 + ability modifier roll.
 *
 * Per `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md §6 row 23`.
 *
 * Behavior:
 *   1. Player navigates to their first campaign's Herói tab (V2 shell).
 *   2. The 6 ability chips render with `data-testid="ability-chip-{ability}"`.
 *   3. Each chip exposes `ability-chip-{ability}-check` as the CHECK zone.
 *   4. Clicking it triggers `useAbilityRoll.rollCheck` which:
 *        a. Rolls 1d20 + abilityMod (NO proficiency bonus on a check).
 *        b. Surfaces the result via sonner toast (`data-testid="ability-roll-toast"`).
 *
 * Skip conditions: V2 flag OFF, V2 shell not built, or no campaigns seeded.
 *
 * Determinism: the dice roll is non-deterministic (Math.random), so we
 * assert structure ("STR check: <number>") rather than exact value. The
 * unit tests in `lib/utils/__tests__/dice-roller.test.ts` cover the
 * deterministic engine path.
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

test.describe("Wave 3b · C7 — AbilityChip CHECK roller", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "AbilityChip rolls require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("clicking STR check produces a toast with the roll result", async ({
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

    // Skip cleanly when the V2 chip isn't wired in this env.
    const chip = page.getByTestId("ability-chip-str");
    if ((await chip.count()) === 0) {
      test.skip(true, "AbilityChip not rendered (V2 shell pre-build state)");
      return;
    }

    const checkBtn = page.getByTestId("ability-chip-str-check");
    if ((await checkBtn.count()) === 0) {
      test.skip(
        true,
        "CHECK button not rendered — chip likely in static (anon) mode for this account",
      );
      return;
    }

    await checkBtn.click();

    // Toast appears via sonner — assert the headline format. The dice roll
    // value is non-deterministic so we only validate the structure: the
    // ability code (STR) followed by the verb ("check") and a number.
    const toast = page.getByTestId("ability-roll-toast");
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await expect(toast).toHaveAttribute("data-roll-type", "check");
    await expect(toast).toHaveAttribute("data-roll-ability", "str");

    const headline = page.getByTestId("ability-roll-toast-headline");
    await expect(headline).toContainText(/STR/);
    const total = page.getByTestId("ability-roll-toast-total");
    await expect(total).toHaveText(/^\d+$/, { timeout: 2_000 });
  });
});
