/**
 * Story 02-H — linkCharacterToCampaign server action tests.
 *
 * This action is the "Returning Player Invite" primitive for Epic 02 Área 6
 * Cenário 5. It runs an atomic UPDATE with a WHERE-filter concurrency guard
 * (see lib/identity/link-character-to-campaign.ts) to prevent 2 concurrent
 * invites from linking the same standalone character.
 *
 * Coverage (9 tests):
 *   1. Unauthenticated caller  → { ok: false, code: "unauthenticated" }
 *   2. Invite not found        → { ok: false, code: "invite_invalid" }
 *   3. Invite already accepted → { ok: false, code: "invite_invalid" }
 *   4. Invite expired          → { ok: false, code: "invite_invalid" }
 *   5. Campaign mismatch       → { ok: false, code: "invite_invalid" }
 *   6. Race / ownership miss   → { ok: false, code: "character_not_available" }
 *   7. Idempotent member insert (23505 swallowed) → { ok: true }
 *   8. Full happy path          → { ok: true } + invite marked accepted
 *   9. Concurrent-call simulation → exactly 1 ok:true, 1 character_not_available
 *
 * The Supabase client is mocked per-table (per-method) so each branch in the
 * action is independently triggerable. The pattern mirrors
 * tests/player-identity/character-claim.test.ts (per-table mock builder) +
 * tests/user/update-default-character.test.ts (scoped helper for simple
 * chains).
 */

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

type BuilderResult<T = unknown> = {
  data?: T;
  error?: { message: string; code?: string } | null;
};

const state: {
  user: { id: string; email?: string } | null;
  inviteRow: BuilderResult;
  updateCharacterRows: BuilderResult<Array<{ id: string }>>;
  insertMemberResult: BuilderResult;
  updateInviteResult: BuilderResult;
  // Call tracking for the atomic UPDATE — allows the concurrent-simulation
  // test to inspect that the guard clauses (.eq user_id + .is campaign_id
  // null) were applied on each invocation.
  updateCharacterCalls: Array<{
    payload: unknown;
    eqCalls: Array<[string, unknown]>;
    isCalls: Array<[string, unknown]>;
  }>;
  insertMemberCalls: Array<{ payload: unknown }>;
  updateInviteCalls: Array<{ payload: unknown; eqId: string | null }>;
} = {
  user: null,
  inviteRow: { data: null, error: null },
  updateCharacterRows: { data: [], error: null },
  insertMemberResult: { data: null, error: null },
  updateInviteResult: { data: null, error: null },
  updateCharacterCalls: [],
  insertMemberCalls: [],
  updateInviteCalls: [],
};

// ---------------------------------------------------------------------------
// Supabase mock builders (per-table)
// ---------------------------------------------------------------------------

function makeInviteSelectBuilder() {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(state.inviteRow)),
  };
  return builder;
}

function makeUpdateCharacterBuilder() {
  // Each invocation records its guard clauses for the race test to inspect.
  const call = {
    payload: undefined as unknown,
    eqCalls: [] as Array<[string, unknown]>,
    isCalls: [] as Array<[string, unknown]>,
  };
  const builder = {
    update: jest.fn((payload: unknown) => {
      call.payload = payload;
      return builder;
    }),
    eq: jest.fn((col: string, val: unknown) => {
      call.eqCalls.push([col, val]);
      return builder;
    }),
    is: jest.fn((col: string, val: unknown) => {
      call.isCalls.push([col, val]);
      return builder;
    }),
    select: jest.fn(() => {
      state.updateCharacterCalls.push(call);
      return Promise.resolve(state.updateCharacterRows);
    }),
  };
  return builder;
}

function makeInsertMemberBuilder() {
  const call = { payload: undefined as unknown };
  const builder = {
    insert: jest.fn((payload: unknown) => {
      call.payload = payload;
      state.insertMemberCalls.push(call);
      return Promise.resolve(state.insertMemberResult);
    }),
  };
  return builder;
}

function makeUpdateInviteBuilder() {
  const call = { payload: undefined as unknown, eqId: null as string | null };
  const builder = {
    update: jest.fn((payload: unknown) => {
      call.payload = payload;
      return builder;
    }),
    eq: jest.fn((_col: string, val: unknown) => {
      call.eqId = val as string;
      state.updateInviteCalls.push(call);
      return Promise.resolve(state.updateInviteResult);
    }),
  };
  return builder;
}

// Mock the supabase/server module. `createClient()` is the cookie-aware
// client used for auth.getUser(); `createServiceClient()` is used for all
// DB mutations that bypass RLS.
const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  // We don't route any .from() through the authenticated client in this
  // action (all writes use the service client), but defining it avoids
  // surprises if the action evolves.
  from: jest.fn(),
}));

