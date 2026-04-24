import { test, expect } from "@playwright/test";

/**
 * Gate Fase A — Post-Combat Screen MUST NOT auto-dismiss.
 *
 * Spec: `_bmad-output/party-mode-2026-04-22/20-post-combat-screen-spec.md`
 * §Decisões travadas line "Auto-dismiss: NÃO. Fica na tela até click
 * explícito."
 *
 * Dormant in Sprint 2 — the `PostCombatBanner` component is shipped but
 * not mounted by `PlayerHqShell` (Sprint 3 HeroiTab wires the mount).
 * Once mounted, this spec asserts: after 30s of inactivity with flag ON
 * on /sheet, the banner is still visible. Keeping the file in-tree so
 * Sprint 3 can flip the skip off in a one-line change rather than
 * authoring a new spec under review pressure.
 */
test.describe("Post-Combat Screen — no auto-dismiss contract", () => {
  test.skip(
    true,
    "Dormant until Sprint 3 mounts PostCombatBanner in HeroiTab. " +
      "Flip to `test.skip(process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== 'true')` " +
      "when wiring lands.",
  );

  test("banner stays visible after 30s without user interaction", async ({ page }) => {
    // Placeholder — real implementation when mount lands in Sprint 3:
    //
    // 1. seed a post-combat snapshot via page.addInitScript before navigate
    // 2. await page.goto(`/app/campaigns/${id}/sheet?tab=heroi`)
    // 3. await expect(page.getByTestId("post-combat-banner")).toBeVisible()
    // 4. await page.waitForTimeout(30_000) — acceptable here because the
    //    assertion IS the 30s duration; no shorter way to verify absence
    //    of a timer without stubbing timers (which would defeat the point)
    // 5. await expect(page.getByTestId("post-combat-banner")).toBeVisible()
    expect(true).toBe(true);
  });
});
