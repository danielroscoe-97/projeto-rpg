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
