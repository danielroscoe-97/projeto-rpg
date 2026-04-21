/**
 * Story 04-C — cloneTemplateForUser server-action tests.
 *
 * Mocks `@/lib/supabase/server.createClient` so we drive the RPC response
 * (happy envelope, missing_monsters envelope, or Postgres error with
 * SQLSTATE) from per-test state. The wrapper's contract is the
 * discriminated union in `lib/upsell/clone-template.ts:34`.
 *
 * Cases (7):
 *   1. Happy path: RPC returns { ok: true, ... } → result.ok true + camelCase
 *   2. F1 forbidden: error.code '42501' → { ok: false, code: 'forbidden' }
 *   3. Template not found: error.code 'P0002' → { ok: false, code: 'not_found' }
 *   4. F9 missing_monsters: envelope { ok: false, missing_monsters: [...] }
 *      → { ok: false, code: 'missing_monsters', missingMonsters: [...] }
 *   5. Unknown RPC error → { ok: false, code: 'unknown', message }
 *   6. Unauthenticated (no cookie user) → forbidden without hitting the RPC
 *   7. user.id mismatch pre-flight → forbidden without hitting the RPC
 */

// ---------------------------------------------------------------------------
// Mocks
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { cloneTemplateForUser } from "@/lib/upsell/clone-template";

const TEMPLATE_ID = "04040401-0000-0000-0000-000000000001";
const USER_ID = "dm-1";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cloneTemplateForUser", () => {
  beforeEach(() => {
    state.user = { id: USER_ID };
    state.rpcResult = { data: null, error: null };
    rpcMock.mockClear();
  });

  it("returns ok:true with camelCased fields on happy path", async () => {
    state.rpcResult = {
      data: {
        ok: true,
        campaign_id: "camp-1",
        join_code: "ABC12345",
        session_id: "sess-1",
      },
      error: null,
    };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({
      ok: true,
      campaignId: "camp-1",
      joinCode: "ABC12345",
      sessionId: "sess-1",
    });
    expect(rpcMock).toHaveBeenCalledWith("clone_campaign_from_template", {
      p_template_id: TEMPLATE_ID,
      p_new_dm_user_id: USER_ID,
    });
  });

  it("maps SQLSTATE 42501 to forbidden (F1)", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "forbidden", code: "42501" },
    };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({ ok: false, code: "forbidden" });
  });

  it("maps SQLSTATE P0002 to not_found", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "template not found or not public", code: "P0002" },
    };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({ ok: false, code: "not_found" });
  });

  it("returns missing_monsters envelope with full accumulated list (F9)", async () => {
    state.rpcResult = {
      data: {
        ok: false,
        missing_monsters: [
          {
            encounter_id: "enc-1",
            missing_slugs: ["vgm-kenku", "mpmm-oblex"],
          },
          {
            encounter_id: "enc-2",
            missing_slugs: ["ftd-ruin-seeker"],
          },
        ],
      },
      error: null,
    };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({
      ok: false,
      code: "missing_monsters",
      missingMonsters: [
        {
          encounter_id: "enc-1",
          missing_slugs: ["vgm-kenku", "mpmm-oblex"],
        },
        {
          encounter_id: "enc-2",
          missing_slugs: ["ftd-ruin-seeker"],
        },
      ],
    });
  });

  it("returns unknown + message on unmapped RPC error", async () => {
    state.rpcResult = {
      data: null,
      error: { message: "boom", code: "XX000" },
    };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({
      ok: false,
      code: "unknown",
      message: "boom",
    });
  });

  it("short-circuits to forbidden when there is no authenticated user", async () => {
    state.user = null;

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({ ok: false, code: "forbidden" });
    // Must NOT reach the RPC — defence-in-depth but also avoids a
    // pointless round-trip.
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("short-circuits to forbidden when the cookie user.id mismatches userId param", async () => {
    state.user = { id: "someone-else" };

    const res = await cloneTemplateForUser(TEMPLATE_ID, USER_ID);

    expect(res).toEqual({ ok: false, code: "forbidden" });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
