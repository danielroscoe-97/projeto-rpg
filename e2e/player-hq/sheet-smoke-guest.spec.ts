import { test, expect } from "@playwright/test";
import { TAB_KEYS } from "./_constants";

/**
 * Player HQ — Guest smoke baseline (EP-INFRA.4, Sprint 1 Track B).
 *
 * Documents that `/try` (Guest combat at `app/try/page.tsx` driven by
 * `components/guest/GuestCombatClient.tsx`) does NOT host or link to the
 * Player HQ shell at `/app/campaigns/[id]/sheet`. Guest has no persistent
 * user → no `campaign_members` row → no character → no sheet.
 *
 * This is intentional per the Combat Parity Rule. See CLAUDE.md:
 *   "Data persistence features (ratings, notas, spell slots) → Auth-only,
 *    documentar no bucket"
 * The full Player HQ surface hits that rule hard — it IS a persistence
 * feature. Guest users can only play combat, not the HQ.
 *
 * Why a guest-focused baseline is valuable:
 *   1. Sprint 2 A6 (post-combat redirect) may add a "guest → /sheet?tab=
 *      heroi" upsell path (decision #43). This spec becomes the checkpoint
 *      where we validate that change is intentional.
 *   2. If a future refactor accidentally wires `/try` to load or link to
 *      `/sheet`, this spec fails with a clear pointer.
 *
 * Skip behavior: the test runs purely against `/try` with no auth, no
 * seed data, no share tokens. Should be stable across all environments.
 */

