// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.

import type { Combatant } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Supabase mock plumbing
//
// `migrateGuestCharacterToAuth` uses three distinct query shapes:
//   1. INSERT into player_characters: .from().insert().select().single()
//   2. READ users.default_character_id: .from().select().eq().single()
//   3. UPDATE users.default_character_id: .from().update().eq()
//
// The mock tracks the last captured insert/update payloads and lets each
// test set the resolution values (including errors) per-operation.
// ---------------------------------------------------------------------------

type Capture = {
  insertedPayload: Record<string, unknown> | null;
  updatedPayload: Record<string, unknown> | null;
  updatedTable: string | null;
  insertTable: string | null;
  selectTable: string | null;
};

type State = {
  insertResult: { data: unknown; error: { message: string } | null };
  userReadResult: { data: unknown; error: { message: string } | null };
  userUpdateResult: { error: { message: string } | null };
  capture: Capture;
};

const state: State = {
  insertResult: { data: null, error: null },
  userReadResult: { data: null, error: null },
  userUpdateResult: { error: null },
  capture: {
    insertedPayload: null,
    updatedPayload: null,
    updatedTable: null,
    insertTable: null,
    selectTable: null,
  },
};

const fromMock = jest.fn((table: string) => {
  const builder = {
    insert: jest.fn((payload: Record<string, unknown>) => {
      state.capture.insertedPayload = payload;
      state.capture.insertTable = table;
      return {
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve(state.insertResult)),
        })),
      };
    }),

    update: jest.fn((payload: Record<string, unknown>) => {
      state.capture.updatedPayload = payload;
      state.capture.updatedTable = table;
      return {
        eq: jest.fn(() => Promise.resolve(state.userUpdateResult)),
      };
    }),

    select: jest.fn(() => {
      state.capture.selectTable = table;
      return {
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve(state.userReadResult)),
        })),
      };
    }),
  };
  return builder;
});

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

// ---------------------------------------------------------------------------
// Imports must come AFTER jest.mock so the mock is in place at module init.
// ---------------------------------------------------------------------------

import { migrateGuestCharacterToAuth } from "@/lib/supabase/character-portability";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-0000-0000-000000000001";
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000002";
const NEW_CHAR_ID = "00000000-0000-0000-0000-000000000003";
const EXISTING_DEFAULT_CHAR_ID = "00000000-0000-0000-0000-000000000004";

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "guest-1",
    name: "Aragorn",
    current_hp: 24,
    max_hp: 30,
    temp_hp: 0,
    ac: 16,
    spell_save_dc: null,
    initiative: null,
    initiative_order: null,
    conditions: [],
    ruleset_version: "2014",
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
    player_notes: "",
    player_character_id: null,
    session_token_id: null,
    combatant_role: "player",
    legendary_actions_total: null,
    legendary_actions_used: 0,
    reaction_used: false,
    ...overrides,
  };
}

function makeInsertedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: NEW_CHAR_ID,
    campaign_id: null,
    user_id: USER_ID,
    claimed_by_session_token: null,
    name: "Aragorn",
    max_hp: 30,
    current_hp: 24,
    ac: 16,
    hp_temp: 0,
    speed: null,
    initiative_bonus: null,
    inspiration: false,
    conditions: [],
    spell_save_dc: null,
    dm_notes: "",
    race: null,
    class: null,
    level: null,
    subrace: null,
    subclass: null,
    background: null,
    alignment: null,
    notes: null,
    token_url: null,
    spell_slots: null,
    str: null,
    dex: null,
    con: null,
    int_score: null,
    wis: null,
    cha_score: null,
    traits: null,
    proficiencies: {},
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  state.insertResult = { data: makeInsertedRow(), error: null };
  state.userReadResult = { data: { default_character_id: null }, error: null };
  state.userUpdateResult = { error: null };
  state.capture = {
    insertedPayload: null,
    updatedPayload: null,
    updatedTable: null,
    insertTable: null,
    selectTable: null,
  };
});

describe("migrateGuestCharacterToAuth — input validation", () => {
  it("throws when userId is empty", async () => {
    await expect(
      migrateGuestCharacterToAuth(makeCombatant(), ""),
    ).rejects.toThrow(/userId inválido/);
  });

  it("throws when userId is not a valid UUID", async () => {
    await expect(
      migrateGuestCharacterToAuth(makeCombatant(), "not-a-uuid"),
    ).rejects.toThrow(/userId inválido/);
  });

  it("throws when guestCharacter.is_player is false", async () => {
    await expect(
      migrateGuestCharacterToAuth(
        makeCombatant({ is_player: false }),
        USER_ID,
      ),
    ).rejects.toThrow("Migração falhou: personagem guest não é player");
  });
});

