/**
 * Epic 04 Story 04-F — roleFlipAndCreateCampaign server action tests.
 *
 * Covers (14):
 *   1. Unauthenticated → { ok: false, code: 'unauthenticated' }
 *   2. role='dm' → { ok: false, code: 'already_dm' } (defense-in-depth)
 *   3. Invalid blank campaign name (empty) → rejected
 *   4. Invalid blank party level (out of range) → rejected
 *   5. Happy template path → role flipped, clone called, analytics emitted
 *   6. Happy blank path → role flipped, RPC called, analytics emitted
 *   7. Clone fails (not_found) → role rolled back to prev, code mapped
 *   8. Clone fails (missing_monsters) → rollback + missingMonsters forwarded
 *   9. Clone fails AND rollback fails → clone_failed_no_rollback
 *  10. Blank RPC fails → rollback + clone_failed
 *  11. Role flip fails → returns role_flip_failed, no clone, no analytics
 *  12. prevRole='both' path → flip is no-op but privacy update still runs
 *  13. share_past_companions persists on both role-flip paths
 *  14. Analytics not emitted on failure
 */

type RpcResult = {
  data?: unknown;
  error?: { message: string; code?: string } | null;
};

type UpdateCall = {
  table: string;
  values: Record<string, unknown>;
  eq: { column: string; value: unknown };
};

const state: {
  user: { id: string } | null;
  userRoleRow: { role: string } | null;
  userRoleErr: { message: string } | null;
  flipError: { message: string } | null;
  rollbackError: { message: string } | null;
  rpcResult: RpcResult;
  updateCalls: UpdateCall[];
} = {
  user: { id: "user-abc" },
  userRoleRow: { role: "player" },
  userRoleErr: null,
  flipError: null,
  rollbackError: null,
  rpcResult: { data: null, error: null },
  updateCalls: [],
};

const cloneMock = jest.fn();
jest.mock("@/lib/upsell/clone-template", () => ({
  cloneTemplateForUser: (...args: unknown[]) => cloneMock(...args),
}));

const trackServerEventMock = jest.fn();
jest.mock("@/lib/analytics/track-server", () => ({
  trackServerEvent: (...args: unknown[]) => trackServerEventMock(...args),
}));

function buildSupabaseMock() {
  const rpcMock = jest.fn(async () => state.rpcResult);
  return {
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.userRoleRow,
            error: state.userRoleErr,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: unknown) => {
          state.updateCalls.push({ table, values, eq: { column, value } });
          // First update call = role flip; subsequent = rollback.
          const isRollback = state.updateCalls.length > 1;
          return Promise.resolve({
            error: isRollback ? state.rollbackError : state.flipError,
          });
        },
      }),
    }),
    rpc: rpcMock,
  };
}

let supabaseMockInstance = buildSupabaseMock();

jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => supabaseMockInstance,
}));

import { roleFlipAndCreateCampaign } from "@/lib/upsell/role-flip-and-create";

const USER_ID = "user-abc";
const TEMPLATE_ID = "04f-tmpl-1";

beforeEach(() => {
  state.user = { id: USER_ID };
  state.userRoleRow = { role: "player" };
  state.userRoleErr = null;
  state.flipError = null;
  state.rollbackError = null;
  state.rpcResult = { data: null, error: null };
  state.updateCalls = [];
  supabaseMockInstance = buildSupabaseMock();
  cloneMock.mockReset();
  trackServerEventMock.mockReset();
});

describe("roleFlipAndCreateCampaign — guards", () => {
  it("fails with unauthenticated when there is no auth user", async () => {
    state.user = null;
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("unauthenticated");
    expect(cloneMock).not.toHaveBeenCalled();
  });

  it("fails with already_dm when prevRole is 'dm'", async () => {
    state.userRoleRow = { role: "dm" };
    const res = await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "My Table",
      partyLevel: 3,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("already_dm");
    expect(state.updateCalls).toHaveLength(0);
  });

  it("rejects empty campaign name on blank path", async () => {
    const res = await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "   ",
      partyLevel: 1,
      sharePastCompanions: false,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("unknown");
  });

  it("rejects out-of-range party level on blank path", async () => {
    const res = await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "My Table",
      partyLevel: 99,
      sharePastCompanions: false,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("unknown");
  });
});

