import {
  sortByInitiative,
  detectTies,
  assignInitiativeOrder,
  adjustInitiativeAfterReorder,
} from "./initiative";
import type { Combatant } from "@/lib/types/combat";

const base: Omit<Combatant, "id" | "name" | "initiative"> = {
  current_hp: 10,
  max_hp: 10,
  temp_hp: 0,
  ac: 12,
  spell_save_dc: null,
  initiative_order: null,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_hidden: false,
  is_player: false,
  monster_id: null,
  token_url: null,
  creature_type: null,
  display_name: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "",
  player_notes: "",
  player_character_id: null,
  combatant_role: null,
};

function make(
  id: string,
  name: string,
  initiative: number | null,
  groupId?: string | null,
  groupOrder?: number | null
): Combatant {
  return {
    ...base,
    id,
    name,
    initiative,
    monster_group_id: groupId ?? null,
    group_order: groupOrder ?? null,
  };
}

describe("sortByInitiative", () => {
  it("sorts descending by initiative", () => {
    const combatants = [
      make("1", "Goblin", 5),
      make("2", "Hero", 18),
      make("3", "Orc", 12),
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted.map((c) => c.name)).toEqual(["Hero", "Orc", "Goblin"]);
  });

  it("does not mutate the input array", () => {
    const combatants = [make("1", "A", 10), make("2", "B", 20)];
    const original = [...combatants];
    sortByInitiative(combatants);
    expect(combatants).toEqual(original);
  });

  it("places null-initiative combatants last", () => {
    const combatants = [make("1", "A", null), make("2", "B", 15)];
    const sorted = sortByInitiative(combatants);
    expect(sorted[0].name).toBe("B");
    expect(sorted[1].name).toBe("A");
  });

  it("is stable for equal initiative values", () => {
    const combatants = [
      make("1", "First", 10),
      make("2", "Second", 10),
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted[0].name).toBe("First");
    expect(sorted[1].name).toBe("Second");
  });
});

describe("detectTies", () => {
  it("returns an empty set when no ties exist", () => {
    const combatants = [
      make("1", "A", 20),
      make("2", "B", 15),
      make("3", "C", 10),
    ];
    expect(detectTies(combatants).size).toBe(0);
  });

  it("detects a single tie", () => {
    const combatants = [
      make("1", "A", 15),
      make("2", "B", 15),
      make("3", "C", 10),
    ];
    const ties = detectTies(combatants);
    expect(ties.has(15)).toBe(true);
    expect(ties.has(10)).toBe(false);
  });

  it("detects multiple tie groups", () => {
    const combatants = [
      make("1", "A", 15),
      make("2", "B", 15),
      make("3", "C", 10),
      make("4", "D", 10),
    ];
    const ties = detectTies(combatants);
    expect(ties.has(15)).toBe(true);
    expect(ties.has(10)).toBe(true);
  });

  it("ignores null initiative values", () => {
    const combatants = [make("1", "A", null), make("2", "B", null)];
    expect(detectTies(combatants).size).toBe(0);
  });
});

describe("assignInitiativeOrder", () => {
  it("assigns 0-based index to each combatant", () => {
    const combatants = [make("1", "A", 20), make("2", "B", 15)];
    const result = assignInitiativeOrder(combatants);
    expect(result[0].initiative_order).toBe(0);
    expect(result[1].initiative_order).toBe(1);
  });

  it("does not mutate the input array", () => {
    const combatants = [make("1", "A", 20)];
    const result = assignInitiativeOrder(combatants);
    expect(result[0]).not.toBe(combatants[0]);
    expect(combatants[0].initiative_order).toBeNull();
  });
});

describe("sortByInitiative — group clustering", () => {
  it("keeps group members adjacent even when interleaved with same-initiative combatants", () => {
    const combatants = [
      make("g1", "Goat 1", 15, "group-goat", 1),
      make("pc", "Hero", 15),
      make("g2", "Goat 2", 15, "group-goat", 2),
    ];
    const sorted = sortByInitiative(combatants);
    const names = sorted.map((c) => c.name);
    // Group must be together — either [Goat1, Goat2, Hero] or [Hero, Goat1, Goat2]
    const g1Idx = names.indexOf("Goat 1");
    const g2Idx = names.indexOf("Goat 2");
    expect(g2Idx).toBe(g1Idx + 1);
  });

  it("sorts groups by their shared initiative descending", () => {
    const combatants = [
      make("g1", "Goat 1", 10, "group-goat", 1),
      make("g2", "Goat 2", 10, "group-goat", 2),
      make("w1", "Wolf 1", 18, "group-wolf", 1),
      make("w2", "Wolf 2", 18, "group-wolf", 2),
      make("pc", "Hero", 14),
    ];
    const sorted = sortByInitiative(combatants);
    const names = sorted.map((c) => c.name);
    // Wolves (18) > Hero (14) > Goats (10)
    expect(names).toEqual(["Wolf 1", "Wolf 2", "Hero", "Goat 1", "Goat 2"]);
  });

  it("sorts group members internally by group_order", () => {
    const combatants = [
      make("g3", "Goat 3", 12, "group-goat", 3),
      make("g1", "Goat 1", 12, "group-goat", 1),
      make("g2", "Goat 2", 12, "group-goat", 2),
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted.map((c) => c.name)).toEqual(["Goat 1", "Goat 2", "Goat 3"]);
  });

  it("handles mixed grouped and ungrouped combatants", () => {
    const combatants = [
      make("pc1", "Fighter", 20),
      make("g1", "Goblin 1", 15, "group-gob", 1),
      make("g2", "Goblin 2", 15, "group-gob", 2),
      make("pc2", "Wizard", 10),
    ];
    const sorted = sortByInitiative(combatants);
    expect(sorted.map((c) => c.name)).toEqual([
      "Fighter",
      "Goblin 1",
      "Goblin 2",
      "Wizard",
    ]);
  });
});

describe("adjustInitiativeAfterReorder — group support", () => {
  it("applies new initiative to all group members when one is moved", () => {
    const reordered = [
      make("g1", "Goat 1", 10, "group-goat", 1),
      make("g2", "Goat 2", 10, "group-goat", 2),
      make("pc", "Hero", 15),
    ];
    const result = adjustInitiativeAfterReorder(reordered, "g1");
    // Goats moved to top — should get initiative > Hero's 15
    expect(result[0].initiative).toBe(16);
    expect(result[1].initiative).toBe(16); // Same group, same initiative
  });
});
