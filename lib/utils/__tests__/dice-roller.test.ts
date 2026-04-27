/**
 * Unit tests — `lib/utils/dice-roller.ts` (Wave 3b · Story C7).
 *
 * The dice-roller wraps `lib/utils/dice.ts` with UI-oriented helpers used by
 * the AbilityChip surface. These tests stub `Math.random` to make every roll
 * deterministic — the engine itself is already exercised in dice tests, so
 * here we validate:
 *
 *   1. Modifier application (check vs save, prof vs not).
 *   2. Roll mode (normal / advantage / disadvantage).
 *   3. Formula string formatting (positive, negative, zero modifier).
 *   4. Proficiency bonus is NEVER added to ability checks (PHB p.174).
 */

import { rollAbilityCheck, rollAbilitySave, rollD20WithMod } from "../dice-roller";

/**
 * Deterministically force every die in the test to roll a fixed value.
 * `dice.ts` uses `Math.floor(Math.random() * faces) + 1`, so a stub that
 * returns `(value - 1) / faces` produces exactly `value`.
 */
function forceRoll(value: number, faces = 20) {
  jest.spyOn(Math, "random").mockReturnValue((value - 1) / faces);
}

/**
 * Force a sequence of values for back-to-back rolls (used for adv/disadv
 * which roll 2 dice in one engine call).
 */
function forceRolls(values: number[], faces = 20) {
  let i = 0;
  jest.spyOn(Math, "random").mockImplementation(() => {
    const v = values[i % values.length];
    i++;
    return (v - 1) / faces;
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("rollAbilityCheck", () => {
  it("rolls 1d20 + abilityMod when normal", () => {
    forceRoll(13);
    const result = rollAbilityCheck("str", 2);
    expect(result.total).toBe(15);
    expect(result.modifier).toBe(2);
    expect(result.proficient).toBe(false);
    expect(result.mode).toBe("normal");
    expect(result.formula).toBe("1d20 + 2");
    expect(result.rolls).toEqual([13]);
    expect(result.ability).toBe("str");
    expect(result.rollType).toBe("check");
  });

  it("never includes proficiency bonus (raw ability check rule)", () => {
    // Caller can NOT signal "proficient" on a check — by design — so the
    // signature itself prevents the foot-gun. This test pins the API down.
    forceRoll(10);
    const result = rollAbilityCheck("dex", 4);
    expect(result.proficient).toBe(false);
    expect(result.total).toBe(14); // 10 + 4 (no prof bonus added)
  });

  it("formats negative modifier with minus sign", () => {
    forceRoll(8);
    const result = rollAbilityCheck("int", -1);
    expect(result.formula).toBe("1d20 - 1");
    expect(result.total).toBe(7);
  });

  it("omits modifier from formula when modifier is 0", () => {
    forceRoll(15);
    const result = rollAbilityCheck("wis", 0);
    expect(result.formula).toBe("1d20");
    expect(result.total).toBe(15);
  });

  it("rolls advantage as 2d20kh1 — keeps the higher die", () => {
    forceRolls([7, 18]);
    const result = rollAbilityCheck("cha", 3, "advantage");
    expect(result.mode).toBe("advantage");
    expect(result.formula).toBe("2d20kh1 + 3");
    expect(result.rolls).toEqual([7, 18]);
    expect(result.total).toBe(21); // 18 (kept) + 3
    expect(result.keptIndex).toBe(1);
  });

  it("rolls disadvantage as 2d20kl1 — keeps the lower die", () => {
    forceRolls([4, 19]);
    const result = rollAbilityCheck("con", 1, "disadvantage");
    expect(result.formula).toBe("2d20kl1 + 1");
    expect(result.total).toBe(5); // 4 (kept) + 1
    expect(result.keptIndex).toBe(0);
  });
});

describe("rollAbilitySave", () => {
  it("includes proficiency bonus when proficient", () => {
    forceRoll(14);
    // CON save with mod +4, prof bonus +4, proficient
    const result = rollAbilitySave("con", 4, 4, true);
    expect(result.total).toBe(22); // 14 + 4 + 4
    expect(result.modifier).toBe(8);
    expect(result.proficient).toBe(true);
    expect(result.rollType).toBe("save");
    expect(result.formula).toBe("1d20 + 8 (prof)");
  });

  it("excludes proficiency bonus when NOT proficient", () => {
    forceRoll(14);
    // STR save with mod +0, prof bonus +3, NOT proficient
    const result = rollAbilitySave("str", 0, 3, false);
    expect(result.total).toBe(14); // 14 + 0 (no prof)
    expect(result.modifier).toBe(0);
    expect(result.proficient).toBe(false);
    expect(result.formula).toBe("1d20");
  });

  it("formats prof suffix only when actually proficient", () => {
    forceRoll(10);
    const profSave = rollAbilitySave("wis", 2, 3, true);
    expect(profSave.formula).toContain("(prof)");

    forceRoll(10);
    const noProfSave = rollAbilitySave("wis", 2, 3, false);
    expect(noProfSave.formula).not.toContain("(prof)");
  });

  it("supports advantage with proficiency", () => {
    forceRolls([5, 17]);
    const result = rollAbilitySave("cha", 3, 2, true, "advantage");
    expect(result.total).toBe(22); // 17 + 3 + 2
    expect(result.formula).toBe("2d20kh1 + 5 (prof)");
  });

  it("supports disadvantage without proficiency", () => {
    forceRolls([15, 6]);
    const result = rollAbilitySave("dex", -2, 4, false, "disadvantage");
    expect(result.total).toBe(4); // 6 + (-2)
    expect(result.formula).toBe("2d20kl1 - 2");
  });
});

describe("rollD20WithMod", () => {
  it("returns the raw engine result (no UI wrapping)", () => {
    forceRoll(11);
    const result = rollD20WithMod(2);
    // Engine result has `total`, `rolls`, `modifier`, `notation`, `kept`.
    expect(result.total).toBe(13);
    expect(result.modifier).toBe(2);
    expect(result.notation).toBe("1d20+2");
  });

  it("supports advantage mode", () => {
    forceRolls([3, 16]);
    const result = rollD20WithMod(0, "advantage");
    expect(result.total).toBe(16);
    expect(result.notation).toBe("2d20kh1");
  });
});
