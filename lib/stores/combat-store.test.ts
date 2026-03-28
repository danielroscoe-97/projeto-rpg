import { useCombatStore, getNumberedName } from "./combat-store";
import type { Combatant } from "@/lib/types/combat";

// Reset store between tests
beforeEach(() => {
  useCombatStore.getState().clearEncounter();
});

const baseCombatant: Omit<Combatant, "id"> = {
  name: "Goblin",
  current_hp: 7,
  max_hp: 7,
  temp_hp: 0,
  ac: 15,
  spell_save_dc: null,
  initiative: null,
  initiative_order: null,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_player: false,
  monster_id: "goblin",
  token_url: null,
  creature_type: null,
  display_name: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "",
  player_notes: "",
  player_character_id: null,
};

describe("useCombatStore – addCombatant", () => {
  it("adds a combatant to the list", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const { combatants } = useCombatStore.getState();
    expect(combatants).toHaveLength(1);
    expect(combatants[0].name).toBe("Goblin");
  });

  it("assigns a unique id to each added combatant", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Orc" });
    const { combatants } = useCombatStore.getState();
    expect(combatants[0].id).toBeTruthy();
    expect(combatants[1].id).toBeTruthy();
    expect(combatants[0].id).not.toBe(combatants[1].id);
  });

  it("supports adding multiple combatants", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant(baseCombatant);
    expect(useCombatStore.getState().combatants).toHaveLength(2);
  });
});

describe("useCombatStore – removeCombatant", () => {
  it("removes a combatant by id", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().removeCombatant(id);
    expect(useCombatStore.getState().combatants).toHaveLength(0);
  });

  it("only removes the targeted combatant", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Orc" });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().removeCombatant(id);
    const { combatants } = useCombatStore.getState();
    expect(combatants).toHaveLength(1);
    expect(combatants[0].name).toBe("Orc");
  });

  it("is a no-op for a non-existent id", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().removeCombatant("non-existent-id");
    expect(useCombatStore.getState().combatants).toHaveLength(1);
  });
});

describe("useCombatStore – clearEncounter", () => {
  it("resets all state", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().setEncounterId("enc-1", "sess-1");
    useCombatStore.getState().clearEncounter();
    const state = useCombatStore.getState();
    expect(state.combatants).toHaveLength(0);
    expect(state.encounter_id).toBeNull();
    expect(state.session_id).toBeNull();
  });
});

describe("getNumberedName", () => {
  it("returns 'Goblin 1' for the first goblin", () => {
    expect(getNumberedName("Goblin", [])).toBe("Goblin 1");
  });

  it("returns 'Goblin 2' when 'Goblin 1' already exists", () => {
    const existing: Combatant[] = [
      { ...baseCombatant, id: "1", name: "Goblin 1" },
    ];
    expect(getNumberedName("Goblin", existing)).toBe("Goblin 2");
  });

  it("handles three goblins", () => {
    const existing: Combatant[] = [
      { ...baseCombatant, id: "1", name: "Goblin 1" },
      { ...baseCombatant, id: "2", name: "Goblin 2" },
    ];
    expect(getNumberedName("Goblin", existing)).toBe("Goblin 3");
  });

  it("does not count differently named monsters", () => {
    const existing: Combatant[] = [
      { ...baseCombatant, id: "1", name: "Orc 1" },
    ];
    expect(getNumberedName("Goblin", existing)).toBe("Goblin 1");
  });
});

describe("useCombatStore – setInitiative", () => {
  it("updates the initiative of the target combatant", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero" });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setInitiative(id, 18);
    const c = useCombatStore.getState().combatants.find((x) => x.id === id);
    expect(c?.initiative).toBe(18);
  });

  it("auto-sorts combatants after initiative is set", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "A" });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "B" });
    const [idA, idB] = useCombatStore
      .getState()
      .combatants.map((c) => c.id);
    useCombatStore.getState().setInitiative(idA, 5);
    useCombatStore.getState().setInitiative(idB, 20);
    const { combatants } = useCombatStore.getState();
    expect(combatants[0].name).toBe("B");
    expect(combatants[1].name).toBe("A");
  });

  it("assigns initiative_order after sort", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "A" });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "B" });
    const [idA, idB] = useCombatStore.getState().combatants.map((c) => c.id);
    useCombatStore.getState().setInitiative(idA, 5);
    useCombatStore.getState().setInitiative(idB, 20);
    const { combatants } = useCombatStore.getState();
    expect(combatants[0].initiative_order).toBe(0);
    expect(combatants[1].initiative_order).toBe(1);
  });
});

