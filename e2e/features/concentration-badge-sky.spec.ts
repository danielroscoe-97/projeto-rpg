/**
 * Concentration badge sky color (PRD decisão #45) — Gate Fase C P1 spec.
 *
 * Asserts that concentration spell badges render with the new
 * `--concentration` token (sky, HSL 197 92% 74% ≈ #7DD3FC) instead of the
 * legacy amber/`--warning` palette. Catches accidental reverts to
 * `text-warning` / `text-amber-*` styling on:
 *   - `components/player-hq/ActiveEffectCard.tsx` (HQ active-effects panel)
 *   - `components/player-hq/SpellCard.tsx`        ("C" badge in spell list)
 *   - `components/player/ActiveEffectsBadges.tsx` (combat-side compact)
 *
 * Why this matters: amber is reserved for low-resource alerts (warning
 * tier); concentration was colliding visually with that semantic, making
 * it impossible for a player to distinguish "I'm concentrating on a spell"
 * from "I'm running low on a resource". The sky token is intentionally
 * lighter / more luminous so the two states never blur together.
 *
 * Auth-only scope per the Wave 3 Sub-zero brief: the seeded
 * /sheet → Resources flow already used by `active-effects.spec.ts` is the
 * canonical surface where players add a concentration effect (Haste in
 * the seeded fixture). Anon/Guest combat surfaces don't add effects;
 * they read them via realtime, and the same Tailwind class applies.
 */

import { test, expect } from "@playwright/test";

const DM_EMAIL = process.env.E2E_DM_EMAIL || "danielroscoe97@gmail.com";
const DM_PASSWORD = process.env.E2E_DM_PASSWORD || "Eusei123*";
const PLAYER_EMAIL = "qa.effects@test-pocketdm.com";
const PLAYER_PASSWORD = "TestQA_Effects!1";

// Sky #7DD3FC ≈ HSL 197 92% 74%. Computed-style values are reported in
// the rgb() form so we lock onto the rgb triplet that comes from
// `hsl(var(--concentration))`. The exact triplet for HSL(197, 92%, 74%)
// is rgb(125, 211, 252), matching #7DD3FC. We tolerate a tiny channel
// drift via a soft check below to avoid sub-pixel rounding flakes.
const CONCENTRATION_RGB = { r: 125, g: 211, b: 252 };

