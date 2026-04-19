/**
 * S5.1 — Polymorph / Wild Shape pure logic tests.
 *
 * Verifies the damage + healing + lifecycle math without wiring a store.
 * Critical invariants:
 * - Polymorph spell: overflow damage DISCARDED (original HP intact).
 * - Wild Shape: overflow damage CARRIES to original HP.
 * - Healing only affects form HP while transformed.
 * - `clearPolymorph` + `createPolymorphState` produce the expected shape.
 */

import {
  applyPolymorphDamage,
  applyPolymorphHealing,
  createPolymorphState,
  clearPolymorph,
} from "./polymorph";
import type { Combatant } from "@/lib/types/combat";

function makeBaseCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "test-1",
    name: "Aragorn",
    current_hp: 40,
    max_hp: 40,
    temp_hp: 0,
    initiative: 10,
    is_player: true,
    is_defeated: false,
    hp_status: "FULL",
    conditions: [],
    death_saves: { successes: 0, failures: 0 },
    ...overrides,
  } as Combatant;
}

function withPolymorph(c: Combatant, variant: "polymorph" | "wildshape", tempCurrent = 30, tempMax = 30): Combatant {
  return {
    ...c,
    polymorph: {
      enabled: true,
      variant,
      form_name: "Tyrannosaurus",
      temp_current_hp: tempCurrent,
      temp_max_hp: tempMax,
      started_at_turn: 0,
    },
  };
}

describe("applyPolymorphDamage", () => {
  it("no-ops when combatant is NOT polymorphed", () => {
    const c = makeBaseCombatant();
    const result = applyPolymorphDamage(c, 10);
    expect(result.next).toBe(c);
    expect(result.ended).toBe(false);
    expect(result.overflow).toBe(0);
  });

  it("no-ops on zero or negative damage", () => {
    const c = withPolymorph(makeBaseCombatant(), "polymorph");
    const zero = applyPolymorphDamage(c, 0);
    const negative = applyPolymorphDamage(c, -5);
    expect(zero.next).toBe(c);
    expect(negative.next).toBe(c);
    expect(zero.ended).toBe(false);
    expect(negative.ended).toBe(false);
  });

  it("polymorph variant: damage less than form HP reduces form HP, original intact", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "polymorph", 30, 30);
    const result = applyPolymorphDamage(c, 10);
    expect(result.ended).toBe(false);
    expect(result.next.polymorph?.temp_current_hp).toBe(20);
    expect(result.next.current_hp).toBe(40); // original HP untouched
  });

  it("polymorph variant: exact damage to 0 ends form, zero overflow, original intact", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "polymorph", 20, 20);
    const result = applyPolymorphDamage(c, 20);
    expect(result.ended).toBe(true);
    expect(result.overflow).toBe(0);
    expect(result.next.polymorph).toBeUndefined();
    expect(result.next.current_hp).toBe(40); // original HP preserved
    expect(result.variant).toBe("polymorph");
  });

  it("polymorph variant: overflow damage is DISCARDED (RAW spell behavior)", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "polymorph", 20, 20);
    const result = applyPolymorphDamage(c, 25); // 5 overflow, discarded
    expect(result.ended).toBe(true);
    // SPELL RULE: overflow is discarded — helper reports 0 so callers don't
    // accidentally double-apply it to the original HP.
    expect(result.overflow).toBe(0);
    expect(result.next.polymorph).toBeUndefined();
    expect(result.next.current_hp).toBe(40); // original preserved
  });

  it("wildshape variant: exact damage to 0 ends form, zero overflow, original intact", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "wildshape", 20, 20);
    const result = applyPolymorphDamage(c, 20);
    expect(result.ended).toBe(true);
    // Allow -0 or 0 (JS quirk with -newTempCurrent where newTempCurrent === 0)
    expect(result.overflow === 0).toBe(true);
    expect(result.next.polymorph).toBeUndefined();
    expect(result.next.current_hp).toBe(40);
    expect(result.variant).toBe("wildshape");
  });

  it("wildshape variant: overflow damage CARRIES to original HP (RAI druid behavior)", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "wildshape", 20, 20);
    const result = applyPolymorphDamage(c, 25); // 5 overflow
    expect(result.ended).toBe(true);
    expect(result.overflow).toBe(5);
    expect(result.next.polymorph).toBeUndefined();
    expect(result.next.current_hp).toBe(35); // WILDSHAPE RULE: 40 - 5 = 35
  });

  it("wildshape variant: overflow exceeding original HP brings combatant to 0", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "wildshape", 10, 30);
    const result = applyPolymorphDamage(c, 100); // 90 overflow
    expect(result.ended).toBe(true);
    expect(result.overflow).toBe(90);
    expect(result.next.polymorph).toBeUndefined();
    expect(result.next.current_hp).toBe(0);
  });

  it("wildshape variant: existing temp_hp on original absorbs overflow first", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40, temp_hp: 5 }), "wildshape", 10, 30);
    const result = applyPolymorphDamage(c, 18); // 8 overflow → 5 absorbed by temp_hp, 3 to HP
    expect(result.ended).toBe(true);
    expect(result.overflow).toBe(8);
    expect(result.next.temp_hp).toBe(0);
    expect(result.next.current_hp).toBe(37); // 40 - 3
  });
});

