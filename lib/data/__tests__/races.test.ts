import { SRD_RACES } from "../races";
import type { RaceOption } from "../races";

describe("SRD_RACES", () => {
  it("contains entries", () => {
    expect(SRD_RACES.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const race of SRD_RACES) {
      expect(race.id).toBeTruthy();
      expect(race.name).toBeTruthy();
      expect(["2014", "2024"]).toContain(race.source);
    }
  });

  it("has unique ids", () => {
    const ids = SRD_RACES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes both 2014 and 2024 sources", () => {
    const sources = new Set(SRD_RACES.map((r) => r.source));
    expect(sources.has("2014")).toBe(true);
    expect(sources.has("2024")).toBe(true);
  });

  it("includes core 2014 races", () => {
    const names2014 = SRD_RACES.filter((r) => r.source === "2014").map((r) => r.name);
    expect(names2014).toContain("Human");
    expect(names2014).toContain("Elf");
    expect(names2014).toContain("Dwarf");
    expect(names2014).toContain("Halfling");
    expect(names2014).toContain("Dragonborn");
  });

  it("satisfies RaceOption type", () => {
    const first: RaceOption = SRD_RACES[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.name).toBe("string");
  });
});
