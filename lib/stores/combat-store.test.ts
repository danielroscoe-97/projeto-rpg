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
