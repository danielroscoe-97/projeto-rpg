// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.
//
// ---------------------------------------------------------------------------
// Concurrency tests for upgradePlayerIdentity — Epic 01 Testing Contract.
//
// T1 ("Concorrência email duplicado"): two anon players try to upgrade at
// the same time with the SAME email → the DB's unique constraint on
// public.users.email makes the second upsert fail, and the second call
// returns `migration_partial_failure` (retryable so a human can pick a
// different email).
//
// Note: in production the uniqueness enforcement happens on `auth.users`
// during `supabase.auth.updateUser` (Phase 2, client-side). That Phase 2
// layer is NOT exercised by this saga — the saga assumes it succeeded. Here
// we model the "Phase 2 somehow let both through" edge case by making the
// public.users upsert fail with a unique_violation on the SECOND concurrent
// call. A real Postgres races the two transactions, one wins, one fails.
//
// T2 ("Concorrência session_token"): two browsers holding the SAME
// session_token_id race the upgrade. The DB has already promoted the token
// (user_id populated via step 7 of the first winner). The second call sees
// `tokenRow.user_id === callerUserId` AND a `users` row already exists →
// takes the idempotency short-circuit and returns `{ ok: true }` with
// `migrated.playerCharactersPromoted === 0` (a no-op success).
// ---------------------------------------------------------------------------

import type { Combatant } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Shared mock state — we need per-call lookups because calls happen
// concurrently. The first call's resolution picks up the "pristine" state;
// the second call must observe side effects from the first (e.g.,
// tokenRow.user_id = userId already set, users row already inserted, OR
// users upsert returning a unique violation).
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
  id: string;
  email: string | null;
  display_name: string | null;
  default_character_id?: string | null;
};

type T1State = {
  // Returns tokenRow on each lookup — same row for both calls.
  tokenRow: DbResult<SessionTokenRow>;
  // Users upsert: FIRST call succeeds, SECOND fails with unique_violation.
  // We track how many times upsert was invoked.
  upsertCallCount: number;
  secondUpsertError: DbError;
  // After the second upsert fails, we must still let the "mark upgrade
  // failed" UPDATE succeed (best-effort).
  existingUser: DbResult<{ id: string }>;
  userTokensResult: DbResult<Array<{ id: string }>>;
  promotedChars: DbResult<Array<{ id: string }>>;
  sessionsForTokens: DbResult<
    Array<{
      session_id: string | null;
      sessions: {
        campaign_id: string | null;
        campaigns: { id: string; owner_id: string } | null;
      } | null;
    }>
  >;
  campaignMembersInserted: DbResult<Array<{ id: string }>>;
  memberships: DbResult<Array<{ campaign_id: string }>>;
  currentUserForDefault: DbResult<{ default_character_id: string | null }>;
  mostRecentCharResult: DbResult<{ id: string }>;
  userUpdateError: DbError;
  upgradeFailedMarked: number; // counter (both calls may mark)
};

type T2State = {
  // First call: anon path (anon_user_id matches, user_id null).
  // Second call: must observe user_id now set (idempotency short-circuit).
  // We model this by making the `tokenRow` response a function of a counter.
  tokenReadCount: number;
  userReadCount: number;
  // State that gets "committed" between reads to simulate the first call
  // finishing step 6 + step 7 before the second call reads.
  committed: {
    tokenUserId: string | null;
    usersRowExists: boolean;
  };
  // Remaining happy-path data for the first caller.
  userTokensResult: DbResult<Array<{ id: string }>>;
  promotedChars: DbResult<Array<{ id: string }>>;
  sessionsForTokens: DbResult<
    Array<{
      session_id: string | null;
      sessions: {
        campaign_id: string | null;
        campaigns: { id: string; owner_id: string } | null;
      } | null;
    }>
  >;
  campaignMembersInserted: DbResult<Array<{ id: string }>>;
  memberships: DbResult<Array<{ campaign_id: string }>>;
  currentUserForDefault: DbResult<{ default_character_id: string | null }>;
  mostRecentCharResult: DbResult<{ id: string }>;
};