test.describe("Player HQ — Guest smoke (no /sheet on /try baseline)", () => {
  test.setTimeout(45_000);

  test("guest /try session has no PlayerHqShell tablist", async ({ page }) => {
    await page.goto("/try", { timeout: 30_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    // Just confirm /try actually loaded — skip if the landing redirected
    // us (e.g. middleware blocking in an odd env).
    if (!page.url().includes("/try")) {
      const reason = `/try redirected to ${page.url()} — cannot run guest baseline`;
      test.info().annotations.push({ type: "skip-reason", description: reason });
      test.skip(true, reason);
      return;
    }

    // Visual baseline — captures the pre-Sprint 2 /try state so Wave 1+
    // density work (A5 combat parity) can diff against a known-good PNG.
    // Soft networkidle wait keeps dice/toast animations from flaking the
    // snapshot. maxDiffPixelRatio 0.02 tolerates antialiasing across runs.
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page).toHaveScreenshot("guest-try-landing.png", {
      fullPage: false,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });

    // PlayerHqShell uses `role="tablist"` for its 7-tab shell. If that
    // ever renders in /try, something is very wrong — guest has no user,
    // no campaign, no character.
    const playerHqTablist = page.locator('[role="tablist"]').filter({
      has: page.locator("#tab-map"),
    });
    await expect(playerHqTablist).toHaveCount(0);

    // And none of the individual V1 tab buttons should render in /try.
    for (const key of TAB_KEYS) {
      const tab = page.locator(`#tab-${key}`);
      await expect(tab, `#tab-${key} must NOT render in /try`).toHaveCount(0);
    }
  });

  /**
   * Visual baseline for /try guest combat landing.
   *
   * Sibling to the structural test above so a pixel diff failure never
   * obscures the semantic `toHaveCount(0)` regression the structural
   * test is written to catch.
   *
   * Platform + flag gating:
   *   - Linux only. Windows/macOS font + AA rendering diverge enough to
   *     false-fail every run. Baselines live in the repo as one PNG per
   *     Playwright project (no -platform suffix) via the config's
   *     snapshotPathTemplate. Regenerate via CI or a Linux container:
   *       docker run --rm --ipc=host -v "$PWD":/w -w /w \
   *         mcr.microsoft.com/playwright:v1.55.0-jammy \
   *         npx playwright test e2e/player-hq/sheet-smoke-guest.spec.ts \
   *         --update-snapshots
   *   - FLAG OFF only. When NEXT_PUBLIC_PLAYER_HQ_V2 is "true" the build
   *     may gate new UI into /try (decision #43 scope creep risk); the
   *     baseline is the FLAG OFF shape by design.
   *
   * Deterministic setup:
   *   - storage cleared so GuestExpiryModal + guest-last-recap banner do
   *     not leak across runs
   *   - Math.random stubbed so generateCreatureName + starter initiative
   *     rolls produce identical values across runs
   *   - desktop-chrome overridden to 1440x900 to match the Sprint 2 DoD
   *     ("mobile 390 + desktop 1440"); mobile-safari keeps the iPhone 14
   *     device profile (390x844) unchanged
   *
   * Intentional regeneration:
   *   npx playwright test e2e/player-hq/sheet-smoke-guest.spec.ts \
   *     --update-snapshots
   *   — on Linux / in the Playwright Docker image. Review the PNG diff in
   *   the PR; never regenerate blindly on a dev machine and commit.
   */
  test("visual baseline — guest /try landing", async ({ page }, testInfo) => {
    test.skip(
      process.platform !== "linux",
      "visual baselines are Linux-captured to match CI runner — skip on " +
        `${process.platform}. Use Docker (see spec comment) to regenerate.`,
    );
    test.skip(
      process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true",
      "visual baseline is FLAG OFF only — re-run with " +
        "NEXT_PUBLIC_PLAYER_HQ_V2=false to capture the prod-shape baseline.",
    );

    // Deterministic setup must run BEFORE page navigation so the scripts
    // execute in every new document. Clears client state and pins
    // Math.random to a fixed stream so random creature names + initiative
    // rolls render identically across runs.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // Some browsers throw on storage access in fresh contexts.
      }
      let seed = 1;
      Math.random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    });

    if (testInfo.project.name === "desktop-chrome") {
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    await page.goto("/try", { timeout: 30_000, waitUntil: "domcontentloaded" });

    if (!page.url().includes("/try")) {
      test.skip(true, `/try redirected to ${page.url()}`);
      return;
    }

    // Anchor on a concrete DOM landmark rendered after hydration instead
    // of waitForLoadState("networkidle") — /try has a 30s expiry setInterval
    // and trackEvent beacons that keep the network non-idle indefinitely.
    await expect(
      page.getByTestId("setup-combatant-list"),
      "setup-combatant-list must render before the baseline is captured",
    ).toBeVisible({ timeout: 20_000 });

    // Settle the post-hydration pulse animation so `animations: "disabled"`
    // freezes a stable frame. The animate-turn-pulse class retargets itself
    // on state changes; waiting for the setTimeout-driven first render to
    // complete prevents a half-rendered pulse ring showing in the snapshot.
    await page
      .waitForFunction(
        () => !document.querySelector(".animate-turn-pulse"),
        null,
        { timeout: 3_000 },
      )
      .catch(() => {
        /* class not present on this build — nothing to wait for */
      });

    await expect(page).toHaveScreenshot("guest-try-landing.png", {
      fullPage: true,
      timeout: 20_000,
    });
  });

  test("guest /try never link-leaks to /sheet routes", async ({ page }) => {
    await page.goto("/try", { timeout: 30_000, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");

    if (!page.url().includes("/try")) {
      const reason = `/try redirected to ${page.url()}`;
      test.info().annotations.push({ type: "skip-reason", description: reason });
      test.skip(true, reason);
      return;
    }

    // Scan all anchor hrefs on /try for sheet routes. The guest surface
    // should offer sign-up/login CTAs, never deep links into the auth
    // Player HQ. If Sprint 2 A6 adds such a link, update this assertion
    // to the specific expected route (e.g. `/sheet?tab=heroi`) and keep
    // the negative check for anything else.
    const links = page.locator("a[href]");
    const count = await links.count();
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }

    const sheetLinks = hrefs.filter((h) => /\/app\/campaigns\/[^/]+\/sheet\b/.test(h));
    expect(sheetLinks, `/try must not link to /sheet — got: ${sheetLinks.join(", ")}`).toEqual([]);
  });
});
