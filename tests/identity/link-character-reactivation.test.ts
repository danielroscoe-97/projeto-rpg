/**
 * Wave 2 code review M17 — campaign_members reactivation on re-invite.
 *
 * The previous implementation used `ON CONFLICT DO NOTHING` on the member
 * insert, which meant that a player who was previously removed from a
 * campaign (`status = 'inactive'` or `'banned'`) stayed in that status even
 * after accepting a fresh invite. From the UX perspective the user saw
 * "linked + redirected to dashboard" but the DM's player list continued to
 * show them as inactive and the app-level membership checks refused access.
 *
 * The fix (bundled with M16's RPC conversion — mig 155) is
 * `ON CONFLICT (campaign_id, user_id) DO UPDATE SET status = 'active'`.
 * Since the RPC runs server-side as SECURITY DEFINER, the UPDATE applies
 * regardless of the caller's RLS, and the audit trail columns
 * (invited_by, joined_at) are preserved by not including them in SET.
 *
 * This test file exercises the server action's contract with the RPC for
 * the reactivation path. The SQL-level reactivation is also covered in
 * the migration itself (ON CONFLICT clause) and would be verified in an
 * integration test with a real Supabase instance — here we assert that
 * the action correctly relays the RPC success even when the pre-existing
 * row scenario is what produced it.
 *
 * Coverage (3 tests):
 *   1. RPC success during a reactivation flow (ok: true surfaces correctly)
 *   2. RPC args are the same whether this is first-join or reactivation
 *      (the action cannot know upfront which will happen)
 *   3. Invite still gets marked accepted on the reactivation path
 */

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
  rpcResult: BuilderResult<RpcEnvelope | null>;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
} = {
  user: null,
  inviteRow: { data: null, error: null },
  rpcResult: { data: null, error: null },
  rpcCalls: [],
};

function makeInviteSelectBuilder() {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(state.inviteRow)),
  };
  return builder;
}

const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  from: jest.fn(),
}));

const createServiceClientMock = jest.fn(() => ({
  from: jest.fn((table: string) => {
    if (table === "campaign_invites") {
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

beforeEach(() => {
  jest.clearAllMocks();
  state.user = { id: USER_ID, email: "player@example.com" };
  state.inviteRow = { data: validInvite(), error: null };
  state.rpcResult = {
    data: { ok: true, character_id: CHAR_ID, campaign_id: CAMPAIGN_ID },
    error: null,
  };
  state.rpcCalls = [];
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("linkCharacterToCampaign — M17 reactivation flow", () => {
  it("returns ok when the RPC reports success (caller cannot distinguish fresh-join vs reactivation)", async () => {
    // The SQL-level ON CONFLICT DO UPDATE SET status='active' means the
    // RPC returns { ok: true, ... } whether this was a brand-new member
    // row OR a pre-existing inactive/banned row that got flipped to
    // active. The TS action doesn't have a separate code for
    // reactivation — and shouldn't, because the UX is identical.
    const res = await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.characterId).toBe(CHAR_ID);
      expect(res.campaignId).toBe(CAMPAIGN_ID);
    }
  });

  it("calls RPC with identical args regardless of whether the member row pre-exists", async () => {
    // First call — fresh join scenario
    await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    const firstArgs = { ...state.rpcCalls[0]!.args };
    state.rpcCalls = [];

    // Second call — reactivation scenario (same inputs)
    await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(state.rpcCalls[0]!.args).toEqual(firstArgs);
  });

  it("relays RPC envelope to the caller on reactivation — invite_id is passed so SQL UPDATE campaign_invites runs", async () => {
    // The RPC also marks the invite accepted in the same transaction (mig
    // 155 step 4). The TS action's contract is: pass p_invite_id so that
    // server-side UPDATE can fire. We can't observe the invite UPDATE from
    // TS (no round-trip), so we assert on the arg contract instead.
    await linkCharacterToCampaign({
      characterId: CHAR_ID,
      campaignId: CAMPAIGN_ID,
      inviteId: INVITE_ID,
      token: TOKEN,
    });

    expect(state.rpcCalls).toHaveLength(1);
    expect(state.rpcCalls[0]!.args.p_invite_id).toBe(INVITE_ID);
    expect(state.rpcCalls[0]!.fn).toBe("link_character_and_join_campaign");
  });
});
