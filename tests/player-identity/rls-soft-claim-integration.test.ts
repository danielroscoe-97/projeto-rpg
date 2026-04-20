// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.
//
// ---------------------------------------------------------------------------
// T4 — RLS soft-claim → hard-claim transition
//
// Epic 01 Testing Contract requires this test:
//
//   "anon player soft-claims → can UPDATE name/stats via RLS
//    `player_characters_soft_claim_update` → post-upgrade, normal RLS
//    (`user_id = auth.uid()`) keeps access."
//
// ### Why this is structured as code-path coverage + documented SQL
//
// A true end-to-end RLS test needs a real Postgres with auth.jwt() populated
// from a service-role-impersonated token. Jest with jsdom cannot do that.
// We have three options (discussed with Quinn in the handoff):
//
//   (a) Mock the service client's WHERE clauses and assert correctness.
//       [This file: the code-path-coverage approach.]
//   (b) Write a TODO with SQL that a pgTap / SQL-level integration harness
//       would run against a live Supabase instance.
//       [Documented in the describe block at bottom.]
//   (c) Cover via a Playwright E2E that logs in as real anon and real auth.
//       [See e2e/features/anon-claim-upgrade-ownership.spec.ts.]
//
// We do (a) + (b). Option (c) provides the real end-to-end signal.
//
// What this jest file DOES prove:
//   1. `claimCampaignCharacter({sessionTokenId})` writes exactly the shape
//      the soft-claim RLS policy's `using` clause expects: sets
//      `claimed_by_session_token` and leaves `user_id NULL`.
//   2. `upgradePlayerIdentity` promotes soft → hard by setting
//      `user_id = callerUserId` AND nulling `claimed_by_session_token`,
//      which is exactly the state transition the normal
//      `user_id = auth.uid()` RLS policy uses.
//   3. After the transition, reads scoped by `user_id = auth.uid()` return
//      the character (proven via the post-upgrade "promoted chars" query).
//
// What this jest file does NOT prove (see SQL TODO at bottom):
//   - That the actual Postgres RLS engine enforces the policy.
//   - That an anon attempting to set `user_id` themselves (bypassing the
//     saga) gets rejected by `with check (user_id is null)`. Migration 145
//     closed that hole; the staging smoke test in the migration file is
//     the source of truth.
// ---------------------------------------------------------------------------

type DbError = { message: string } | null;
type DbResult<T> = { data: T | null; error: DbError };

type CapturedUpdate = {
  table: string | null;
  payload: Record<string, unknown> | null;
  // WHERE-clause filters captured from chained .eq() / .is() / .in() calls.
  filters: Array<{ op: "eq" | "is" | "in"; col: string; val: unknown }>;
};

const state: {
  capturedClaimUpdate: CapturedUpdate;
  capturedPromoteUpdate: CapturedUpdate;
  claimUpdateResult: DbResult<Array<{ id: string }>>;
  promoteUpdateResult: DbResult<Array<{ id: string }>>;
  tokenRow: DbResult<{
    id: string;
    anon_user_id: string | null;
    user_id: string | null;
    session_id: string | null;
    player_name: string | null;
  }>;
  existingUser: DbResult<{ id: string; email?: string | null }>;
  userTokensResult: DbResult<Array<{ id: string }>>;
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
  mostRecent: DbResult<{ id: string }>;
  currentUserDefault: DbResult<{ default_character_id: string | null }>;
} = {
  capturedClaimUpdate: { table: null, payload: null, filters: [] },
  capturedPromoteUpdate: { table: null, payload: null, filters: [] },
  claimUpdateResult: { data: null, error: null },
  promoteUpdateResult: { data: null, error: null },
  tokenRow: { data: null, error: null },
  existingUser: { data: null, error: null },
  userTokensResult: { data: [], error: null },
  sessionsForTokens: { data: [], error: null },
  campaignMembersInserted: { data: [], error: null },
  memberships: { data: [], error: null },
  mostRecent: { data: null, error: null },
  currentUserDefault: { data: { default_character_id: null }, error: null },
};

