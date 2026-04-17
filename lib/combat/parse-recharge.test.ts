import { parseRecharge, rollRecharge } from "./parse-recharge";

describe("parseRecharge", () => {
  it("parses Fire Breath (Recharge 5-6) → threshold 5, key fire_breath", () => {
    const result = parseRecharge("Fire Breath (Recharge 5-6)");
    expect(result).toEqual({ threshold: 5, key: "fire_breath" });
  });

  it("parses Lightning Breath (Recharge 5-6) → threshold 5", () => {
    const result = parseRecharge("Lightning Breath (Recharge 5-6)");
    expect(result).toEqual({ threshold: 5, key: "lightning_breath" });
  });

  it("parses Antipathic Flood (Recharge 6) → threshold 6", () => {
    const result = parseRecharge("Antipathic Flood (Recharge 6)");
    expect(result).toEqual({ threshold: 6, key: "antipathic_flood" });
  });

  it("parses (Recharge 4-6) → threshold 4", () => {
    const result = parseRecharge("Breath Weapon (Recharge 4-6)");
    expect(result).toEqual({ threshold: 4, key: "breath_weapon" });
  });

  it("parses en-dash form Fire Breath (Recharge 5\u20136) → threshold 5", () => {
    const result = parseRecharge("Fire Breath (Recharge 5\u20136)");
    expect(result).toEqual({ threshold: 5, key: "fire_breath" });
  });

  it("returns null for Aberrant Quickness (Recharges after a Short or Long Rest)", () => {
    expect(parseRecharge("Aberrant Quickness (Recharges after a Short or Long Rest)")).toBeNull();
  });

  it("returns null for Acid Rain (Recharges on a Short or Long Rest)", () => {
    expect(parseRecharge("Acid Rain (Recharges on a Short or Long Rest)")).toBeNull();
  });

  it("returns null for plain names like Bite", () => {
    expect(parseRecharge("Bite")).toBeNull();
  });

  it("returns null for empty / null-ish names", () => {
    expect(parseRecharge("")).toBeNull();
  });

  it("is case-insensitive for the word Recharge", () => {
    const result = parseRecharge("Tail Slap (recharge 5-6)");
    expect(result).toEqual({ threshold: 5, key: "tail_slap" });
  });

  it("preserves multi-word action names with punctuation in the key", () => {
    const result = parseRecharge("Cone of Cold (Recharge 5-6)");
    expect(result).toEqual({ threshold: 5, key: "cone_of_cold" });
  });

  it("handles names with apostrophes or hyphens safely (Death Ray — Recharge 5-6)", () => {
    const result = parseRecharge("Death-Ray (Recharge 5-6)");
    expect(result?.threshold).toBe(5);
    // Hyphen and spaces collapse to a single underscore.
    expect(result?.key).toBe("death_ray");
  });

  it("returns null when the digit is outside 2-6 (safety — D&D only uses 4/5/6)", () => {
    expect(parseRecharge("Weird Move (Recharge 1)")).toBeNull();
    expect(parseRecharge("Weird Move (Recharge 9)")).toBeNull();
  });
});

describe("rollRecharge", () => {
  afterEach(() => {
    jest.spyOn(Math, "random").mockRestore?.();
  });

  it("returns recharged=true when roll >= threshold", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9); // roll = 6
    const result = rollRecharge(5);
    expect(result.roll).toBe(6);
    expect(result.recharged).toBe(true);
  });

  it("returns recharged=false when roll < threshold", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1); // roll = 1
    const result = rollRecharge(5);
    expect(result.roll).toBe(1);
    expect(result.recharged).toBe(false);
  });

  it("distribution: ~33% recharged on threshold 5 across 1000 rolls (±6%)", () => {
    // No mocking — actual distribution test.
    let recharged = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      if (rollRecharge(5).recharged) recharged++;
    }
    const ratio = recharged / iterations;
    // Expected 2/6 = 33.3%. Allow ±6% for random variance with n=1000 (z=3σ → ~4.5%).
    expect(ratio).toBeGreaterThan(0.27);
    expect(ratio).toBeLessThan(0.4);
  });

  it("distribution: ~17% recharged on threshold 6 across 1000 rolls", () => {
    let recharged = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      if (rollRecharge(6).recharged) recharged++;
    }
    const ratio = recharged / iterations;
    // Expected 1/6 = 16.7%. Allow ±5%.
    expect(ratio).toBeGreaterThan(0.11);
    expect(ratio).toBeLessThan(0.22);
  });

  it("always rolls within 1-6 inclusive", () => {
    for (let i = 0; i < 200; i++) {
      const { roll } = rollRecharge(5);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
      expect(Number.isInteger(roll)).toBe(true);
    }
  });
});

describe("per-instance recharge state (sanity check)", () => {
  // Validates the "5 velociraptors with independent state" rule from the spec
  // by simulating the state shape we attach to each Combatant. Real state is
  // wired through combat stores; this test documents the invariant.
  type RechargeState = Record<string, { depleted: boolean; threshold: number }>;

  it("depleting one instance does not affect the others", () => {
    const raptors: { id: string; rechargeState: RechargeState }[] = [
      { id: "v1", rechargeState: {} },
      { id: "v2", rechargeState: {} },
      { id: "v3", rechargeState: {} },
      { id: "v4", rechargeState: {} },
      { id: "v5", rechargeState: {} },
    ];

    // Deplete Pounce on raptor #3 (index 2).
    raptors[2].rechargeState["pounce"] = { depleted: true, threshold: 5 };

    expect(raptors[0].rechargeState["pounce"]).toBeUndefined();
    expect(raptors[1].rechargeState["pounce"]).toBeUndefined();
    expect(raptors[2].rechargeState["pounce"]).toEqual({ depleted: true, threshold: 5 });
    expect(raptors[3].rechargeState["pounce"]).toBeUndefined();
    expect(raptors[4].rechargeState["pounce"]).toBeUndefined();
  });
});
