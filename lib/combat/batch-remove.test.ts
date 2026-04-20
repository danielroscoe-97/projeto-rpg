import { computeBatchRemove } from "./batch-remove";
import type { Combatant } from "@/lib/types/combat";

/**
 * S3.4 — Turn-index adjust math for "Limpar N derrotados" / "Deletar grupo".
 *
 * These cases mirror the spec's 4 critical turn-index scenarios + the 4
 * correctness guarantees around clear-defeated / delete-group.
 */
function makeC(id: string, partial: Partial<Combatant> = {}): Combatant {
  return {
    id,
    name: partial.name ?? id,
    current_hp: partial.current_hp ?? 10,
    max_hp: partial.max_hp ?? 10,
    temp_hp: 0,
    ac: 12,
    spell_save_dc: null,
    initiative: partial.initiative ?? 10,
    initiative_order: 0,
    conditions: [],
    ruleset_version: "2014",
    is_defeated: partial.is_defeated ?? false,
    is_hidden: false,
    is_player: false,
    monster_id: partial.monster_id ?? "goblin",
    token_url: null,
    creature_type: "humanoid",
    display_name: null,
    monster_group_id: partial.monster_group_id ?? null,
    group_order: null,
    dm_notes: "",
    player_notes: "",
    player_character_id: null,
    combatant_role: null,
    legendary_actions_total: null,
    legendary_actions_used: 0,
    reaction_used: false,
  } as Combatant;
}