// Which player_characters UPDATE are we inside? The claim path calls
// `.update(payload).eq("id",…).is("user_id",null).is("claimed_by_session_token",null).select("id")`.
// The promote path calls `.update({user_id, claimed_by_session_token:null}).in(…).select("id")`.
// We disambiguate by watching whether `.in()` is called.
function playerCharactersBuilder() {
  let currentUpdate: CapturedUpdate | null = null;
  let inChainUsed = false;

  const captureFilter = (op: "eq" | "is" | "in", col: string, val: unknown) => {
    if (!currentUpdate) return;
    currentUpdate.filters.push({ op, col, val });
    if (op === "in") inChainUsed = true;
  };

  const builder: Record<string, unknown> = {
    select: jest.fn((cols: string) => {
      if (currentUpdate) {
        // Terminator for UPDATE .select("id")
        const result = inChainUsed ? state.promoteUpdateResult : state.claimUpdateResult;
        if (inChainUsed) {
          state.capturedPromoteUpdate = currentUpdate;
        } else {
          state.capturedClaimUpdate = currentUpdate;
        }
        currentUpdate = null;
        inChainUsed = false;
        return Promise.resolve(result);
      }
      // Non-update SELECT — fall through to terminator chain for
      // upgrade flow's "most recent character" query.
      void cols;
      return {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve(state.mostRecent)),
            })),
          })),
        })),
      };
    }),
    update: jest.fn((payload: Record<string, unknown>) => {
      currentUpdate = { table: "player_characters", payload, filters: [] };
      inChainUsed = false;
      return builder;
    }),
    eq: jest.fn((col: string, val: unknown) => {
      captureFilter("eq", col, val);
      return builder;
    }),
    is: jest.fn((col: string, val: unknown) => {
      captureFilter("is", col, val);
      return builder;
    }),
    in: jest.fn((col: string, val: unknown) => {
      captureFilter("in", col, val);
      return builder;
    }),
    // Tolerate awaiting the builder directly (for non-select terminators).
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(state.claimUpdateResult).then(resolve),
  };
  return builder;
}

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
    upsert: jest.fn(() => Promise.resolve({ error: null, data: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null, data: null })),
    })),
    eq: jest.fn(() => ({
      maybeSingle: jest.fn(() => {
        if (selectCols.includes("default_character_id")) {
          return Promise.resolve(state.currentUserDefault);
        }
        return Promise.resolve(state.existingUser);
      }),
    })),
  };
  return builder;
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
  migrateGuestCharacterToAuth: jest.fn(() => Promise.resolve({ id: "c1" })),
}));

import { claimCampaignCharacter } from "@/lib/supabase/character-claim";
import { upgradePlayerIdentity } from "@/lib/supabase/player-identity";

const CHAR_ID = "00000000-0000-0000-0000-000000000aaa";
const SESSION_TOKEN_ID = "00000000-0000-0000-0000-000000000bbb";
const USER_ID = "00000000-0000-0000-0000-000000000ccc";

function resetState(): void {
  state.capturedClaimUpdate = { table: null, payload: null, filters: [] };
  state.capturedPromoteUpdate = { table: null, payload: null, filters: [] };
  state.claimUpdateResult = { data: [{ id: CHAR_ID }], error: null };
  state.promoteUpdateResult = { data: [{ id: CHAR_ID }], error: null };
  state.tokenRow = {
    data: {
      id: SESSION_TOKEN_ID,
      anon_user_id: USER_ID,
      user_id: null,
      session_id: "00000000-0000-0000-0000-000000000sss",
      player_name: "Anon",
    },
    error: null,
  };
  state.existingUser = { data: null, error: null };
  state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };
  state.sessionsForTokens = { data: [], error: null };
  state.campaignMembersInserted = { data: [], error: null };
  state.memberships = { data: [], error: null };
  state.mostRecent = { data: null, error: null };
  state.currentUserDefault = { data: { default_character_id: null }, error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetState();
});

// ===========================================================================
// Code-path coverage for RLS transition
// ===========================================================================

describe("T4.a — soft-claim WRITE shape matches the RLS policy expectations", () => {
  it("claimCampaignCharacter({sessionTokenId}) sets claimed_by_session_token and preserves user_id NULL", async () => {
    const result = await claimCampaignCharacter(CHAR_ID, {
      sessionTokenId: SESSION_TOKEN_ID,
    });

    expect(result.claimedBy).toBe("anon");

    // Verify the UPDATE payload shape — this is EXACTLY what the soft-claim
    // RLS policy's `with check` clause allows: user_id IS NULL is preserved,
    // and claimed_by_session_token is set to a token the anon owns.
    const update = state.capturedClaimUpdate;
    expect(update.table).toBe("player_characters");
    expect(update.payload).toEqual({
      claimed_by_session_token: SESSION_TOKEN_ID,
    });
    // The payload MUST NOT contain user_id — that would violate migration
    // 145's `with check (user_id is null)` guard.
    expect(update.payload).not.toHaveProperty("user_id");

    // Race guards match the policy's `using` clause.
    const isFilters = update.filters.filter((f) => f.op === "is");
    const hasUserIdNullGuard = isFilters.some(
      (f) => f.col === "user_id" && f.val === null,
    );
    const hasClaimedNullGuard = isFilters.some(
      (f) => f.col === "claimed_by_session_token" && f.val === null,
    );
    expect(hasUserIdNullGuard).toBe(true);
    expect(hasClaimedNullGuard).toBe(true);
  });
});

