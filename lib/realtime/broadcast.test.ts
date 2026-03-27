/**
 * Tests for broadcast sanitization — verifies anti-metagaming rules.
 * Stories B1-1 + B1-2
 */

import type { Combatant } from "@/lib/types/combat";

const mockSend = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      subscribe: mockSubscribe,
      send: mockSend,
      unsubscribe: mockUnsubscribe,
    }),
  }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

import { broadcastEvent, cleanupDmChannel, getDmChannel } from "./broadcast";

beforeEach(() => {
  mockSend.mockClear();
  mockSubscribe.mockClear();
  cleanupDmChannel();
});

const monsterCombatant: Combatant = {
  id: "m1",
  name: "Beholder",
  display_name: "Mysterious Creature",
  current_hp: 180,
  max_hp: 189,
  temp_hp: 0,
  ac: 18,
  spell_save_dc: 17,
  initiative: 15,
  initiative_order: 0,
  conditions: [],
  ruleset_version: "2014",
  is_defeated: false,
  is_player: false,
  monster_id: "beholder",
  token_url: null,
  creature_type: "aberration",
  monster_group_id: null,
  group_order: null,
  dm_notes: "secret weakness: antimagic",
  player_notes: "",
  player_character_id: null,
};

const playerCombatant: Combatant = {
  id: "p1",
  name: "Aragorn",
  display_name: null,
  current_hp: 45,
  max_hp: 52,
  temp_hp: 5,
  ac: 18,
  spell_save_dc: null,
  initiative: 20,
  initiative_order: 1,
  conditions: ["Blessed"],
  ruleset_version: null,
  is_defeated: false,
  is_player: true,
  monster_id: null,
  token_url: null,
  creature_type: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "is the true king",
  player_notes: "concentrating on Bless",
  player_character_id: "pc1",
};

describe("broadcastEvent – combat:combatant_add sanitization", () => {
  it("replaces monster real name with display_name for players", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: monsterCombatant });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.name).toBe("Mysterious Creature");
    expect(payload.combatant.display_name).toBeUndefined();
  });

  it("strips dm_notes from monster combatant", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: monsterCombatant });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.dm_notes).toBeUndefined();
  });

  it("strips exact HP, AC, spell_save_dc from monster", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: monsterCombatant });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.current_hp).toBeUndefined();
    expect(payload.combatant.max_hp).toBeUndefined();
    expect(payload.combatant.ac).toBeUndefined();
    expect(payload.combatant.spell_save_dc).toBeUndefined();
  });

  it("includes hp_status tier for monster", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: monsterCombatant });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.hp_status).toBe("LIGHT");
  });

  it("keeps player stats intact (HP, AC)", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: playerCombatant });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.name).toBe("Aragorn");
    expect(payload.combatant.current_hp).toBe(45);
    expect(payload.combatant.max_hp).toBe(52);
    expect(payload.combatant.ac).toBe(18);
  });

  it("strips dm_notes from player combatant", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: playerCombatant });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant.dm_notes).toBeUndefined();
  });
});

describe("broadcastEvent – session:state_sync sanitization", () => {
  it("sanitizes all combatants in state sync", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [monsterCombatant, playerCombatant],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatants[0].name).toBe("Mysterious Creature");
    expect(payload.combatants[0].current_hp).toBeUndefined();
    expect(payload.combatants[1].name).toBe("Aragorn");
    expect(payload.combatants[1].current_hp).toBe(45);
  });
});

describe("broadcastEvent – combat:hp_update sanitization", () => {
  it("sends only hp_status for monsters", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "m1",
      current_hp: 50,
      temp_hp: 0,
      max_hp: 189,
      is_player: false,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.hp_status).toBeDefined();
    expect(payload.current_hp).toBeUndefined();
    expect(payload.temp_hp).toBeUndefined();
  });

  it("sends full HP data for players", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "p1",
      current_hp: 45,
      temp_hp: 5,
      max_hp: 52,
      is_player: true,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.current_hp).toBe(45);
    expect(payload.temp_hp).toBe(5);
  });
});

describe("broadcastEvent – combat:stats_update sanitization (B1-2)", () => {
  it("does NOT leak real monster name to players when DM renames", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "m1",
      name: "Elder Brain",
      is_player: false,
      display_name: "Mysterious Creature",
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.name).not.toBe("Elder Brain");
    expect(payload.name).toBe("Mysterious Creature");
  });

  it("sends display_name change as visible name for monsters", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "m1",
      display_name: "Dark Shadow",
      is_player: false,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.name).toBe("Dark Shadow");
  });

  it("sends real name for player combatants", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "p1",
      name: "Aragorn II",
      is_player: true,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.name).toBe("Aragorn II");
  });
});
