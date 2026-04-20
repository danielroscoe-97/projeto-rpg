// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.

import type { Combatant } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Supabase mock plumbing
//
// `upgradePlayerIdentity` touches multiple tables with varied query shapes.
// We model the mock as a small state machine:
//
//   - `state.tokenRow`           — result of SELECT session_tokens WHERE id = ?
//   - `state.existingUser`       — result of SELECT users WHERE id = ?
//   - `state.usersUpsertError`   — optional error for UPSERT public.users
//   - `state.tokenUpdateError`   — optional error for UPDATE session_tokens
//   - `state.userTokensResult`   — SELECT session_tokens WHERE user_id = ?
//   - `state.promotedChars`      — UPDATE player_characters RETURNING id
//   - `state.promoteCharsError`  — optional error for the above
//   - `state.sessionsForTokens`  — SELECT session_tokens with joined sessions/campaigns
//   - `state.campaignMembersInserted` — UPSERT campaign_members RETURNING id
//   - `state.campaignMembersError`    — optional error
//   - `state.userUpdateError`    — optional error for the final UPDATE users
//   - `state.memberships`        — SELECT campaign_members WHERE user_id = ? (broadcast loop)
//
// We also support the character-portability `migrateGuestCharacterToAuth` path
// via its own state block (insertResult, userReadResult, userUpdateResult).
// ---------------------------------------------------------------------------

type DbError = { message: string } | null;
type DbResult<T> = { data: T | null; error: DbError };

type SessionTokenRow = {
  id: string;
  anon_user_id: string | null;
  user_id: string | null;
  session_id: string | null;
  player_name: string | null;
};

type UsersRow = {
  id?: string;
  email?: string | null;
  display_name?: string | null;
  default_character_id?: string | null;
};

type State = {
  tokenRow: { data: SessionTokenRow | null; error: DbError };
  existingUser: { data: UsersRow | null; error: DbError };
  usersUpsertError: DbError;
  tokenUpdateError: DbError;
  userTokensResult: { data: Array<{ id: string }> | null; error: DbError };
  promotedChars: { data: Array<{ id: string }> | null; error: DbError };
  sessionsForTokens: {
    data:
      | Array<{
          session_id: string | null;
          sessions: {
            campaign_id: string | null;
            campaigns: { id: string; owner_id: string } | null;
          } | null;
        }>
      | null;
    error: DbError;
  };
  campaignMembersInserted: { data: Array<{ id: string }> | null; error: DbError };
  memberships: { data: Array<{ campaign_id: string }> | null; error: DbError };
  mostRecentCharResult: { data: { id: string } | null; error: DbError };
  currentUserForDefault: { data: { default_character_id: string | null } | null; error: DbError };
  userUpdateError: DbError;
  upgradeFailedMarked: boolean;
  adminGetUser: DbResult<{ user: { email: string; user_metadata?: Record<string, unknown> } }>;
  // Portability side (migrateGuestCharacterToAuth):
  portInsertResult: DbResult<Record<string, unknown>>;
  portUserReadResult: DbResult<{ default_character_id: string | null }>;
  portUserUpdateResult: { error: DbError };
  // Counters for assertions
  calls: {
    usersUpsert: number;
    sessionTokensUpdate: number;
    playerCharsUpdate: number;
    campaignMembersUpsert: number;
    usersUpdate: number;
  };
};

const state: State = createInitialState();

function createInitialState(): State {
  return {
    tokenRow: { data: null, error: null },
    existingUser: { data: null, error: null },
    usersUpsertError: null,
    tokenUpdateError: null,
    userTokensResult: { data: [], error: null },
    promotedChars: { data: [], error: null },
    sessionsForTokens: { data: [], error: null },
    campaignMembersInserted: { data: [], error: null },
    memberships: { data: [], error: null },
    mostRecentCharResult: { data: null, error: null },
    currentUserForDefault: { data: { default_character_id: null }, error: null },
    userUpdateError: null,
    upgradeFailedMarked: false,
    adminGetUser: { data: null, error: null },
    portInsertResult: { data: null, error: null },
    portUserReadResult: { data: { default_character_id: null }, error: null },
    portUserUpdateResult: { error: null },
    calls: {
      usersUpsert: 0,
      sessionTokensUpdate: 0,
      playerCharsUpdate: 0,
      campaignMembersUpsert: 0,
      usersUpdate: 0,
    },
  };
}