describe("useCombatStore – reorderCombatants", () => {
  it("replaces combatants in the given order and reassigns initiative_order", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "A" });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "B" });
    const original = useCombatStore.getState().combatants;
    // Reverse the order
    useCombatStore.getState().reorderCombatants([original[1], original[0]]);
    const { combatants } = useCombatStore.getState();
    expect(combatants[0].name).toBe("B");
    expect(combatants[1].name).toBe("A");
    expect(combatants[0].initiative_order).toBe(0);
    expect(combatants[1].initiative_order).toBe(1);
  });
});

describe("useCombatStore – startCombat", () => {
  it("sets is_active to true and current_turn_index to 0", () => {
    useCombatStore.getState().startCombat();
    const state = useCombatStore.getState();
    expect(state.is_active).toBe(true);
    expect(state.current_turn_index).toBe(0);
  });
});

describe("useCombatStore – hydrateActiveState", () => {
  it("sets is_active, current_turn_index and round_number from server values", () => {
    useCombatStore.getState().hydrateActiveState(3, 2);
    const state = useCombatStore.getState();
    expect(state.is_active).toBe(true);
    expect(state.current_turn_index).toBe(3);
    expect(state.round_number).toBe(2);
  });
});

describe("useCombatStore – advanceTurn", () => {
  function addCombatant(name: string, is_defeated = false) {
    useCombatStore.getState().addCombatant({
      ...baseCombatant,
      name,
      is_defeated,
      initiative: null,
      initiative_order: null,
    });
  }

  it("advances current_turn_index by 1", () => {
    addCombatant("A");
    addCombatant("B");
    addCombatant("C");
    useCombatStore.getState().startCombat(); // index = 0
    useCombatStore.getState().advanceTurn();
    expect(useCombatStore.getState().current_turn_index).toBe(1);
  });

  it("wraps from last combatant to first and increments round_number", () => {
    addCombatant("A");
    addCombatant("B");
    useCombatStore.getState().startCombat(); // index = 0
    useCombatStore.getState().advanceTurn(); // index = 1
    useCombatStore.getState().advanceTurn(); // wraps → index = 0, round = 2
    const state = useCombatStore.getState();
    expect(state.current_turn_index).toBe(0);
    expect(state.round_number).toBe(2);
  });

  it("skips defeated combatants", () => {
    addCombatant("A");
    addCombatant("B", true); // defeated
    addCombatant("C");
    useCombatStore.getState().startCombat(); // index = 0 (A)
    useCombatStore.getState().advanceTurn(); // B is defeated → skip to C (index 2)
    expect(useCombatStore.getState().current_turn_index).toBe(2);
  });

  it("is a no-op when all combatants are defeated", () => {
    addCombatant("A", true);
    addCombatant("B", true);
    useCombatStore.getState().startCombat();
    useCombatStore.getState().advanceTurn();
    const state = useCombatStore.getState();
    expect(state.current_turn_index).toBe(0);
    expect(state.round_number).toBe(1);
  });

  it("does not increment round when wrap is not crossed", () => {
    addCombatant("A");
    addCombatant("B");
    addCombatant("C");
    useCombatStore.getState().startCombat(); // index = 0
    useCombatStore.getState().advanceTurn(); // index = 1
    expect(useCombatStore.getState().round_number).toBe(1);
  });

  it("increments round when wrapping past a defeated combatant at index 0", () => {
    addCombatant("A", true); // defeated — sits at index 0
    addCombatant("B");       // index 1
    addCombatant("C");       // index 2
    // Simulate being on C's turn in round 1
    useCombatStore.getState().hydrateActiveState(2, 1);
    useCombatStore.getState().advanceTurn(); // passes through defeated A (index 0) → lands on B (index 1)
    const state = useCombatStore.getState();
    expect(state.current_turn_index).toBe(1);
    expect(state.round_number).toBe(2); // round incremented because we crossed index 0
  });
});

