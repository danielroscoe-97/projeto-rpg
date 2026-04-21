/**
 * @jest-environment node
 *
 * Epic 04 Story 04-D — integration-style tests for
 * `app/api/campaign/[id]/invites/bulk/route.ts`.
 *
 * Covers:
 *   - 401 unauthenticated
 *   - 403 non-owner
 *   - 429 rate-limited (check_rate_limit returns false)
 *   - 200 happy path — creates one invite per resolved companion, skips
 *     users with no email, emits the analytics event.
 *   - F20: email resolution uses service-role client (auth.users.email RLS)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Mutable test state (reset in beforeEach) ─────────────────────────
const state: {
  user: { id: string } | null;
  campaignOwnerId: string | null; // null → campaign not found for this owner
  rateLimitAllowed: boolean;
  serviceUsers: { id: string; email: string | null }[];
  insertedRows: any[];
  insertError: { message: string } | null;
} = {
  user: null,
  campaignOwnerId: null,
  rateLimitAllowed: true,
  serviceUsers: [],
  insertedRows: [],
  insertError: null,
};

// ── Mocks (declared before the route import) ─────────────────────────

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
        // SELECT id FROM campaigns WHERE id = ? AND owner_id = ? LIMIT 1
        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn(() => chain),
          maybeSingle: jest.fn(async () => ({
            data: state.campaignOwnerId ? { id: "cam-1" } : null,
            error: null,
          })),
        };
        return chain;
      }
      if (table === "campaign_invites") {
        // INSERT ... SELECT email
        const chain: any = {
          insert: jest.fn((rows: any[]) => {
            state.insertedRows = rows;
            return chain;
          }),
          select: jest.fn(async () => {
            if (state.insertError) {
              return { data: null, error: state.insertError };
            }
            return {
              data: state.insertedRows.map((r) => ({ email: r.email })),
              error: null,
            };
          }),
        };
        return chain;
      }
      throw new Error(`[server mock] unexpected table: ${table}`);
    }),
    rpc: jest.fn(async (name: string) => {
      if (name === "check_rate_limit") {
        return { data: state.rateLimitAllowed, error: null };
      }
      throw new Error(`[server mock] unexpected rpc: ${name}`);
    }),
  };
}

function makeServiceClient() {
  return {
    from: jest.fn((table: string) => {
      if (table === "users") {
        // SELECT id, email FROM users WHERE id = ANY(ids)
        const chain: any = {
          select: jest.fn(() => chain),
          in: jest.fn(async (_col: string, _ids: string[]) => ({
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

describe("POST /api/campaign/[id]/invites/bulk — Epic 04 Story 04-D", () => {
  beforeEach(() => {
    state.user = { id: "dm-1" };
    state.campaignOwnerId = "dm-1"; // DM owns the campaign
    state.rateLimitAllowed = true;
    state.serviceUsers = [];
    state.insertedRows = [];
    state.insertError = null;
    trackMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    state.user = null;
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when the caller does not own the campaign", async () => {
    state.campaignOwnerId = null; // maybeSingle returns null → forbidden
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 400 when invitee_user_ids is missing or empty", async () => {
    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(400);

    const res2 = await POST(
      makeReq({ invitee_user_ids: [] }),
      makeParams(),
    );
    expect(res2.status).toBe(400);
  });

  it("returns 429 with rate_limited: true when the RPC blocks the caller", async () => {
    state.rateLimitAllowed = false;
    state.serviceUsers = [{ id: "u-1", email: "a@example.com" }];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1"] }),
      makeParams(),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({
      sent: [],
      skipped_no_email: [],
      rate_limited: true,
    });
    // No invites inserted, no analytics fired when rate-limited.
    expect(state.insertedRows).toEqual([]);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("resolves user_id → email, creates invites, and classifies no-email users as skipped", async () => {
    state.serviceUsers = [
      { id: "u-1", email: "ana@example.com" },
      { id: "u-2", email: null }, // F20: no email → skipped
      { id: "u-3", email: "carla@example.com" },
    ];

    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2", "u-3"] }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rate_limited).toBe(false);
    expect(body.sent.sort()).toEqual(["u-1", "u-3"]);
    expect(body.skipped_no_email).toEqual(["u-2"]);

    // Two invite rows inserted (one per email). Verify shape.
    expect(state.insertedRows).toHaveLength(2);
    for (const row of state.insertedRows) {
      expect(row.campaign_id).toBe(CAMPAIGN_ID);
      expect(row.invited_by).toBe("dm-1");
      expect(typeof row.token).toBe("string");
      expect(row.token.length).toBeGreaterThan(0);
      expect(typeof row.expires_at).toBe("string");
      // expires_at is ~7 days in the future
      const deltaMs =
        new Date(row.expires_at).getTime() - Date.now();
      expect(deltaMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
      expect(deltaMs).toBeLessThan(8 * 24 * 60 * 60 * 1000);
    }

    // Analytics emitted with the spec's payload.
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      "dm_upsell:invite_past_companions_sent",
      expect.objectContaining({
        userId: "dm-1",
        properties: expect.objectContaining({
          companionCount: 2,
          campaignId: CAMPAIGN_ID,
        }),
      }),
    );
  });

  it("treats users missing from the service lookup as skipped_no_email (hard-delete race)", async () => {
    // Caller asks about u-1 and u-2; service only returns u-1.
    state.serviceUsers = [{ id: "u-1", email: "ana@example.com" }];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual(["u-1"]);
    expect(body.skipped_no_email).toEqual(["u-2"]);
  });

  it("emits analytics event with companionCount=0 when every invitee lacks an email", async () => {
    state.serviceUsers = [
      { id: "u-1", email: null },
      { id: "u-2", email: "" },
    ];
    const res = await POST(
      makeReq({ invitee_user_ids: ["u-1", "u-2"] }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toEqual([]);
    expect(body.skipped_no_email.sort()).toEqual(["u-1", "u-2"]);
    expect(state.insertedRows).toEqual([]);
    expect(trackMock).toHaveBeenCalledWith(
      "dm_upsell:invite_past_companions_sent",
      expect.objectContaining({
        properties: expect.objectContaining({ companionCount: 0 }),
      }),
    );
  });
});
