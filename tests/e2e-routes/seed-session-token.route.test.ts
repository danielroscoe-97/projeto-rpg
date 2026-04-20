/**
 * @jest-environment node
 */
// Uses jest globals (describe, it, expect, beforeEach, jest) — no import needed.
/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the supabase server client module BEFORE importing the route.
// The route imports `createServiceClient` for its inserts.
const svcState: {
  sessionResult: { data: { id: string } | null; error: null | { message: string } };
  insertResult: {
    data: { id: string; token: string } | null;
    error: null | { message: string };
  };
} = {
  sessionResult: { data: { id: "sess-1" }, error: null },
  insertResult: {
    data: { id: "st-1", token: "tok-abcdef" },
    error: null,
  },
};

function makeSelectChain(data: { id: string } | null, error: { message: string } | null) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve({ data, error })),
  };
  return chain;
}

function makeInsertChain(
  data: { id: string; token: string } | null,
  error: { message: string } | null,
) {
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve({ data, error })),
  };
  return chain;
}

jest.mock("@/lib/supabase/server", () => {
  return {
    createServiceClient: () => ({
      from: jest.fn((table: string) => {
        if (table === "sessions") {
          return makeSelectChain(svcState.sessionResult.data, svcState.sessionResult.error);
        }
        if (table === "session_tokens") {
          return makeInsertChain(svcState.insertResult.data, svcState.insertResult.error);
        }
        throw new Error(`unexpected table ${table}`);
      }),
    }),
  };
});

// Now import the route. Must come AFTER jest.mock().
import { POST } from "@/app/api/e2e/seed-session-token/route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/e2e/seed-session-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/e2e/seed-session-token", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_E2E_MODE;

  beforeEach(() => {
    svcState.sessionResult = { data: { id: "sess-1" }, error: null };
    svcState.insertResult = { data: { id: "st-1", token: "tok-abcdef" }, error: null };
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_E2E_MODE;
    else process.env.NEXT_PUBLIC_E2E_MODE = ORIGINAL;
  });

  it("returns 404 with empty body when NEXT_PUBLIC_E2E_MODE is not 'true'", async () => {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    const res = await POST(makeReq({ campaignId: "camp-1" }) as any);
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toBe("");
  });

  it("returns 404 when flag is 'false' (anti-truthy)", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "false";
    const res = await POST(makeReq({ campaignId: "camp-1" }) as any);
    expect(res.status).toBe(404);
  });

  it("returns 404 when flag is '1' (must be exactly 'true')", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "1";
    const res = await POST(makeReq({ campaignId: "camp-1" }) as any);
    expect(res.status).toBe(404);
  });

  it("returns 200 with token when flag is 'true' and campaign has active session", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    const res = await POST(makeReq({ campaignId: "camp-1", playerName: "Aragorn" }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBe("tok-abcdef");
    expect(body.sessionTokenId).toBe("st-1");
    expect(body.sessionId).toBe("sess-1");
  });

  it("returns 400 when campaignId is missing", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    const res = await POST(makeReq({}) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 when no active session exists for the campaign", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    svcState.sessionResult = { data: null, error: null };
    const res = await POST(makeReq({ campaignId: "camp-1" }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("no_active_session");
  });
});
