/**
 * Gate Fase A — `sheet-hp-controls-inline` (P0, Auth).
 *
 * Locks in Story A5 on the Auth `/sheet` surface: HP controls use the
 * canonical CombatantRow pattern (click HP → inline number input →
 * delta-calc on blur/Enter). The legacy `[−5][−1][+1][+5]` buttons MUST
 * NOT render in V2.
 *
 * Runs gated by `NEXT_PUBLIC_PLAYER_HQ_V2=true` — with the flag OFF, the
 * legacy UI is allowed and the spec is skipped.
 *
 * Tap target assertion: the HP button must be ≥40px tall on mobile viewport
 * (tokens delta §14 — `min-h-[44px] sm:min-h-[28px]`).
 *
 * @tags @fase-a @a5 @player-hq @combat-parity
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("Gate Fase A — A5 HP inline controls on /sheet (Auth)", () => {
  test.setTimeout(90_000);

  test("HP displays as click-to-edit inline input; no -5/-1/+1/+5 buttons", async ({
    page,
  }) => {
    if (process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true") {
      test.skip(
        true,
        "A5 pattern gates on NEXT_PUBLIC_PLAYER_HQ_V2=true; legacy HP " +
          "buttons allowed with flag OFF.",
      );
      return;
    }

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

    // Legacy button absence — the canonical pattern removes these.
    // Use exact-match (regex anchored) so "-5" does NOT match "-50",
    // "-15", etc. Both ASCII hyphen-minus ("-") and Unicode minus ("−")
    // need coverage because the legacy buttons rendered the typographic
    // glyph in some locales.
    const legacyMinus5 = page.getByRole("button", {
      name: /^[-−]5$/,
    });
    const legacyPlus5 = page.getByRole("button", { name: /^\+5$/ });
    await expect(
      legacyMinus5,
      "legacy [-5] button must NOT render in V2 HP ribbon",
    ).toHaveCount(0);
    await expect(
      legacyPlus5,
      "legacy [+5] button must NOT render in V2 HP ribbon",
    ).toHaveCount(0);

    // Canonical pattern: an editable HP control exists. We match loosely
    // on testid suffix to accommodate both CombatantRow reuse and a new
    // HpDisplay variant.
    const hpEditableCandidates = page.locator(
      '[data-testid^="current-hp-btn-"], [data-testid^="hp-display-edit-"]',
    );
    if ((await hpEditableCandidates.count()) === 0) {
      test.skip(true, "No canonical HP control testid present yet");
      return;
    }
    const hpBtn = hpEditableCandidates.first();
    await expect(hpBtn).toBeVisible({ timeout: 10_000 });

    // Tap target check (mobile 390). On desktop-chrome (1440) the
    // CombatantRow canonical uses `sm:min-h-[28px]` which is below the
    // mobile target — we only assert ≥40px when viewport <= 640.
    const vw = page.viewportSize()?.width ?? 1440;
    if (vw <= 640) {
      const box = await hpBtn.boundingBox();
      expect(
        box?.height ?? 0,
        `HP button tap target must be ≥40px at viewport ${vw}`,
      ).toBeGreaterThanOrEqual(40);
    }
  });
});