// === Story 3-5: HP Management ===
describe("useCombatStore – applyDamage", () => {
  it("reduces current_hp by damage amount", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 10, max_hp: 10 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 3);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });

  it("does not reduce HP below 0", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 5, max_hp: 10 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 20);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(0);
  });

  it("temp HP absorbs damage first", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 10, max_hp: 10, temp_hp: 5 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 8);
    const c = useCombatStore.getState().combatants[0];
    expect(c.temp_hp).toBe(0);
    expect(c.current_hp).toBe(7); // 8 damage - 5 temp = 3 to current, 10-3=7
  });

  it("temp HP partially absorbs damage", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 10, max_hp: 10, temp_hp: 3 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 2);
    const c = useCombatStore.getState().combatants[0];
    expect(c.temp_hp).toBe(1);
    expect(c.current_hp).toBe(10);
  });
});

describe("useCombatStore – applyHealing", () => {
  it("increases current_hp", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 3, max_hp: 10 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyHealing(id, 4);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });

  it("does not exceed max_hp", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 8, max_hp: 10 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyHealing(id, 5);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(10);
  });
});

describe("useCombatStore – setTempHp", () => {
  it("sets temp HP when higher than current", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, temp_hp: 0 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setTempHp(id, 5);
    expect(useCombatStore.getState().combatants[0].temp_hp).toBe(5);
  });

  it("does not replace with a lower value", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, temp_hp: 8 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setTempHp(id, 3);
    expect(useCombatStore.getState().combatants[0].temp_hp).toBe(8);
  });
});

// === Story 3-6: Conditions ===
describe("useCombatStore – toggleCondition", () => {
  it("adds a condition", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().toggleCondition(id, "Stunned");
    expect(useCombatStore.getState().combatants[0].conditions).toContain("Stunned");
  });

  it("removes an existing condition", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, conditions: ["Stunned"] });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().toggleCondition(id, "Stunned");
    expect(useCombatStore.getState().combatants[0].conditions).not.toContain("Stunned");
  });

  it("supports multiple conditions", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().toggleCondition(id, "Stunned");
    useCombatStore.getState().toggleCondition(id, "Poisoned");
    expect(useCombatStore.getState().combatants[0].conditions).toEqual(["Stunned", "Poisoned"]);
  });
});

// === Story 3-7: Defeat ===
describe("useCombatStore – setDefeated", () => {
  it("marks a combatant as defeated", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setDefeated(id, true);
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(true);
  });

  it("un-defeats a combatant", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, is_defeated: true });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setDefeated(id, false);
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(false);
  });
});

// === Story 3-8: Edit Stats ===
describe("useCombatStore – updateCombatantStats", () => {
  it("updates name", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateCombatantStats(id, { name: "Dragon" });
    expect(useCombatStore.getState().combatants[0].name).toBe("Dragon");
  });

  it("caps current HP when max HP is reduced below current", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 7, max_hp: 7 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateCombatantStats(id, { max_hp: 5 });
    const c = useCombatStore.getState().combatants[0];
    expect(c.max_hp).toBe(5);
    expect(c.current_hp).toBe(5);
  });

  it("does not change current HP when max HP is increased", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 7, max_hp: 7 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateCombatantStats(id, { max_hp: 20 });
    const c = useCombatStore.getState().combatants[0];
    expect(c.max_hp).toBe(20);
    expect(c.current_hp).toBe(7);
  });

  it("updates AC", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateCombatantStats(id, { ac: 20 });
    expect(useCombatStore.getState().combatants[0].ac).toBe(20);
  });
});

// === Story 8-1: Dual Notes ===
describe("useCombatStore – updateDmNotes", () => {
  it("sets DM notes for a combatant", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateDmNotes(id, "secretly cursed");
    expect(useCombatStore.getState().combatants[0].dm_notes).toBe("secretly cursed");
  });

  it("does not affect other combatants", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Orc" });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updateDmNotes(id, "has key");
    expect(useCombatStore.getState().combatants[1].dm_notes).toBe("");
  });
});

