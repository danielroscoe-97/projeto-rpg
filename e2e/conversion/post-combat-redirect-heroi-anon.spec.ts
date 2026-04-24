/**
 * E2E — A6: Anon recap CTA carries the flag-aware redirect target.
 *
 * Combat Parity STRICT companion for A6. Mirrors the Auth spec but
 * targets the `/join/:token` anon flow.
 *
 * Tested invariant:
 *   - When `NEXT_PUBLIC_PLAYER_HQ_V2=true`, the RecapCtaCard anon root
 *     exposes `data-redirect-to="/app/campaigns/<id>/sheet?tab=heroi"`.
 *   - When the flag is OFF, the same attribute points at
 *     `/app/dashboard`.
 *
 * This is an attribute-level assertion rather than a full signup → OAuth
 * → dashboard round trip. The round-trip is covered by
 * `recap-anon-signup.spec.ts` (which was updated to dual-target in the
 * Sprint 2 A6 patch). Here we pin the contract at the DOM so a future
 * refactor that drops the data attr fails immediately.
 *
 * Skip behavior: the spec requires seeded DM + anon join helpers. If the
 * environment lacks them (most local runs), we skip with a clear reason.
 *
 * @tags @conversion @post-combat @a6 @combat-parity
 */

import { test, expect } from "@playwright/test";
import { dmSetupCombatSession } from "../helpers/session";
import { endEncounter } from "../helpers/combat";
import { DM_PRIMARY } from "../fixtures/test-accounts";
import { anonJoinCombat } from "../fixtures/identity-upgrade-helpers";

test.describe("A6 — Anon post-combat redirect contract", () => {
  test.setTimeout(240_000);

  test("RecapCtaCard anon root carries flag-aware data-redirect-to", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    try {
      const shareToken = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
        { name: "Sparring Dummy", hp: "5", ac: "10", init: "5" },
      ]).catch(() => null);

      if (!shareToken) {
        test.skip(true, "DM seed unavailable — skip anon redirect spec");
        return;
      }

      try {
        await anonJoinCombat(playerPage, shareToken, "A6AnonSurvivor", {
          initiative: "18",
          hp: "30",
          ac: "15",
        });
      } catch (err) {
        test.skip(true, `Anon join unavailable: ${String(err)}`);
        return;
      }

      await endEncounter(dmPage);
      const confirm = dmPage
        .locator("button")
        .filter({ hasText: /Confirmar|Confirm|Encerrar|End|Pular|Skip/i })
        .first();
      if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirm.click();
      }

      const recapRoot = playerPage.locator('[data-testid="combat-recap"]');
      await expect(recapRoot).toBeVisible({ timeout: 30_000 });

      const anonCta = playerPage.locator(
        '[data-testid="conversion.recap-cta.anon.root"]',
      );
      await expect(anonCta).toBeVisible({ timeout: 15_000 });

      const dataRedirect = await anonCta.getAttribute("data-redirect-to");
      const flagOn = process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true";

      expect(
        dataRedirect,
        "RecapCtaCard must emit data-redirect-to so E2Es can assert the " +
          "flag-aware target without reaching into React internals",
      ).not.toBeNull();

      if (flagOn) {
        expect(dataRedirect).toMatch(
          /\/app\/campaigns\/[^/]+\/sheet\?tab=heroi/,
        );
      } else {
        expect(dataRedirect).toBe("/app/dashboard");
      }
    } finally {
      await playerContext.close().catch(() => {});
      await dmContext.close().catch(() => {});
    }
  });
});