// ---------------------------------------------------------------------------
// The mock lives in module scope so jest.mock can see it. We expose a
// single `scenario` variable that tests configure; the builders route to the
// appropriate state object.
// ---------------------------------------------------------------------------

type Scenario = "t1_email_dup" | "t2_session_token_race";

const ctx: {
  scenario: Scenario;
  t1: T1State;
  t2: T2State;
} = {
  scenario: "t1_email_dup",
  t1: createT1State(),
  t2: createT2State(),
};

function createT1State(): T1State {
  return {
    tokenRow: {
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        anon_user_id: "00000000-0000-0000-0000-000000000002",
        user_id: null,
        session_id: "00000000-0000-0000-0000-000000000003",
        player_name: "GuestA",
      },
      error: null,
    },
    upsertCallCount: 0,
    secondUpsertError: { message: "duplicate key value violates unique constraint \"users_email_key\"" },
    existingUser: { data: null, error: null },
    userTokensResult: { data: [{ id: "00000000-0000-0000-0000-000000000001" }], error: null },
    promotedChars: { data: [], error: null },
    sessionsForTokens: { data: [], error: null },
    campaignMembersInserted: { data: [], error: null },
    memberships: { data: [], error: null },
    currentUserForDefault: { data: { default_character_id: null }, error: null },
    mostRecentCharResult: { data: null, error: null },
    userUpdateError: null,
    upgradeFailedMarked: 0,
  };
}

function createT2State(): T2State {
  return {
    tokenReadCount: 0,
    userReadCount: 0,
    committed: {
      tokenUserId: null,
      usersRowExists: false,
    },
    userTokensResult: { data: [{ id: "00000000-0000-0000-0000-000000000001" }], error: null },
    promotedChars: { data: [], error: null },
    sessionsForTokens: { data: [], error: null },
    campaignMembersInserted: { data: [], error: null },
    memberships: { data: [], error: null },
    currentUserForDefault: { data: { default_character_id: null }, error: null },
    mostRecentCharResult: { data: null, error: null },
  };
}

// ---------------------------------------------------------------------------
// Builders — mirror the shape of existing tests, but with scenario-aware
// dispatch in the terminal resolvers.
// ---------------------------------------------------------------------------

function sessionTokensBuilder() {
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      return builder;
    }),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        is: jest.fn(() => Promise.resolve({ error: null, data: null })),
      })),
    })),
    eq: jest.fn(() => {
      const second = {
        eq: jest.fn(() => Promise.resolve(resolveSessionsForTokens())),
        maybeSingle: jest.fn(() => Promise.resolve(resolveTokenRow())),
        then: (resolve: (v: unknown) => unknown) => {
          if (selectCols === "id") {
            return Promise.resolve(resolveUserTokens()).then(resolve);
          }
          return Promise.resolve(resolveTokenRow()).then(resolve);
        },
      };
      return second;
    }),
  };
  return builder;
}

function resolveTokenRow(): DbResult<SessionTokenRow> {
  if (ctx.scenario === "t1_email_dup") {
    return ctx.t1.tokenRow;
  }
  // T2: sequentialize token reads. The first read returns (user_id=null),
  // the second read returns (user_id=USER_ID) because the first caller
  // already UPDATEd session_tokens.user_id at step 7.
  ctx.t2.tokenReadCount++;
  const baseRow: SessionTokenRow = {
    id: "00000000-0000-0000-0000-000000000001",
    anon_user_id: "00000000-0000-0000-0000-000000000002",
    user_id: ctx.t2.committed.tokenUserId,
    session_id: "00000000-0000-0000-0000-000000000003",
    player_name: "GuestA",
  };
  // After the first Phase 1 lookup, immediately "commit" the user_id change
  // so the NEXT read sees the promoted row. This simulates a winner-takes-all
  // race where caller #1 finished steps 6+7 before caller #2's Phase 1 read.
  if (ctx.t2.tokenReadCount === 1 && ctx.t2.committed.tokenUserId === null) {
    ctx.t2.committed.tokenUserId = "00000000-0000-0000-0000-000000000002";
    ctx.t2.committed.usersRowExists = true;
  }
  return { data: baseRow, error: null };
}