describe("roleFlipAndCreateCampaign — happy paths", () => {
  it("template mode: flips role, calls clone, emits analytics", async () => {
    cloneMock.mockResolvedValue({
      ok: true,
      campaignId: "camp-1",
      joinCode: "ABCD1234",
      sessionId: "sess-1",
    });
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(true);
    expect((res as { campaignId: string }).campaignId).toBe("camp-1");
    expect((res as { prevRole: string }).prevRole).toBe("player");
    expect((res as { newRole: string }).newRole).toBe("both");
    expect(cloneMock).toHaveBeenCalledWith(TEMPLATE_ID, USER_ID);
    // One role-flip update, no rollback.
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0].values).toMatchObject({
      role: "both",
      share_past_companions: true,
    });
    // Both analytics events fired.
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "dm_upsell:role_upgraded_to_dm",
      expect.objectContaining({
        userId: USER_ID,
        properties: expect.objectContaining({ from: "player", to: "both" }),
      }),
    );
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "dm_upsell:first_campaign_created",
      expect.objectContaining({
        properties: expect.objectContaining({
          campaignId: "camp-1",
          mode: "template",
          templateId: TEMPLATE_ID,
        }),
      }),
    );
  });

  it("blank mode: flips role, calls RPC, emits analytics", async () => {
    state.rpcResult = {
      data: { campaign_id: "camp-2", join_code: "ZZZ" },
      error: null,
    };
    const res = await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "  Blank Campaign  ",
      partyLevel: 5,
      sharePastCompanions: false,
    });
    expect(res.ok).toBe(true);
    expect((res as { campaignId: string }).campaignId).toBe("camp-2");
    expect((res as { sessionId: string | null }).sessionId).toBeNull();
    expect(state.updateCalls[0].values).toMatchObject({
      role: "both",
      share_past_companions: false,
    });
    expect(cloneMock).not.toHaveBeenCalled();
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "dm_upsell:first_campaign_created",
      expect.objectContaining({
        properties: expect.objectContaining({
          campaignId: "camp-2",
          mode: "blank",
          templateId: null,
        }),
      }),
    );
  });

  it("prevRole='both': flip still runs (privacy update), analytics reflect no change", async () => {
    state.userRoleRow = { role: "both" };
    cloneMock.mockResolvedValue({
      ok: true,
      campaignId: "camp-3",
      joinCode: "JC",
      sessionId: "sess-3",
    });
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(true);
    expect((res as { prevRole: string }).prevRole).toBe("both");
    expect(trackServerEventMock).toHaveBeenCalledWith(
      "dm_upsell:role_upgraded_to_dm",
      expect.objectContaining({
        properties: expect.objectContaining({ from: "both", to: "both" }),
      }),
    );
  });
});

describe("roleFlipAndCreateCampaign — rollback + failure paths", () => {
  it("rolls back role on clone 'not_found' and maps to template_not_found", async () => {
    cloneMock.mockResolvedValue({ ok: false, code: "not_found" });
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("template_not_found");
    // Two updates: flip + rollback.
    expect(state.updateCalls).toHaveLength(2);
    expect(state.updateCalls[1].values).toEqual({ role: "player" });
    expect(trackServerEventMock).not.toHaveBeenCalled();
  });

  it("rolls back role on clone 'missing_monsters' and forwards the list", async () => {
    const missing = [
      { encounter_id: "enc-1", missing_slugs: ["beholder"] },
    ];
    cloneMock.mockResolvedValue({
      ok: false,
      code: "missing_monsters",
      missingMonsters: missing,
    });
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("missing_monsters");
    expect(
      (res as { missingMonsters: typeof missing }).missingMonsters,
    ).toEqual(missing);
    expect(state.updateCalls).toHaveLength(2);
  });

  it("returns clone_failed_no_rollback when both clone AND rollback fail", async () => {
    cloneMock.mockResolvedValue({ ok: false, code: "unknown", message: "boom" });
    state.rollbackError = { message: "rollback oops" };
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("clone_failed_no_rollback");
  });

  it("rolls back role when blank RPC fails", async () => {
    state.rpcResult = { data: null, error: { message: "db down" } };
    const res = await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "Test",
      partyLevel: 2,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("clone_failed");
    expect(state.updateCalls).toHaveLength(2);
    expect(state.updateCalls[1].values).toEqual({ role: "player" });
  });

  it("fails with role_flip_failed when the initial update errors", async () => {
    state.flipError = { message: "rls denied" };
    const res = await roleFlipAndCreateCampaign({
      mode: "template",
      templateId: TEMPLATE_ID,
      sharePastCompanions: true,
    });
    expect(res.ok).toBe(false);
    expect((res as { code: string }).code).toBe("role_flip_failed");
    expect(cloneMock).not.toHaveBeenCalled();
    expect(trackServerEventMock).not.toHaveBeenCalled();
  });

  it("does not emit analytics on any failure path", async () => {
    state.flipError = { message: "denied" };
    await roleFlipAndCreateCampaign({
      mode: "blank",
      campaignName: "X",
      partyLevel: 1,
      sharePastCompanions: false,
    });
    expect(trackServerEventMock).not.toHaveBeenCalled();
  });
});
