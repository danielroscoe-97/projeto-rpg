/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Route tests for /api/characters/claimable and /api/characters/mine —
 * Wave 2 code review fixes M1 (UUID validation) and M2 (rate limit).
 *
 * We stub the Supabase server client so the handler runs end-to-end in
 * jsdom-less node. The rate-limit wrapper is mocked so we can count
 * invocations AND simulate 429 when the budget is exhausted.
 */

// ---- Supabase server mock -----------------------------------------------

type User = { id: string; is_anonymous?: boolean };

const supabaseState: {
  user: User | null;
  mineCount: { count: number; error: { message: string } | null };
  mineList: { data: unknown[]; error: { message: string } | null };
} = {
  user: { id: "user-1", is_anonymous: false },
  mineCount: { count: 0, error: null },
  mineList: { data: [], error: null },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: supabaseState.user },
        error: null,
      })),
    },
    from: jest.fn((_table: string) => {
      const chain: any = {
        select: jest.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === "exact") {
            // COUNT path: .select("id", {count, head}).eq(...).is(...)
            return {
              eq: jest.fn(() => ({
                is: jest.fn(() =>
                  Promise.resolve({
                    count: supabaseState.mineCount.count,
                    error: supabaseState.mineCount.error,
                  }),
                ),
              })),
            };
          }
          // SELECT rows path
          return {
            eq: jest.fn(() => ({
              is: jest.fn(() => ({
                order: jest.fn(() => ({
                  range: jest.fn(() =>
                    Promise.resolve({
                      data: supabaseState.mineList.data,
                      error: supabaseState.mineList.error,
                    }),
                  ),
                })),
              })),
            })),
          };
        }),
      };
      return chain;
    }),
  })),
}));

// ---- listClaimableCharacters mock ---------------------------------------

const listClaimableMock = jest.fn(async () => ({
  characters: [{ id: "c1", name: "Thorin" }],
  total: 1,
  hasMore: false,
}));

jest.mock("@/lib/supabase/character-claim", () => ({
  listClaimableCharacters: (...args: unknown[]) => listClaimableMock(...args as []),
}));

// ---- Rate limit wrapper: bypass but count, allow forcing 429 ------------

const rateLimitState = { hits: 0, budget: Number.POSITIVE_INFINITY };

jest.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: any) => {
    return async (request: any, ctx: any) => {
      rateLimitState.hits++;
      if (rateLimitState.hits > rateLimitState.budget) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 },
        );
      }
      return handler(request, ctx);
    };
  },
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// ---- Helpers ------------------------------------------------------------

import { NextRequest } from "next/server";

function mkReq(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: "GET" });
}

const VALID_UUID = "11111111-2222-4333-8444-555555555555";

beforeEach(() => {
  rateLimitState.hits = 0;
  rateLimitState.budget = Number.POSITIVE_INFINITY;
  supabaseState.user = { id: "user-1", is_anonymous: false };
  supabaseState.mineCount = { count: 0, error: null };
  supabaseState.mineList = { data: [], error: null };
  listClaimableMock.mockClear();
  jest.resetModules();
});

// ---- /api/characters/claimable ------------------------------------------

describe("GET /api/characters/claimable — M1 UUID validation", () => {
  it("returns 400 invalid_uuid when campaignId is not a UUID", async () => {
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(mkReq(`/api/characters/claimable?campaignId=not-a-uuid`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_uuid");
  });

  it("returns 400 invalid_uuid when campaignId is numeric", async () => {
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(mkReq(`/api/characters/claimable?campaignId=12345`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_uuid");
  });

  it("returns 400 when campaignId is missing (pre-existing behavior)", async () => {
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(mkReq(`/api/characters/claimable`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing campaignId");
  });

  it("accepts a valid UUID and proxies to listClaimableCharacters", async () => {
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(
      mkReq(`/api/characters/claimable?campaignId=${VALID_UUID}`),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(200);
    expect(listClaimableMock).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.data.characters).toHaveLength(1);
  });
});

describe("GET /api/characters/claimable — auth gating", () => {
  it("returns 401 when no user", async () => {
    supabaseState.user = null;
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(
      mkReq(`/api/characters/claimable?campaignId=${VALID_UUID}`),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/characters/claimable — M2 rate limit", () => {
  it("wraps handler with withRateLimit (increments hits)", async () => {
    const { GET } = await import("@/app/api/characters/claimable/route");
    await GET(mkReq(`/api/characters/claimable?campaignId=${VALID_UUID}`), {
      params: Promise.resolve({}),
    });
    expect(rateLimitState.hits).toBe(1);
  });

  it("returns 429 when rate limit budget is exhausted", async () => {
    rateLimitState.budget = 0;
    const { GET } = await import("@/app/api/characters/claimable/route");
    const res = await GET(
      mkReq(`/api/characters/claimable?campaignId=${VALID_UUID}`),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(429);
  });
});

// ---- /api/characters/mine -----------------------------------------------

describe("GET /api/characters/mine — auth gating", () => {
  it("returns 401 when no user", async () => {
    supabaseState.user = null;
    const { GET } = await import("@/app/api/characters/mine/route");
    const res = await GET(mkReq(`/api/characters/mine`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is anonymous", async () => {
    supabaseState.user = { id: "anon-1", is_anonymous: true };
    const { GET } = await import("@/app/api/characters/mine/route");
    const res = await GET(mkReq(`/api/characters/mine`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(403);
  });

  it("returns empty list when user has no characters", async () => {
    supabaseState.mineCount = { count: 0, error: null };
    const { GET } = await import("@/app/api/characters/mine/route");
    const res = await GET(mkReq(`/api/characters/mine`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.characters).toEqual([]);
    expect(body.data.total).toBe(0);
  });
});

describe("GET /api/characters/mine — M2 rate limit", () => {
  it("wraps handler with withRateLimit (increments hits)", async () => {
    const { GET } = await import("@/app/api/characters/mine/route");
    await GET(mkReq(`/api/characters/mine`), {
      params: Promise.resolve({}),
    });
    expect(rateLimitState.hits).toBe(1);
  });

  it("returns 429 when rate limit budget is exhausted", async () => {
    rateLimitState.budget = 0;
    const { GET } = await import("@/app/api/characters/mine/route");
    const res = await GET(mkReq(`/api/characters/mine`), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(429);
  });
});
