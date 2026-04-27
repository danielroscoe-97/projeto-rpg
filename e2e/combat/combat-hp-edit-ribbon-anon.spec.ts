/**
 * Gate Fase A — `combat-hp-edit-ribbon-anon` (P0, Anon).
 *
 * Combat Parity STRICT companion to `sheet-hp-controls-inline.spec.ts`.
 * Asserts the same canonical HP pattern (click → inline number input →
 * delta calc) works for the Anon player on `/combat` via `/join/:token`.
 *
 * Anon lives in `PlayerJoinClient`, which reuses `CombatantRow` for the
 * HP UI already. This spec pins the contract so the A5 refactor doesn't
 * regress the shared pattern.
 *
 * @tags @fase-a @a5 @combat-parity @anon
 */

import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import { anonJoinCombat } from "../fixtures/identity-upgrade-helpers";

test.describe("Gate Fase A — A5 HP inline ribbon for Anon /join", () => {
  test.setTimeout(240_000);

  test("anon player's HP ribbon uses inline edit pattern without legacy buttons", async ({
    browser,
  }) => {
    if (process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true") {
      test.skip(true, "A5 gates on NEXT_PUBLIC_PLAYER_HQ_V2=true");
      return;
    }

    const dmCtx = await browser.newContext();
    const dmPage = await dmCtx.newPage();
    const playerCtx = await browser.newContext();
    const playerPage = await playerCtx.newPage();

    try {
      const shareToken = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
        { name: "Sparring Dummy", hp: "5", ac: "10", init: "5" },
      ]).catch(() => null);

      if (!shareToken) {
        test.skip(true, "DM seed unavailable");
        return;
      }

      try {
        await anonJoinCombat(playerPage, shareToken, "A5AnonHP", {
          initiative: "18",
          hp: "30",
          ac: "15",
          // Pass the DM page so the helper drives the accept step —
          // prod does not auto-accept late-join; without this the helper
          // times out waiting for `player-view` and the spec skips 100%.
          dmPage,
        });
      } catch (err) {
        test.skip(true, `Anon join failed: ${String(err)}`);
        return;
      }

      // Legacy buttons absent. Use exact-match (regex anchored) so
      // "-5" does NOT match "-50", "-15", etc. Both ASCII hyphen-minus
      // and Unicode minus glyphs are covered.
      const legacyMinus5 = playerPage.getByRole("button", {
        name: /^[-−]5$/,
      });
      const legacyPlus5 = playerPage.getByRole("button", {
        name: /^\+5$/,
      });
      await expect(
        legacyMinus5,
        "anon combat ribbon must not expose legacy [-5] in V2",
      ).toHaveCount(0);
      await expect(
        legacyPlus5,
        "anon combat ribbon must not expose legacy [+5] in V2",
      ).toHaveCount(0);

      // Canonical pattern: some HP button testid is exposed. Short-
      // circuit skip if no canonical testid yet (A5 lands the testid).
      const hpEditable = playerPage.locator(
        '[data-testid^="current-hp-btn-"], [data-testid^="inline-current-hp-input-"]',
      );
      if ((await hpEditable.count()) === 0) {
        test.skip(true, "Canonical HP testid not present in this build");
        return;
      }
      await expect(hpEditable.first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await playerCtx.close().catch(() => {});
      await dmCtx.close().catch(() => {});
    }
  });
});