describe("computeBatchRemove — turn-index adjust cases", () => {
  it("Case 1: group entirely BEFORE current turn → shift back by K", () => {
    const combatants = [
      makeC("goblin-a", { monster_group_id: "g1" }),
      makeC("goblin-b", { monster_group_id: "g1" }),
      makeC("goblin-c", { monster_group_id: "g1" }),
      makeC("player", {}),
    ];
    // current_turn_index = 3 (player); we remove all 3 goblins (index 0,1,2).
    const res = computeBatchRemove(combatants, 3, ["goblin-a", "goblin-b", "goblin-c"]);
    expect(res.wasCurrentTurnRemoved).toBe(false);
    expect(res.removedBeforeCurrent).toBe(3);
    expect(res.survivors.map((c) => c.id)).toEqual(["player"]);
    // Player is now at index 0.
    expect(res.nextTurnIndex).toBe(0);
  });

  it("Case 2: group entirely AFTER current turn → unchanged", () => {
    const combatants = [
      makeC("player", {}),
      makeC("goblin-a", { monster_group_id: "g1" }),
      makeC("goblin-b", { monster_group_id: "g1" }),
    ];
    // current_turn_index = 0 (player); remove both goblins.
    const res = computeBatchRemove(combatants, 0, ["goblin-a", "goblin-b"]);
    expect(res.wasCurrentTurnRemoved).toBe(false);
    expect(res.removedBeforeCurrent).toBe(0);
    expect(res.nextTurnIndex).toBe(0);
    expect(res.survivors.map((c) => c.id)).toEqual(["player"]);
  });

  it("Case 3: group CONTAINS current turn → advance to next alive combatant", () => {
    const combatants = [
      makeC("player", {}),
      makeC("goblin-a", { monster_group_id: "g1" }),
      makeC("goblin-b", { monster_group_id: "g1" }), // current
      makeC("goblin-c", { monster_group_id: "g1" }),
      makeC("wizard", {}),
    ];
    // current_turn_index = 2 (goblin-b). Delete whole group.
    const res = computeBatchRemove(combatants, 2, ["goblin-a", "goblin-b", "goblin-c"]);
    expect(res.wasCurrentTurnRemoved).toBe(true);
    expect(res.removedBeforeCurrent).toBe(1);
    // Post-remove survivors: [player, wizard]. Slot would be 2-1=1 → wizard.
    expect(res.survivors.map((c) => c.id)).toEqual(["player", "wizard"]);
    expect(res.nextTurnIndex).toBe(1);
  });

  it("Case 4: MIXED — K-before + current IN group → advance to survivor", () => {
    const combatants = [
      makeC("goblin-a", { monster_group_id: "g1" }), // before current, removed
      makeC("goblin-b", { monster_group_id: "g1" }), // before current, removed
      makeC("goblin-c", { monster_group_id: "g1" }), // current (index 2), removed
      makeC("goblin-d", { monster_group_id: "g1" }), // after, removed
      makeC("player", {}),
    ];
    const res = computeBatchRemove(combatants, 2, [
      "goblin-a", "goblin-b", "goblin-c", "goblin-d",
    ]);
    expect(res.wasCurrentTurnRemoved).toBe(true);
    expect(res.removedBeforeCurrent).toBe(2);
    expect(res.survivors.map((c) => c.id)).toEqual(["player"]);
    // After shift: 2-2=0 → player at survivors[0].
    expect(res.nextTurnIndex).toBe(0);
  });

  it("Clear-defeated: preserves alive members, only removes is_defeated/hp<=0", () => {
    const combatants = [
      makeC("goblin-a", { monster_group_id: "g1", current_hp: 8 }), // alive
      makeC("goblin-b", { monster_group_id: "g1", current_hp: 0, is_defeated: true }),
      makeC("goblin-c", { monster_group_id: "g1", current_hp: 12 }), // alive
      makeC("goblin-d", { monster_group_id: "g1", current_hp: 0, is_defeated: true }),
      makeC("player", {}),
    ];
    const dead = combatants.filter((c) => c.is_defeated || c.current_hp <= 0).map((c) => c.id);
    expect(dead).toEqual(["goblin-b", "goblin-d"]);
    const res = computeBatchRemove(combatants, 4, dead);
    expect(res.survivors.map((c) => c.id)).toEqual(["goblin-a", "goblin-c", "player"]);
    expect(res.nextTurnIndex).toBe(2); // player shifted from 4 to 2 (2 removed before).
  });

  it("Delete-group: removes ALL members (alive + dead)", () => {
    const combatants = [
      makeC("goblin-a", { monster_group_id: "g1", current_hp: 8 }),
      makeC("goblin-b", { monster_group_id: "g1", current_hp: 0, is_defeated: true }),
      makeC("goblin-c", { monster_group_id: "g1", current_hp: 12 }),
      makeC("player", {}),
    ];
    const allGroup = combatants.filter((c) => c.monster_group_id === "g1").map((c) => c.id);
    const res = computeBatchRemove(combatants, 3, allGroup);
    expect(res.survivors.map((c) => c.id)).toEqual(["player"]);
    expect(res.nextTurnIndex).toBe(0);
  });

  it("When all survivors are defeated, next index clamps to startIdx (no infinite loop)", () => {
    // If the wipe leaves only is_defeated survivors, the forward-hunt should
    // terminate and return the startIdx — never infinite-loop or produce -1.
    const combatants = [
      makeC("goblin-a", { monster_group_id: "g1" }), // current, will be removed
      makeC("ghost-1", { is_defeated: true }), // already dead
      makeC("ghost-2", { is_defeated: true }),
    ];
    const res = computeBatchRemove(combatants, 0, ["goblin-a"]);
    expect(res.wasCurrentTurnRemoved).toBe(true);
    expect(res.survivors.map((c) => c.id)).toEqual(["ghost-1", "ghost-2"]);
    // No alive combatant — falls back to startIdx 0 (min(0-0, 1) = 0).
    expect(res.nextTurnIndex).toBe(0);
  });

  it("Empty removeIds is a no-op (caller short-circuits, but math stays sane)", () => {
    const combatants = [makeC("a"), makeC("b")];
    const res = computeBatchRemove(combatants, 1, []);
    expect(res.survivors.map((c) => c.id)).toEqual(["a", "b"]);
    expect(res.nextTurnIndex).toBe(1);
    expect(res.wasCurrentTurnRemoved).toBe(false);
    expect(res.removedBeforeCurrent).toBe(0);
  });

  it("Entire list wiped → survivors empty, nextTurnIndex 0", () => {
    const combatants = [makeC("a"), makeC("b")];
    const res = computeBatchRemove(combatants, 1, ["a", "b"]);
    expect(res.survivors).toEqual([]);
    expect(res.nextTurnIndex).toBe(0);
  });

  it("Accepts Set<string> OR string[] for removeIds (API symmetry)", () => {
    const combatants = [makeC("a"), makeC("b"), makeC("c")];
    const viaArray = computeBatchRemove(combatants, 0, ["b"]);
    const viaSet = computeBatchRemove(combatants, 0, new Set(["b"]));
    expect(viaArray).toEqual(viaSet);
  });
});
