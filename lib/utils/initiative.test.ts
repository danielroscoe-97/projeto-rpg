import {
  sortByInitiative,
  detectTies,
  assignInitiativeOrder,
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
  is_player: false,
  monster_id: null,
  token_url: null,
  creature_type: null,
  dm_notes: "",
  player_notes: "",
};

function make(
  id: string,
  name: string,
  initiative: number | null
): Combatant {
  return { ...base, id, name, initiative };
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
