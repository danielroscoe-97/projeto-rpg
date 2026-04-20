// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.
//
// ---------------------------------------------------------------------------
// T5 — anon_user_id regenerated before upgrade
//
// Scenario from Epic 01 Testing Contract:
//   1. Player joins via anon auth → session_tokens.anon_user_id = A1.
//   2. Cookies are cleared (accidental, mobile app refresh, etc.).
//   3. Player returns; signInAnonymously issues a NEW anon UUID = A2.
//   4. Reconnection flow re-binds the SAME session_tokens.id (DC4: stable
//      cross-reference) to anon_user_id = A2.
//   5. Player upgrades identity. callerUserId = A2 (the current auth.uid()).
//
// The saga must:
//   (a) Use `sessionTokenId` as the primary lookup key (NOT anon_user_id).
//   (b) Validate callerUserId matches tokenRow.anon_user_id (== A2).
//   (c) Complete Phase 3 normally — the user_id column (stable, DC2) gets
//       set to A2 and everything works.
//
// This test specifically pins down: the saga must NOT care which anon_user_id
// was attached to the session_token historically. It only cares that the
// CURRENT anon_user_id matches the CURRENT callerUserId at lookup time.
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

const state: {
  tokenRow: DbResult<SessionTokenRow>;
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
  capturedTokenLookupId: string | null;
  calls: { usersUpsert: number; sessionTokensUpdate: number };
} = {
  tokenRow: { data: null, error: null },
  existingUser: { data: null, error: null },
  userTokensResult: { data: [], error: null },
  promotedChars: { data: [], error: null },
  sessionsForTokens: { data: [], error: null },
  campaignMembersInserted: { data: [], error: null },
  memberships: { data: [], error: null },
  currentUserForDefault: { data: { default_character_id: null }, error: null },
  mostRecentCharResult: { data: null, error: null },
  capturedTokenLookupId: null,
  calls: { usersUpsert: 0, sessionTokensUpdate: 0 },
};

function sessionTokensBuilder() {
  let selectCols = "";
  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      selectCols = cols;
      return builder;
    }),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        is: jest.fn(() => {
          state.calls.sessionTokensUpdate++;
          return Promise.resolve({ error: null, data: null });
        }),
      })),
    })),
    // SELECT paths — capture the lookup argument so we can assert the saga
    // uses session_tokens.id (not anon_user_id).
    eq: jest.fn((col: string, val: unknown) => {
      if (col === "id") state.capturedTokenLookupId = val as string;
      const second = {
        eq: jest.fn(() => Promise.resolve(state.sessionsForTokens)),
        maybeSingle: jest.fn(() => Promise.resolve(state.tokenRow)),
        then: (resolve: (v: unknown) => unknown) => {
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
      return Promise.resolve({ error: null, data: null });
    }),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null, data: null })),
    })),
    eq: jest.fn(() => ({
      maybeSingle: jest.fn(() => {
        if (selectCols.includes("default_character_id")) {
          return Promise.resolve(state.currentUserForDefault);
        }
        return Promise.resolve(state.existingUser);
      }),
    })),
  };
  return builder;
}

function playerCharactersBuilder() {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve(state.mostRecentCharResult)),
          })),
        })),
      })),
    })),
    update: jest.fn(() => ({
      in: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve(state.promotedChars)),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  };
}

function campaignMembersBuilder() {
  return {
    upsert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve(state.campaignMembersInserted)),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve(state.memberships)),
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

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: fromMock,
    channel: jest.fn(() => ({ send: jest.fn(() => Promise.resolve("ok")) })),
    removeChannel: jest.fn(() => Promise.resolve("ok")),
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

import { upgradePlayerIdentity } from "@/lib/supabase/player-identity";

const SESSION_TOKEN_ID = "00000000-0000-0000-0000-000000000001";
// A1 — the anon_user_id the session_token was CREATED with (historical).
// Cookies were cleared; this anon auth UUID is gone from the client.
const ANON_ID_LEGACY = "00000000-0000-0000-0000-0000000000aa";
// A2 — the NEW anon_user_id after signInAnonymously post-cookie-clear.
// The reconnection flow (spec-resilient-reconnection §2.4) already
// re-bound session_tokens.anon_user_id to A2 before the upgrade fires.
const ANON_ID_REGENERATED = "00000000-0000-0000-0000-0000000000bb";