describe("useCombatStore – updatePlayerNotes", () => {
  it("sets player-visible notes for a combatant", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updatePlayerNotes(id, "concentrating on Bless");
    expect(useCombatStore.getState().combatants[0].player_notes).toBe("concentrating on Bless");
  });

  it("does not affect other combatants", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Orc" });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().updatePlayerNotes(id, "flying");
    expect(useCombatStore.getState().combatants[1].player_notes).toBe("");
  });
});

describe("useCombatStore – addCombatant notes defaults", () => {
  it("new combatants have empty notes by default", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const c = useCombatStore.getState().combatants[0];
    expect(c.dm_notes).toBe("");
    expect(c.player_notes).toBe("");
  });
});

describe("useCombatStore – reorderCombatants (universal)", () => {
  it("works for any arbitrary reorder, not just ties", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "A", initiative: 20 });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "B", initiative: 15 });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "C", initiative: 10 });
    const original = useCombatStore.getState().combatants;
    // Move C to first, A to second, B to third
    useCombatStore.getState().reorderCombatants([original[2], original[0], original[1]]);
    const { combatants } = useCombatStore.getState();
    expect(combatants[0].name).toBe("C");
    expect(combatants[1].name).toBe("A");
    expect(combatants[2].name).toBe("B");
    expect(combatants[0].initiative_order).toBe(0);
    expect(combatants[1].initiative_order).toBe(1);
    expect(combatants[2].initiative_order).toBe(2);
  });
});

// === Story 3-9: Ruleset Version Switching ===
describe("useCombatStore – setRulesetVersion", () => {
  it("switches version from 2014 to 2024", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setRulesetVersion(id, "2024");
    expect(useCombatStore.getState().combatants[0].ruleset_version).toBe("2024");
  });

  it("does not affect other combatants", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Orc" });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setRulesetVersion(id, "2024");
    expect(useCombatStore.getState().combatants[1].ruleset_version).toBe("2014");
  });
});

// === AC4: Undo Stack (unified) ===

describe("useCombatStore – undoLastAction (HP undo, backwards compat)", () => {
  it("pushes entry on damage and restores on undo", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 3);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(4);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });

  it("pushes entry on healing", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, current_hp: 3 });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyHealing(id, 2);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(5);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(3);
  });

  it("supports multiple levels of undo", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 1); // 7 -> 6
    useCombatStore.getState().applyDamage(id, 2); // 6 -> 4
    useCombatStore.getState().applyDamage(id, 1); // 4 -> 3
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(3);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(4);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(6);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });

  it("returns null when stack is empty", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const result = useCombatStore.getState().undoLastAction();
    expect(result).toBeNull();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });

  it("restores temp HP after damage absorbed by temp HP", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setTempHp(id, 5);
    useCombatStore.getState().applyDamage(id, 8);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(4);
    expect(useCombatStore.getState().combatants[0].temp_hp).toBe(0);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
    expect(useCombatStore.getState().combatants[0].temp_hp).toBe(5);
  });

  it("clearEncounter resets undo stack", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 3);
    useCombatStore.getState().clearEncounter();
    expect(useCombatStore.getState().undoStack).toEqual([]);
  });

  it("undoLastHpChange delegates to undoLastAction (backwards compat)", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 3);
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(4);
    useCombatStore.getState().undoLastHpChange();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });
});

describe("useCombatStore – undoLastAction (condition undo)", () => {
  it("undoes adding a condition", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().toggleCondition(id, "Poisoned");
    expect(useCombatStore.getState().combatants[0].conditions).toContain("Poisoned");
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].conditions).not.toContain("Poisoned");
  });

  it("undoes removing a condition", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, conditions: ["Stunned"] });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().toggleCondition(id, "Stunned");
    expect(useCombatStore.getState().combatants[0].conditions).not.toContain("Stunned");
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].conditions).toContain("Stunned");
  });
});

describe("useCombatStore – undoLastAction (defeated undo)", () => {
  it("undoes marking as defeated", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(false);
    useCombatStore.getState().setDefeated(id, true);
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(true);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(false);
  });

  it("undoes un-defeating", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, is_defeated: true });
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().setDefeated(id, false);
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(false);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(true);
  });
});

