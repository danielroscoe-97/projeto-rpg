import { test, expect } from "@playwright/test";

/**
 * Gate Fase A — Post-Combat Screen state preservation contract.
 *
 * Spec: `_bmad-output/party-mode-2026-04-22/20-post-combat-screen-spec.md`
 * §Decisões travadas line "HP, spell slots, conditions restantes VISÍVEIS.
 * Valores reais do estado final do combate."
 *
 * Dormant in Sprint 2 — `PostCombatBanner` is shipped but not mounted
 * (Sprint 3 HeroiTab wiring). Once mounted, this spec asserts: the HP /
 * spell slots / conditions rendered in the banner match the final state
 * of the ended combat (not stale pre-combat values).
 */
test.describe("Post-Combat Screen — end-of-combat state preserved", () => {
  test.skip(
    true,
    "Dormant until Sprint 3 mounts PostCombatBanner in HeroiTab. " +
      "Flip to `test.skip(process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== 'true')` " +
      "when wiring lands.",
  );

  test("banner HP/slots/conditions match combat's final state", async ({ page }) => {
    // Placeholder — real implementation when mount lands in Sprint 3:
    //
    // 1. seed combat with known final state (character at 45/88 HP,
    //    slots I 2/4, conditions ["blessed"]) via init script
    // 2. goto /sheet?tab=heroi with flag ON
    // 3. await expect(banner HP).toHaveText(/45\s*\/\s*88/)
    // 4. await expect(banner MODERATE tier badge).toBeVisible()
    // 5. for each expected slot level, assert ratio text
    // 6. for each expected condition, assert chip visible
    expect(true).toBe(true);
  });
});