function resetState(): void {
  state.tokenRow = { data: null, error: null };
  state.existingUser = { data: null, error: null };
  state.userTokensResult = { data: [], error: null };
  state.promotedChars = { data: [], error: null };
  state.sessionsForTokens = { data: [], error: null };
  state.campaignMembersInserted = { data: [], error: null };
  state.memberships = { data: [], error: null };
  state.currentUserForDefault = { data: { default_character_id: null }, error: null };
  state.mostRecentCharResult = { data: null, error: null };
  state.capturedTokenLookupId = null;
  state.calls = { usersUpsert: 0, sessionTokensUpdate: 0 };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetState();
});

describe("T5 — anon_user_id regenerated before upgrade", () => {
  it("upgrade succeeds when callerUserId matches the CURRENT (regenerated) anon_user_id on session_token", async () => {
    // The session_token's anon_user_id was already updated to A2 by the
    // reconnection flow BEFORE the upgrade call. session_tokens.id is
    // stable (DC4) — it never changed. The historic value A1 is gone.
    state.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: ANON_ID_REGENERATED,
        user_id: null,
        session_id: "00000000-0000-0000-0000-000000000003",
        player_name: "Regen",
      },
      error: null,
    };
    state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      // callerUserId is the CURRENT anon auth UID (A2). The legacy A1 is
      // unused and irrelevant.
      callerUserId: ANON_ID_REGENERATED,
      credentials: {
        email: "regen@example.com",
        password: "abcdefgh",
        displayName: "Regen",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // userId returned is the regenerated anon UUID (which, after
      // updateUser client-side, IS the auth.users.id — same UUID by DC1).
      expect(result.userId).toBe(ANON_ID_REGENERATED);
    }

    // The saga did lookup session_tokens by ID (stable DC4), not by
    // anon_user_id. Assert the lookup key.
    expect(state.capturedTokenLookupId).toBe(SESSION_TOKEN_ID);
    // Side-effects happened (not short-circuited).
    expect(state.calls.usersUpsert).toBe(1);
  });

  it("upgrade fails with session_token_not_found when callerUserId is the LEGACY anon_user_id (A1 not the current one)", async () => {
    // Session token currently bound to A2. Caller passes A1 (stale client).
    state.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: ANON_ID_REGENERATED,
        user_id: null,
        session_id: "00000000-0000-0000-0000-000000000003",
        player_name: "Regen",
      },
      error: null,
    };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: ANON_ID_LEGACY, // Stale — no longer on the token.
      credentials: {
        email: "stale@example.com",
        password: "abcdefgh",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("session_token_not_found");
      expect(result.retryable).toBe(false);
      // Importantly: saga did NOT trigger any side-effects.
      expect(state.calls.usersUpsert).toBe(0);
    }
  });

  it("upgrade still succeeds when session_token.user_id already matches callerUserId via ownsViaAuth branch (post-Phase-2 stale read)", async () => {
    // Edge case: in a recovery retry, the token already has user_id = A2
    // (set on first attempt's step 7). anon_user_id can be anything. The
    // Phase 1 "ownsViaAuth" check must accept this.
    state.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: ANON_ID_LEGACY, // Stale — doesn't matter.
        user_id: ANON_ID_REGENERATED, // Already upgraded.
        session_id: "00000000-0000-0000-0000-000000000003",
        player_name: "Regen",
      },
      error: null,
    };
    // users row exists — idempotency short-circuit triggers.
    state.existingUser = { data: { id: ANON_ID_REGENERATED }, error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: ANON_ID_REGENERATED,
      credentials: { email: "regen@example.com", password: "abcdefgh" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe(ANON_ID_REGENERATED);
      // No migration work — already done.
      expect(result.migrated.playerCharactersPromoted).toBe(0);
      expect(result.migrated.campaignMembersInserted).toBe(0);
    }
    // No upsert because idempotency short-circuit hit.
    expect(state.calls.usersUpsert).toBe(0);
  });
});