// Each .from(table) returns a builder shaped to the specific queries the
// saga makes against that table. We route by table name to keep the mock
// predictable and close to the code under test.
function makeBuilder(table: string): Record<string, unknown> {
  if (table === "session_tokens") return sessionTokensBuilder();
  if (table === "users") return usersBuilder();
  if (table === "player_characters") return playerCharactersBuilder();
  if (table === "campaign_members") return campaignMembersBuilder();
  // Unknown table — return a no-op builder that rejects to surface test bugs.
  return {
    select: () => ({
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: `unmocked table: ${table}` } }) }),
    }),
  };
}

function sessionTokensBuilder() {
  // There are 3 distinct queries against session_tokens:
  //   A. SELECT ... .eq("id", sessionTokenId).maybeSingle()      -> tokenRow
  //   B. UPDATE .eq("id", sid).is("user_id", null)               -> tokenUpdateError
  //   C. SELECT id .eq("user_id", ...)                           -> userTokensResult
  //   D. SELECT session_id, sessions(...) .eq("user_id", ...).eq("is_active", true)
  //                                                              -> sessionsForTokens
  //
  // We disambiguate via column names handed to `.select` and the columns used
  // in subsequent `.eq` calls.
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      return builder;
    }),
    // UPDATE path ---------------------------------------------------------
    update: jest.fn(() => {
      // UPDATE → .eq().is() — returns a promise-like that resolves to
      // { error } per Supabase semantics for UPDATE without .select().
      const p = Promise.resolve({ error: state.tokenUpdateError, data: null });
      // increment counter when await-chain terminates.
      const resolver = {
        eq: jest.fn(() => ({
          is: jest.fn(() => {
            state.calls.sessionTokensUpdate++;
            return p;
          }),
        })),
      };
      return resolver;
    }),
    // SELECT paths --------------------------------------------------------
    eq: jest.fn((_col: string, _val: unknown) => {
      // Chain continues; terminator is either maybeSingle() or another eq()
      // + terminator (for 2-filter path D).
      const second = {
        eq: jest.fn(() => {
          // Path D: .eq("user_id",…).eq("is_active", true) then awaited directly
          return Promise.resolve(state.sessionsForTokens);
        }),
        maybeSingle: jest.fn(() => Promise.resolve(state.tokenRow)),
        then: (resolve: (v: unknown) => unknown) => {
          // Path C: SELECT id .eq("user_id", ...) awaited directly (no maybeSingle)
          if (selectCols === "id") {
            return Promise.resolve(state.userTokensResult).then(resolve);
          }
          return Promise.resolve(state.tokenRow).then(resolve);
        },
      };
      return second;
    }),
  };
  return builder;
}

function usersBuilder() {
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      return builder;
    }),
    upsert: jest.fn(() => {
      state.calls.usersUpsert++;
      return Promise.resolve({ error: state.usersUpsertError, data: null });
    }),
    update: jest.fn((payload: Record<string, unknown>) => {
      state.calls.usersUpdate++;
      // The `markUpgradeFailed` helper sets upgrade_failed_at — track it.
      if (payload && "upgrade_failed_at" in payload && payload.upgrade_failed_at) {
        state.upgradeFailedMarked = true;
      }
      return {
        eq: jest.fn(() => Promise.resolve({ error: state.userUpdateError, data: null })),
      };
    }),
    eq: jest.fn(() => ({
      maybeSingle: jest.fn(() => {
        // Disambiguate by which columns were selected.
        if (selectCols.includes("email")) {
          // Recovery path reads email + display_name.
          return Promise.resolve({
            data: state.existingUser.data
              ? {
                  email: state.existingUser.data.email ?? null,
                  display_name: state.existingUser.data.display_name ?? null,
                }
              : null,
            error: state.existingUser.error,
          });
        }
        if (selectCols.includes("default_character_id")) {
          return Promise.resolve(state.currentUserForDefault);
        }
        // Default: existence check inside upgradePlayerIdentity idempotency
        return Promise.resolve({
          data: state.existingUser.data ? { id: state.existingUser.data.id ?? "" } : null,
          error: state.existingUser.error,
        });
      }),
    })),
  };
  return builder;
}

