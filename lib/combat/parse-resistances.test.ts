import { describe, it, expect } from "vitest";
import { parseDamageModifiers, applyDamageModifier, DAMAGE_TYPES } from "./parse-resistances";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { DamageModifiers } from "@/lib/types/combat";

function makeMockMonster(overrides: Partial<SrdMonster> = {}): SrdMonster {
  return {
    id: "test", name: "Test", cr: "1", type: "beast",
    hit_points: 10, armor_class: 10, ruleset_version: "2024",
    ...overrides,
  };
}

describe("parseDamageModifiers", () => {
  it("parses simple semicolon-separated resistances (Fire Elemental)", () => {
    const monster = makeMockMonster({
      damage_resistances: "bludgeoning; piercing; slashing",
      damage_immunities: "fire; poison",
      condition_immunities: "exhaustion; grappled; paralyzed; petrified; poisoned; prone; restrained; unconscious",
    });
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toHaveLength(3);
    expect(result.resistances.map((r) => r.type)).toEqual(["bludgeoning", "piercing", "slashing"]);
    expect(result.immunities).toHaveLength(2);
    expect(result.immunities.map((r) => r.type)).toEqual(["fire", "poison"]);
    expect(result.conditionImmunities).toHaveLength(8);
    expect(result.conditionImmunities).toContain("Exhaustion");
    expect(result.conditionImmunities).toContain("Poisoned");
  });

  it("parses simple immunity (Adult Red Dragon)", () => {
    const monster = makeMockMonster({ damage_immunities: "fire" });
    const result = parseDamageModifiers(monster);
    expect(result.immunities).toEqual([{ type: "fire" }]);
  });

  it("parses single resistance (Mind Flayer)", () => {
    const monster = makeMockMonster({ damage_resistances: "psychic" });
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toEqual([{ type: "psychic" }]);
  });

  it("parses multiple immunities semicolons (Demilich)", () => {
    const monster = makeMockMonster({
      damage_resistances: "bludgeoning; piercing; slashing",
      damage_immunities: "necrotic; poison; psychic",
    });
    const result = parseDamageModifiers(monster);
    expect(result.immunities).toHaveLength(3);
    expect(result.immunities.map((i) => i.type)).toEqual(["necrotic", "poison", "psychic"]);
  });

  it("parses conditional resistance (SRD 2014 style)", () => {
    const monster = makeMockMonster({
      damage_resistances: "bludgeoning, piercing, and slashing from nonmagical attacks",
    });
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toHaveLength(3);
    result.resistances.forEach((r) => {
      expect(r.condition).toBe("from nonmagical attacks");
    });
  });

  it("parses conditional with exception (silvered)", () => {
    const monster = makeMockMonster({
      damage_resistances: "bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered",
    });
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toHaveLength(3);
    result.resistances.forEach((r) => {
      expect(r.condition).toContain("silvered");
    });
  });

  it("parses mixed conditional + unconditional (semicolon separated)", () => {
    const monster = makeMockMonster({
      damage_resistances: "fire; bludgeoning, piercing, and slashing from nonmagical attacks",
    });
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toHaveLength(4);
    expect(result.resistances[0]).toEqual({ type: "fire" });
    expect(result.resistances[1].condition).toBe("from nonmagical attacks");
  });

  it("handles null/undefined fields", () => {
    const monster = makeMockMonster();
    const result = parseDamageModifiers(monster);
    expect(result.resistances).toEqual([]);
    expect(result.immunities).toEqual([]);
    expect(result.vulnerabilities).toEqual([]);
    expect(result.conditionImmunities).toEqual([]);
  });

  it("parses vulnerability", () => {
    const monster = makeMockMonster({ damage_vulnerabilities: "fire" });
    const result = parseDamageModifiers(monster);
    expect(result.vulnerabilities).toEqual([{ type: "fire" }]);
  });
});

describe("applyDamageModifier", () => {
  const fireImmune: DamageModifiers = {
    resistances: [],
    immunities: [{ type: "fire" }],
    vulnerabilities: [],
    conditionImmunities: [],
  };

  const coldResistant: DamageModifiers = {
    resistances: [{ type: "cold" }],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
  };

  const fireVulnerable: DamageModifiers = {
    resistances: [],
    immunities: [],
    vulnerabilities: [{ type: "fire" }],
    conditionImmunities: [],
  };

  const conditionalResistance: DamageModifiers = {
    resistances: [{ type: "slashing", condition: "from nonmagical attacks" }],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
  };

  it("returns 0 for immune damage type", () => {
    const result = applyDamageModifier(20, "Fire", fireImmune);
    expect(result).toEqual({ finalDamage: 0, applied: "immune" });
  });

  it("halves resistant damage (rounds down)", () => {
    const result = applyDamageModifier(15, "Cold", coldResistant);
    expect(result).toEqual({ finalDamage: 7, applied: "resistant" });
  });

  it("doubles vulnerable damage", () => {
    const result = applyDamageModifier(10, "Fire", fireVulnerable);
    expect(result).toEqual({ finalDamage: 20, applied: "vulnerable" });
  });

  it("returns normal for non-matching damage type", () => {
    const result = applyDamageModifier(10, "Lightning", fireImmune);
    expect(result).toEqual({ finalDamage: 10, applied: "normal" });
  });

  it("ignores conditional modifiers by default", () => {
    const result = applyDamageModifier(10, "Slashing", conditionalResistance);
    expect(result).toEqual({ finalDamage: 10, applied: "normal" });
  });

  it("applies conditional modifiers when ignoreConditional is false", () => {
    const result = applyDamageModifier(10, "Slashing", conditionalResistance, false);
    expect(result).toEqual({ finalDamage: 5, applied: "resistant" });
  });

  it("handles case-insensitive damage types", () => {
    const result = applyDamageModifier(20, "FIRE", fireImmune);
    expect(result).toEqual({ finalDamage: 0, applied: "immune" });
  });
});

describe("DAMAGE_TYPES constant", () => {
  it("includes all 13 D&D 5e damage types", () => {
    expect(DAMAGE_TYPES).toHaveLength(13);
    expect(DAMAGE_TYPES).toContain("acid");
    expect(DAMAGE_TYPES).toContain("fire");
    expect(DAMAGE_TYPES).toContain("force");
    expect(DAMAGE_TYPES).toContain("thunder");
  });
});