describe("applyPolymorphHealing", () => {
  it("no-ops when combatant is NOT polymorphed", () => {
    const c = makeBaseCombatant({ current_hp: 20 });
    const result = applyPolymorphHealing(c, 10);
    expect(result).toBe(c);
  });

  it("raises form HP only, capped at temp_max_hp", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 25 }), "polymorph", 10, 30);
    const result = applyPolymorphHealing(c, 15);
    expect(result.polymorph?.temp_current_hp).toBe(25); // 10 + 15
    expect(result.current_hp).toBe(25); // ORIGINAL UNTOUCHED — frozen during transformation
  });

  it("does not exceed temp_max_hp cap", () => {
    const c = withPolymorph(makeBaseCombatant({ current_hp: 40 }), "polymorph", 20, 30);
    const result = applyPolymorphHealing(c, 999);
    expect(result.polymorph?.temp_current_hp).toBe(30);
    expect(result.current_hp).toBe(40);
  });

  it("no-ops on zero or negative amounts", () => {
    const c = withPolymorph(makeBaseCombatant(), "polymorph", 10, 30);
    expect(applyPolymorphHealing(c, 0)).toBe(c);
    expect(applyPolymorphHealing(c, -5)).toBe(c);
  });
});

describe("createPolymorphState", () => {
  it("produces a valid polymorph object from inputs", () => {
    const result = createPolymorphState({
      variant: "polymorph",
      form_name: "Brown Bear",
      temp_max_hp: 34,
      started_at_turn: 3,
    });
    expect(result).toEqual({
      enabled: true,
      variant: "polymorph",
      form_name: "Brown Bear",
      temp_current_hp: 34, // starts at full
      temp_max_hp: 34,
      temp_ac: undefined,
      started_at_turn: 3,
    });
  });

  it("accepts optional temp_ac", () => {
    const result = createPolymorphState({
      variant: "wildshape",
      form_name: "Dire Wolf",
      temp_max_hp: 37,
      temp_ac: 14,
      started_at_turn: 1,
    });
    expect(result.variant).toBe("wildshape");
    expect(result.temp_ac).toBe(14);
    expect(result.temp_current_hp).toBe(37);
    expect(result.temp_max_hp).toBe(37);
  });

  it("floors temp_max_hp at 1 (defensive against 0 / negative inputs)", () => {
    const result = createPolymorphState({
      variant: "polymorph",
      form_name: "Tiny Form",
      temp_max_hp: 0,
      started_at_turn: 0,
    });
    expect(result.temp_current_hp).toBe(1);
    expect(result.temp_max_hp).toBe(1);
  });
});

describe("clearPolymorph", () => {
  it("removes the polymorph object entirely (manual end)", () => {
    const c = withPolymorph(makeBaseCombatant(), "polymorph", 20, 30);
    const result = clearPolymorph(c);
    expect(result.polymorph).toBeUndefined();
  });

  it("preserves original HP on manual end (no residual damage)", () => {
    const c = withPolymorph(
      makeBaseCombatant({ current_hp: 40, max_hp: 40 }),
      "polymorph",
      5,
      30,
    );
    const result = clearPolymorph(c);
    expect(result.current_hp).toBe(40);
    expect(result.max_hp).toBe(40);
  });
});
