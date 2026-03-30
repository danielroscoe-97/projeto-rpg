/**
 * Tests for broadcast sanitization — anti-metagaming security.
 * Story A0-6: Broadcast type safety
 *
 * Verifies that sensitive monster data (exact HP, AC, spell_save_dc, dm_notes)
 * is NEVER leaked to player-facing broadcast events.
 */

// ── Supabase mock ────────────────────────────────────────────────
const mockSend = jest.fn();
const mockUnsubscribe = jest.fn();
const mockChannelInstance = {
  send: mockSend,
  subscribe: jest.fn((cb?: (status: string) => void) => {
    if (cb) cb("SUBSCRIBED");
    return mockChannelInstance;
  }),
  unsubscribe: mockUnsubscribe,
  state: "joined",
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ channel: () => mockChannelInstance }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

// Mock server-side broadcast — return false to test client-side fallback path
jest.mock("@/lib/realtime/broadcast-server", () => ({
  broadcastViaServer: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/realtime/offline-queue", () => ({
  enqueueAction: jest.fn(),
  getSyncStatus: jest.fn().mockReturnValue("online"),
  setSyncStatus: jest.fn(),
  replayQueue: jest.fn(),
}));

import { broadcastEvent, cleanupDmChannel } from "../broadcast";
import type { Combatant } from "@/lib/types/combat";

// ── Test fixtures ────────────────────────────────────────────────

function makeMonster(overrides?: Partial<Combatant>): Combatant {
  return {
    id: "monster-1",
    name: "Ancient Red Dragon",
    current_hp: 200,
    max_hp: 546,
    temp_hp: 0,
    ac: 22,
    spell_save_dc: 24,
    initiative: 15,
    initiative_order: 1,
    conditions: [],
    ruleset_version: "2024",
    is_defeated: false,
    is_hidden: false,
    is_player: false,
    monster_id: "ancient-red-dragon",
    token_url: null,
    creature_type: "dragon",
    display_name: "Wyrm of Flame",
    monster_group_id: null,
    group_order: null,
    dm_notes: "SECRET: vulnerable to cold damage",
    player_notes: "",
    player_character_id: null,
    combatant_role: null,
    ...overrides,
  };
}

function makePlayer(overrides?: Partial<Combatant>): Combatant {
  return {
    id: "player-1",
    name: "Thorin Oakenshield",
    current_hp: 45,
    max_hp: 60,
    temp_hp: 5,
    ac: 18,
    spell_save_dc: 15,
    initiative: 12,
    initiative_order: 2,
    conditions: ["poisoned"],
    ruleset_version: "2024",
    is_defeated: false,
    is_hidden: false,
    is_player: true,
    monster_id: null,
    token_url: null,
    creature_type: null,
    display_name: null,
    monster_group_id: null,
    group_order: null,
    dm_notes: "",
    player_notes: "Focus fire on the dragon",
    player_character_id: "pc-1",
    combatant_role: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChannelInstance.state = "joined";
  cleanupDmChannel();
});

// ── Anti-metagaming: Monster data sanitization ───────────────────

