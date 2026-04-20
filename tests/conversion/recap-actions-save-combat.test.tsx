/**
 * Epic 03, Story 03-D (F6) — regression unit tests for the
 * "Salvar Combate" render rule extracted in `RecapActions.shouldShowSaveCombat`.
 *
 * The rule went from a one-liner (`!onSaveAndSignup`) to a helper that
 * inspects the new `saveSignupContext` prop. These tests pin the truth
 * table documented in the epic (§D4, §Story 03-D AC) so accidental
 * regressions surface loudly — especially the first case, which covers
 * the existing auth-DM path that must keep seeing the button.
 */
import type { Combatant } from "@/lib/types/combat";
import type { SaveSignupContext } from "@/components/conversion/types";
import { shouldShowSaveCombat } from "@/components/combat/RecapActions";

const ANON_CTX: SaveSignupContext = {
  mode: "anon",
  sessionTokenId: "tok-abc",
  campaignId: "camp-1",
  characterId: "char-1",
  characterName: "Thorin",
};

const GUEST_NO_CAMP: SaveSignupContext = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1" } as unknown as Combatant],
};

const GUEST_WITH_CAMP: SaveSignupContext = {
  mode: "guest",
  characterName: "Thorin",
  guestCombatants: [{ id: "c-1" } as unknown as Combatant],
  campaignId: "camp-x",
};

const noop = () => {};

describe("shouldShowSaveCombat (Story 03-D, F6)", () => {
  it("returns true when neither saveSignupContext nor onSaveAndSignup are set (auth/DM legacy path — REGRESSION CRITICAL)", () => {
    expect(shouldShowSaveCombat(undefined, undefined)).toBe(true);
  });

  it("returns false when only onSaveAndSignup is set (guest legacy path — pre-03-E)", () => {
    expect(shouldShowSaveCombat(undefined, noop)).toBe(false);
  });

  it("returns true for anon context even without onSaveAndSignup", () => {
    expect(shouldShowSaveCombat(ANON_CTX, undefined)).toBe(true);
  });

  it("returns true for anon context with onSaveAndSignup set", () => {
    expect(shouldShowSaveCombat(ANON_CTX, noop)).toBe(true);
  });

  it("returns false for guest context without a campaignId (03-E baseline)", () => {
    expect(shouldShowSaveCombat(GUEST_NO_CAMP, undefined)).toBe(false);
    expect(shouldShowSaveCombat(GUEST_NO_CAMP, noop)).toBe(false);
  });

  it("returns true for guest context with a campaignId (edge case, full matrix completeness)", () => {
    expect(shouldShowSaveCombat(GUEST_WITH_CAMP, undefined)).toBe(true);
    expect(shouldShowSaveCombat(GUEST_WITH_CAMP, noop)).toBe(true);
  });
});