describe("migrateGuestCharacterToAuth — happy path mapping", () => {
  it("maps a full Combatant into a correct player_characters row", async () => {
    const combatant = makeCombatant({
      name: "Gandalf",
      current_hp: 48,
      max_hp: 60,
      temp_hp: 5,
      ac: 18,
      spell_save_dc: 17,
      conditions: ["blessed"],
      dm_notes: "Secret wizard",
      player_notes: "My staff glows",
      token_url: "https://example.test/gandalf.webp",
    });

    state.insertResult = {
      data: makeInsertedRow({ name: "Gandalf" }),
      error: null,
    };

    const result = await migrateGuestCharacterToAuth(combatant, USER_ID);

    expect(result.id).toBe(NEW_CHAR_ID);
    expect(state.capture.insertTable).toBe("player_characters");

    const payload = state.capture.insertedPayload!;
    expect(payload.user_id).toBe(USER_ID);
    expect(payload.campaign_id).toBeNull();
    expect(payload.name).toBe("Gandalf");
    expect(payload.max_hp).toBe(60);
    expect(payload.current_hp).toBe(48);
    expect(payload.ac).toBe(18);
    expect(payload.hp_temp).toBe(5);
    expect(payload.spell_save_dc).toBe(17);
    expect(payload.conditions).toEqual(["blessed"]);
    expect(payload.dm_notes).toBe("Secret wizard");
    expect(payload.notes).toBe("My staff glows");
    expect(payload.token_url).toBe("https://example.test/gandalf.webp");
    expect(payload.inspiration).toBe(false);
    expect(payload.proficiencies).toEqual({});
    expect(payload.currency).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
    expect(payload.race).toBeNull();
    expect(payload.class).toBeNull();
    expect(payload.level).toBeNull();
    expect(payload.str).toBeNull();
    expect(payload.spell_slots).toBeNull();
  });

  it("defaults optional fields correctly when Combatant has minimal data", async () => {
    const combatant = makeCombatant({
      name: "Slim",
      max_hp: 10,
      current_hp: 10,
      ac: 12,
      // Everything else defaults (temp_hp=0, dm_notes="", player_notes="", etc.)
    });

    const result = await migrateGuestCharacterToAuth(combatant, USER_ID);

    expect(result.id).toBe(NEW_CHAR_ID);

    const payload = state.capture.insertedPayload!;
    expect(payload.hp_temp).toBe(0);
    expect(payload.conditions).toEqual([]);
    expect(payload.dm_notes).toBe("");
    // Empty player_notes stored as NULL (not empty string) to distinguish
    // "no notes" from "notes cleared".
    expect(payload.notes).toBeNull();
    expect(payload.spell_save_dc).toBeNull();
    expect(payload.token_url).toBeNull();
  });
});

describe("migrateGuestCharacterToAuth — campaignId option", () => {
  it("sets campaign_id on insert when options.campaignId is provided", async () => {
    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID, {
      campaignId: CAMPAIGN_ID,
    });

    expect(state.capture.insertedPayload!.campaign_id).toBe(CAMPAIGN_ID);
  });

  it("sets campaign_id to null when options.campaignId is omitted", async () => {
    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID);

    expect(state.capture.insertedPayload!.campaign_id).toBeNull();
  });
});

describe("migrateGuestCharacterToAuth — setAsDefault logic", () => {
  it("setAsDefault=true: always UPDATEs users.default_character_id", async () => {
    // Even if user already has a default, true forces override.
    state.userReadResult = {
      data: { default_character_id: EXISTING_DEFAULT_CHAR_ID },
      error: null,
    };

    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID, {
      setAsDefault: true,
    });

    expect(state.capture.updatedTable).toBe("users");
    expect(state.capture.updatedPayload).toEqual({
      default_character_id: NEW_CHAR_ID,
    });
  });

  it("setAsDefault=false: never UPDATEs users.default_character_id", async () => {
    state.userReadResult = {
      data: { default_character_id: null },
      error: null,
    };

    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID, {
      setAsDefault: false,
    });

    expect(state.capture.updatedTable).toBeNull();
    expect(state.capture.updatedPayload).toBeNull();
  });

  it("setAsDefault=undefined + user has no default: sets it", async () => {
    state.userReadResult = {
      data: { default_character_id: null },
      error: null,
    };

    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID);

    expect(state.capture.updatedTable).toBe("users");
    expect(state.capture.updatedPayload).toEqual({
      default_character_id: NEW_CHAR_ID,
    });
  });

  it("setAsDefault=undefined + user already has default: does not override", async () => {
    state.userReadResult = {
      data: { default_character_id: EXISTING_DEFAULT_CHAR_ID },
      error: null,
    };

    await migrateGuestCharacterToAuth(makeCombatant(), USER_ID);

    expect(state.capture.updatedTable).toBeNull();
    expect(state.capture.updatedPayload).toBeNull();
  });
});

describe("migrateGuestCharacterToAuth — error propagation", () => {
  it("propagates insert errors with PT-BR prefix", async () => {
    state.insertResult = {
      data: null,
      error: { message: "violates unique constraint" },
    };

    await expect(
      migrateGuestCharacterToAuth(makeCombatant(), USER_ID),
    ).rejects.toThrow(/Migração falhou: violates unique constraint/);
  });

  it("throws PT-BR message when insert returns no data and no error", async () => {
    state.insertResult = { data: null, error: null };

    await expect(
      migrateGuestCharacterToAuth(makeCombatant(), USER_ID),
    ).rejects.toThrow(/Migração falhou/);
  });
});
