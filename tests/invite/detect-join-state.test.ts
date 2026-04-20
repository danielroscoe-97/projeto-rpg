// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.

// ---------------------------------------------------------------------------
// Supabase mock plumbing
//
// `detectJoinState` reads:
//   - session_tokens (SELECT ... WHERE token = ?)
//   - sessions        (SELECT ... WHERE id = ?)
//
// and calls `getAuthUser()` when the token row has user_id set.
// ---------------------------------------------------------------------------

type DbError = { message: string } | null;
type DbResult<T> = { data: T | null; error: DbError };

type SessionTokenRow = {
  id: string;
  session_id: string;
  token: string;
  player_name: string | null;
  anon_user_id: string | null;
  user_id: string | null;
  is_active: boolean;
  last_seen_at: string | null;
};

type SessionRow = {
  id: string;
  name: string;
  is_active: boolean;
  campaign_id: string | null;
  ruleset_version: string;
  dm_plan: string;
};

type State = {
  sessionTokensResult: DbResult<SessionTokenRow>;
  sessionsResult: DbResult<SessionRow>;
  authUser: { id: string; email?: string; is_anonymous?: boolean } | null;
};

const state: State = {
  sessionTokensResult: { data: null, error: null },
  sessionsResult: { data: null, error: null },
  authUser: null,
};

function makeBuilder(table: string): Record<string, unknown> {
  if (table === "session_tokens") {
    const b: Record<string, unknown> = {};
    b.select = jest.fn(() => b);
    b.eq = jest.fn(() => b);
    b.maybeSingle = jest.fn(() => Promise.resolve(state.sessionTokensResult));
    return b;
  }
  if (table === "sessions") {
    const b: Record<string, unknown> = {};
    b.select = jest.fn(() => b);
    b.eq = jest.fn(() => b);
    b.maybeSingle = jest.fn(() => Promise.resolve(state.sessionsResult));
    return b;
  }
  throw new Error(`detect-join-state test hit unmocked table: ${table}`);
}

const fromMock = jest.fn((table: string) => makeBuilder(table));

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: fromMock }),
  getAuthUser: jest.fn(() => Promise.resolve(state.authUser)),
}));

import { detectJoinState } from "@/lib/identity/detect-join-state";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOKEN = "join-token-xyz";
const TOKEN_ID = "00000000-0000-0000-0000-0000000000a1";
const SESSION_ID = "00000000-0000-0000-0000-0000000000a2";
const CAMPAIGN_ID = "00000000-0000-0000-0000-0000000000a3";
const ANON_USER_ID = "00000000-0000-0000-0000-0000000000a4";
const AUTH_USER_ID = "00000000-0000-0000-0000-0000000000a5";
const OTHER_ANON_ID = "00000000-0000-0000-0000-0000000000a6";

function makeTokenRow(overrides: Partial<SessionTokenRow> = {}): SessionTokenRow {
  return {
    id: TOKEN_ID,
    session_id: SESSION_ID,
    token: TOKEN,
    player_name: null,
    anon_user_id: null,
    user_id: null,
    is_active: true,
    last_seen_at: null,
    ...overrides,
  };
}

function makeSessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: SESSION_ID,
    name: "Session 1",
    is_active: true,
    campaign_id: CAMPAIGN_ID,
    ruleset_version: "2014",
    dm_plan: "free",
    ...overrides,
  };
}

function makeAuthUser(id: string = AUTH_USER_ID) {
  return { id, email: "player@example.com", is_anonymous: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  state.sessionTokensResult = { data: null, error: null };
  state.sessionsResult = { data: null, error: null };
  state.authUser = null;
});

describe("detectJoinState — invalid tokens", () => {
  it("returns invalid.not_found when token is empty", async () => {
    const result = await detectJoinState("");
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.not_found when token is only whitespace (typo)", async () => {
    const result = await detectJoinState("   ");
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.not_found when DB lookup returns null (unknown token)", async () => {
    state.sessionTokensResult = { data: null, error: null };
    const result = await detectJoinState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "not_found" });
  });

  it("returns invalid.expired when token.is_active is false (revoked)", async () => {
    state.sessionTokensResult = {
      data: makeTokenRow({ is_active: false }),
      error: null,
    };
    const result = await detectJoinState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "expired" });
  });

  it("returns invalid.session_ended when parent session is missing", async () => {
    state.sessionTokensResult = { data: makeTokenRow(), error: null };
    state.sessionsResult = { data: null, error: null };
    const result = await detectJoinState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "session_ended" });
  });

  it("returns invalid.session_ended when session.is_active is false", async () => {
    state.sessionTokensResult = { data: makeTokenRow(), error: null };
    state.sessionsResult = { data: makeSessionRow({ is_active: false }), error: null };
    const result = await detectJoinState(TOKEN);
    expect(result).toEqual({ state: "invalid", reason: "session_ended" });
  });
});

