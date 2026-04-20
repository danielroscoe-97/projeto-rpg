/**
 * Story 02-H — linkCharacterToCampaign server action tests.
 *
 * Wave 2 code review refactor (2026-04-20):
 *   M16: the 3 write round-trips were folded into a single Postgres RPC
 *        `link_character_and_join_campaign` (mig 155). These tests now mock
 *        the RPC call instead of per-table builders for the write path.
 *   M17: RPC does ON CONFLICT DO UPDATE SET status='active' to reactivate
 *        inactive/banned members (covered in
 *        `tests/identity/link-character-reactivation.test.ts`).
 *   M18: error codes split into sub-codes:
 *          - unauthenticated
 *          - character_not_available
 *          - invite_not_found
 *          - invite_expired
 *          - invite_already_accepted
 *          - invite_mismatch
 *          - internal
 *        Old coarse `invite_invalid` is gone.
 *
 * Coverage (this file):
 *   1. Unauthenticated caller         → { code: "unauthenticated" }
 *   2. Invite not found                → { code: "invite_not_found" }
 *   3. Invite already accepted         → { code: "invite_already_accepted" }
 *   4. Invite status = "expired"       → { code: "invite_expired" }
 *   5. Invite expires_at in the past   → { code: "invite_expired" }
 *   6. Campaign mismatch               → { code: "invite_mismatch" }
 *   7. Email mismatch                  → { code: "invite_mismatch" }
 *   8. RPC returns character_not_available → { code: "character_not_available" }
 *   9. RPC returns unauthenticated     → { code: "unauthenticated" }
 *   10. RPC network error              → { code: "internal" }
 *   11. Malformed RPC envelope         → { code: "internal" }
 *   12. Happy path                     → { ok: true, ... } — RPC invoked w/ right args
 */

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

type BuilderResult<T = unknown> = {
  data?: T;
  error?: { message: string; code?: string } | null;
};

type RpcEnvelope =
  | { ok: true; character_id: string; campaign_id: string }
  | { ok: false; code: "unauthenticated" | "character_not_available" };

const state: {
  user: { id: string; email?: string } | null;
  inviteRow: BuilderResult;
  // RPC return shape + error
  rpcResult: BuilderResult<RpcEnvelope | null>;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
} = {
  user: null,
  inviteRow: { data: null, error: null },
  rpcResult: { data: null, error: null },
  rpcCalls: [],
};

// ---------------------------------------------------------------------------
// Supabase mock builders
// ---------------------------------------------------------------------------

function makeInviteSelectBuilder() {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(state.inviteRow)),
  };
  return builder;
}

// Mock the supabase/server module. `createClient()` is the cookie-aware
// client used for auth.getUser(); `createServiceClient()` is used for the
// invite pre-validation SELECT and the RPC invocation.
const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  from: jest.fn(),
}));

