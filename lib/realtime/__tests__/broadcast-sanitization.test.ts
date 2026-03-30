/**
 * Broadcast Sanitization E2E Tests — Story 3
 *
 * Integration tests verifying the broadcast sanitization pipeline:
 * - DM events are properly sanitized before reaching players
 * - Hidden combatants are suppressed
 * - Monster stats are stripped; player stats are preserved
 * - State sync adjusts turn index for visible combatants
 *
 * These tests mock the Supabase channel to capture what would be sent
 * over the wire, then verify the sanitized payloads.
 *
 * Run: npm test -- --testPathPattern=broadcast-sanitization
 */

// ── Supabase mock ────────────────────────────────────────────────
const mockSend = jest.fn();
const mockSubscribe = jest.fn((cb: (status: string) => void) => {
  cb("SUBSCRIBED");
});
const mockUnsubscribe = jest.fn();
const mockChannel = jest.fn(() => ({
  send: mockSend,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  state: "joined",
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ channel: mockChannel }),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

import {
  broadcastEvent,
  cleanupDmChannel,
  registerHiddenLookup,
} from "../broadcast";
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

function makeHiddenMonster(overrides?: Partial<Combatant>): Combatant {
  return makeMonster({
    id: "hidden-ambush",
    name: "Ambush Predator",
    is_hidden: true,
    dm_notes: "Surprise round — attacks on initiative 20",
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  cleanupDmChannel();
  // Reset hidden lookup
  registerHiddenLookup(() => false);
});

// ===========================================================================
// Story 3.1: DM updates monster HP → Player receives hp_status (NOT current_hp)
// ===========================================================================

describe("Broadcast Sanitization — Monster HP", () => {
  it("DM updates monster HP → Player receives hp_status, NOT current_hp", () => {
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

    // Player receives tier label only
    expect(payload.hp_status).toBeDefined();
    expect(typeof payload.hp_status).toBe("string");
    expect(["LIGHT", "MODERATE", "HEAVY", "CRITICAL"]).toContain(payload.hp_status);

    // CRITICAL: No exact HP values
    expect(payload.current_hp).toBeUndefined();
    expect(payload.temp_hp).toBeUndefined();
    expect(payload.max_hp).toBeUndefined();
  });
});

// ===========================================================================
// Story 3.2: DM updates PC HP → Player receives current_hp (full data)
// ===========================================================================

describe("Broadcast Sanitization — Player HP", () => {
  it("DM updates PC HP → Player receives full HP data", () => {
    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "player-1",
      current_hp: 45,
      temp_hp: 5,
      max_hp: 60,
      is_player: true,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;

    expect(payload.current_hp).toBe(45);
    expect(payload.temp_hp).toBe(5);
    expect(payload.max_hp).toBe(60);
    expect(payload.hp_status).toBeDefined();
  });
});

// ===========================================================================
// Story 3.3: DM adds hidden combatant → Player does NOT receive broadcast
// ===========================================================================

describe("Broadcast Sanitization — Hidden Combatants", () => {
  it("DM adds hidden combatant → broadcast is suppressed entirely", () => {
    const hidden = makeHiddenMonster();

    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: hidden,
    });

    // Broadcast should be suppressed — player sees nothing
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("hidden combatant HP update is suppressed when lookup reports hidden", () => {
    registerHiddenLookup((id) => id === "hidden-ambush");

    broadcastEvent("session-1", {
      type: "combat:hp_update",
      combatant_id: "hidden-ambush",
      current_hp: 30,
      temp_hp: 0,
      max_hp: 50,
      is_player: false,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("hidden combatant condition change is suppressed", () => {
    registerHiddenLookup((id) => id === "hidden-ambush");

    broadcastEvent("session-1", {
      type: "combat:condition_change",
      combatant_id: "hidden-ambush",
      conditions: ["invisible"],
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("hidden combatant defeated change is suppressed", () => {
    registerHiddenLookup((id) => id === "hidden-ambush");

    broadcastEvent("session-1", {
      type: "combat:defeated_change",
      combatant_id: "hidden-ambush",
      is_defeated: true,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Story 3.4: DM reveals combatant → Player receives combatant_add
// ===========================================================================

describe("Broadcast Sanitization — Reveal Combatant", () => {
  it("revealing a visible combatant sends sanitized combatant_add", () => {
    // When a combatant is revealed, the caller converts hidden_change → combatant_add
    const revealed = makeMonster({
      id: "revealed-monster",
      is_hidden: false,
    });

    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: revealed,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    const sanitized = payload.combatant;

    // Monster stats stripped
    expect(sanitized.current_hp).toBeUndefined();
    expect(sanitized.max_hp).toBeUndefined();
    expect(sanitized.ac).toBeUndefined();
    expect(sanitized.dm_notes).toBeUndefined();
    expect(sanitized.hp_status).toBeDefined();

    // display_name applied as visible name
    expect(sanitized.name).toBe("Wyrm of Flame");
  });
});

// ===========================================================================
// Story 3.5: DM edits monster stats → Player receives only display_name
// ===========================================================================

describe("Broadcast Sanitization — Stats Update", () => {
  it("DM edits monster stats → Player receives only visible name", () => {
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

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;

    // Only display_name surfaces as "name"
    expect(payload.name).toBe("Wyrm of Flame");

    // Sensitive stats stripped
    expect(payload.max_hp).toBeUndefined();
    expect(payload.ac).toBeUndefined();
    expect(payload.spell_save_dc).toBeUndefined();
    expect(payload.display_name).toBeUndefined();
  });

  it("DM edits monster without display_name → name is undefined (nothing visible to change)", () => {
    broadcastEvent("session-1", {
      type: "combat:stats_update",
      combatant_id: "monster-2",
      is_player: false,
      name: "Goblin",
      max_hp: 20,
      ac: 14,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    // No display_name set → visible name is undefined (no change to report)
    expect(payload.name).toBeUndefined();
    expect(payload.max_hp).toBeUndefined();
    expect(payload.ac).toBeUndefined();
  });
});

// ===========================================================================
// Story 3.6: DM adds dm_notes → Player does NOT receive dm_notes
// ===========================================================================

describe("Broadcast Sanitization — DM Notes", () => {
  it("combatant_add strips dm_notes from monsters", () => {
    const monster = makeMonster({ dm_notes: "SECRET WEAKNESS: cold iron" });

    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: monster,
    });

    const sanitized = mockSend.mock.calls[0][0].payload.combatant;
    expect(sanitized.dm_notes).toBeUndefined();
  });

  it("combatant_add strips dm_notes from players too", () => {
    const player = makePlayer({ dm_notes: "This player tends to hoard items" });

    broadcastEvent("session-1", {
      type: "combat:combatant_add",
      combatant: player,
    });

    const sanitized = mockSend.mock.calls[0][0].payload.combatant;
    expect(sanitized.dm_notes).toBeUndefined();
  });

  it("state_sync strips dm_notes from all combatants", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [
        makeMonster({ dm_notes: "Monster secret" }),
        makePlayer({ dm_notes: "Player secret" }),
      ],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    for (const c of payload.combatants) {
      expect(c.dm_notes).toBeUndefined();
    }
  });
});

// ===========================================================================
// Story 3.7: State sync (reconnect) → Player receives only visible combatants
// ===========================================================================

describe("Broadcast Sanitization — State Sync", () => {
  it("state_sync filters out hidden combatants", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [
        makeMonster({ id: "visible-1", is_hidden: false }),
        makeHiddenMonster({ id: "hidden-1", is_hidden: true }),
        makePlayer({ id: "player-1", is_hidden: false }),
      ],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatants).toHaveLength(2);

    const ids = payload.combatants.map((c: { id: string }) => c.id);
    expect(ids).toContain("visible-1");
    expect(ids).toContain("player-1");
    expect(ids).not.toContain("hidden-1");
  });

  it("state_sync sanitizes monster data in visible list", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [
        makeMonster({ current_hp: 300, max_hp: 546, ac: 22 }),
      ],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    const [monster] = payload.combatants;

    expect(monster.current_hp).toBeUndefined();
    expect(monster.max_hp).toBeUndefined();
    expect(monster.ac).toBeUndefined();
    expect(monster.hp_status).toBeDefined();
    expect(monster.dm_notes).toBeUndefined();
  });

  it("state_sync preserves player data in visible list", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [makePlayer({ current_hp: 30, max_hp: 60, ac: 18 })],
      current_turn_index: 0,
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    const [player] = payload.combatants;

    expect(player.current_hp).toBe(30);
    expect(player.max_hp).toBe(60);
    expect(player.ac).toBe(18);
  });
});

// ===========================================================================
// Story 3.8: State sync → Turn index adjusted for visible list
// ===========================================================================

describe("Broadcast Sanitization — Turn Index Adjustment", () => {
  it("turn index adjusted when hidden combatants precede the active turn", () => {
    // DM list: [hidden(0), visible-monster(1), player(2)]
    // Visible list: [visible-monster(0), player(1)]
    // DM turn index 1 (visible-monster) → player turn index 0
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [
        makeHiddenMonster({ id: "h1", initiative_order: 0 }),
        makeMonster({ id: "v1", initiative_order: 1 }),
        makePlayer({ id: "p1", initiative_order: 2 }),
      ],
      current_turn_index: 1,
      round_number: 2,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    // After filtering hidden, turn index should point to v1 in the visible list
    expect(payload.current_turn_index).toBe(0);
    expect(payload.combatants).toHaveLength(2);
  });

  it("turn on hidden combatant → player sees -1 (DMs turn)", () => {
    broadcastEvent("session-1", {
      type: "session:state_sync",
      combatants: [
        makeHiddenMonster({ id: "h1", initiative_order: 0 }),
        makeMonster({ id: "v1", initiative_order: 1 }),
      ],
      current_turn_index: 0, // Turn is on the hidden combatant
      round_number: 1,
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.current_turn_index).toBe(-1);
  });

  it("initiative_reorder filters hidden and sanitizes", () => {
    broadcastEvent("session-1", {
      type: "combat:initiative_reorder",
      combatants: [
        makeHiddenMonster({ id: "h1" }),
        makeMonster({ id: "v1" }),
        makePlayer({ id: "p1" }),
      ],
    });

    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.combatants).toHaveLength(2);

    const monster = payload.combatants.find((c: { id: string }) => c.id === "v1");
    expect(monster.current_hp).toBeUndefined();
    expect(monster.hp_status).toBeDefined();
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe("Broadcast Sanitization — Edge Cases", () => {
  it("player:death_save events are never broadcast to player channel", () => {
    broadcastEvent("session-1", {
      type: "player:death_save",
      player_name: "Thorin",
      combatant_id: "player-1",
      result: "success",
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("audio:play_sound passes through unchanged", () => {
    broadcastEvent("session-1", {
      type: "audio:play_sound",
      sound_id: "sword-clash",
      source: "preset",
      player_name: "Thorin",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.sound_id).toBe("sword-clash");
  });

  it("session:weather_change passes through unchanged", () => {
    broadcastEvent("session-1", {
      type: "session:weather_change",
      effect: "heavy_rain",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.effect).toBe("heavy_rain");
  });

  it("hidden_change event is converted to combatant_remove as safety net", () => {
    // If hidden_change somehow reaches broadcastEvent directly (bypass caller conversion)
    broadcastEvent("session-1", {
      type: "combat:hidden_change",
      combatant_id: "monster-1",
      is_hidden: true,
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const payload = mockSend.mock.calls[0][0].payload;
    expect(payload.type).toBe("combat:combatant_remove");
    expect(payload.combatant_id).toBe("monster-1");
  });
});
