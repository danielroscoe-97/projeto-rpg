import { buildGroupHealth } from "@/components/combat/MonsterGroupHeader";
import type { Combatant } from "@/lib/types/combat";

/**
 * Covers the data contract for Finding 3 (spike 2026-04-17).
 * Header must no longer sum current_hp across members — we expose a
 * granular breakdown that the visual layer (Track D, UX spec H9) consumes.
 */
function makeMember(overrides: Partial<Combatant> & { id: string; current_hp: number; max_hp: number }): Combatant {
  return {
    id: overrides.id,
    name: `Goblin ${overrides.id}`,
    current_hp: overrides.current_hp,
    max_hp: overrides.max_hp,
    temp_hp: 0,
    ac: 15,
    spell_save_dc: null,
    initiative: 12,
    initiative_order: 0,
    conditions: [],
    ruleset_version: "2014",
    is_defeated: overrides.is_defeated ?? false,
    is_hidden: false,
    is_player: false,
    monster_id: "goblin",
    token_url: null,
    creature_type: "humanoid",
    display_name: null,
    monster_group_id: "g1",
    group_order: 1,
    dm_notes: "",
    player_notes: "",
    player_character_id: null,
    combatant_role: null,
    legendary_actions_total: null,
    legendary_actions_used: 0,
    reaction_used: false,
  };
}

describe("buildGroupHealth", () => {
  it("returns zero stats for empty member list", () => {
    const health = buildGroupHealth([]);
    expect(health).toEqual({
      members: [],
      min: 0,
      max: 0,
      median: 0,
      criticalCount: 0,
      membersAlive: 0,
      membersTotal: 0,
    });
  });

  it("excludes defeated members from the alive breakdown but counts them in membersTotal", () => {
    const members = [
      makeMember({ id: "1", current_hp: 10, max_hp: 20 }),
      makeMember({ id: "2", current_hp: 0, max_hp: 20, is_defeated: true }),
      makeMember({ id: "3", current_hp: 15, max_hp: 20 }),
    ];
    const health = buildGroupHealth(members);
    expect(health.members).toHaveLength(2);
    expect(health.membersAlive).toBe(2);
    expect(health.membersTotal).toBe(3);
  });

  it("computes min / max / median on alive members", () => {
    const members = [
      makeMember({ id: "1", current_hp: 5, max_hp: 50 }),
      makeMember({ id: "2", current_hp: 25, max_hp: 50 }),
      makeMember({ id: "3", current_hp: 40, max_hp: 50 }),
    ];
    const health = buildGroupHealth(members);
    expect(health.min).toBe(5);
    expect(health.max).toBe(40);
    expect(health.median).toBe(25);
  });

  it("takes rounded mean of the two middle values for even-length groups", () => {
    const members = [
      makeMember({ id: "1", current_hp: 10, max_hp: 50 }),
      makeMember({ id: "2", current_hp: 20, max_hp: 50 }),
      makeMember({ id: "3", current_hp: 30, max_hp: 50 }),
      makeMember({ id: "4", current_hp: 41, max_hp: 50 }),
    ];
    const health = buildGroupHealth(members);
    // median of (20, 30) = 25
    expect(health.median).toBe(25);
  });

  it("tags members at or below 25% HP as critical", () => {
    const members = [
      makeMember({ id: "1", current_hp: 5, max_hp: 50 }), // 10% → critical
      makeMember({ id: "2", current_hp: 12, max_hp: 50 }), // 24% → critical
      makeMember({ id: "3", current_hp: 26, max_hp: 50 }), // 52% → healthy
    ];
    const health = buildGroupHealth(members);
    expect(health.criticalCount).toBe(2);
    expect(health.members[0].tier).toBe("critical");
    expect(health.members[1].tier).toBe("critical");
    expect(health.members[2].tier).toBe("healthy");
  });

  it("classifies >25% and ≤50% HP as warning", () => {
    const members = [makeMember({ id: "1", current_hp: 15, max_hp: 50 })];
    const health = buildGroupHealth(members);
    expect(health.members[0].tier).toBe("warning");
    expect(health.criticalCount).toBe(0);
  });

  it("returns unknown tier when max_hp is zero (avoids NaN)", () => {
    const members = [makeMember({ id: "1", current_hp: 0, max_hp: 0 })];
    const health = buildGroupHealth(members);
    expect(health.members[0].tier).toBe("unknown");
    expect(health.members[0].pct).toBe(0);
  });

  it("never sums current_hp (regression guard for Finding 3)", () => {
    const members = [
      makeMember({ id: "1", current_hp: 10, max_hp: 50 }),
      makeMember({ id: "2", current_hp: 10, max_hp: 50 }),
      makeMember({ id: "3", current_hp: 10, max_hp: 50 }),
    ];
    const health = buildGroupHealth(members);
    // If anyone adds a sum field back, this assertion pins the data shape.
    expect(Object.keys(health).sort()).toEqual([
      "criticalCount",
      "max",
      "median",
      "members",
      "membersAlive",
      "membersTotal",
      "min",
    ]);
    // And the individual HP values must survive intact (no aggregation).
    expect(health.members.map((m) => m.current_hp)).toEqual([10, 10, 10]);
  });
});
