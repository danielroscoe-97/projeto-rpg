import {
  isCustomCondition,
  parseCustomCondition,
  formatCustomCondition,
  CUSTOM_CONDITION_PREFIX,
} from "./custom-conditions";

describe("S4.2 — custom conditions parser", () => {
  describe("isCustomCondition", () => {
    it("recognises `custom:Name`", () => {
      expect(isCustomCondition("custom:Bless")).toBe(true);
    });

    it("recognises `custom:Name|Desc`", () => {
      expect(isCustomCondition("custom:Bless|Abençoado")).toBe(true);
    });

    it("does NOT collide with `concentrating:Fireball`", () => {
      expect(isCustomCondition("concentrating:Fireball")).toBe(false);
    });

    it("does NOT collide with plain `concentrating`", () => {
      expect(isCustomCondition("concentrating")).toBe(false);
    });

    it("does NOT collide with `exhaustion:3`", () => {
      expect(isCustomCondition("exhaustion:3")).toBe(false);
    });

    it("does NOT collide with standard SRD conditions (e.g. `Stunned`)", () => {
      expect(isCustomCondition("Stunned")).toBe(false);
      expect(isCustomCondition("Blessed")).toBe(false);
    });
  });

  describe("parseCustomCondition — round trip", () => {
    it("parses `custom:Bless` into { name: 'Bless', description: undefined }", () => {
      expect(parseCustomCondition("custom:Bless")).toEqual({
        name: "Bless",
        description: undefined,
      });
    });

    it("parses `custom:Bless|Abençoado` into name + description", () => {
      expect(parseCustomCondition("custom:Bless|Abençoado")).toEqual({
        name: "Bless",
        description: "Abençoado",
      });
    });

    it("normalises empty-description (pipe with empty payload) to undefined", () => {
      expect(parseCustomCondition("custom:Bless|")).toEqual({
        name: "Bless",
        description: undefined,
      });
    });

    it("normalises whitespace-only description to undefined", () => {
      expect(parseCustomCondition("custom:Bless|   ")).toEqual({
        name: "Bless",
        description: undefined,
      });
    });

    it("returns empty name on `custom:` (malformed)", () => {
      expect(parseCustomCondition("custom:")).toEqual({
        name: "",
        description: undefined,
      });
    });

    it("returns empty name on non-custom input (defensive)", () => {
      expect(parseCustomCondition("Stunned")).toEqual({ name: "" });
      expect(parseCustomCondition("concentrating:Bless")).toEqual({ name: "" });
    });
  });

  describe("formatCustomCondition — sanitisation + limits", () => {
    it("builds `custom:Name` when description is missing", () => {
      expect(formatCustomCondition("Bless")).toBe("custom:Bless");
    });

    it("builds `custom:Name|Desc` when both are present", () => {
      expect(formatCustomCondition("Bless", "Abençoado")).toBe(
        "custom:Bless|Abençoado"
      );
    });

    it("strips `|` from name and description to keep parser safe", () => {
      expect(formatCustomCondition("Bless|Aura", "holy | power")).toBe(
        "custom:BlessAura|holy  power"
      );
    });

    it("trims surrounding whitespace", () => {
      expect(formatCustomCondition("  Bless  ", "  Abençoado  ")).toBe(
        "custom:Bless|Abençoado"
      );
    });

    it("caps name at 32 chars and description at 200 chars", () => {
      const longName = "A".repeat(50);
      const longDesc = "B".repeat(300);
      const result = formatCustomCondition(longName, longDesc);
      const parsed = parseCustomCondition(result);
      expect(parsed.name).toHaveLength(32);
      expect(parsed.description ?? "").toHaveLength(200);
    });

    it("throws on empty name (caller responsibility to validate UI first)", () => {
      expect(() => formatCustomCondition("   ")).toThrow(/non-empty/);
    });

    it("round-trips cleanly through format → parse", () => {
      const str = formatCustomCondition("Cego Histérico", "Attack em disadvantage");
      expect(str.startsWith(CUSTOM_CONDITION_PREFIX)).toBe(true);
      expect(parseCustomCondition(str)).toEqual({
        name: "Cego Histérico",
        description: "Attack em disadvantage",
      });
    });
  });

  describe("cross-parser safety", () => {
    it("`custom:concentrating|X` does NOT match concentrating parser semantics", () => {
      // Concentrating parser uses `c === "concentrating" || c.startsWith("concentrating:")`.
      const raw = "custom:concentrating|X";
      expect(isCustomCondition(raw)).toBe(true);
      expect(raw.startsWith("concentrating:")).toBe(false);
      expect(raw === "concentrating").toBe(false);
    });
  });
});