describe("useCombatStore – undoLastAction (turn undo)", () => {
  it("undoes turn advance and restores round", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "A", initiative: 20 });
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "B", initiative: 10 });
    useCombatStore.getState().startCombat();
    expect(useCombatStore.getState().current_turn_index).toBe(0);
    expect(useCombatStore.getState().round_number).toBe(1);
    useCombatStore.getState().advanceTurn();
    expect(useCombatStore.getState().current_turn_index).toBe(1);
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().current_turn_index).toBe(0);
    expect(useCombatStore.getState().round_number).toBe(1);
  });
});

describe("useCombatStore – unified undo stack ordering", () => {
  it("undoes mixed actions in LIFO order", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    const id = useCombatStore.getState().combatants[0].id;
    useCombatStore.getState().applyDamage(id, 2); // hp: 7 -> 5
    useCombatStore.getState().toggleCondition(id, "Poisoned"); // add condition
    useCombatStore.getState().setDefeated(id, true); // mark defeated

    // Undo defeated first (LIFO)
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].is_defeated).toBe(false);

    // Undo condition
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].conditions).not.toContain("Poisoned");

    // Undo HP
    useCombatStore.getState().undoLastAction();
    expect(useCombatStore.getState().combatants[0].current_hp).toBe(7);
  });
});

// === Story B1-1: Add Combatant Mid-Combat ===
describe("useCombatStore – addCombatant mid-combat (lastAddedCombatantId)", () => {
  it("tracks lastAddedCombatantId when combat is active", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero", initiative: 10 });
    useCombatStore.getState().startCombat();
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Reinforcement", initiative: 15 });
    const state = useCombatStore.getState();
    expect(state.lastAddedCombatantId).toBeTruthy();
    const added = state.combatants.find((c) => c.id === state.lastAddedCombatantId);
    expect(added?.name).toBe("Reinforcement");
  });

  it("does not track lastAddedCombatantId when combat is not active", () => {
    useCombatStore.getState().addCombatant(baseCombatant);
    expect(useCombatStore.getState().lastAddedCombatantId).toBeNull();
  });

  it("updates lastAddedCombatantId on subsequent adds", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero", initiative: 10 });
    useCombatStore.getState().startCombat();
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "First", initiative: 12 });
    const firstId = useCombatStore.getState().lastAddedCombatantId;
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Second", initiative: 8 });
    const secondId = useCombatStore.getState().lastAddedCombatantId;
    expect(secondId).not.toBe(firstId);
    const added = useCombatStore.getState().combatants.find((c) => c.id === secondId);
    expect(added?.name).toBe("Second");
  });
});

describe("useCombatStore – undoLastAdd", () => {
  it("removes the last added combatant and returns its id", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero", initiative: 10 });
    useCombatStore.getState().startCombat();
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Reinforcement", initiative: 15 });
    expect(useCombatStore.getState().combatants).toHaveLength(2);

    const removedId = useCombatStore.getState().undoLastAdd();
    expect(removedId).toBeTruthy();
    expect(useCombatStore.getState().combatants).toHaveLength(1);
    expect(useCombatStore.getState().combatants[0].name).toBe("Hero");
  });

  it("clears lastAddedCombatantId after undo", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero", initiative: 10 });
    useCombatStore.getState().startCombat();
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Reinforcement", initiative: 15 });
    useCombatStore.getState().undoLastAdd();
    expect(useCombatStore.getState().lastAddedCombatantId).toBeNull();
  });

  it("returns null when nothing to undo", () => {
    const result = useCombatStore.getState().undoLastAdd();
    expect(result).toBeNull();
  });

  it("returns null on second call (only one undo)", () => {
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Hero", initiative: 10 });
    useCombatStore.getState().startCombat();
    useCombatStore.getState().addCombatant({ ...baseCombatant, name: "Reinforcement", initiative: 15 });
    useCombatStore.getState().undoLastAdd();
    const result = useCombatStore.getState().undoLastAdd();
    expect(result).toBeNull();
  });
});
