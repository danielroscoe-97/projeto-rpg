/**
 * Tests for reconnect module — state recovery from DB.
 * Story A1-2: Realtime layer tests
 */

// ── Supabase mock ────────────────────────────────────────────────
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockOrder = jest.fn();
const mockSelect = jest.fn((fields: string) => {
  // encounters select chain ends with .eq().single()
  if (fields.includes("round_number")) return { eq: mockEq };
  // combatants select chain ends with .eq().order()
  return {
    eq: jest.fn(() => ({
      order: mockOrder,
    })),
  };
});
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

import { fetchSessionSnapshot } from "../reconnect";

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────

describe("fetchSessionSnapshot", () => {
  it("returns null when encounter query fails", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const result = await fetchSessionSnapshot("enc-404");

    expect(result).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith("encounters");
  });

  it("returns null when encounter does not exist", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchSessionSnapshot("enc-missing");

    expect(result).toBeNull();
  });

  it("recovers full session state from DB on success", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { round_number: 3, current_turn_index: 1, is_active: true },
      error: null,
    });

    const rawCombatants = [
      {
        id: "c1",
        name: "Fighter",
        current_hp: 40,
        max_hp: 50,
        temp_hp: 0,
        ac: 18,
        spell_save_dc: null,
        initiative: 15,
        initiative_order: 0,
        conditions: ["Blessed"],
        ruleset_version: "2014",
        is_defeated: false,
        is_player: true,
        monster_id: null,
        display_name: null,
        monster_group_id: null,
        group_order: null,
        dm_notes: "",
        player_notes: "concentrating",
        player_character_id: "pc1",
      },
    ];
    mockOrder.mockResolvedValueOnce({ data: rawCombatants });

    const result = await fetchSessionSnapshot("enc-1");

    expect(result).not.toBeNull();
    expect(result!.round_number).toBe(3);
    expect(result!.current_turn_index).toBe(1);
    expect(result!.is_active).toBe(true);
    expect(result!.combatants).toHaveLength(1);
    expect(result!.combatants[0].id).toBe("c1");
    expect(result!.combatants[0].name).toBe("Fighter");
    expect(result!.combatants[0].conditions).toEqual(["Blessed"]);
  });

  it("defaults nullable fields when DB returns nulls", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { round_number: null, current_turn_index: null, is_active: null },
      error: null,
    });

    const rawCombatants = [
      {
        id: "c2",
        name: "Goblin",
        current_hp: 7,
        max_hp: 7,
        temp_hp: null,
        ac: 15,
        spell_save_dc: null,
        initiative: null,
        initiative_order: null,
        conditions: null,
        ruleset_version: null,
        is_defeated: null,
        is_player: null,
        monster_id: "goblin",
        display_name: null,
        monster_group_id: null,
        group_order: null,
        dm_notes: null,
        player_notes: null,
        player_character_id: null,
      },
    ];
    mockOrder.mockResolvedValueOnce({ data: rawCombatants });

    const result = await fetchSessionSnapshot("enc-2");

    expect(result).not.toBeNull();
    // Session-level defaults
    expect(result!.round_number).toBe(1);
    expect(result!.current_turn_index).toBe(0);
    expect(result!.is_active).toBe(false);
    // Combatant-level defaults
    const c = result!.combatants[0];
    expect(c.temp_hp).toBe(0);
    expect(c.conditions).toEqual([]);
    expect(c.is_defeated).toBe(false);
    expect(c.is_player).toBe(false);
    expect(c.dm_notes).toBe("");
    expect(c.player_notes).toBe("");
  });

  it("returns empty combatants array when combatants query returns null", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { round_number: 1, current_turn_index: 0, is_active: true },
      error: null,
    });
    mockOrder.mockResolvedValueOnce({ data: null });

    const result = await fetchSessionSnapshot("enc-empty");

    expect(result).not.toBeNull();
    expect(result!.combatants).toEqual([]);
  });

  it("queries the correct tables with the encounter ID", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { round_number: 1, current_turn_index: 0, is_active: true },
      error: null,
    });
    mockOrder.mockResolvedValueOnce({ data: [] });

    await fetchSessionSnapshot("enc-42");

    expect(mockFrom).toHaveBeenCalledWith("encounters");
    expect(mockFrom).toHaveBeenCalledWith("combatants");
  });
});
