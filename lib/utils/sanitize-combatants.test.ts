import { sanitizeCombatantsForPlayer, type RawCombatantRow } from "./sanitize-combatants";

/** Factory for a raw combatant row with sensible defaults. */
function make(overrides: Partial<RawCombatantRow> = {}): RawCombatantRow {
  return {
    id: "c1",
    name: "Adult Red Dragon",
    display_name: null,
    current_hp: 256,
    max_hp: 256,
    temp_hp: 0,
    ac: 19,
    initiative_order: 1,
    conditions: [],
    is_defeated: false,
    is_player: false,
    is_hidden: false,
    monster_id: "adult-red-dragon",
    ruleset_version: "2014",
    ...overrides,
  };
}

describe("sanitizeCombatantsForPlayer — anti-metagaming", () => {
  it("T1: replaces monster real name with display_name when set", () => {
    const input = [make({ display_name: "Mysterious Creature" })];
    const [result] = sanitizeCombatantsForPlayer(input);

    expect(result.name).toBe("Mysterious Creature");
    expect(result).not.toHaveProperty("display_name");
  });

  it("T2: filters out hidden combatants (is_hidden: true)", () => {
    const input = [
      make({ id: "visible", is_hidden: false }),
      make({ id: "hidden", is_hidden: true }),
    ];
    const result = sanitizeCombatantsForPlayer(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("visible");
  });

  it("T3: keeps real name when display_name is null", () => {
    const input = [make({ name: "Goblin", display_name: null })];
    const [result] = sanitizeCombatantsForPlayer(input);

    expect(result.name).toBe("Goblin");
  });

  it("T4: preserves all stats for players (is_player: true)", () => {
    const input = [make({
      id: "p1",
      name: "Thorin",
      is_player: true,
      current_hp: 45,
      max_hp: 50,
      ac: 18,
      temp_hp: 5,
    })];
    const [result] = sanitizeCombatantsForPlayer(input);

    expect(result.name).toBe("Thorin");
    expect(result).toHaveProperty("current_hp", 45);
    expect(result).toHaveProperty("max_hp", 50);
    expect(result).toHaveProperty("ac", 18);
    expect(result).not.toHaveProperty("hp_status");
    expect(result).not.toHaveProperty("display_name");
    expect(result).not.toHaveProperty("is_hidden");
  });

  it("T5: strips exact stats from visible monsters and adds hp_status", () => {
    const input = [make({ current_hp: 100, max_hp: 256 })];
    const [result] = sanitizeCombatantsForPlayer(input);

    expect(result).toHaveProperty("hp_status");
    expect(result).not.toHaveProperty("current_hp");
    expect(result).not.toHaveProperty("max_hp");
    expect(result).not.toHaveProperty("temp_hp");
    expect(result).not.toHaveProperty("ac");
    expect(result).not.toHaveProperty("is_hidden");
  });

  it("T6: mixed scenario — hidden filtered, visible sanitized, player kept intact", () => {
    const input = [
      make({ id: "monster-visible", name: "Orc", display_name: "Dark Warrior", is_hidden: false }),
      make({ id: "monster-hidden", name: "Ambush Spider", is_hidden: true }),
      make({ id: "player", name: "Elara", is_player: true, current_hp: 30, max_hp: 35, ac: 14, is_hidden: false }),
    ];
    const result = sanitizeCombatantsForPlayer(input);

    // Hidden spider filtered out
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.id === "monster-hidden")).toBeUndefined();

    // Visible monster: alias applied, stats stripped
    const orc = result.find((c) => c.id === "monster-visible")!;
    expect(orc.name).toBe("Dark Warrior");
    expect(orc).toHaveProperty("hp_status");
    expect(orc).not.toHaveProperty("current_hp");
    expect(orc).not.toHaveProperty("ac");

    // Player: stats preserved
    const player = result.find((c) => c.id === "player")!;
    expect(player.name).toBe("Elara");
    expect(player).toHaveProperty("current_hp", 30);
    expect(player).toHaveProperty("ac", 14);
  });

  it("returns empty array when all combatants are hidden", () => {
    const input = [
      make({ id: "h1", is_hidden: true }),
      make({ id: "h2", is_hidden: true }),
    ];
    expect(sanitizeCombatantsForPlayer(input)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(sanitizeCombatantsForPlayer([])).toEqual([]);
  });
});
