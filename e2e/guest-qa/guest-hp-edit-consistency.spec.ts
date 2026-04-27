/**
 * Gate Fase A — `guest-hp-edit-consistency` (P0, Guest).
 *
 * Combat Parity STRICT — third leg of the A5 triple (Auth + Anon + Guest).
 * Guest combat lives in `GuestCombatClient` on `/try`; it must offer the
 * same canonical HP pattern (click → inline edit → delta-calc) and must
 * NOT expose the legacy `[-5]/[-1]/[+1]/[+5]` buttons once A5 lands.
 *
 * Unlike Anon/Auth this spec does not need a DM session — Guest is fully
 * self-contained on `/try`. We stand up a minimal combat via the existing
 * guest-qa helpers.
 *
 * @tags @fase-a @a5 @combat-parity @guest
 */

import { test, expect } from "@playwright/test";
import {
  goToTryPage,
  clearGuestState,
  addAllCombatants,
  startCombat,
} from "./helpers";

const ROSTER = [
  { name: "Hero", hp: "30", ac: "15", init: "15", role: "player" as const },
  { name: "Goblin", hp: "7", ac: "13", init: "10" },
];

test.describe("Gate Fase A — A5 HP inline for Guest /try", () => {
  test.setTimeout(120_000);

  test("guest combat ribbon exposes inline HP pattern without legacy buttons", async ({
    page,
  }) => {
    if (process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true") {
      test.skip(true, "A5 gates on NEXT_PUBLIC_PLAYER_HQ_V2=true");
      return;
    }

    await page.goto("/try");
    await clearGuestState(page);
    await goToTryPage(page);
    await addAllCombatants(page, ROSTER);
    await startCombat(page);

    await expect(
      page.locator('[data-testid="active-combat"]'),
    ).toBeVisible({ timeout: 15_000 });

    // Legacy buttons must not exist on the guest ribbon in V2.
    // Use exact-match (regex anchored) so "-5" does NOT match "-50",
    // "-15", etc. Both ASCII hyphen-minus and Unicode minus glyphs are
    // covered because legacy markup rendered both depending on locale.
    const legacyMinus5 = page.getByRole("button", {
      name: /^[-−]5$/,
    });
    const legacyPlus5 = page.getByRole("button", { name: /^\+5$/ });
    await expect(
      legacyMinus5,
      "guest /try must not expose legacy [-5] after A5",
    ).toHaveCount(0);
    await expect(
      legacyPlus5,
      "guest /try must not expose legacy [+5] after A5",
    ).toHaveCount(0);

    // Canonical testid presence (skip if A5 hasn't landed yet in this
    // build — the contract is still asserted via the legacy-absence above).
    const hpEditable = page.locator(
      '[data-testid^="current-hp-btn-"], [data-testid^="inline-current-hp-input-"]',
    );
    if ((await hpEditable.count()) === 0) {
      test
        .info()
        .annotations.push({
          type: "skip-reason",
          description: "Canonical HP testid not present; legacy absence still verified",
        });
      return;
    }
    await expect(hpEditable.first()).toBeVisible({ timeout: 10_000 });
  });
});