const createServiceClientMock = jest.fn(() => ({
  from: jest.fn((table: string) => {
    if (table === "campaign_invites") {
      // campaign_invites is used in TWO ways:
      //   1. SELECT → validate invite row
      //   2. UPDATE → mark accepted
      // We disambiguate by the first method called.
      const selectBuilder = makeInviteSelectBuilder();
      const updateBuilder = makeUpdateInviteBuilder();
      return {
        select: selectBuilder.select,
        eq: selectBuilder.eq,
        maybeSingle: selectBuilder.maybeSingle,
        update: updateBuilder.update,
      };
    }
    if (table === "player_characters") {
      return makeUpdateCharacterBuilder();
    }
    if (table === "campaign_members") {
      return makeInsertMemberBuilder();
    }
    throw new Error(`Unexpected table in test: ${table}`);
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
  createServiceClient: () => createServiceClientMock(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { linkCharacterToCampaign } from "@/lib/identity/link-character-to-campaign";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-0000-0000-00000000aaaa";
const OTHER_USER_ID = "00000000-0000-0000-0000-00000000bbbb";
const CHAR_ID = "00000000-0000-0000-0000-0000000000c1";
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000ca1";
const INVITE_ID = "00000000-0000-0000-0000-0000000000i1";
const TOKEN = "tok-valid-1";

function futureIso(minutesAhead = 60): string {
  return new Date(Date.now() + minutesAhead * 60_000).toISOString();
}

function pastIso(minutesAgo = 60): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function validInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: INVITE_ID,
    campaign_id: CAMPAIGN_ID,
    status: "pending",
    expires_at: futureIso(),
    invited_by: OTHER_USER_ID,
    email: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset per-test
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  state.user = { id: USER_ID, email: "player@example.com" };
  state.inviteRow = { data: validInvite(), error: null };
  state.updateCharacterRows = { data: [{ id: CHAR_ID }], error: null };
  state.insertMemberResult = { data: null, error: null };
  state.updateInviteResult = { data: null, error: null };
  state.updateCharacterCalls = [];
  state.insertMemberCalls = [];
  state.updateInviteCalls = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("linkCharacterToCampaign — auth guard", () => {
  it("returns { ok: false, code: 'unauthenticated' } when no user", async () => {
    state.user = null;

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("unauthenticated");
      expect(res.retryable).toBe(false);
    }
    // Must bail before touching the DB writes.
    expect(state.updateCharacterCalls).toHaveLength(0);
    expect(state.insertMemberCalls).toHaveLength(0);
    expect(state.updateInviteCalls).toHaveLength(0);
  });
});

describe("linkCharacterToCampaign — invite validation", () => {
  it("returns { ok: false, code: 'invite_invalid' } when invite not found", async () => {
    state.inviteRow = { data: null, error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_invalid");
    expect(state.updateCharacterCalls).toHaveLength(0);
  });

  it("returns invite_invalid when status != pending (already accepted)", async () => {
    state.inviteRow = {
      data: validInvite({ status: "accepted" }),
      error: null,
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_invalid");
    expect(state.updateCharacterCalls).toHaveLength(0);
  });

  it("returns invite_invalid when expires_at is in the past", async () => {
    state.inviteRow = {
      data: validInvite({ expires_at: pastIso() }),
      error: null,
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_invalid");
  });

  it("returns invite_invalid when the client-provided campaignId doesn't match the invite", async () => {
    state.inviteRow = { data: validInvite(), error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: "00000000-0000-0000-0000-000000000bad",
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_invalid");
    expect(state.updateCharacterCalls).toHaveLength(0);
  });
});

describe("linkCharacterToCampaign — concurrency guard (race)", () => {
  it("returns character_not_available when UPDATE matches 0 rows (covers ownership AND race)", async () => {
    // 0 rows can happen for three reasons — all of which collapse into the
    // same `character_not_available` code by design:
    //   (a) character belongs to a different user (user_id = auth.uid() fails)
    //   (b) character is already linked to a campaign (campaign_id IS NULL fails)
    //   (c) characterId doesn't exist at all (id = $characterId fails)
    state.updateCharacterRows = { data: [], error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("character_not_available");
      expect(res.retryable).toBe(false);
    }
    // Member INSERT and invite mark-accepted must NOT have fired.
    expect(state.insertMemberCalls).toHaveLength(0);
    expect(state.updateInviteCalls).toHaveLength(0);

    // Guard clauses must have been applied — this is the core invariant of
    // the concurrency guard and we assert it explicitly.
    expect(state.updateCharacterCalls).toHaveLength(1);
    const call = state.updateCharacterCalls[0]!;
    expect(call.eqCalls).toEqual(
      expect.arrayContaining([
        ["id", CHAR_ID],
        ["user_id", USER_ID],
      ]),
    );
    expect(call.isCalls).toEqual(
      expect.arrayContaining([["campaign_id", null]]),
    );
  });
});

describe("linkCharacterToCampaign — member insert idempotency", () => {
  it("swallows 23505 (unique_violation) — already a member", async () => {
    state.updateCharacterRows = { data: [{ id: CHAR_ID }], error: null };
    state.insertMemberResult = {
      data: null,
      error: { message: "duplicate key", code: "23505" },
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    // Idempotent — still succeeds end-to-end.
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.characterId).toBe(CHAR_ID);
    // Invite must still have been marked accepted.
    expect(state.updateInviteCalls).toHaveLength(1);
  });
});

describe("linkCharacterToCampaign — happy path", () => {
  it("returns ok + marks invite accepted + fires member insert with proper payload", async () => {
    state.updateCharacterRows = { data: [{ id: CHAR_ID }], error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res).toEqual({
      ok: true,
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
    });

    // UPDATE characters payload sets campaign_id.
    expect(state.updateCharacterCalls).toHaveLength(1);
    expect(state.updateCharacterCalls[0]!.payload).toEqual({
      campaign_id: CAMPAIGN_ID,
    });

    // Member insert hit with proper payload.
    expect(state.insertMemberCalls).toHaveLength(1);
    expect(state.insertMemberCalls[0]!.payload).toEqual({
      campaign_id: CAMPAIGN_ID,
      user_id: USER_ID,
      role: "player",
      invited_by: OTHER_USER_ID,
    });

    // Invite marked accepted with accepted_at + accepted_by populated.
    expect(state.updateInviteCalls).toHaveLength(1);
    const invitePayload = state.updateInviteCalls[0]!.payload as {
      status: string;
      accepted_at?: string;
      accepted_by?: string;
    };
    expect(invitePayload.status).toBe("accepted");
    expect(invitePayload.accepted_by).toBe(USER_ID);
    expect(typeof invitePayload.accepted_at).toBe("string");
    expect(state.updateInviteCalls[0]!.eqId).toBe(INVITE_ID);
  });
});

describe("linkCharacterToCampaign — concurrent call simulation (integration)", () => {
  it("simulates 2 concurrent callers on same character — exactly 1 succeeds", async () => {
    // We simulate the atomic-UPDATE semantics: the DB guarantees that
    // `UPDATE ... WHERE campaign_id IS NULL` succeeds for at most ONE row
    // when two queries race on the same row. We model that by flipping
    // `updateCharacterRows` from a hit to a miss after the first call — any
    // subsequent UPDATE sees 0 rows because the row no longer matches the
    // guard clause.
    let updateCount = 0;
    state.updateCharacterRows = { data: [{ id: CHAR_ID }], error: null };

    // Re-wire the service client's `from("player_characters")` to flip
    // the result mid-flight, simulating the DB's single-winner guarantee.
    createServiceClientMock.mockImplementation(() => ({
      from: jest.fn((table: string) => {
        if (table === "campaign_invites") {
          const sel = makeInviteSelectBuilder();
          const upd = makeUpdateInviteBuilder();
          return {
            select: sel.select,
            eq: sel.eq,
            maybeSingle: sel.maybeSingle,
            update: upd.update,
          };
        }
        if (table === "player_characters") {
          // Each builder invocation represents one concurrent call's UPDATE.
          // First call wins (1 row); second sees 0.
          const call = {
            payload: undefined as unknown,
            eqCalls: [] as Array<[string, unknown]>,
            isCalls: [] as Array<[string, unknown]>,
          };
          const localCount = ++updateCount;
          const builder = {
            update: jest.fn((payload: unknown) => {
              call.payload = payload;
              return builder;
            }),
            eq: jest.fn((col: string, val: unknown) => {
              call.eqCalls.push([col, val]);
              return builder;
            }),
            is: jest.fn((col: string, val: unknown) => {
              call.isCalls.push([col, val]);
              return builder;
            }),
            select: jest.fn(() => {
              state.updateCharacterCalls.push(call);
              const result =
                localCount === 1
                  ? { data: [{ id: CHAR_ID }], error: null }
                  : { data: [], error: null };
              return Promise.resolve(result);
            }),
          };
          return builder;
        }
        if (table === "campaign_members") {
          return makeInsertMemberBuilder();
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    }));

    // Fire two concurrent calls on the same character.
    const params = {
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    };
    const [res1, res2] = await Promise.all([
      linkCharacterToCampaign(params),
      linkCharacterToCampaign({ ...params, inviteId: "invite-2-alt" }),
    ]);

    const results = [res1, res2];
    const winners = results.filter((r) => r.ok);
    const losers = results.filter((r) => !r.ok);

    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]!.ok).toBe(false);
    if (!losers[0]!.ok) {
      expect(losers[0]!.code).toBe("character_not_available");
    }
    // Both calls hit the atomic UPDATE on player_characters.
    expect(state.updateCharacterCalls.length).toBeGreaterThanOrEqual(2);
  });
});
