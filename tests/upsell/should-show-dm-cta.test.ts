/**
 * Epic 04 Story 04-B — `shouldShowDmCta` coverage.
 *
 * Target: `lib/upsell/should-show-dm-cta.ts`
 *
 * AC Test 4 (F28) scenarios, plus error/defensive paths:
 *   (a) role=player, sessions=0                       → hidden, below_threshold
 *   (b) role=player, sessions>=2, first_campaign NULL → SHOWN, shown
 *   (c) role=both,   sessions=0                       → hidden, below_threshold
 *   (d) role=both,   sessions>=2, first_campaign NULL → SHOWN, shown
 *   (e) role=both,   sessions>=2, first_campaign SET  → hidden, already_dm
 *   (f) role=dm,     sessions=any                     → hidden, already_dm
 *   (g) users row missing / query error               → hidden, error
 *   (h) empty userId                                  → hidden, error
 *   (i) user_onboarding query error (role=both)       → hidden, error
 */

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

type BuilderResult<T = unknown> = {
  data?: T;
  error?: { message: string } | null;
};

const state: {
  userRow: BuilderResult<{ role: "player" | "dm" | "both" } | null>;
  onboardingRow: BuilderResult<{ first_campaign_created_at: string | null } | null>;
  sessionsPlayed: number;
  // Explicit toggle for getSessionsPlayed-called assertion
  getSessionsPlayedCalls: number;
} = {
  userRow: { data: null, error: null },
  onboardingRow: { data: null, error: null },
  sessionsPlayed: 0,
  getSessionsPlayedCalls: 0,
};

// ---------------------------------------------------------------------------
// Supabase mock — just the two SELECT paths this function takes
// ---------------------------------------------------------------------------

function makeUsersBuilder() {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    maybeSingle: jest.fn(() => Promise.resolve(state.userRow)),
  };
  return b;
}

function makeOnboardingBuilder() {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    maybeSingle: jest.fn(() => Promise.resolve(state.onboardingRow)),
  };
  return b;
}

const createClientMock = jest.fn(async () => ({
  from: jest.fn((table: string) => {
    if (table === "users") return makeUsersBuilder();
    if (table === "user_onboarding") return makeOnboardingBuilder();
    throw new Error(`Unexpected table in test: ${table}`);
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

jest.mock("@/lib/upsell/get-sessions-played", () => ({
  getSessionsPlayed: jest.fn(async () => {
    state.getSessionsPlayedCalls += 1;
    return state.sessionsPlayed;
  }),
}));

// ---------------------------------------------------------------------------
// Imports — after mock
// ---------------------------------------------------------------------------

import { shouldShowDmCta } from "@/lib/upsell/should-show-dm-cta";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-0000-0000-0000000000d1";

beforeEach(() => {
  jest.clearAllMocks();
  state.userRow = { data: { role: "player" }, error: null };
  state.onboardingRow = { data: { first_campaign_created_at: null }, error: null };
  state.sessionsPlayed = 0;
  state.getSessionsPlayedCalls = 0;
});

// ---------------------------------------------------------------------------
// AC Test 4 — F28 scenarios (a)-(f)
// ---------------------------------------------------------------------------

describe("shouldShowDmCta — AC Test 4 (F28)", () => {
  it("(a) role=player, sessions=0 → hidden, below_threshold", async () => {
    state.userRow = { data: { role: "player" }, error: null };
    state.sessionsPlayed = 0;

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({
      show: false,
      reason: "below_threshold",
      sessionsPlayed: 0,
    });
  });

  it("(b) role=player, sessions=2, first_campaign NULL → SHOWN", async () => {
    state.userRow = { data: { role: "player" }, error: null };
    state.sessionsPlayed = 2;
    // player role should NOT even peek at user_onboarding — skip the query
    // entirely (spec: the gate is "role===both AND first_campaign SET").

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({
      show: true,
      reason: "shown",
      sessionsPlayed: 2,
    });
  });

  it("(c) role=both, sessions=0, first_campaign NULL → hidden, below_threshold", async () => {
    state.userRow = { data: { role: "both" }, error: null };
    state.onboardingRow = { data: { first_campaign_created_at: null }, error: null };
    state.sessionsPlayed = 0;

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({
      show: false,
      reason: "below_threshold",
      sessionsPlayed: 0,
    });
  });

  it("(d) role=both, sessions=3, first_campaign NULL → SHOWN", async () => {
    state.userRow = { data: { role: "both" }, error: null };
    state.onboardingRow = { data: { first_campaign_created_at: null }, error: null };
    state.sessionsPlayed = 3;

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({
      show: true,
      reason: "shown",
      sessionsPlayed: 3,
    });
  });

  it("(e) role=both, sessions=3, first_campaign SET → hidden, already_dm", async () => {
    state.userRow = { data: { role: "both" }, error: null };
    state.onboardingRow = {
      data: { first_campaign_created_at: new Date().toISOString() },
      error: null,
    };
    state.sessionsPlayed = 3;

    const res = await shouldShowDmCta(USER_ID);
    expect(res.show).toBe(false);
    expect(res.reason).toBe("already_dm");
    // Short-circuits BEFORE sessions read — performance expectation.
    expect(state.getSessionsPlayedCalls).toBe(0);
  });

  it("(f) role=dm, sessions=any → hidden, already_dm (short-circuits before sessions read)", async () => {
    state.userRow = { data: { role: "dm" }, error: null };
    state.sessionsPlayed = 5;

    const res = await shouldShowDmCta(USER_ID);
    expect(res.show).toBe(false);
    expect(res.reason).toBe("already_dm");
    // No call to getSessionsPlayed — the role=dm branch short-circuits.
    expect(state.getSessionsPlayedCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error / defensive paths
// ---------------------------------------------------------------------------

describe("shouldShowDmCta — error + defensive fallbacks", () => {
  it("returns error fallback when users row is missing", async () => {
    state.userRow = { data: null, error: null };

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({ show: false, reason: "error", sessionsPlayed: 0 });
  });

  it("returns error fallback when users query errors", async () => {
    state.userRow = { data: null, error: { message: "boom" } };

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({ show: false, reason: "error", sessionsPlayed: 0 });
  });

  it("returns error fallback when user_onboarding query errors (role=both)", async () => {
    state.userRow = { data: { role: "both" }, error: null };
    state.onboardingRow = { data: null, error: { message: "rls" } };

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({ show: false, reason: "error", sessionsPlayed: 0 });
  });

  it("returns error fallback for empty userId without touching the DB", async () => {
    const res = await shouldShowDmCta("");
    expect(res).toEqual({ show: false, reason: "error", sessionsPlayed: 0 });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("role=both with NO user_onboarding row (null data) still flows to sessions gate", async () => {
    // Not strictly an error path — maybeSingle returning null means "no row
    // yet", which is functionally equivalent to first_campaign_created_at
    // being NULL. Exercise path (d) via the null-row case.
    state.userRow = { data: { role: "both" }, error: null };
    state.onboardingRow = { data: null, error: null };
    state.sessionsPlayed = 2;

    const res = await shouldShowDmCta(USER_ID);
    expect(res).toEqual({
      show: true,
      reason: "shown",
      sessionsPlayed: 2,
    });
  });
});
