/**
 * Gate Fase C — `ribbon-vivo-sticky` (P0, Auth).
 *
 * Wave 3a Story C1 — RibbonVivo specs (per
 * `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §6 row 17).
 *
 * Locks the contract that:
 *   1. Ribbon mounts inside HeroiTab when the V2 flag is on.
 *   2. The ribbon root has `position: sticky` + `top: 0`.
 *   3. The HP bar element exists with the `hp-bar-{characterId}` testid.
 *   4. Both the desktop chip strip (line 1) and the slot/condition row
 *      (line 2) render.
 *   5. The mobile-only `⌄` toggle is hidden on desktop (sm+) and visible
 *      below `sm`.
 *
 * Gated by `NEXT_PUBLIC_PLAYER_HQ_V2 === "true"`. Skipped on the V1
 * lane to keep CI happy.
 *
 * @tags @fase-c @c1 @ribbon-vivo @v2-only @auth
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

async function gotoFirstCampaignSheet(page: Page): Promise<string | null> {
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
  if (!match) return null;
  const campaignId = match[1];
  await page.goto(`/app/campaigns/${campaignId}/sheet?tab=heroi`, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  if (!page.url().includes("/sheet")) return null;
  return campaignId;
}

test.describe("Gate Fase C — RibbonVivo sticky (C1)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "C1 specs require NEXT_PUBLIC_PLAYER_HQ_V2=true (V2 4-tab shell)",
  );
  test.setTimeout(90_000);

  test("ribbon mounts inside HeroiTab and is sticky at top:0", async ({ page }) => {
    const campaignId = await gotoFirstCampaignSheet(page);
    test.skip(!campaignId, "no seeded campaign");

    const ribbon = page.locator('[data-testid="ribbon-vivo"]');
    await expect(ribbon).toBeVisible({ timeout: 15_000 });

    // Sticky positioning + top:0 — read computed styles to avoid trusting
    // class names which Tailwind may inline differently between dev/prod.
    const style = await ribbon.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { position: s.position, top: s.top, zIndex: s.zIndex };
    });
    expect(style.position).toBe("sticky");
    // Tailwind's `top-0` resolves to "0px"; allow either string form.
    expect(["0px", "0"].includes(style.top)).toBeTruthy();
    expect(Number(style.zIndex) || 0).toBeGreaterThanOrEqual(20);
  });

  test("ribbon hosts HP bar and 2 visible lines on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const campaignId = await gotoFirstCampaignSheet(page);
    test.skip(!campaignId, "no seeded campaign");

    const ribbon = page.locator('[data-testid="ribbon-vivo"]');
    await expect(ribbon).toBeVisible({ timeout: 15_000 });

    // HP bar testid is per-character via `hp-bar-{id}`. Use `^=` to avoid
    // hard-coding a UUID.
    await expect(ribbon.locator('[data-testid^="hp-bar-"]').first()).toBeVisible();

    // AC chip exists on desktop (the desktop strip is `hidden sm:flex`).
    await expect(ribbon.locator('[data-testid="ribbon-ac"]')).toBeVisible();

    // Line 2 is always rendered on desktop (`sm:block`).
    await expect(ribbon.locator('[data-testid="ribbon-vivo-line-2"]')).toBeVisible();
  });

  test("mobile expand toggle is visible <sm and hidden ≥sm", async ({ page }) => {
    const campaignId = await gotoFirstCampaignSheet(page);
    test.skip(!campaignId, "no seeded campaign");

    // ── Mobile (390x844 ~ iPhone 12) ─────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "domcontentloaded" });
    const ribbon = page.locator('[data-testid="ribbon-vivo"]');
    await expect(ribbon).toBeVisible({ timeout: 15_000 });
    await expect(
      ribbon.locator('[data-testid="ribbon-expand-toggle"]'),
    ).toBeVisible();

    // Line 2 starts collapsed on mobile (the toggle controls it).
    const line2 = ribbon.locator('[data-testid="ribbon-vivo-line-2"]');
    await expect(line2).toHaveAttribute("data-expanded", "false");

    // Click expands.
    await ribbon.locator('[data-testid="ribbon-expand-toggle"]').click();
    await expect(line2).toHaveAttribute("data-expanded", "true");

    // ── Desktop (1280x800) ──────────────────────────────────────
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(ribbon).toBeVisible({ timeout: 15_000 });
    // Toggle hidden on sm+
    await expect(
      ribbon.locator('[data-testid="ribbon-expand-toggle"]'),
    ).toBeHidden();
  });
});