function playerCharactersBuilder() {
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      // After UPDATE .select("id") — return the promoted rows.
      return Promise.resolve(state.promotedChars);
    }),
    update: jest.fn(() => {
      // UPDATE .in(...) .select("id")
      return {
        in: jest.fn(() => ({
          select: jest.fn(() => {
            state.calls.playerCharsUpdate++;
            return Promise.resolve(state.promotedChars);
          }),
        })),
      };
    }),
    // The final "most recent promoted" query chains .select().eq().order().limit().maybeSingle()
    // Expose it via a separate top-level builder.
    eq: jest.fn(() => ({
      order: jest.fn(() => ({
        limit: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve(state.mostRecentCharResult)),
        })),
      })),
    })),
  };
  // The "select('*').single()" path used by migrateGuestCharacterToAuth
  // lives here too — we handle it by pretending the .insert() path was taken.
  builder.insert = jest.fn(() => ({
    select: jest.fn(() => ({
      single: jest.fn(() => Promise.resolve(state.portInsertResult)),
    })),
  }));
  // Re-expose select for the recovery path (columns starting with "id").
  const originalSelect = builder.select;
  builder.select = jest.fn((cols: string) => {
    selectCols = cols;
    // After INSERT ... .select() with no arg is handled by the insert() path.
    // After UPDATE ... .in(...) .select("id") is handled inside update().
    // The "most recent character" chain starts with .select("id") followed
    // by .eq/.order/.limit/.maybeSingle. We return a builder that handles
    // that.
    if (cols === "id") {
      return {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve(state.mostRecentCharResult)),
            })),
          })),
        })),
      };
    }
    return (originalSelect as (c: string) => unknown)(cols);
  });
  return builder;
}

function campaignMembersBuilder() {
  const builder: Record<string, unknown> = {
    upsert: jest.fn(() => {
      state.calls.campaignMembersUpsert++;
      return {
        select: jest.fn(() => Promise.resolve(state.campaignMembersInserted)),
      };
    }),
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve(state.memberships)),
    })),
  };
  return builder;
}

const fromMock = jest.fn((table: string) => makeBuilder(table));

// Channel mock for broadcasts — send/removeChannel both resolve.
const channelMock = {
  send: jest.fn(() => Promise.resolve("ok")),
};
const removeChannelMock = jest.fn(() => Promise.resolve("ok"));

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: fromMock,
    channel: jest.fn(() => channelMock),
    removeChannel: removeChannelMock,
    auth: {
      admin: {
        getUserById: jest.fn(() => Promise.resolve(state.adminGetUser)),
      },
    },
  }),
}));

// Mock character-portability separately so we can assert it was called and
// control its success/failure without reasoning about its own Supabase calls.
jest.mock("@/lib/supabase/character-portability", () => ({
  migrateGuestCharacterToAuth: jest.fn((_g: Combatant, userId: string) =>
    Promise.resolve({
      id: "00000000-0000-0000-0000-00000000cccc",
      user_id: userId,
      name: "GuestChar",
    }),
  ),
}));

// ---------------------------------------------------------------------------
// Imports come after jest.mock so module init picks up the mocks.
// ---------------------------------------------------------------------------

import {
  upgradePlayerIdentity,
  recoverUpgradePlayerIdentity,
} from "@/lib/supabase/player-identity";
import { migrateGuestCharacterToAuth } from "@/lib/supabase/character-portability";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION_TOKEN_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";
const OTHER_USER_ID = "00000000-0000-0000-0000-0000000000ff";
const SESSION_ID = "00000000-0000-0000-0000-000000000003";
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000004";
const CAMPAIGN_OWNER_ID = "00000000-0000-0000-0000-000000000005";

const VALID_CREDS = {
  email: "newuser@example.com",
  password: "abcdefgh",
  displayName: "New User",
};

