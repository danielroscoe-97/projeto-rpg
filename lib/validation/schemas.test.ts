import {
  playerCharacterSchema,
  campaignSchema,
  combatantStatsSchema,
  hpAdjustmentSchema,
  sessionIdSchema,
} from "./schemas";

describe("playerCharacterSchema", () => {
  it("accepts valid input", () => {
    const result = playerCharacterSchema.safeParse({
      name: "Aragorn",
      max_hp: 40,
      current_hp: 40,
      ac: 18,
      spell_save_dc: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = playerCharacterSchema.safeParse({
      name: "",
      max_hp: 40,
      current_hp: 40,
      ac: 18,
      spell_save_dc: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative HP", () => {
    const result = playerCharacterSchema.safeParse({
      name: "Test",
      max_hp: -1,
      current_hp: 0,
      ac: 10,
      spell_save_dc: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("campaignSchema", () => {
  it("accepts valid campaign", () => {
    const result = campaignSchema.safeParse({ name: "Dragon Quest" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = campaignSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("combatantStatsSchema", () => {
  it("accepts partial stats update", () => {
    const result = combatantStatsSchema.safeParse({ name: "Goblin King", ac: 16 });
    expect(result.success).toBe(true);
  });

  it("rejects invalid AC", () => {
    const result = combatantStatsSchema.safeParse({ ac: -1 });
    expect(result.success).toBe(false);
  });
});

describe("hpAdjustmentSchema", () => {
  it("accepts positive amount", () => {
    expect(hpAdjustmentSchema.safeParse({ amount: 5 }).success).toBe(true);
  });

  it("rejects negative amount", () => {
    expect(hpAdjustmentSchema.safeParse({ amount: -1 }).success).toBe(false);
  });
});

describe("sessionIdSchema", () => {
  it("accepts valid UUID", () => {
    expect(
      sessionIdSchema.safeParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11").success
    ).toBe(true);
  });

  it("rejects non-UUID string", () => {
    expect(sessionIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