function resolveUserTokens(): DbResult<Array<{ id: string }>> {
  if (ctx.scenario === "t1_email_dup") return ctx.t1.userTokensResult;
  return ctx.t2.userTokensResult;
}

function resolveSessionsForTokens(): DbResult<
  Array<{
    session_id: string | null;
    sessions: {
      campaign_id: string | null;
      campaigns: { id: string; owner_id: string } | null;
    } | null;
  }>
> {
  if (ctx.scenario === "t1_email_dup") return ctx.t1.sessionsForTokens;
  return ctx.t2.sessionsForTokens;
}

function usersBuilder() {
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      return builder;
    }),
    upsert: jest.fn(() => {
      if (ctx.scenario === "t1_email_dup") {
        ctx.t1.upsertCallCount++;
        // First call succeeds; second returns the duplicate-key error.
        const error =
          ctx.t1.upsertCallCount === 1 ? null : ctx.t1.secondUpsertError;
        return Promise.resolve({ error, data: null });
      }
      return Promise.resolve({ error: null, data: null });
    }),
    update: jest.fn((payload: Record<string, unknown>) => {
      if (ctx.scenario === "t1_email_dup") {
        if (payload && "upgrade_failed_at" in payload && payload.upgrade_failed_at) {
          ctx.t1.upgradeFailedMarked++;
        }
      }
      return {
        eq: jest.fn(() =>
          Promise.resolve({
            error: ctx.scenario === "t1_email_dup" ? ctx.t1.userUpdateError : null,
            data: null,
          }),
        ),
      };
    }),
    eq: jest.fn(() => ({
      maybeSingle: jest.fn(() => {
        if (selectCols.includes("default_character_id")) {
          return Promise.resolve(
            ctx.scenario === "t1_email_dup"
              ? ctx.t1.currentUserForDefault
              : ctx.t2.currentUserForDefault,
          );
        }
        // Existence check inside idempotency branch.
        if (ctx.scenario === "t2_session_token_race") {
          ctx.t2.userReadCount++;
          // The second caller's idempotency read must find the users row.
          const exists = ctx.t2.committed.usersRowExists;
          return Promise.resolve({
            data: exists ? { id: "00000000-0000-0000-0000-000000000002" } : null,
            error: null,
          });
        }
        return Promise.resolve(ctx.t1.existingUser);
      }),
    })),
  };
  return builder;
}

function playerCharactersBuilder() {
  const builder: Record<string, unknown> = {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn(() =>
              Promise.resolve(
                ctx.scenario === "t1_email_dup"
                  ? ctx.t1.mostRecentCharResult
                  : ctx.t2.mostRecentCharResult,
              ),
            ),
          })),
        })),
      })),
    })),
    update: jest.fn(() => ({
      in: jest.fn(() => ({
        select: jest.fn(() =>
          Promise.resolve(
            ctx.scenario === "t1_email_dup"
              ? ctx.t1.promotedChars
              : ctx.t2.promotedChars,
          ),
        ),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  };
  return builder;
}

function campaignMembersBuilder() {
  return {
    upsert: jest.fn(() => ({
      select: jest.fn(() =>
        Promise.resolve(
          ctx.scenario === "t1_email_dup"
            ? ctx.t1.campaignMembersInserted
            : ctx.t2.campaignMembersInserted,
        ),
      ),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() =>
        Promise.resolve(
          ctx.scenario === "t1_email_dup"
            ? ctx.t1.memberships
            : ctx.t2.memberships,
        ),
      ),
    })),
  };
}

const fromMock = jest.fn((table: string) => {
  if (table === "session_tokens") return sessionTokensBuilder();
  if (table === "users") return usersBuilder();
  if (table === "player_characters") return playerCharactersBuilder();
  if (table === "campaign_members") return campaignMembersBuilder();
  return {};
});

const channelMock = { send: jest.fn(() => Promise.resolve("ok")) };
const removeChannelMock = jest.fn(() => Promise.resolve("ok"));

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: fromMock,
    channel: jest.fn(() => channelMock),
    removeChannel: removeChannelMock,
    auth: {
      admin: {
        getUserById: jest.fn(() => Promise.resolve({ data: null, error: null })),
      },
    },
  }),
}));

