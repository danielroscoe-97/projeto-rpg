/**
 * S4.3 — Quick-actions auto-cleanup (guest mode parity).
 *
 * Verifies the Dodge-auto-expire contract inside the guest combat store's
 * `advanceTurn` action: `action:dodge` is cleared on the combatant whose turn
 * is starting, while Dash/Help/Disengage/Hide/Ready persist.
 */
import { useGuestCombatStore } from "./guest-combat-store";
import type { Combatant } from "@/lib/types/combat";

const baseCombatant: Omit<Combatant, "id"> = {
  name: "Filler",
  current_hp: 10,
  max_hp: 10,
  temp_hp: 0,
  ac: 15,
  spell_save_dc: null,
  initiative: null,
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

beforeEach(() => {
  useGuestCombatStore.getState().resetCombat();
});

function seedTrio(): { aragorn: string; legolas: string; orc: string } {
  const s = useGuestCombatStore.getState();
  s.addCombatant({ ...baseCombatant, name: "Aragorn", initiative: 20, is_player: true });
  s.addCombatant({ ...baseCombatant, name: "Legolas", initiative: 15, is_player: true });
  s.addCombatant({ ...baseCombatant, name: "Orc", initiative: 10 });
  s.startCombat();
  const post = useGuestCombatStore.getState();
  return {
    aragorn: post.combatants.find((c) => c.name === "Aragorn")!.id,
    legolas: post.combatants.find((c) => c.name === "Legolas")!.id,
    orc: post.combatants.find((c) => c.name === "Orc")!.id,
  };
}

describe("S4.3 — guest combat store auto-cleanup on turn advance", () => {
  it("removes `action:dodge` when the caster's next turn begins (full round cycle)", () => {
    const { aragorn } = seedTrio();
    const s = useGuestCombatStore.getState();

    // Aragorn (current) dodges, then turn advances to Legolas → Orc → back to Aragorn.
    s.toggleCondition(aragorn, "action:dodge");
    expect(
      useGuestCombatStore.getState().combatants.find((c) => c.id === aragorn)!
        .conditions,
    ).toContain("action:dodge");

    // Advance past Legolas, Orc, back to Aragorn.
    useGuestCombatStore.getState().advanceTurn(); // → Legolas
    useGuestCombatStore.getState().advanceTurn(); // → Orc
    useGuestCombatStore.getState().advanceTurn(); // → Aragorn (next turn)

    const after = useGuestCombatStore
      .getState()
      .combatants.find((c) => c.id === aragorn)!;
    expect(after.conditions).not.toContain("action:dodge");
  });

  it("PRESERVES legacy action:* rows (Dash/Help/Disengage/Hide) and Ready across the caster's next turn", () => {
    const { aragorn } = seedTrio();
    const s = useGuestCombatStore.getState();

    // All non-expiring quick actions on Aragorn.
    for (const cond of [
      "action:dash",
      "action:help",
      "action:disengage",
      "action:hide",
      "action:ready",
    ]) {
      s.toggleCondition(aragorn, cond);
    }

    // Full round so turn wraps back to Aragorn.
    useGuestCombatStore.getState().advanceTurn();
    useGuestCombatStore.getState().advanceTurn();
    useGuestCombatStore.getState().advanceTurn();

    const after = useGuestCombatStore
      .getState()
      .combatants.find((c) => c.id === aragorn)!;
    for (const cond of [
      "action:dash",
      "action:help",
      "action:disengage",
      "action:hide",
      "action:ready",
    ]) {
      expect(after.conditions).toContain(cond);
    }
  });

  it("does NOT strip Dodge from OTHER combatants whose turn hasn't started", () => {
    const { aragorn, legolas } = seedTrio();
    const s = useGuestCombatStore.getState();
    s.toggleCondition(legolas, "action:dodge");

    // Aragorn → Legolas (this advance starts Legolas's turn, so Dodge should be cleaned).
    useGuestCombatStore.getState().advanceTurn();
    const legolasAfter = useGuestCombatStore
      .getState()
      .combatants.find((c) => c.id === legolas)!;
    expect(legolasAfter.conditions).not.toContain("action:dodge");
    expect(aragorn).toBeTruthy(); // sanity: id resolved
  });

  it("preserves non-quick-action conditions (SRD + concentration + custom) across advance", () => {
    const { aragorn } = seedTrio();
    const s = useGuestCombatStore.getState();

    s.toggleCondition(aragorn, "action:dodge");
    s.toggleCondition(aragorn, "Prone");
    s.toggleCondition(aragorn, "concentrating:Bless");
    s.toggleCondition(aragorn, "custom:Cursed|By the witch");

    // Full cycle back to Aragorn.
    useGuestCombatStore.getState().advanceTurn();
    useGuestCombatStore.getState().advanceTurn();
    useGuestCombatStore.getState().advanceTurn();

    const after = useGuestCombatStore
      .getState()
      .combatants.find((c) => c.id === aragorn)!;
    expect(after.conditions).not.toContain("action:dodge");
    expect(after.conditions).toContain("Prone");
    expect(after.conditions).toContain("concentrating:Bless");
    expect(after.conditions).toContain("custom:Cursed|By the witch");
  });
});
