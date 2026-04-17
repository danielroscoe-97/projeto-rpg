/**
 * Tests for broadcast sanitization — verifies anti-metagaming rules.
 * Stories B1-1 + B1-2
 */

import type { Combatant } from "@/lib/types/combat";

const mockSend = jest.fn();
const mockUnsubscribe = jest.fn();

const mockChannel = {
  subscribe: jest.fn((cb?: (status: string) => void) => {
    if (cb) cb("SUBSCRIBED");
    return mockChannel;
  }),
  send: mockSend,
  unsubscribe: mockUnsubscribe,
  state: "joined",
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => mockChannel,
  }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

jest.mock("@/lib/realtime/broadcast-server", () => ({
  broadcastViaServer: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/realtime/offline-queue", () => ({
  enqueueAction: jest.fn(),
  getSyncStatus: jest.fn().mockReturnValue("online"),
  setSyncStatus: jest.fn(),
  replayQueue: jest.fn(),
}));

import { broadcastEvent, cleanupDmChannel, getDmChannel, shouldSkipServerBroadcast } from "./broadcast";
import { broadcastViaServer } from "./broadcast-server";

/** Flush microtask queue so broadcastViaServer.then() resolves */
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockSend.mockClear();
  mockChannel.subscribe.mockClear();
  mockChannel.state = "joined";
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
  is_hidden: false,
  is_player: false,
  monster_id: "beholder",
  token_url: null,
  creature_type: "aberration",
  monster_group_id: null,
  group_order: null,
  dm_notes: "secret weakness: antimagic",
  player_notes: "",
  player_character_id: null,
  combatant_role: null,
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
  is_hidden: false,
  is_player: true,
  monster_id: null,
  token_url: null,
  creature_type: null,
  monster_group_id: null,
  group_order: null,
  dm_notes: "is the true king",
  player_notes: "concentrating on Bless",
  player_character_id: "pc1",
  combatant_role: null,
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

describe("S1.2 — combat:combatant_add_reorder", () => {
  const addReorderEvent = {
    type: "combat:combatant_add_reorder",
    combatant: monsterCombatant,
    initiative_map: [
      { id: "hero", initiative_order: 0 },
      { id: "m1", initiative_order: 1 },
    ],
    current_turn_index: 0,
    round_number: 1,
    encounter_id: "enc-1",
  } as const;

  it("sanitizes the combatant in the payload", async () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", addReorderEvent);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.type).toBe("combat:combatant_add_reorder");
    // Real monster name replaced with display_name.
    expect(payload.combatant.name).toBe("Mysterious Creature");
    expect(payload.combatant.dm_notes).toBeUndefined();
    // Exact HP is stripped; hp_status is added.
    expect(payload.combatant.current_hp).toBeUndefined();
    expect(payload.combatant.hp_status).toBeDefined();
    // Initiative map + turn_index + round_number + encounter_id pass through.
    expect(payload.initiative_map).toEqual([
      { id: "hero", initiative_order: 0 },
      { id: "m1", initiative_order: 1 },
    ]);
    expect(payload.current_turn_index).toBe(0);
    expect(payload.round_number).toBe(1);
    expect(payload.encounter_id).toBe("enc-1");
  });

  it("suppresses the broadcast entirely when the new combatant is hidden", () => {
    getDmChannel("session-1");
    broadcastEvent("session-1", {
      ...addReorderEvent,
      combatant: { ...monsterCombatant, is_hidden: true },
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("opts out of server-side re-broadcast (FIFO guarantee)", async () => {
    (broadcastViaServer as jest.Mock).mockClear();
    getDmChannel("session-1");
    broadcastEvent("session-1", addReorderEvent);
    await flush();

    // Client-direct send fires.
    expect(mockSend).toHaveBeenCalledTimes(1);
    // Server path MUST NOT fire — this is the whole point of the opt-out.
    expect(broadcastViaServer).not.toHaveBeenCalled();
  });

  it("legacy combatant_add still uses the server path (regression — flag OFF behaviour)", async () => {
    (broadcastViaServer as jest.Mock).mockClear();
    getDmChannel("session-1");
    broadcastEvent("session-1", { type: "combat:combatant_add", combatant: monsterCombatant });
    await flush();

    expect(mockSend).toHaveBeenCalledTimes(1);
    // Legacy path MUST still call broadcastViaServer — otherwise we'd break
    // flag-OFF clients that rely on server sanitization.
    expect(broadcastViaServer).toHaveBeenCalledTimes(1);
  });

  describe("shouldSkipServerBroadcast", () => {
    it("returns true for combat:combatant_add_reorder", () => {
      expect(
        shouldSkipServerBroadcast({
          type: "combat:combatant_add_reorder",
          combatant: monsterCombatant,
          initiative_map: [],
          current_turn_index: 0,
          round_number: 1,
          encounter_id: "enc",
        }),
      ).toBe(true);
    });

    it("returns false for legacy combat:combatant_add", () => {
      expect(
        shouldSkipServerBroadcast({ type: "combat:combatant_add", combatant: monsterCombatant }),
      ).toBe(false);
    });

    it("returns false for session:state_sync", () => {
      expect(
        shouldSkipServerBroadcast({
          type: "session:state_sync",
          combatants: [],
          current_turn_index: 0,
          round_number: 1,
        }),
      ).toBe(false);
    });
  });
});
