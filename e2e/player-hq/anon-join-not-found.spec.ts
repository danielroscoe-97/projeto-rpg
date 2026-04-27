/**
 * F03 / F08 — Anon-mode parity smoke for the /join/[token] SSR.
 *
 * Both F03 (SosResyncButton in PlayerInitiativeBoard) and F08 (SrdInitializer
 * fullData propagation) hang off the /join/[token] SSR. Anon mode is the
 * critical surface — anonymous players join via this route and never log in.
 *
 * This smoke covers the anon-path SSR error rendering (the "session not
 * found" branch) so regressions in the SSR fetch chain are caught quickly.
 * The full happy-path anon flow is covered by e2e/journeys/j2-player-join.spec.ts;
 * this is the parity evidence for PR #95 with minimal seeding.
 */
import { test, expect } from "@playwright/test";

test.describe("Anon /join/[token] SSR — invalid token branch", () => {
  test("renders 'session not found' for an unknown token (no login required)", async ({ page }) => {
    // No loginAs — anon browser, no session_tokens row matches.
    await page.goto("/join/this-token-does-not-exist-zzzz", {
      waitUntil: "domcontentloaded",
    });

    // The SSR error branch renders the i18n'd "session_not_found" heading.
    // PT-BR + EN both acceptable to keep the test locale-agnostic.
    const heading = page.getByRole("heading", {
      name: /Combate Não Encontrado|Combat Not Found|Session Not Found|Sessão Não Encontrada/i,
    });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // No SosResyncButton on the error page — confirms the Anon SSR didn't
    // accidentally render PlayerInitiativeBoard for an invalid token.
    const sosBtn = page.locator('[data-testid="sos-resync-btn"]');
    await expect(sosBtn).toHaveCount(0);
  });
});
