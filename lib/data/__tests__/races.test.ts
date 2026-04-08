import { SRD_RACES, ALL_RACES, getAvailableRaces } from "../races";
import type { LegacyRaceOption, RaceOption } from "../races";

describe("SRD_RACES (legacy backward-compat)", () => {
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

  it("satisfies LegacyRaceOption type", () => {
    const first: LegacyRaceOption = SRD_RACES[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.name).toBe("string");
  });
});

describe("ALL_RACES", () => {
  it("contains more races than SRD_RACES", () => {
    expect(ALL_RACES.length).toBeGreaterThan(SRD_RACES.length);
  });

  it("every entry has required fields", () => {
    for (const race of ALL_RACES) {
      expect(race.id).toBeTruthy();
      expect(race.name).toBeTruthy();
      expect(race.source).toBeTruthy();
      expect(typeof race.srd).toBe("boolean");
    }
  });

  it("has unique ids", () => {
    const ids = ALL_RACES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes SRD and non-SRD races", () => {
    const hasSrd = ALL_RACES.some((r) => r.srd);
    const hasNonSrd = ALL_RACES.some((r) => !r.srd);
    expect(hasSrd).toBe(true);
    expect(hasNonSrd).toBe(true);
  });

  it("satisfies RaceOption type", () => {
    const first: RaceOption = ALL_RACES[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.name).toBe("string");
    expect(typeof first.source).toBe("string");
    expect(typeof first.srd).toBe("boolean");
  });
});

describe("getAvailableRaces", () => {
  it("returns only SRD races when fullMode is false", () => {
    const races = getAvailableRaces(false);
    expect(races.every((r) => r.srd)).toBe(true);
  });

  it("returns all races when fullMode is true", () => {
    const races = getAvailableRaces(true);
    expect(races.length).toBe(ALL_RACES.length);
    expect(races.some((r) => !r.srd)).toBe(true);
  });

  it("SRD-only list is smaller than full list", () => {
    const srdOnly = getAvailableRaces(false);
    const full = getAvailableRaces(true);
    expect(srdOnly.length).toBeLessThan(full.length);
  });
});
