/**
 * @jest-environment node
 *
 * Epic 04 Story 04-D — integration-style tests for
 * `app/api/campaign/[id]/invites/bulk/route.ts`.
 *
 * Post-Sprint-1-adversarial-review coverage:
 *   - 401 unauthenticated
 *   - 403 non-owner
 *   - 400 bad body / length cap (H2)
 *   - 403 — inviteeIds not in past companions (C1 — email oracle fix)
 *   - 429 rate-limited (COUNT-based, not RPC — C3)
 *   - 200 happy path — creates invites, sends emails (C2), emits analytics
 *   - F20 — service-role email resolution
 *   - M1 — email validation drops malformed rows
 *   - H1 — skip_duplicate for emails with pending invites
 *   - budget truncation — partial send + skipped_budget tail
 *   - email failure path — row created but Resend returns false
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mutable test state (reset in beforeEach) ─────────────────────────
const state: {
  user: { id: string } | null;
  campaignOwnerId: string | null;
  pastCompanions: { companion_user_id: string }[];
  pastCompanionsError: { message: string } | null;
  inviteCountToday: number;
  inviteCountError: { message: string } | null;
  serviceUsers: { id: string; email: string | null }[];
  existingPendingEmails: string[];
  insertErrorsFor: Set<string>; // emails that will error on insert
  emailSendFor: Map<string, boolean>; // email → sendCampaignInviteEmail return
  insertedRows: any[];
  dmDisplayName: string | null;
} = {
  user: null,
  campaignOwnerId: null,
  pastCompanions: [],
  pastCompanionsError: null,
  inviteCountToday: 0,
  inviteCountError: null,
  serviceUsers: [],
  existingPendingEmails: [],
  insertErrorsFor: new Set(),
  emailSendFor: new Map(),
  insertedRows: [],
  dmDisplayName: "DM One",
};

function makeServerClient() {
  return {
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: state.user },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === "campaigns") {
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          maybeSingle: jest.fn(async () => ({
            data: state.campaignOwnerId
              ? { id: "cam-1", name: "Taverna em Chamas" }
              : null,
            error: null,
          })),
        };
        return chain;
      }
      if (table === "campaign_invites") {
        // Three patterns used by the route, distinguished by call order:
        //   1. SELECT id, count:exact, head:true ... eq invited_by ... gte created_at
        //   2. SELECT email ... eq campaign_id + status=pending + in(email, ...)
        //   3. INSERT + SELECT id (single row per invite)
        let currentOp: "count" | "dedupe" | "insert" | null = null;
        let lastInsertPayload: any = null;

        const chain: any = {
          select: jest.fn((cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === "exact" && opts?.head) {
              currentOp = "count";
            } else if (cols === "email") {
              currentOp = "dedupe";
            } else if (cols === "id") {
              currentOp = "insert";
            }
            return chain;
          }),
          eq: jest.fn(() => chain),
          gte: jest.fn(() => chain),
          in: jest.fn(async (_col: string, values: string[]) => {
            if (currentOp === "dedupe") {
              return {
                data: state.existingPendingEmails
                  .filter((e) => values.includes(e))
                  .map((email) => ({ email })),
                error: null,
              };
            }
            return { data: null, error: null };
          }),
          insert: jest.fn((row: any) => {
            lastInsertPayload = row;
            state.insertedRows.push(row);
            return chain;
          }),
          single: jest.fn(async () => {
            if (currentOp === "insert" && lastInsertPayload) {
              if (state.insertErrorsFor.has(lastInsertPayload.email)) {
                return {
                  data: null,
                  error: { message: "insert failed" },
                };
              }
              return { data: { id: "new-invite-id" }, error: null };
            }
            return { data: null, error: null };
          }),
          // count head:true terminates here — supabase-js resolves the promise
          // without `.single()`. We simulate via a then() side-hook.
          then: jest.fn((resolve: any) => {
            if (currentOp === "count") {
              resolve({
                count: state.inviteCountToday,
                error: state.inviteCountError,
              });
            }
            return Promise.resolve();
          }),
        };
        return chain;
      }
      if (table === "users") {
        // display_name lookup for the DM email body
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          maybeSingle: jest.fn(async () => ({
            data: state.dmDisplayName
              ? { display_name: state.dmDisplayName }
              : null,
            error: null,
          })),
        };
        return chain;
      }
      throw new Error(`[server mock] unexpected table: ${table}`);
    }),
    rpc: jest.fn(async (name: string) => {
      if (name === "get_past_companions") {
        return {
          data: state.pastCompanions,
          error: state.pastCompanionsError,
        };
      }
      throw new Error(`[server mock] unexpected rpc: ${name}`);
    }),
  };
}

function makeServiceClient() {
  return {
    from: jest.fn((table: string) => {
      if (table === "users") {
        const chain: any = {
          select: jest.fn(() => chain),
          in: jest.fn(async () => ({
            data: state.serviceUsers,
            error: null,
          })),
        };
        return chain;
      }
      throw new Error(`[service mock] unexpected table: ${table}`);
    }),
  };
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => makeServerClient()),
  createServiceClient: jest.fn(() => makeServiceClient()),
}));

const trackMock = jest.fn();
jest.mock("@/lib/analytics/track-server", () => ({
  trackServerEvent: (...args: unknown[]) => trackMock(...args),
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
  captureWarning: jest.fn(),
}));

const sendEmailMock = jest.fn(async (payload: { email: string }) => {
  const result = state.emailSendFor.get(payload.email);
  return result === undefined ? true : result;
});
jest.mock("@/lib/notifications/campaign-invite", () => ({
  sendCampaignInviteEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

import { POST } from "@/app/api/campaign/[id]/invites/bulk/route";

function makeReq(body: unknown): any {
  return new Request("http://localhost/api/campaign/cam-1/invites/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CAMPAIGN_ID = "cam-1";
function makeParams() {
  return { params: Promise.resolve({ id: CAMPAIGN_ID }) };
}

describe("POST /api/campaign/[id]/invites/bulk — Epic 04 Story 04-D (post-review)", () => {
  beforeEach(() => {
    state.user = { id: "dm-1" };
    state.campaignOwnerId = "dm-1";
    state.pastCompanions = [
      { companion_user_id: "u-1" },
      { companion_user_id: "u-2" },
      { companion_user_id: "u-3" },
      { companion_user_id: "u-4" },
      { companion_user_id: "u-5" },
    ];
    state.pastCompanionsError = null;
    state.inviteCountToday = 0;
    state.inviteCountError = null;
    state.serviceUsers = [];
    state.existingPendingEmails = [];
    state.insertErrorsFor = new Set();
    state.emailSendFor = new Map();
    state.insertedRows = [];
    state.dmDisplayName = "DM One";
    trackMock.mockReset();
    sendEmailMock.mockClear();
  });

  it("401 when unauthenticated", async () => {
    state.user = null;
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(401);
  });

  it("403 when the caller does not own the campaign", async () => {
    state.campaignOwnerId = null;
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(403);
  });

  it("400 when body missing / empty / invalid json", async () => {
    expect((await POST(makeReq({}), makeParams())).status).toBe(400);
    expect(
      (await POST(makeReq({ invitee_user_ids: [] }), makeParams())).status,
    ).toBe(400);
    expect(
      (
        await POST(
          makeReq({ invitee_user_ids: [null, 42, ""] }),
          makeParams(),
        )
      ).status,
    ).toBe(400);
  });

  it("400 when batch exceeds MAX_BULK_INVITE_SIZE (H2)", async () => {
    const huge = Array.from({ length: 51 }, (_, i) => `u-${i}`);
    // All must be past companions so we actually hit the cap check
    state.pastCompanions = huge.map((id) => ({ companion_user_id: id }));
    const res = await POST(
      makeReq({ invitee_user_ids: huge }),
      makeParams(),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/exceeds/i);
  });

  it("403 when any invitee_user_id is NOT a past companion (C1 — email oracle fix)", async () => {
    state.pastCompanions = [{ companion_user_id: "u-1" }];
    state.serviceUsers = [
      { id: "u-1", email: "a@x.com" },
      { id: "stranger", email: "s@x.com" },
    ];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "stranger"] }),
      makeParams(),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not past companions/i);
    // Nothing inserted, no emails sent
    expect(state.insertedRows).toHaveLength(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("429 with rate_limited=true when 20 invites already sent today (C3)", async () => {
    state.inviteCountToday = 20;
    state.serviceUsers = [{ id: "u-1", email: "a@x.com" }];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.rate_limited).toBe(true);
    expect(body.skipped_budget).toContain("u-1");
    expect(state.insertedRows).toEqual([]);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("resolves emails, dedupes existing pending, sends mail, returns 200 (C2)", async () => {
    state.serviceUsers = [
      { id: "u-1", email: "ana@example.com" },
      { id: "u-2", email: null }, // skipped_no_email
      { id: "u-3", email: "carla@example.com" },
    ];
    state.existingPendingEmails = []; // no duplicates

    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2", "u-3"] }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rate_limited).toBe(false);
    expect(body.sent.sort()).toEqual(["u-1", "u-3"]);
    expect(body.skipped_no_email).toEqual(["u-2"]);
    expect(body.skipped_duplicate).toEqual([]);
    expect(body.skipped_budget).toEqual([]);
    expect(body.email_failed).toEqual([]);

    // 2 invite rows inserted, 2 emails sent (C2)
    expect(state.insertedRows).toHaveLength(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    // Analytics fires with full breakdown
    expect(trackMock).toHaveBeenCalledWith(
      "dm_upsell:invite_past_companions_sent",
      expect.objectContaining({
        userId: "dm-1",
        properties: expect.objectContaining({
          campaignId: CAMPAIGN_ID,
          companionCount: 2,
          sentCount: 2,
          skippedNoEmailCount: 1,
        }),
      }),
    );
  });

  it("H1 — skip_duplicate for emails already on a pending invite", async () => {
    state.serviceUsers = [
      { id: "u-1", email: "ana@example.com" }, // already pending
      { id: "u-2", email: "bia@example.com" },
    ];
    state.existingPendingEmails = ["ana@example.com"];

    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2"] }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-2"]);
    expect(body.skipped_duplicate).toEqual(["u-1"]);
    expect(state.insertedRows).toHaveLength(1);
    expect(state.insertedRows[0].email).toBe("bia@example.com");
  });

  it("M1 — drops malformed emails into skipped_no_email and lowercases valid ones", async () => {
    state.serviceUsers = [
      { id: "u-1", email: "   ANA@EXAMPLE.COM   " }, // needs trim + lowercase
      { id: "u-2", email: "not-an-email" }, // malformed
      { id: "u-3", email: " " }, // whitespace only
    ];

    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2", "u-3"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-1"]);
    expect(body.skipped_no_email.sort()).toEqual(["u-2", "u-3"]);
    expect(state.insertedRows[0].email).toBe("ana@example.com");
  });

  it("truncates to remaining budget and reports skipped_budget (C3 partial)", async () => {
    // 18 already sent today; remaining = 2
    state.inviteCountToday = 18;
    state.serviceUsers = [
      { id: "u-1", email: "a@x.com" },
      { id: "u-2", email: "b@x.com" },
      { id: "u-3", email: "c@x.com" },
      { id: "u-4", email: "d@x.com" },
    ];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2", "u-3", "u-4"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toHaveLength(2);
    expect(body.skipped_budget).toHaveLength(2);
    expect(body.rate_limited).toBe(false);
    expect(state.insertedRows).toHaveLength(2);
  });

  it("email_failed when Resend returns false but invite row was created", async () => {
    state.serviceUsers = [
      { id: "u-1", email: "a@x.com" },
      { id: "u-2", email: "b@x.com" },
    ];
    state.emailSendFor.set("a@x.com", false); // Resend fails for this one

    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-2"]);
    expect(body.email_failed).toEqual(["u-1"]);
    expect(state.insertedRows).toHaveLength(2);
  });

  it("users missing from the service lookup are skipped_no_email (hard-delete race)", async () => {
    // u-1 is a companion but was hard-deleted between past_companions and here
    state.serviceUsers = [{ id: "u-2", email: "b@x.com" }];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-2"]);
    expect(body.skipped_no_email).toEqual(["u-1"]);
  });

  it("dedupes duplicate invitee_user_ids in the input before processing", async () => {
    state.serviceUsers = [{ id: "u-1", email: "a@x.com" }];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-1", "u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-1"]);
    expect(state.insertedRows).toHaveLength(1);
  });
});
