/**
 * Story 04-C — cloneTemplateForUser envelope-shape tests.
 *
 * Defensive tests around edge shapes coming back from the RPC layer:
 *   1. `null` payload + no error → unknown
 *   2. non-object data (string, number) → unknown
 *   3. missing_monsters envelope with non-array `missing_monsters` field
 *      → normalizes to [] rather than throwing
 *   4. Happy envelope is passed through even with extra unexpected keys
 */

// ---------------------------------------------------------------------------
// Mocks (same plumbing as clone-template.test.ts but isolated file)
// ---------------------------------------------------------------------------

type RpcResult = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

const state: {
  user: { id: string } | null;
  rpcResult: RpcResult;
} = {
  user: { id: "dm-1" },
  rpcResult: { data: null, error: null },
};

const rpcMock = jest.fn(
  async (_fn: string, _args: Record<string, unknown>) => state.rpcResult,
);

const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  rpc: rpcMock,
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

import { cloneTemplateForUser } from "@/lib/upsell/clone-template";

const TEMPLATE_ID = "04040401-0000-0000-0000-000000000001";
const USER_ID = "dm-1";

describe("cloneTemplateForUser — shape guards", () => {
  beforeEach(() => {
    state.user = { id: USER_ID };
    state.rpcResult = { data: null, error: null };
    rpcMock.mockClear();
  });

  it("maps null data + null error to unknown", async () => {
    state.rpcResult = { data: null, error: null };
    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unknown");
  });

  it("maps non-object data (string) to unknown", async () => {
    state.rpcResult = { data: "unexpected", error: null };
    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unknown");
  });

  it("normalizes missing_monsters to [] when RPC returns non-array field", async () => {
    state.rpcResult = {
      data: { ok: false, missing_monsters: null },
      error: null,
    };
    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === "missing_monsters") {
      expect(res.missingMonsters).toEqual([]);
    } else {
      throw new Error("expected missing_monsters result");
    }
  });

  it("passes through happy envelope with extra unknown keys", async () => {
    state.rpcResult = {
      data: {
        ok: true,
        campaign_id: "camp-2",
        join_code: "ZYXW0987",
        session_id: "sess-2",
        debug_server_time: "2026-04-21T00:00:00Z",
      },
      error: null,
    };
    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);
    expect(res).toEqual({
      ok: true,
      campaignId: "camp-2",
      joinCode: "ZYXW0987",
      sessionId: "sess-2",
    });
  });
});
