/**
 * S5.7 — Recap First Blood
 *
 * Tests for:
 * 1. findFirstBlood — new temporal first-kill lookup (replaces count-based Assassin).
 * 2. Bug fix in computeCombatStats — knockouts now credited to killer, not victim.
 * 3. buildAwards emits type: "first_blood" for new recaps.
 * 4. Backward compat: legacy recaps with type: "assassin" still render (shape check).
 */

import {
  findFirstBlood,
  computeCombatStats,
  buildAwards,
} from "./combat-stats";
import type { CombatLogEntry } from "@/lib/stores/combat-log-store";

// Identity translator: returns the key so we can inspect which message was used.
const tIdentity = (key: string, values?: Record<string, string | number>) => {
  if (!values) return key;
  return `${key}:${JSON.stringify(values)}`;
};

function entry(
  overrides: Partial<CombatLogEntry> & Pick<CombatLogEntry, "type">,
): CombatLogEntry {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2)}`,
    timestamp: overrides.timestamp ?? Date.now(),
    round: overrides.round ?? 1,
    actorName: overrides.actorName ?? "",
    targetName: overrides.targetName,
    description: overrides.description ?? "",
    details: overrides.details,
    type: overrides.type,
  };
}

describe("findFirstBlood", () => {
  it("returns null for empty entries", () => {
    expect(findFirstBlood([])).toBeNull();
  });

  it("returns null when no defeat entries exist", () => {
    const entries = [
      entry({ type: "attack", actorName: "Aragorn", targetName: "Orc" }),
      entry({ type: "damage", actorName: "Aragorn", targetName: "Orc" }),
    ];
    expect(findFirstBlood(entries)).toBeNull();
  });

  it("returns the first chronological defeat with distinct actor and target", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Aragorn",
        targetName: "Orc",
        round: 2,
      }),
      entry({
        type: "defeat",
        actorName: "Legolas",
        targetName: "Goblin",
        round: 3,
      }),
    ];
    expect(findFirstBlood(entries)).toEqual({
      actorName: "Aragorn",
      targetName: "Orc",
      round: 2,
    });
  });

  it("skips self-defeats (actor === target)", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Ciclone",
        targetName: "Ciclone",
        round: 1,
      }),
    ];
    expect(findFirstBlood(entries)).toBeNull();
  });

  it("skips self-defeats and returns next non-self defeat", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Ciclone",
        targetName: "Ciclone",
        round: 1,
      }),
      entry({
        type: "defeat",
        actorName: "Legolas",
        targetName: "Goblin",
        round: 2,
      }),
    ];
    expect(findFirstBlood(entries)).toEqual({
      actorName: "Legolas",
      targetName: "Goblin",
      round: 2,
    });
  });

  it("requires both actorName and targetName to be truthy", () => {
    const entries = [
      entry({ type: "defeat", actorName: "", targetName: "Orc", round: 1 }),
      entry({ type: "defeat", actorName: "Aragorn", targetName: "", round: 2 }),
      entry({
        type: "defeat",
        actorName: "Gimli",
        targetName: "Troll",
        round: 3,
      }),
    ];
    expect(findFirstBlood(entries)).toEqual({
      actorName: "Gimli",
      targetName: "Troll",
      round: 3,
    });
  });
});

describe("computeCombatStats knockouts (S5.7 bug fix)", () => {
  it("credits knockouts to the killer, not the victim", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Aragorn",
        targetName: "Orc",
        round: 2,
      }),
      entry({
        type: "defeat",
        actorName: "Aragorn",
        targetName: "Orc",
        round: 3,
      }),
    ];
    const stats = computeCombatStats(entries);
    const byName = new Map(stats.map((s) => [s.name, s]));
    expect(byName.get("Aragorn")?.knockouts).toBe(2);
    // Victim "Orc" should not get knockouts attributed.
    expect(byName.get("Orc")?.knockouts ?? 0).toBe(0);
  });

  it("does not credit self-defeats", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Ciclone",
        targetName: "Ciclone",
        round: 1,
      }),
    ];
    const stats = computeCombatStats(entries);
    const byName = new Map(stats.map((s) => [s.name, s]));
    expect(byName.get("Ciclone")?.knockouts ?? 0).toBe(0);
  });
});

describe("buildAwards — First Blood emission (S5.7)", () => {
  it("emits type: first_blood (not assassin) for new recaps", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Aragorn",
        targetName: "Orc",
        round: 2,
      }),
    ];
    const stats = computeCombatStats(entries);
    const awards = buildAwards(stats, tIdentity, entries);
    const firstBloodAward = awards.find((a) => a.type === "first_blood");
    const legacyAssassinAward = awards.find((a) => a.type === "assassin");
    expect(firstBloodAward).toBeDefined();
    expect(legacyAssassinAward).toBeUndefined();
    expect(firstBloodAward?.combatantName).toBe("Aragorn");
    expect(firstBloodAward?.value).toBe(2);
    expect(firstBloodAward?.displayValue).toContain("recap_award_value_first_blood");
    expect(firstBloodAward?.displayValue).toContain(`"target":"Orc"`);
    expect(firstBloodAward?.displayValue).toContain(`"round":2`);
  });

  it("omits First Blood when no defeat entries exist", () => {
    const entries = [
      entry({ type: "attack", actorName: "Aragorn", targetName: "Orc" }),
    ];
    const stats = computeCombatStats(entries);
    const awards = buildAwards(stats, tIdentity, entries);
    expect(awards.find((a) => a.type === "first_blood")).toBeUndefined();
  });

  it("is idempotent: same input produces same output", () => {
    const entries = [
      entry({
        type: "defeat",
        actorName: "Aragorn",
        targetName: "Orc",
        round: 2,
      }),
      entry({
        type: "defeat",
        actorName: "Legolas",
        targetName: "Goblin",
        round: 3,
      }),
    ];
    const stats = computeCombatStats(entries);
    const awards1 = buildAwards(stats, tIdentity, entries);
    const awards2 = buildAwards(stats, tIdentity, entries);
    expect(awards1).toEqual(awards2);
  });
});

describe("Backward compat — legacy 'assassin' type shape", () => {
  it("AwardType union accepts 'assassin' as a valid legacy type", () => {
    const legacyAward: import("@/lib/types/combat-report").CombatReportAward = {
      type: "assassin",
      combatantName: "Aragorn",
      value: 1,
      displayValue: "1 kill",
    };
    expect(legacyAward.type).toBe("assassin");
  });

  it("AwardType union accepts 'first_blood' as the new canonical type", () => {
    const newAward: import("@/lib/types/combat-report").CombatReportAward = {
      type: "first_blood",
      combatantName: "Aragorn",
      value: 2,
      displayValue: "downed Orc in round 2",
    };
    expect(newAward.type).toBe("first_blood");
  });
});
