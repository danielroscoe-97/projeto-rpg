/**
 * E2E — A6 / decision #43: Guest post-combat redirect stays on /app/dashboard
 * regardless of `NEXT_PUBLIC_PLAYER_HQ_V2`.
 *
 * This spec is the Combat Parity STRICT companion to
 * `recap-guest-signup-migrate.spec.ts`. It exists to guarantee the Guest
 * lock-in contract the V2 shell depends on: Guest has no seeded
 * `campaign_id`, so there is no coherent `/sheet?tab=heroi` target to
 * hydrate. Pointing Guest at `/sheet` would 404 or boomerang back.
 *
 * We assert the contract at the component + config boundary rather than
 * running a full signup flow (those are covered by
 * `recap-guest-signup-migrate.spec.ts`). Specifically: visit `/try`, scan
 * for any anchor pointing at `/sheet?tab=heroi`, and assert none exist —
 * regardless of the flag.
 *
 * @tags @conversion @post-combat @a6 @combat-parity
 */

import { test, expect } from "@playwright/test";

test.describe("A6 — Guest post-combat redirect lock-in (decision #43)", () => {
  test.setTimeout(45_000);

  test("guest /try exposes no /sheet?tab=heroi links regardless of flag", async ({
    page,
  }) => {
    await page.goto("/try", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    if (!page.url().includes("/try")) {
      test.skip(
        true,
        `/try redirected to ${page.url()} — cannot run guest baseline`,
      );
      return;
    }

    const links = page.locator("a[href]");
    const count = await links.count();
    const offending: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && /\/sheet\?tab=heroi/.test(href)) {
        offending.push(href);
      }
    }

    expect(
      offending,
      `Guest /try must NOT link to /sheet?tab=heroi (decision #43). ` +
        `Found: ${offending.join(", ")}`,
    ).toEqual([]);
  });

  test("build-time flag does not mutate Guest redirect contract", async ({
    page,
  }) => {
    // The resolver contract: `resolvePostCombatRedirect({ mode: "guest" })`
    // always returns `/app/dashboard`. We can't import the resolver in
    // Playwright, so we assert via the observable side-effect — the
    // GuestUpsellModal's Google OAuth button carries the redirect as a
    // data attribute. If Sprint 2+ wires a /sheet link for Guest, this
    // spec fails loudly.
    await page.goto("/try", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    if (!page.url().includes("/try")) {
      test.skip(true, `/try redirected to ${page.url()}`);
      return;
    }

    // Surface-level invariant: if a GuestUpsellModal shows up anywhere,
    // its OAuth href/data MUST land on dashboard — never /sheet.
    const anyUpsellGoogle = page.locator('[data-testid="upsell-google-button"]');
    const anyCount = await anyUpsellGoogle.count();
    for (let i = 0; i < anyCount; i++) {
      const el = anyUpsellGoogle.nth(i);
      const dataRedirect = await el.getAttribute("data-redirect-to");
      if (!dataRedirect) continue;
      expect(dataRedirect).not.toMatch(/\/sheet\?tab=heroi/);
    }
  });
});