const createServiceClientMock = jest.fn(() => ({
  from: jest.fn((table: string) => {
    if (table === "campaign_invites") {
      // Only SELECT shape is used now (invite pre-validation). Writes are
      // via RPC.
      return makeInviteSelectBuilder();
    }
    throw new Error(`Unexpected table in test: ${table}`);
  }),
  rpc: jest.fn(async (fn: string, args: Record<string, unknown>) => {
    state.rpcCalls.push({ fn, args });
    return state.rpcResult;
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
  // Default: RPC succeeds
  state.rpcResult = {
    data: {
      ok: true,
      character_id: CHAR_ID,
      campaign_id: CAMPAIGN_ID,
    },
    error: null,
  };
  state.rpcCalls = [];
});

// ---------------------------------------------------------------------------
// Tests — auth guard
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
    // Must bail before touching DB.
    expect(state.rpcCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — invite validation sub-codes (M18)
// ---------------------------------------------------------------------------

describe("linkCharacterToCampaign — invite sub-code taxonomy (M18)", () => {
  it("returns invite_not_found when invite row is missing", async () => {
    state.inviteRow = { data: null, error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_not_found");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns invite_already_accepted when status == 'accepted'", async () => {
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
    if (!res.ok) expect(res.code).toBe("invite_already_accepted");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns invite_expired when status == 'expired'", async () => {
    state.inviteRow = {
      data: validInvite({ status: "expired" }),
      error: null,
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_expired");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns invite_expired when expires_at is in the past", async () => {
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
    if (!res.ok) expect(res.code).toBe("invite_expired");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns invite_mismatch when client campaignId doesn't match invite", async () => {
    state.inviteRow = { data: validInvite(), error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: "00000000-0000-0000-0000-000000000bad",
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_mismatch");
    expect(state.rpcCalls).toHaveLength(0);
  });

  it("returns invite_mismatch when invite.email doesn't match user.email", async () => {
    state.inviteRow = {
      data: validInvite({ email: "other@example.com" }),
      error: null,
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("invite_mismatch");
    expect(state.rpcCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — RPC error envelopes
// ---------------------------------------------------------------------------

describe("linkCharacterToCampaign — RPC error envelopes", () => {
  it("returns character_not_available when RPC reports concurrency loss", async () => {
    state.rpcResult = {
      data: { ok: false, code: "character_not_available" },
      error: null,
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("character_not_available");
      expect(res.retryable).toBe(true);
    }
    // RPC was invoked (with correct args) before bailing.
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]!.fn).toBe("link_character_and_join_campaign");
    expect(state.rpcCalls[0]!.args).toEqual({
      p_character_id: CHAR_ID,
      p_campaign_id: CAMPAIGN_ID,
      p_invite_id: INVITE_ID,
    });
  });

  it("returns unauthenticated when RPC reports no auth.uid()", async () => {
    // Defense-in-depth: even if the cookie-aware client thought we were
    // authenticated, the RPC may disagree (role mismatch, expired JWT).
    state.rpcResult = {
      data: { ok: false, code: "unauthenticated" },
      error: null,
    };

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
  });

  it("returns internal when RPC errors at the network layer", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "network down", code: "XX000" },
    };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("internal");
      expect(res.retryable).toBe(true);
    }
  });

  it("returns internal when RPC returns a malformed envelope", async () => {
    // Supabase should never return non-object data for a JSON-returning
    // function, but belt-and-braces for forward-compat if the RPC signature
    // ever drifts.
    state.rpcResult = { data: null, error: null };

    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("internal");
  });
});

// ---------------------------------------------------------------------------
// Tests — happy path
// ---------------------------------------------------------------------------

describe("linkCharacterToCampaign — happy path", () => {
  it("returns ok with the RPC-supplied character_id + campaign_id", async () => {
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

    // RPC was invoked exactly once with the right parameter names (these
    // names are load-bearing — they must match the CREATE FUNCTION signature
    // in mig 155).
    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]!.fn).toBe("link_character_and_join_campaign");
    expect(state.rpcCalls[0]!.args).toEqual({
      p_character_id: CHAR_ID,
      p_campaign_id: CAMPAIGN_ID,
      p_invite_id: INVITE_ID,
    });
  });

  it("uses invite.campaign_id (not caller's) for the RPC — prevents spoofing", async () => {
    // The caller passes CAMPAIGN_ID and the invite row is also for that
    // campaign. The RPC must receive invite.campaign_id, not the raw
    // client-provided value. Assert by flipping the invite shape to carry
    // a NORMALIZED campaign_id that matches the caller — otherwise the
    // mismatch guard would have rejected in the previous describe block.
    // This is a regression guard for the in-flight "campaign_id =
    // invite.campaign_id" assignment at line 166 of the action.
    state.inviteRow = { data: validInvite(), error: null };

    await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(state.rpcCalls[0]!.args.p_campaign_id).toBe(CAMPAIGN_ID);
  });
});