function makeSessionToken(overrides: Partial<SessionTokenRow> = {}): SessionTokenRow {
  return {
    id: SESSION_TOKEN_ID,
    anon_user_id: USER_ID,
    user_id: null,
    session_id: SESSION_ID,
    player_name: "GuestyMcGuestface",
    ...overrides,
  };
}

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

function resetState(): void {
  const fresh = createInitialState();
  // Copy properties onto the live `state` object so references in the mock
  // closure remain valid.
  (Object.keys(fresh) as Array<keyof State>).forEach((k) => {
    // @ts-expect-error — dynamic assignment across union keys
    state[k] = fresh[k];
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  resetState();
  channelMock.send.mockClear();
  channelMock.send.mockImplementation(() => Promise.resolve("ok"));
  removeChannelMock.mockClear();
});

describe("upgradePlayerIdentity — Phase 1 pre-flight", () => {
  it("1. returns session_token_not_found when token row is missing", async () => {
    state.tokenRow = { data: null, error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("session_token_not_found");
      expect(result.retryable).toBe(false);
    }
  });

  it("2. returns invalid_credentials when email format is bogus", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: { ...VALID_CREDS, email: "not-an-email" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_credentials");
      expect(result.retryable).toBe(false);
    }
  });

  it("3. returns invalid_credentials when password is too short", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: { ...VALID_CREDS, password: "short1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_credentials");
    }
  });

  it("returns session_token_not_found when caller doesn't own the token", async () => {
    // Token belongs to a different anon uuid.
    state.tokenRow = {
      data: makeSessionToken({ anon_user_id: OTHER_USER_ID, user_id: null }),
      error: null,
    };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("session_token_not_found");
    }
  });
});

describe("upgradePlayerIdentity — Phase 3 happy path", () => {
  it("4. idempotency: user_id already set and users row exists returns no-op success", async () => {
    state.tokenRow = {
      data: makeSessionToken({ user_id: USER_ID }),
      error: null,
    };
    state.existingUser = { data: { id: USER_ID }, error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe(USER_ID);
      expect(result.migrated).toEqual({
        playerCharactersPromoted: 0,
        campaignMembersInserted: 0,
        guestCharacterMigrated: false,
      });
    }
    // No migration side effects.
    expect(state.calls.usersUpsert).toBe(0);
    expect(state.calls.playerCharsUpdate).toBe(0);
  });

  it("5. happy path (no guestCharacter) executes all steps and returns counts", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };
    state.userTokensResult = {
      data: [{ id: SESSION_TOKEN_ID }],
      error: null,
    };
    state.promotedChars = {
      data: [{ id: "00000000-0000-0000-0000-00000000aaaa" }],
      error: null,
    };
    state.sessionsForTokens = {
      data: [
        {
          session_id: SESSION_ID,
          sessions: {
            campaign_id: CAMPAIGN_ID,
            campaigns: { id: CAMPAIGN_ID, owner_id: CAMPAIGN_OWNER_ID },
          },
        },
      ],
      error: null,
    };
    state.campaignMembersInserted = {
      data: [{ id: "00000000-0000-0000-0000-00000000bbbb" }],
      error: null,
    };
    state.memberships = { data: [{ campaign_id: CAMPAIGN_ID }], error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe(USER_ID);
      expect(result.migrated.playerCharactersPromoted).toBe(1);
      expect(result.migrated.campaignMembersInserted).toBe(1);
      expect(result.migrated.guestCharacterMigrated).toBe(false);
    }
    // All side-effects happened:
    expect(state.calls.usersUpsert).toBe(1);
    expect(state.calls.sessionTokensUpdate).toBe(1);
    expect(state.calls.playerCharsUpdate).toBe(1);
    expect(state.calls.campaignMembersUpsert).toBe(1);
    // No upgrade_failed_at set on success.
    expect(state.upgradeFailedMarked).toBe(false);
    // Guest migration NOT called.
    expect(migrateGuestCharacterToAuth).not.toHaveBeenCalled();
  });

  it("6. happy path with guestCharacter calls migrateGuestCharacterToAuth and reports flag", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };
    state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };
    state.promotedChars = { data: [], error: null };
    state.sessionsForTokens = { data: [], error: null };
    state.memberships = { data: [], error: null };

    const guestChar = makeCombatant();

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
      guestCharacter: guestChar,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated.guestCharacterMigrated).toBe(true);
    }
    expect(migrateGuestCharacterToAuth).toHaveBeenCalledTimes(1);
    expect(migrateGuestCharacterToAuth).toHaveBeenCalledWith(
      guestChar,
      USER_ID,
      expect.objectContaining({ setAsDefault: true }),
    );
  });
});