jest.mock("@/lib/supabase/character-portability", () => ({
  migrateGuestCharacterToAuth: jest.fn(() => Promise.resolve({ id: "char-1" })),
}));

// ---------------------------------------------------------------------------
// Imports must come AFTER jest.mock.
// ---------------------------------------------------------------------------

import { upgradePlayerIdentity } from "@/lib/supabase/player-identity";

const SESSION_TOKEN_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000002";
const SHARED_EMAIL = "sharedrace@example.com";

const VALID_CREDS = {
  email: SHARED_EMAIL,
  password: "abcdefgh",
  displayName: "Shared Racer",
};

beforeEach(() => {
  jest.clearAllMocks();
  ctx.scenario = "t1_email_dup";
  ctx.t1 = createT1State();
  ctx.t2 = createT2State();
  channelMock.send.mockClear();
  removeChannelMock.mockClear();
});

// ===========================================================================
// T1 — Concurrency email duplicate
// ===========================================================================

describe("T1 — concurrency: two upgrades with the SAME email", () => {
  it("second concurrent call returns migration_partial_failure when unique constraint blocks users upsert", async () => {
    ctx.scenario = "t1_email_dup";

    // Two different callerUserIds (two distinct anon users racing to take
    // the same email). Same session_token_id doesn't apply here — email
    // collision is what matters.
    const USER_A = USER_ID;
    const USER_B = "00000000-0000-0000-0000-0000000000bb";

    // Both callers' session_tokens exist. We model them as owned by each
    // respective anon by returning the same tokenRow with ownsViaAnon=true
    // against whichever USER is asked. To keep the mock simple we make each
    // caller look up their own token — tokenRow is the same (they're racing
    // over EMAIL uniqueness, not over the same token). So for this test we
    // just point both at the A-owned token, and USER_B will get "caller not
    // owner" — that's NOT what we want. Instead we model it honestly:
    // Supabase mock returns per-caller tokens. Simplified: run caller A
    // first and caller B second SEQUENTIALLY (both succeed Phase 1 because
    // the mock serves the token row they own).
    //
    // For fidelity we switch tokenRow between calls. anon_user_id matches
    // whichever USER_X is calling.
    let callerSequence = 0;
    ctx.t1.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: USER_A, // overwritten below per-call
        user_id: null,
        session_id: "00000000-0000-0000-0000-000000000003",
        player_name: "GuestA",
      },
      error: null,
    };

    // Re-wire the token-row resolver to alternate anon_user_id per call.
    // We do this by patching the closure indirectly: the token lookup
    // returns a fresh object each time based on `callerSequence`.
    const originalTokenRow = ctx.t1.tokenRow.data!;
    Object.defineProperty(ctx.t1, "tokenRow", {
      get() {
        callerSequence++;
        return {
          data: {
            ...originalTokenRow,
            anon_user_id: callerSequence === 1 ? USER_A : USER_B,
          },
          error: null,
        };
      },
      configurable: true,
    });

    // Race: both upgrade calls fire simultaneously.
    const [resA, resB] = await Promise.all([
      upgradePlayerIdentity({
        sessionTokenId: SESSION_TOKEN_ID,
        callerUserId: USER_A,
        credentials: VALID_CREDS,
      }),
      upgradePlayerIdentity({
        sessionTokenId: SESSION_TOKEN_ID,
        callerUserId: USER_B,
        credentials: VALID_CREDS,
      }),
    ]);

    // Whichever upsert ran first succeeds; the other fails. Their `ok`
    // flags must be exactly one true, one false.
    const okCount = [resA, resB].filter((r) => r.ok).length;
    const failCount = [resA, resB].filter((r) => !r.ok).length;

    expect(okCount).toBe(1);
    expect(failCount).toBe(1);

    // The failing call reports migration_partial_failure with failed_step=6
    // (the users upsert step), and is retryable (human can pick a new email).
    const failure = [resA, resB].find((r) => !r.ok)!;
    if (!failure.ok) {
      expect(failure.code).toBe("migration_partial_failure");
      expect(failure.retryable).toBe(true);
      expect(failure.details).toMatchObject({ failed_step: 6 });
      expect(failure.message).toMatch(/unique constraint|duplicate key/i);
    }

    // Upgrade_failed_at must have been marked for the failing call.
    expect(ctx.t1.upgradeFailedMarked).toBeGreaterThanOrEqual(1);
    // Both upserts were attempted (not serialized by the mock).
    expect(ctx.t1.upsertCallCount).toBe(2);
  });
});

