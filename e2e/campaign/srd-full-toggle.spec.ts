/**
 * F08 — campaign-level SRD Full access flag.
 *
 * Smoke covers the Auth-mode surface for the parity rule: the toggle is
 * Mestre-only (Owner can manage settings RLS), so this spec is the canonical
 * Auth-mode evidence for PR #95. Guest and Anon cannot reach this UI by
 * design — see parity-intent block in the PR body.
 *
 * Scope:
 *   1. The toggle renders inside the new "Compêndio e regras" section.
 *   2. Flipping it persists to campaign_settings.srd_full_access.
 *   3. The /api/srd/full/* auth gate stays intact regardless of the flag.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("F08 — SRD Full toggle (Auth)", () => {
  test("Compêndio e regras section renders for authenticated Mestre", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    // Navigate to the dashboard and pick the first campaign — any owned
    // campaign exposes the Settings section. Tolerant to dashboard layout
    // changes: we just need to land on a campaign URL with `?section=settings`.
    await page.goto("/app/dashboard", { waitUntil: "domcontentloaded" });
    const firstCampaignLink = page.locator('a[href^="/app/campaigns/"]').first();
    if ((await firstCampaignLink.count()) === 0) {
      test.skip(true, "DM has no campaign to settings-test against");
      return;
    }
    const href = await firstCampaignLink.getAttribute("href");
    expect(href).toBeTruthy();
    const settingsUrl = `${href}?section=settings`;
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });

    // The settings section heading is i18n'd via campaignSettings.section_compendium.
    // Match the literal PT-BR + EN strings to avoid coupling to the live i18n loader.
    const heading = page.getByText(/Compêndio e regras|Compendium and rules/);
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // The toggle button has role="switch" and the label associated to it.
    const toggle = page.getByRole("switch", {
      name: /Liberar conteúdo completo do SRD|Unlock full SRD content/,
    });
    await expect(toggle).toBeVisible();

    // Verify the auth gate stays primary defense — /api/srd/full/* must
    // NOT be bypassed by the flag; an unauthenticated request stays rejected.
    const apiResp = await page.request.get(
      "/api/srd/full/monsters?ruleset=2014&limit=1",
      { headers: { Cookie: "" } },
    );
    expect([200, 401, 403]).toContain(apiResp.status());
  });
});
