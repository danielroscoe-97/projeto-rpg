/**
 * @jest-environment node
 *
 * F6 (Estabilidade Combate, Sprint 1) — integration tests for the resume
 * endpoint /api/combat/:encounterId/events.
 *
 * Coverage:
 *   - Auth: missing token → 401; invalid token (not in session_tokens) → 401
 *   - Encounter resolution: encounter_id miss → 404
 *   - Input validation: since_seq missing / negative / non-integer → 400
 *   - Happy paths: empty / events / too_stale responses pass through with
 *     correct status code
 *
 * Framework: Jest (node env). Mocks `createServiceClient` from
 * @/lib/supabase/server and `getEventsSince` from @/lib/realtime/event-journal
 * — the actual journal/Supabase queries are tested in their own suites
 * (event-journal.test.ts + Supabase migration smoke). This file isolates
 * the route's auth + parse + dispatch behavior.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextRequest } from "next/server";

// jsdom env doesn't polyfill Request, so we don't import NextRequest at
// runtime — the route only reads `req.url` and constructs a `new URL(...)`
// from it. A plain object with a `url` field is duck-typed correctly.
// (Switching to node env would require a separate test config — overkill
// for this surface.)

// ---- Mocks ---------------------------------------------------------------

type EncounterRow = { session_id: string };
type TokenRow = { id: string };

const supabaseState: {
  encounter: EncounterRow | null;
  tokenRow: TokenRow | null;
} = {
  encounter: null,
  tokenRow: null,
};

const journalState: {
  result:
    | { kind: "events"; events: unknown[]; currentSeq: number }
    | { kind: "too_stale"; currentSeq: number; oldestSeq: number; instruction: "refetch_full_state" }
    | { kind: "empty"; currentSeq: number };
} = {
  result: { kind: "empty", currentSeq: 0 },
};

function makeChain(table: string) {
  // Discriminate by table — encounters vs session_tokens
  const isEncounters = table === "encounters";
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(() =>
      Promise.resolve(
        isEncounters
          ? { data: supabaseState.encounter, error: supabaseState.encounter ? null : { message: "not found" } }
          : { data: supabaseState.tokenRow, error: supabaseState.tokenRow ? null : { message: "not found" } },
      ),
    ),
    maybeSingle: jest.fn(() =>
      Promise.resolve(
        isEncounters
          ? { data: supabaseState.encounter, error: null }
          : { data: supabaseState.tokenRow, error: null },
      ),
    ),
  };
  return chain;
}

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({
    from: jest.fn((table: string) => makeChain(table)),
  }),
}));

jest.mock("@/lib/realtime/event-journal", () => ({
  getEventsSince: jest.fn(async () => journalState.result),
}));

// Import AFTER mocks so the route picks up the mocked deps.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require("./route") as { GET: (req: NextRequest, ctx: { params: Promise<{ encounterId: string }> }) => Promise<Response> };

function buildReq(qs: string): NextRequest {
  return { url: `http://localhost/api/combat/enc-1/events${qs}` } as unknown as NextRequest;
}

// ---- Tests ---------------------------------------------------------------

beforeEach(() => {
  supabaseState.encounter = { session_id: "session-1" };
  supabaseState.tokenRow = { id: "token-row-1" };
  journalState.result = { kind: "empty", currentSeq: 0 };
});

describe("/api/combat/:encounterId/events — auth", () => {
  it("returns 401 when token query param is missing", async () => {
    const req = buildReq("?since_seq=0");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("missing_token");
  });

  it("returns 401 when token doesn't match an active session_tokens row for this session", async () => {
    supabaseState.tokenRow = null; // simulate no matching token
    const req = buildReq("?since_seq=0&token=bogus");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_token");
  });
});

describe("/api/combat/:encounterId/events — input validation", () => {
  it("returns 400 when since_seq is missing", async () => {
    const req = buildReq("?token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_since_seq");
  });

  it("returns 400 when since_seq is negative", async () => {
    const req = buildReq("?since_seq=-1&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when since_seq is not numeric", async () => {
    const req = buildReq("?since_seq=foo&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(400);
  });

  it("accepts since_seq=0 (player has never seen any event)", async () => {
    const req = buildReq("?since_seq=0&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(200);
  });
});

describe("/api/combat/:encounterId/events — encounter resolution", () => {
  it("returns 404 when encounter does not exist", async () => {
    supabaseState.encounter = null;
    const req = buildReq("?since_seq=0&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "missing" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("encounter_not_found");
  });
});

describe("/api/combat/:encounterId/events — journal dispatch", () => {
  it("passes through the empty result", async () => {
    journalState.result = { kind: "empty", currentSeq: 0 };
    const req = buildReq("?since_seq=0&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ kind: "empty", currentSeq: 0 });
  });

  it("passes through the events result", async () => {
    journalState.result = {
      kind: "events",
      events: [
        { seq: 5, sessionId: "session-1", timestamp: "2026-04-26T00:00:00Z", event: { type: "combat:hp_update" } },
      ],
      currentSeq: 5,
    };
    const req = buildReq("?since_seq=4&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("events");
    expect(body.events).toHaveLength(1);
    expect(body.currentSeq).toBe(5);
  });

  // P-18 fix (2026-04-26 review): the "data has rows but filter > sinceSeq
  // produces empty list" path is distinct from `kind: "empty"` (which only
  // fires when the session has zero rows). Caller is "caught up" — server
  // responds with kind:"events" and an empty array. Hook treats this
  // correctly (no onEvents call, cursor still advances to currentSeq if
  // forward). Worth covering so future changes to the dispatch logic
  // don't accidentally collapse the two cases.
  it("handles events shape with empty array (caller is caught up)", async () => {
    journalState.result = {
      kind: "events",
      events: [],
      currentSeq: 42,
    };
    const req = buildReq("?since_seq=42&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("events");
    expect(body.events).toEqual([]);
    expect(body.currentSeq).toBe(42);
  });

  it("passes through the too_stale result", async () => {
    journalState.result = {
      kind: "too_stale",
      currentSeq: 200,
      oldestSeq: 101,
      instruction: "refetch_full_state",
    };
    const req = buildReq("?since_seq=10&token=tkn");
    const res = await GET(req, { params: Promise.resolve({ encounterId: "enc-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("too_stale");
    expect(body.instruction).toBe("refetch_full_state");
    expect(body.oldestSeq).toBe(101);
  });
});
