import { SRD_CLASSES } from "../classes";
import type { ClassOption } from "../classes";

describe("SRD_CLASSES", () => {
  it("contains entries", () => {
    expect(SRD_CLASSES.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const cls of SRD_CLASSES) {
      expect(cls.id).toBeTruthy();
      expect(cls.name).toBeTruthy();
      expect(["2014", "2024"]).toContain(cls.source);
    }
  });

  it("has unique ids", () => {
    const ids = SRD_CLASSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes both 2014 and 2024 sources", () => {
    const sources = new Set(SRD_CLASSES.map((c) => c.source));
    expect(sources.has("2014")).toBe(true);
    expect(sources.has("2024")).toBe(true);
  });

  it("includes all 12 core classes per source", () => {
    const coreNames = [
      "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk",
      "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
    ];
    for (const source of ["2014", "2024"] as const) {
      const names = SRD_CLASSES.filter((c) => c.source === source).map((c) => c.name);
      for (const name of coreNames) {
        expect(names).toContain(name);
      }
    }
  });

  it("satisfies ClassOption type", () => {
    const first: ClassOption = SRD_CLASSES[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.name).toBe("string");
  });
});
