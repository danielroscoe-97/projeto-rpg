import { PlayerRegistrationSchema } from "../player-registration";

describe("PlayerRegistrationSchema", () => {
  describe("valid", () => {
    it("accepts a normal registration", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(true);
    });

    it("trims whitespace on name", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "  Hero  ",
        initiative: 15,
        hp: 30,
        ac: 16,
      });
      if (!result.success) throw new Error("expected success");
      expect(result.data.name).toBe("Hero");
    });

    it("accepts high initiative (no upper cap — F05 2026-04-24)", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "BBEG",
        initiative: 150,
        hp: 400,
        ac: 22,
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable hp and ac", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15,
        hp: null,
        ac: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid name", () => {
    it("rejects empty name", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "",
        initiative: 15,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
    });

    it("rejects whitespace-only name (trim + min 1)", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "   ",
        initiative: 15,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });

    it("rejects name longer than 50 chars", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "a".repeat(51),
        initiative: 15,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });
  });

  describe("invalid initiative", () => {
    it("rejects 0 (below floor of 1)", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 0,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.flatten().fieldErrors.initiative).toBeDefined();
    });

    it("rejects negative initiative", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: -1,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer initiative", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15.5,
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
    });

    it("rejects string initiative", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: "15",
        hp: 30,
        ac: 16,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid hp", () => {
    it("rejects 0 hp (must be positive when not null)", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15,
        hp: 0,
        ac: 16,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative hp", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15,
        hp: -10,
        ac: 16,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid ac", () => {
    it("rejects 0 ac", () => {
      const result = PlayerRegistrationSchema.safeParse({
        name: "Hero",
        initiative: 15,
        hp: 30,
        ac: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("type inference", () => {
    it("PlayerRegistration inferred type accepts data.name / initiative / hp / ac", () => {
      // Compile-time test: TS will fail build if shape drifts.
      const sample: import("../player-registration").PlayerRegistration = {
        name: "Hero",
        initiative: 15,
        hp: 30,
        ac: 16,
      };
      expect(sample.name).toBe("Hero");
    });
  });
});
