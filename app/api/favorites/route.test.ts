/**
 * S5.2 — API route tests for /api/favorites.
 *
 * Framework: Jest (jsdom). Mocks Supabase server client + rate limiter.
 * We exercise the raw inner handlers via the `withRateLimit` wrapper.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---- Mock the Supabase server client --------------------------------------

type MockQuery = {
  select: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  insert: jest.Mock;
  single: jest.Mock;
  delete: jest.Mock;
};

const supabaseState: {
  user: { id: string; is_anonymous?: boolean } | null;
  countResult: { count: number; error: null | { message: string } };
  listResult: { data: unknown[]; error: null | { message: string } };
  insertResult: { data: unknown; error: null | { code?: string; message: string } };
  deleteResult: { error: null | { message: string } };
} = {
  user: { id: "user-1", is_anonymous: false },
  countResult: { count: 0, error: null },
  listResult: { data: [], error: null },
  insertResult: { data: { slug: "goblin", kind: "monster", favorited_at: "2026-04-17T00:00:00Z" }, error: null },
  deleteResult: { error: null },
};

function buildQueryChain(): MockQuery {
  let op: "select" | "insert" | "delete" = "select";
  let isCount = false;
  const chain: MockQuery = {
    select: jest.fn((_: string, opts?: { count?: string; head?: boolean }) => {
      isCount = opts?.count === "exact";
      return chain;
    }),
    eq: jest.fn(() => chain),
    order: jest.fn(() => Promise.resolve(supabaseState.listResult)),
    insert: jest.fn(() => {
      op = "insert";
      return chain;
    }),
    delete: jest.fn(() => {
      op = "delete";
      return Promise.resolve(supabaseState.deleteResult);
    }),
    single: jest.fn(() => Promise.resolve({ data: supabaseState.insertResult.data, error: supabaseState.insertResult.error })),
  };
  // `select` after insert → return single() path
  // For count, `.select(..., {count, head})` then `.eq(...).eq(...)` resolves to list (thenable by count)
  // Our GET path does: from("user_favorites").select(...).eq(...).order(...)
  // Our COUNT path does: from("user_favorites").select("id", {count, head:true}).eq(...).eq(...)
  // Make the second `.eq()` in count resolve to a thenable
  const originalEq = chain.eq;
  chain.eq = jest.fn((field: string, val: unknown) => {
    originalEq(field, val);
    if (isCount) {
      return {
        eq: (f: string, v: unknown) => {
          originalEq(f, v);
          return Promise.resolve(supabaseState.countResult);
        },
        then: (fn: (v: unknown) => void) => fn(supabaseState.countResult),
      } as any;
    }
    if (op === "delete") {
      return {
        eq: (f: string, v: unknown) => {
          originalEq(f, v);
          return {
            eq: (f2: string, v2: unknown) => {
              originalEq(f2, v2);
              return Promise.resolve(supabaseState.deleteResult);
            },
          };
        },
      } as any;
    }
    return chain;
  });
  return chain;
}

let lastClient: any;

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => {
    const chain = buildQueryChain();
    lastClient = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: supabaseState.user } })),
      },
      from: jest.fn(() => chain),
    };
    return lastClient;
  }),
}));

// ---- Rate limit wrapper: bypass in tests --------------------------------
// The real withRateLimit uses Upstash. Stub it to just run the handler
// EXCEPT for one specific test that validates 429 behavior (see below).
let rateLimitHits = 0;
const RATE_LIMIT_BUDGET = { current: Number.POSITIVE_INFINITY };

jest.mock("@/lib/rate-limit", () => ({
  withRateLimit: (handler: any) => {
    return async (request: any, ctx: any) => {
      rateLimitHits++;
      if (rateLimitHits > RATE_LIMIT_BUDGET.current) {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
      return handler(request, ctx);
    };
  },
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// ---- Helpers -------------------------------------------------------------
import { NextRequest } from "next/server";

function mkReq(method: "GET" | "POST" | "DELETE", url: string, body?: unknown): NextRequest {
  const init: any = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  return new NextRequest(`http://localhost${url}`, init);
}

beforeEach(() => {
  rateLimitHits = 0;
  RATE_LIMIT_BUDGET.current = Number.POSITIVE_INFINITY;
  supabaseState.user = { id: "user-1", is_anonymous: false };
  supabaseState.countResult = { count: 0, error: null };
  supabaseState.listResult = { data: [], error: null };
  supabaseState.insertResult = {
    data: { slug: "goblin", kind: "monster", favorited_at: "2026-04-17T00:00:00Z" },
    error: null,
  };
  supabaseState.deleteResult = { error: null };
  jest.resetModules();
});

// ---- Tests ---------------------------------------------------------------

describe("/api/favorites — auth gating", () => {
  it("rejects unauthenticated with 401", async () => {
    supabaseState.user = null;
    const { GET } = await import("@/app/api/favorites/route");
    const res = await GET(mkReq("GET", "/api/favorites"), { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("rejects anonymous (is_anonymous=true) with 401", async () => {
    supabaseState.user = { id: "anon-1", is_anonymous: true };
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: "goblin" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });
});

describe("/api/favorites POST — validation + happy path", () => {
  it("rejects invalid kind with 400", async () => {
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "weapon", slug: "sword" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid slug with 400", async () => {
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: "" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 201 with the inserted favorite on success", async () => {
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: "goblin" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { favorite: { slug: string; kind: string } };
    expect(json.favorite.slug).toBe("goblin");
    expect(json.favorite.kind).toBe("monster");
  });

  it("returns 409 when limit reached", async () => {
    supabaseState.countResult = { count: 50, error: null };
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: "goblin" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("limit_reached");
  });

  it("returns 409 when unique violation (duplicate)", async () => {
    supabaseState.insertResult = {
      data: null,
      error: { code: "23505", message: "duplicate" },
    };
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: "goblin" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("already_favorite");
  });
});

describe("/api/favorites DELETE", () => {
  it("returns 204 on success", async () => {
    const { DELETE } = await import("@/app/api/favorites/route");
    const res = await DELETE(mkReq("DELETE", "/api/favorites", { kind: "monster", slug: "goblin" }), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(204);
  });
});

describe("/api/favorites — rate limit simulation", () => {
  it("returns 429 once the stubbed budget is exhausted (simulates 31 calls/60s)", async () => {
    // Cap the wrapper to 30 calls — the 31st gets 429.
    RATE_LIMIT_BUDGET.current = 30;
    const { POST } = await import("@/app/api/favorites/route");

    let lastStatus = 0;
    for (let i = 0; i < 31; i++) {
      const res = await POST(mkReq("POST", "/api/favorites", { kind: "monster", slug: `m-${i}` }), {
        params: Promise.resolve({}),
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