describe("upgradePlayerIdentity — Phase 3 failure", () => {
  it("7. step 9 campaign_members insert failure returns migration_partial_failure and marks user", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };
    state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };
    state.promotedChars = { data: [], error: null };
    state.sessionsForTokens = {
      data: [
        {
          session_id: SESSION_ID,
          sessions: {
            campaign_id: CAMPAIGN_ID,
            campaigns: { id: CAMPAIGN_ID, owner_id: CAMPAIGN_OWNER_ID },
          },
        },
      ],
      error: null,
    };
    // Force the campaign_members upsert to fail:
    state.campaignMembersInserted = {
      data: null,
      error: { message: "duplicate key or something" },
    };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("migration_partial_failure");
      expect(result.retryable).toBe(true);
      expect(result.details).toMatchObject({ failed_step: 9 });
    }
    // The marker was written.
    expect(state.upgradeFailedMarked).toBe(true);
  });

  it("propagates step 6 (users upsert) failure with failed_step=6", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };
    state.usersUpsertError = { message: "constraint violated" };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("migration_partial_failure");
      expect(result.details).toMatchObject({ failed_step: 6 });
    }
  });
});

describe("recoverUpgradePlayerIdentity — second attempt succeeds", () => {
  it("8. retry after step 9 failure: recovery succeeds and does NOT re-migrate guestCharacter", async () => {
    // First attempt (failed at step 9) produced these side-effects:
    state.tokenRow = {
      data: makeSessionToken({ user_id: USER_ID }),
      error: null,
    };
    // Users row now exists (step 6 wrote it on first attempt).
    state.existingUser = {
      data: { id: USER_ID, email: VALID_CREDS.email, display_name: "Dani" },
      error: null,
    };
    state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };
    state.promotedChars = { data: [], error: null };
    state.sessionsForTokens = {
      data: [
        {
          session_id: SESSION_ID,
          sessions: {
            campaign_id: CAMPAIGN_ID,
            campaigns: { id: CAMPAIGN_ID, owner_id: CAMPAIGN_OWNER_ID },
          },
        },
      ],
      error: null,
    };
    state.campaignMembersInserted = {
      data: [{ id: "00000000-0000-0000-0000-00000000bbbb" }],
      error: null,
    };
    state.memberships = { data: [{ campaign_id: CAMPAIGN_ID }], error: null };

    const result = await recoverUpgradePlayerIdentity(SESSION_TOKEN_ID, USER_ID);

    expect(result.ok).toBe(true);
    // Recovery MUST NOT call migrateGuestCharacterToAuth (would double-insert).
    expect(migrateGuestCharacterToAuth).not.toHaveBeenCalled();
    // The final update clears upgrade_failed_at — verify by observing that
    // the last users.update was called at least once.
    expect(state.calls.usersUpdate).toBeGreaterThanOrEqual(1);
  });
});

describe("upgradePlayerIdentity — bonus branch: no user tokens", () => {
  it("9. skips step 8/9 cleanly when the user has no session_tokens (after upsert)", async () => {
    state.tokenRow = { data: makeSessionToken(), error: null };
    // userTokens comes back empty — means the token update at step 7 didn't
    // register (possible if the token was previously claimed under a
    // different auth.uid() path). Verify we don't crash.
    state.userTokensResult = { data: [], error: null };
    state.memberships = { data: [], error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated.playerCharactersPromoted).toBe(0);
      expect(result.migrated.campaignMembersInserted).toBe(0);
    }
    expect(state.calls.playerCharsUpdate).toBe(0);
    expect(state.calls.campaignMembersUpsert).toBe(0);
  });
});