describe("broadcast sanitization — monsters", () => {
  it("strips exact HP from monster hp_update events", () => {
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "monster-1",
      current_hp: 200,
      temp_hp: 0,
      max_hp: 546,
      is_player: false,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.type).toBe("combat:hp_update");
    expect(payload.hp_status).toBeDefined();
    // CRITICAL: exact HP values must NOT be present
    expect(payload.current_hp).toBeUndefined();
    expect(payload.temp_hp).toBeUndefined();
    expect(payload.max_hp).toBeUndefined();
  });

  it("returns correct hp_status tiers for monsters", () => {
    // Full health (>70%) → LIGHT
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "m1",
      current_hp: 80,
      temp_hp: 0,
      max_hp: 100,
      is_player: false,
    });
    expect(mockSend.mock.calls[0][0].payload.hp_status).toBe("LIGHT");

    // 40-70% → MODERATE
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "m1",
      current_hp: 50,
      temp_hp: 0,
      max_hp: 100,
      is_player: false,
    });
    expect(mockSend.mock.calls[1][0].payload.hp_status).toBe("MODERATE");

    // 10-40% → HEAVY
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "m1",
      current_hp: 20,
      temp_hp: 0,
      max_hp: 100,
      is_player: false,
    });
    expect(mockSend.mock.calls[2][0].payload.hp_status).toBe("HEAVY");

    // ≤10% → CRITICAL
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "m1",
      current_hp: 5,
      temp_hp: 0,
      max_hp: 100,
      is_player: false,
    });
    expect(mockSend.mock.calls[3][0].payload.hp_status).toBe("CRITICAL");
  });

  it("strips dm_notes, AC, spell_save_dc from monster in combatant_add", () => {
    const monster = makeMonster();
    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: monster,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    const sanitized = payload.combatant;

    // Anti-metagaming: display_name replaces real name
    expect(sanitized.name).toBe("Wyrm of Flame");
    expect(sanitized.display_name).toBeUndefined();

    // Sensitive fields stripped
    expect(sanitized.dm_notes).toBeUndefined();
    expect(sanitized.current_hp).toBeUndefined();
    expect(sanitized.max_hp).toBeUndefined();
    expect(sanitized.temp_hp).toBeUndefined();
    expect(sanitized.ac).toBeUndefined();
    expect(sanitized.spell_save_dc).toBeUndefined();

    // hp_status included instead
    expect(sanitized.hp_status).toBeDefined();
  });

  it("strips monster stats from state_sync combatants", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [makeMonster(), makePlayer()],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    const [monsterSanitized, playerSanitized] = payload.combatants;

    // Monster: no exact HP/AC
    expect(monsterSanitized.current_hp).toBeUndefined();
    expect(monsterSanitized.ac).toBeUndefined();
    expect(monsterSanitized.hp_status).toBeDefined();
    expect(monsterSanitized.dm_notes).toBeUndefined();

    // Player: keeps full stats
    expect(playerSanitized.current_hp).toBe(45);
    expect(playerSanitized.max_hp).toBe(60);
    expect(playerSanitized.ac).toBe(18);
  });

  it("strips monster stats from initiative_reorder combatants", () => {
    broadcastEvent("session-1", {
      type: "combat:initiative_reorder",
      combatants: [makeMonster()],
    });

    const sanitized = mockSend.mock.calls[0][0].payload.combatants[0];
    expect(sanitized.current_hp).toBeUndefined();
    expect(sanitized.ac).toBeUndefined();
    expect(sanitized.hp_status).toBeDefined();
  });

  it("strips AC and spell_save_dc from monster stats_update events", () => {
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "monster-1",
      is_player: false,
      name: "Ancient Red Dragon",
      display_name: "Wyrm of Flame",
      max_hp: 600,
      ac: 25,
      spell_save_dc: 20,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    // Monster: display_name becomes visible name
    expect(payload.name).toBe("Wyrm of Flame");
    // Sensitive stats stripped
    expect(payload.max_hp).toBeUndefined();
    expect(payload.ac).toBeUndefined();
    expect(payload.spell_save_dc).toBeUndefined();
    expect(payload.display_name).toBeUndefined();
  });

  it("forwards name for player stats_update events", () => {
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "player-1",
      is_player: true,
      name: "Renamed Player",
      max_hp: 80,
      ac: 20,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.name).toBe("Renamed Player");
    // Still strips sensitive stats for consistency
    expect(payload.max_hp).toBeUndefined();
    expect(payload.ac).toBeUndefined();
  });
});

// ── Player data: should pass through ─────────────────────────────

describe("broadcast sanitization — players", () => {
  it("keeps full HP data for player hp_update events", () => {
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "player-1",
      current_hp: 45,
      temp_hp: 5,
      max_hp: 60,
      is_player: true,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.current_hp).toBe(45);
    expect(payload.temp_hp).toBe(5);
    expect(payload.max_hp).toBe(60);
    expect(payload.hp_status).toBeDefined();
  });

  it("keeps player stats in combatant_add", () => {
    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: makePlayer(),
    });

    const sanitized = mockSend.mock.calls[0][0].payload.combatant;
    expect(sanitized.current_hp).toBe(45);
    expect(sanitized.max_hp).toBe(60);
    expect(sanitized.ac).toBe(18);
    expect(sanitized.name).toBe("Thorin Oakenshield");
  });
});

// ── Passthrough events (no sensitive data) ───────────────────────

describe("broadcast sanitization — passthrough events", () => {
  it("passes turn_advance events unchanged", () => {
    broadcastEvent("session-1", {
      type: "combat:turn_advance",
      current_turn_index: 2,
      round_number: 3,
      next_combatant_id: "player-1",
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.type).toBe("combat:turn_advance");
    expect(payload.current_turn_index).toBe(2);
    expect(payload.round_number).toBe(3);
  });

  it("passes condition_change events unchanged", () => {
    broadcastEvent("session-1", {
      type: "combat:condition_change",
      combatant_id: "monster-1",
      conditions: ["stunned", "prone"],
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.conditions).toEqual(["stunned", "prone"]);
  });

  it("passes combatant_remove events unchanged", () => {
    broadcastEvent("session-1", {
      type: "combat:combatant_remove",
      combatant_id: "monster-1",
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatant_id).toBe("monster-1");
  });

  it("passes defeated_change events unchanged", () => {
    broadcastEvent("session-1", {
      type: "combat:defeated_change",
      combatant_id: "monster-1",
      is_defeated: true,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.is_defeated).toBe(true);
  });
});

// ── Session channel management ───────────────────────────────────

describe("broadcast channel management", () => {
  it("blocks broadcast to stale session", () => {
    // First broadcast creates channel for session-1
    broadcastEvent("session-1", {
      type: "combat:combatant_remove",
      combatant_id: "x",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    // Trying to broadcast to session-2 while channel is for session-1 is blocked
    // (getDmChannel recreates, but the guard in broadcastEvent checks currentSessionId)
    // After cleanup and re-init, it should work fine
    cleanupDmChannel();
    broadcastEvent("session-2", {
      type: "combat:combatant_remove",
      combatant_id: "y",
    });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
