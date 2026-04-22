/**
 * e2e/upsell/upsell-surface.spec.ts
 *
 * Epic 04 Sprint 2 Story 04-J — E2E Playwright suite for the DM-upsell
 * flow. Covers the three ship surfaces in a single spec file (per the
 * conversion-spec convention — one file per story arc, tagged @upsell):
 *
 *   1. Auth gate: /app/become-dm redirects unauthenticated visitors
 *      to /auth/login with a returnTo param.
 *   2. Wizard mount: authenticated users see Step 1 of BecomeDmWizard
 *      (title + primary CTA + template picker entry point).
 *   3. Admin funnel route: admins can reach /admin/dm-upsell-funnel
 *      and the page ships `noindex` meta (SEO parity with the rest of
 *      /admin/*).
 *
 * ### What this DOESN'T cover (deferred to spec growth)
 *
 * - Full 2-tab Test 10 (D9 role flip broadcast + sessionStorage
 *   invariant) — requires two authenticated Playwright contexts +
 *   triggering a real role flip, which burns 2 test accounts per run.
 *   The unit test at `tests/upsell/user-role-listener.test.tsx` locks
 *   the core invariant; promote to E2E when CI gets the bandwidth.
 * - Full template clone → first-session flow — exercises Sprint 1's
 *   clone_campaign_from_template RPC end-to-end which requires seeded
 *   templates in the live DB. The lib is covered by
 *   `tests/upsell/clone-template.test.ts` + pgTap 04; promote to E2E
 *   when staging has a stable template fixture.
 * - Past-companions copy-message — requires a DM account with at
 *   least one past teammate (and a shared session in history). The
 *   RTL test at `tests/upsell/invite-past-companions.test.tsx` covers
 *   the interaction shape; live E2E would need a seed script.
 *
 * @tags @upsell @story-04J
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the `<meta name="robots" content="..." />` tag, returns "" if absent. */
async function readRobotsMeta(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const meta = document.querySelector('meta[name="robots"]');
    return meta?.getAttribute("content") ?? "";
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Epic 04 Sprint 2 — DM upsell surface", () => {
  test("auth gate: /app/become-dm redirects unauthenticated to login", async ({
    page,
  }) => {
    // No login; hit the wizard route directly.
    await page.goto("/app/become-dm");
    await page.waitForURL((url) => url.pathname.startsWith("/auth/login"), {
      timeout: 15_000,
    });
    // Auth page arrived. Confirm the returnTo hint made it into the URL
    // so post-login the user lands back on the wizard.
    const url = new URL(page.url());
    const returnTo =
      url.searchParams.get("returnTo") ?? url.searchParams.get("redirectTo");
    expect(returnTo ?? "").toContain("/app/become-dm");
  });

  test("authenticated user sees the wizard Step 1 surface", async ({
    page,
  }) => {
    await loginAsDM(page);
    await page.goto("/app/become-dm");
    await page.waitForLoadState("domcontentloaded");

    // Wizard mount + Step 1 affordances.
    await expect(
      page.getByTestId("upsell.become-dm-wizard"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId("wizard-step-indicator"),
    ).toBeVisible();
    await expect(
      page.getByTestId("wizard-step1-primary"),
    ).toBeVisible();
    await expect(
      page.getByTestId("wizard-maybe-later"),
    ).toBeVisible();
  });

  test("Step 1 'Let's go' advances to Step 2 template gallery", async ({
    page,
  }) => {
    await loginAsDM(page);
    await page.goto("/app/become-dm");
    await page.waitForLoadState("domcontentloaded");

    await page.getByTestId("wizard-step1-primary").click();

    // Step 2 surface: template gallery + the blank-mode escape hatch.
    await expect(
      page.getByTestId("upsell.template-gallery"),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("wizard-blank-mode")).toBeVisible();
  });

  test("admin funnel route renders and ships noindex robots meta", async ({
    page,
  }) => {
    await loginAsDM(page);
    // Admin layout redirects non-admin users to /app/dashboard. Skip the
    // assertion if the test DM account isn't flagged admin (env-dependent).
    await page.goto("/admin/dm-upsell-funnel");
    await page.waitForLoadState("domcontentloaded");

    // If the layout redirected us away, document + skip (don't fail CI
    // for accounts without is_admin).
    const pathname = new URL(page.url()).pathname;
    if (pathname !== "/admin/dm-upsell-funnel") {
      test.skip(
        true,
        `DM account is not admin — layout redirected to ${pathname}; skipping the noindex assertion`,
      );
      return;
    }

    // Page surface + robots meta.
    await expect(
      page.getByTestId("admin.dm-upsell-funnel-page"),
    ).toBeVisible();
    const robots = await readRobotsMeta(page);
    expect(robots).toMatch(/noindex/i);
    expect(robots).toMatch(/nofollow/i);
  });
});