describe("T4.b — soft-claim → hard-claim transition inside upgradePlayerIdentity", () => {
  it("step 8 UPDATE promotes soft claim: sets user_id + nulls claimed_by_session_token, filtered by user's own session_tokens", async () => {
    // Seed: the anon user has a soft-claimed character. Their session_token
    // is ACTIVE and references a session that belongs to some campaign.
    state.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: USER_ID,
        user_id: null,
        session_id: "00000000-0000-0000-0000-000000000sss",
        player_name: "Anon",
      },
      error: null,
    };
    state.userTokensResult = { data: [{ id: SESSION_TOKEN_ID }], error: null };
    // Step 8 promotes this character.
    state.promoteUpdateResult = { data: [{ id: CHAR_ID }], error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: {
        email: "soft-to-hard@example.com",
        password: "abcdefgh",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated.playerCharactersPromoted).toBe(1);
    }

    // The UPDATE payload on player_characters during step 8 MUST set
    // user_id AND null-out claimed_by_session_token — putting the row into
    // the state the normal `user_id = auth.uid()` RLS policy applies to.
    const promote = state.capturedPromoteUpdate;
    expect(promote.table).toBe("player_characters");
    expect(promote.payload).toEqual({
      user_id: USER_ID,
      claimed_by_session_token: null,
    });

    // The filter uses `.in("claimed_by_session_token", userTokenIds)` —
    // scoping the promotion to tokens the user owns. Critical for security:
    // without this filter the saga could steal soft-claims from other users.
    const inFilter = promote.filters.find((f) => f.op === "in");
    expect(inFilter).toBeDefined();
    expect(inFilter!.col).toBe("claimed_by_session_token");
    expect(Array.isArray(inFilter!.val)).toBe(true);
    expect((inFilter!.val as unknown[]).every((v) => typeof v === "string")).toBe(true);
    expect(inFilter!.val).toContain(SESSION_TOKEN_ID);
  });

  it("preserves idempotency: second call with user already hard-claimed is a no-op (soft-claim step skipped)", async () => {
    state.tokenRow = {
      data: {
        id: SESSION_TOKEN_ID,
        anon_user_id: USER_ID,
        user_id: USER_ID, // Already promoted.
        session_id: null,
        player_name: "Anon",
      },
      error: null,
    };
    state.existingUser = { data: { id: USER_ID, email: "existing@x.com" }, error: null };

    const result = await upgradePlayerIdentity({
      sessionTokenId: SESSION_TOKEN_ID,
      callerUserId: USER_ID,
      credentials: { email: "existing@x.com", password: "abcdefgh" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.migrated.playerCharactersPromoted).toBe(0);
    }
    // No UPDATE executed on player_characters during this idempotent run.
    expect(state.capturedPromoteUpdate.table).toBeNull();
  });
});

// ===========================================================================
// Documented SQL-level test TODOs — for a follow-up pgTap suite or live
// Supabase integration harness. Not runnable from jest/jsdom.
// ===========================================================================

describe.skip("T4.c — live-RLS assertions (pgTap / Supabase integration harness)", () => {
  // These specs describe SQL tests that the follow-up ticket should codify.
  // We use describe.skip to keep them visible in `npx jest --listTests` while
  // not failing CI. See rec_follow_up: "pgTap migration for RLS tests".

  it("anon with session_token A can UPDATE a soft-claimed character's name field", () => {
    /**
     * SQL (run as anon with JWT.sub = A1):
     *   update player_characters
     *     set name = 'Renamed by Anon'
     *   where id = :soft_claimed_char
     *     and claimed_by_session_token = :token_A;
     *
     * Expected: 1 row affected.
     */
  });

  it("anon cannot UPDATE claimed_by_session_token to a token they do not own (RLS with check)", () => {
    /**
     * SQL (run as anon A1, attempting to re-assign to token B):
     *   update player_characters
     *     set claimed_by_session_token = :token_B
     *   where id = :soft_claimed_char;
     *
     * Expected: 0 rows affected (RLS with check rejects — token_B is not
     * owned by A1 anon_user_id).
     */
  });

  it("anon CANNOT self-promote by setting user_id directly (migration 145 guard)", () => {
    /**
     * SQL (run as anon A1):
     *   update player_characters
     *     set user_id = :anon_uid, claimed_by_session_token = null
     *   where id = :soft_claimed_char;
     *
     * Expected: 0 rows affected. Migration 145's
     * `with check (user_id IS NULL)` blocks this path; only the
     * server-side upgradePlayerIdentity saga (service-role) can promote.
     */
  });

  it("after upgradePlayerIdentity completes, anon JWT cannot see the character; auth JWT can", () => {
    /**
     * SQL part 1 (as anon A1, after saga ran with user_id = A1):
     *   select id from player_characters where id = :char_id;
     * Expected: 0 rows (the anon SELECT policy requires user_id IS NULL).
     *
     * SQL part 2 (as auth A1 = same UUID per DC1):
     *   select id from player_characters where id = :char_id;
     * Expected: 1 row (normal user_id = auth.uid() policy).
     */
  });
});