// ===========================================================================
// T2 — Concurrency session_token (same token, two browsers)
// ===========================================================================

describe("T2 — concurrency: two browsers sharing the SAME session_token_id", () => {
  it("second call detects already-authenticated state and returns success with no-op migration", async () => {
    ctx.scenario = "t2_session_token_race";

    // Both callers pass the SAME callerUserId — the design contract DC1
    // ("updateUser preserves auth.users.id") means if two browsers ran the
    // client-side updateUser concurrently they'd end up with the same UUID
    // because they started from the same anon session.
    const [res1, res2] = await Promise.all([
      upgradePlayerIdentity({
        sessionTokenId: SESSION_TOKEN_ID,
        callerUserId: USER_ID,
        credentials: VALID_CREDS,
      }),
      upgradePlayerIdentity({
        sessionTokenId: SESSION_TOKEN_ID,
        callerUserId: USER_ID,
        credentials: VALID_CREDS,
      }),
    ]);

    // Both succeed. The first one does actual migration work. The second
    // hits the idempotency short-circuit and returns zeroed counters.
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);

    // Exactly one of the two results reports zero playerCharactersPromoted
    // + zero campaignMembersInserted + guestCharacterMigrated=false — that
    // was the idempotent no-op.
    if (res1.ok && res2.ok) {
      const noopCount = [res1, res2].filter(
        (r) =>
          r.ok &&
          r.migrated.playerCharactersPromoted === 0 &&
          r.migrated.campaignMembersInserted === 0 &&
          r.migrated.guestCharacterMigrated === false,
      ).length;
      // At least one should be the no-op. Depending on mock timing both may
      // land on the no-op path (if both Phase 1 reads see user_id already
      // populated) — that's still CORRECT behavior for this test because
      // idempotency means neither call does duplicate work.
      expect(noopCount).toBeGreaterThanOrEqual(1);
      expect(res1.userId).toBe(USER_ID);
      expect(res2.userId).toBe(USER_ID);
    }
  });

  it("verifies idempotency: second call after first committed sees users row and returns zeroed counters", async () => {
    ctx.scenario = "t2_session_token_race";
    // Pre-seed the "committed" state so the first read already finds
    // user_id + users row populated (simulates caller #2 arriving AFTER
    // caller #1 fully finished).
    ctx.t2.committed.tokenUserId = USER_ID;
    ctx.t2.committed.usersRowExists = true;

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: VALID_CREDS,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // No-op success — zero counters confirm the idempotency branch.
      expect(result.migrated).toEqual({
        playerCharactersPromoted: 0,
        campaignMembersInserted: 0,
        guestCharacterMigrated: false,
      });
      expect(result.userId).toBe(USER_ID);
    }

    // fromMock was called — but the absence of upsert (Phase 3 step 6)
    // proves we short-circuited. We verify by asserting no call to
    // 'campaign_members' happened (step 9 of Phase 3).
    const campaignMembersCalls = fromMock.mock.calls.filter(
      ([table]) => table === "campaign_members",
    );
    expect(campaignMembersCalls).toHaveLength(0);
  });
});