describe("detectJoinState — fresh state", () => {
  it("returns fresh when token has neither anon_user_id nor user_id", async () => {
    state.sessionTokensResult = { data: makeTokenRow(), error: null };
    state.sessionsResult = { data: makeSessionRow(), error: null };

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("fresh");
    if (result.state !== "fresh") throw new Error("expected fresh");
    expect(result.sessionToken.id).toBe(TOKEN_ID);
    expect(result.sessionToken.anonUserId).toBeNull();
    expect(result.sessionToken.userId).toBeNull();
    expect(result.session.id).toBe(SESSION_ID);
    expect(result.session.campaignId).toBe(CAMPAIGN_ID);
  });
});

describe("detectJoinState — returning-anon state", () => {
  it("returns returning-anon when token has anon_user_id but no user_id", async () => {
    state.sessionTokensResult = {
      data: makeTokenRow({
        anon_user_id: ANON_USER_ID,
        player_name: "Maria",
        last_seen_at: new Date().toISOString(),
      }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("returning-anon");
    if (result.state !== "returning-anon") throw new Error("expected returning-anon");
    expect(result.sessionToken.anonUserId).toBe(ANON_USER_ID);
    expect(result.sessionToken.playerName).toBe("Maria");
  });

  it("returns returning-anon even when caller presents a DIFFERENT anon cookie (mismatch)", async () => {
    // Token row has anon_user_id = ANON_USER_ID but caller cookie is OTHER_ANON_ID.
    // Per the Winston F-note in detect-join-state.ts, we deliberately do NOT
    // emit a fifth "fresh-but-claimed" state — reconcile lives in the client.
    state.sessionTokensResult = {
      data: makeTokenRow({ anon_user_id: ANON_USER_ID }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = makeAuthUser(OTHER_ANON_ID); // different anon identity

    const result = await detectJoinState(TOKEN);

    // Critical invariant: still "returning-anon", not a new state.
    expect(result.state).toBe("returning-anon");
    if (result.state !== "returning-anon") throw new Error("expected returning-anon");
    // The token's anon_user_id is exposed verbatim for the client's own
    // reconcile/split-brain logic (which compares to sessionStorage).
    expect(result.sessionToken.anonUserId).toBe(ANON_USER_ID);
  });

});

describe("detectJoinState — returning-auth-mismatch state (M7)", () => {
  it("emits returning-auth-mismatch when token.user_id is set but caller has NO auth cookie", async () => {
    // Auth-bound token, cookie absent. Previously collapsed into
    // returning-anon (M7 code review). Now emits a distinct state so the
    // consumer can render "sign-in to reconnect" in one check.
    state.sessionTokensResult = {
      data: makeTokenRow({ user_id: AUTH_USER_ID }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = null;

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("returning-auth-mismatch");
    if (result.state !== "returning-auth-mismatch") {
      throw new Error("expected returning-auth-mismatch");
    }
    // Token's user_id is still exposed for the consumer's own login flow.
    expect(result.sessionToken.userId).toBe(AUTH_USER_ID);
    expect(result.session.id).toBe(SESSION_ID);
  });

  it("emits returning-auth-mismatch when token.user_id is set but caller is a DIFFERENT auth user", async () => {
    state.sessionTokensResult = {
      data: makeTokenRow({ user_id: AUTH_USER_ID }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = makeAuthUser(OTHER_ANON_ID); // cookie belongs to someone else

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("returning-auth-mismatch");
  });

  it("does NOT include a `user` field on returning-auth-mismatch (contract invariant)", async () => {
    // "returning-auth" is ONLY emitted when we can hand back a matching User.
    // The mismatch state intentionally omits `user` so the consumer has to
    // drive login explicitly.
    state.sessionTokensResult = {
      data: makeTokenRow({ user_id: AUTH_USER_ID }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = null;

    const result = await detectJoinState(TOKEN);

    expect(result).not.toHaveProperty("user");
  });
});

describe("detectJoinState — returning-auth state", () => {
  it("returns returning-auth + user when token.user_id matches caller auth", async () => {
    state.sessionTokensResult = {
      data: makeTokenRow({ user_id: AUTH_USER_ID, anon_user_id: AUTH_USER_ID }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = makeAuthUser(AUTH_USER_ID);

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("returning-auth");
    if (result.state !== "returning-auth") throw new Error("expected returning-auth");
    expect(result.user.id).toBe(AUTH_USER_ID);
    expect(result.sessionToken.userId).toBe(AUTH_USER_ID);
    expect(result.session.campaignId).toBe(CAMPAIGN_ID);
  });

  it("returning-auth takes precedence when both user_id and anon_user_id are set (post-upgrade)", async () => {
    // Per migration 142, after upgradePlayerIdentity both columns are set to
    // the same UUID. Caller with matching cookie should land in returning-auth.
    state.sessionTokensResult = {
      data: makeTokenRow({
        user_id: AUTH_USER_ID,
        anon_user_id: AUTH_USER_ID,
      }),
      error: null,
    };
    state.sessionsResult = { data: makeSessionRow(), error: null };
    state.authUser = makeAuthUser(AUTH_USER_ID);

    const result = await detectJoinState(TOKEN);

    expect(result.state).toBe("returning-auth");
  });
});
