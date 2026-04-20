import { describe, expect, it } from "@jest/globals";
import { matchesSource } from "./monster-source-filter";

// Minimal shape matching the fields read by `matchesSource`. Keeps tests free
// of the heavier `SrdMonster` literal.
type MonsterSeed = {
  ruleset_version: "2014" | "2024";
  is_srd?: boolean;
  source?: string;
};

const goblin14: MonsterSeed = {
  ruleset_version: "2014",
  is_srd: true,
  source: "MM",
};
const goblin24: MonsterSeed = {
  ruleset_version: "2024",
  is_srd: true,
  source: "XMM",
};
const boogieManMad: MonsterSeed = {
  ruleset_version: "2014",
  is_srd: false,
  source: "MAD",
};
const vgmMonster: MonsterSeed = {
  ruleset_version: "2014",
  is_srd: false,
  source: "VGM",
};
// Non-SRD 2024 (reprint book, e.g. "XMM" that is NOT on the SRD whitelist).
// Here the flag intentionally reads `is_srd: false` so the bucket "srd_2024"
// does not incorrectly promote this entry to the gold-highlighted set.
const xmmNonSrd2024: MonsterSeed = {
  ruleset_version: "2024",
  is_srd: false,
  source: "XMM",
};

describe("matchesSource", () => {
  it("'all' always matches", () => {
    expect(matchesSource(goblin14, "all")).toBe(true);
    expect(matchesSource(boogieManMad, "all")).toBe(true);
    expect(matchesSource(vgmMonster, "all")).toBe(true);
  });

  it("'srd_2014' matches SRD 2014 monsters and excludes SRD 2024", () => {
    expect(matchesSource(goblin14, "srd_2014")).toBe(true);
    expect(matchesSource(goblin24, "srd_2014")).toBe(false);
    expect(matchesSource(boogieManMad, "srd_2014")).toBe(false);
    expect(matchesSource(vgmMonster, "srd_2014")).toBe(false);
  });

  it("'srd_2024' matches only SRD-flagged 2024 content (excludes non-SRD XMM reprint)", () => {
    expect(matchesSource(goblin24, "srd_2024")).toBe(true);
    expect(matchesSource(goblin14, "srd_2024")).toBe(false);
    expect(matchesSource(xmmNonSrd2024, "srd_2024")).toBe(false);
  });

  it("'mad' matches MAD bundle regardless of SRD flag", () => {
    expect(matchesSource(boogieManMad, "mad")).toBe(true);
    expect(matchesSource(goblin14, "mad")).toBe(false);
    expect(matchesSource(vgmMonster, "mad")).toBe(false);
  });

  it("'nonsrd' matches everything non-SRD, excluding MAD", () => {
    expect(matchesSource(vgmMonster, "nonsrd")).toBe(true);
    expect(matchesSource(xmmNonSrd2024, "nonsrd")).toBe(true);
    expect(matchesSource(goblin14, "nonsrd")).toBe(false);
    expect(matchesSource(boogieManMad, "nonsrd")).toBe(false); // MAD kept in its own bucket
  });
});
