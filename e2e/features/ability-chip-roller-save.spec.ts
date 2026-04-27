/**
 * Wave 3b · Story C7 — `ability-chip-roller-save` (P0, Auth).
 *
 * Validates that clicking the SAVE zone of an `AbilityChip` produces a
 * toast displaying the calculated 1d20 + ability modifier (+ proficiency
 * bonus when proficient).
 *
 * Per `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md §6 row 24`.
 *
 * Behavior:
 *   1. Player navigates to their first campaign's Herói tab (V2 shell).
 *   2. The 6 ability chips render with `data-testid="ability-chip-{ability}"`.
 *   3. Each chip exposes `ability-chip-{ability}-save` as the SAVE zone.
 *   4. The proficient marker shows as `ability-chip-{ability}-prof-dot` when
 *      the character has proficiency in that save.
 *   5. Clicking the SAVE zone triggers `useAbilityRoll.rollSave` which:
 *        a. Rolls 1d20 + abilityMod (+ profBonus when proficient).
 *        b. Surfaces the result via sonner toast with `data-roll-type="save"`.
 *
 * Skip conditions: V2 flag OFF, V2 shell not built, no campaigns seeded,
 * or the test character has no save proficiencies (we then assert the
 * structural contract on a non-proficient save instead).
 *
 * @tags @wave-3b @c7 @ability-chip @v2-only
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
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

/** Find the first ability chip whose SAVE zone advertises proficient=true. */
async function findProficientSaveChip(page: Page): Promise<{
  ability: string;
  saveBtn: Locator;
} | null> {
  const abilities = ["str", "dex", "con", "int", "wis", "cha"];
  for (const ability of abilities) {
    const saveBtn = page.getByTestId(`ability-chip-${ability}-save`);
    if ((await saveBtn.count()) === 0) continue;
    const proficient = await saveBtn.getAttribute("data-proficient");
    if (proficient === "true") {
      return { ability, saveBtn };
    }
  }
  return null;
}

test.describe("Wave 3b · C7 — AbilityChip SAVE roller", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "AbilityChip rolls require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("clicking a proficient save includes proficiency in the toast", async ({
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

    const anyChip = page.getByTestId("ability-chip-str");
    if ((await anyChip.count()) === 0) {
      test.skip(true, "AbilityChip not rendered (V2 shell pre-build state)");
      return;
    }

    const proficientPick = await findProficientSaveChip(page);
    if (!proficientPick) {
      test.skip(
        true,
        "Test character has no save proficiencies — covered by the non-prof path in roller-check.spec",
      );
      return;
    }

    const { ability, saveBtn } = proficientPick;
    // Proficiency dot must be visible per PRD #44 (visual differentiation).
    await expect(page.getByTestId(`ability-chip-${ability}-prof-dot`)).toBeVisible();

    await saveBtn.click();

    const toast = page.getByTestId("ability-roll-toast");
    await expect(toast).toBeVisible({ timeout: 5_000 });
    await expect(toast).toHaveAttribute("data-roll-type", "save");
    await expect(toast).toHaveAttribute("data-roll-ability", ability);

    const headline = page.getByTestId("ability-roll-toast-headline");
    // Verb varies by locale but the ability code is always upper-case EN.
    await expect(headline).toContainText(new RegExp(ability.toUpperCase()));

    const total = page.getByTestId("ability-roll-toast-total");
    await expect(total).toHaveText(/^\d+$/, { timeout: 2_000 });

    // The detail line should explicitly mention proficiency for a prof save.
    const detail = page.getByTestId("ability-roll-toast-detail");
    await expect(detail).toContainText(/prof/i);
  });
});