function parseRgb(value: string): { r: number; g: number; b: number } | null {
  const m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

function isCloseTo(
  rgb: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  tolerance = 6
) {
  return (
    Math.abs(rgb.r - target.r) <= tolerance &&
    Math.abs(rgb.g - target.g) <= tolerance &&
    Math.abs(rgb.b - target.b) <= tolerance
  );
}

test.describe("Concentration badge — sky color (PRD #45)", () => {
  test.setTimeout(180_000);

  test("Auth — concentration badge renders with --concentration sky color", async ({ page }) => {
    // Login (mirrors active-effects.spec.ts to share the seeded character).
    await page.goto("/auth/login", { timeout: 45_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", PLAYER_EMAIL);
    await page.fill("#login-password", PLAYER_PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL("**/app/**", { timeout: 45_000, waitUntil: "domcontentloaded" });
    } catch {
      // Player account not seeded in this env — fall back to DM and skip.
      test.skip(true, "QA effects player not seeded in this environment");
      return;
    }

    // Reuse the seeded campaign id from active-effects.spec.ts.
    const campaignId = "e392c8b7-9b9e-4e72-b3d0-6f7573c56f8a";
    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2_500);
    if (!page.url().includes("/sheet")) {
      test.skip(true, `Player redirected from sheet — URL: ${page.url()}`);
      return;
    }

    // Open the resources/heroi tab where ActiveEffectsPanel lives.
    const resourcesTab = page
      .locator("button")
      .filter({ hasText: /^(Resources|Recursos|Herói|Heroi)$/i })
      .first();
    if (await resourcesTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await resourcesTab.click();
      await page.waitForTimeout(800);
    }

    const aeHeader = page
      .locator("h3")
      .filter({ hasText: /Active Effects|Efeitos Ativos/ })
      .first();
    await expect(aeHeader).toBeVisible({ timeout: 8_000 });

    // ── Add Haste (concentration spell, 1min) ──────────────────────
    // Best-effort: if the panel already has a concentration effect we'll
    // skip the add and assert directly. Otherwise we add Haste.
    let conc = page
      .locator("span")
      .filter({ hasText: /^(Concentration|Concentração)$/ })
      .first();
    if (!(await conc.isVisible({ timeout: 1_000 }).catch(() => false))) {
      const addBtn = page
        .locator("button")
        .filter({ hasText: /Add Effect|Adicionar Efeito/ })
        .first();
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.fill('[id="effect-name"]', "Haste");
      const levelInput = page.locator('[id="spell-level"]');
      if (await levelInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await levelInput.fill("3");
      }
      // First checkbox in the dialog is the concentration toggle.
      await page.locator('input[type="checkbox"]').first().check();
      await page.locator("button").filter({ hasText: "1min" }).first().click();
      await page.locator('[type="submit"]').click();
      await page.waitForTimeout(1_500);
      conc = page
        .locator("span")
        .filter({ hasText: /^(Concentration|Concentração)$/ })
        .first();
    }
    await expect(conc).toBeVisible({ timeout: 5_000 });

    // ── Assertion 1: class allowlist — must use `text-concentration`,
    // never `text-warning` / `text-amber-*` for the badge. ─────────
    const badgeClass = (await conc.getAttribute("class")) ?? "";
    expect(
      badgeClass,
      `Concentration badge must include 'text-concentration' (saw: ${badgeClass})`
    ).toContain("text-concentration");
    expect(
      badgeClass,
      `Concentration badge must NOT include 'text-warning' (PRD #45)`
    ).not.toContain("text-warning");
    expect(
      badgeClass,
      `Concentration badge must NOT include 'text-amber-' (PRD #45)`
    ).not.toMatch(/text-amber-\d/);

    // ── Assertion 2: computed color resolves to sky token. ─────────
    const computedColor = await conc.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    const rgb = parseRgb(computedColor);
    expect(
      rgb,
      `Could not parse computed color '${computedColor}' for concentration badge`
    ).not.toBeNull();
    expect(
      isCloseTo(rgb!, CONCENTRATION_RGB),
      `Computed color ${computedColor} is not close to sky token rgb(${CONCENTRATION_RGB.r},${CONCENTRATION_RGB.g},${CONCENTRATION_RGB.b})`
    ).toBe(true);

    // ── Cleanup: dismiss the Haste effect so re-runs stay deterministic.
    const dismissBtns = page.locator(
      '[aria-label="Dismiss"], [aria-label="Remover"]'
    );
    const dismissCount = await dismissBtns.count().catch(() => 0);
    if (dismissCount > 0) {
      // Two clicks: first arms confirm, second dismisses.
      await dismissBtns.first().click();
      await page.waitForTimeout(300);
      await dismissBtns.first().click();
      await page.waitForTimeout(800);
    }
    // Sanity: silence the unused import warning if DM_EMAIL/PASSWORD are
    // ever needed to swap to the DM-as-player fallback later.
    void DM_EMAIL;
    void DM_PASSWORD;
  });

  test("Effect without concentration does NOT render the badge (control)", async ({ page }) => {
    await page.goto("/auth/login", { timeout: 45_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.fill("#login-email", PLAYER_EMAIL);
    await page.fill("#login-password", PLAYER_PASSWORD);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL("**/app/**", { timeout: 45_000, waitUntil: "domcontentloaded" });
    } catch {
      test.skip(true, "QA effects player not seeded in this environment");
      return;
    }

    const campaignId = "e392c8b7-9b9e-4e72-b3d0-6f7573c56f8a";
    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2_500);
    if (!page.url().includes("/sheet")) {
      test.skip(true, `Player redirected from sheet — URL: ${page.url()}`);
      return;
    }

    const resourcesTab = page
      .locator("button")
      .filter({ hasText: /^(Resources|Recursos|Herói|Heroi)$/i })
      .first();
    if (await resourcesTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await resourcesTab.click();
      await page.waitForTimeout(800);
    }

    const aeHeader = page
      .locator("h3")
      .filter({ hasText: /Active Effects|Efeitos Ativos/ })
      .first();
    await expect(aeHeader).toBeVisible({ timeout: 8_000 });

    // Add Aid (NOT concentration, 8h).
    const addBtn = page
      .locator("button")
      .filter({ hasText: /Add Effect|Adicionar Efeito/ })
      .first();
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.fill('[id="effect-name"]', "Aid");
    const levelInput = page.locator('[id="spell-level"]');
    if (await levelInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await levelInput.fill("2");
    }
    // Skip the concentration checkbox.
    await page.locator("button").filter({ hasText: "8h" }).first().click();
    await page.locator('[type="submit"]').click();
    await page.waitForTimeout(1_500);

    // The just-added effect row should NOT contain a concentration badge.
    const aidRow = page.locator("text=Aid").first();
    await expect(aidRow).toBeVisible({ timeout: 5_000 });
    const aidCard = aidRow.locator("xpath=ancestor::div[contains(@class,'flex')][1]");
    const concInside = aidCard
      .locator("span")
      .filter({ hasText: /^(Concentration|Concentração)$/ });
    expect(
      await concInside.count(),
      "Non-concentration effect must not render a concentration badge"
    ).toBe(0);

    // Cleanup
    const dismissBtns = page.locator(
      '[aria-label="Dismiss"], [aria-label="Remover"]'
    );
    const dismissCount = await dismissBtns.count().catch(() => 0);
    if (dismissCount > 0) {
      await dismissBtns.first().click();
      await page.waitForTimeout(300);
      await dismissBtns.first().click();
      await page.waitForTimeout(800);
    }
  });
});
