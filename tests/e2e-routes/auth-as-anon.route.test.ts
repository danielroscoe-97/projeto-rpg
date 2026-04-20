/**
 * @jest-environment node
 */
// Uses jest globals — no import needed.
/* eslint-disable @typescript-eslint/no-explicit-any */

const clientState: {
  signInResult: {
    data: { user: { id: string } | null; session: { expires_at: number } | null } | null;
    error: null | { message: string };
  };
} = {
  signInResult: {
    data: {
      user: { id: "anon-user-uuid" },
      session: { expires_at: 1_800_000_000 },
    },
    error: null,
  },
};

jest.mock("@/lib/supabase/server", () => {
  return {
    createClient: async () => ({
      auth: {
        signInAnonymously: jest.fn(() => Promise.resolve(clientState.signInResult)),
      },
    }),
    // Keep createServiceClient exported so other imports don't break.
    createServiceClient: () => ({}),
  };
});

import { POST } from "@/app/api/e2e/auth-as-anon/route";

function makeReq(): Request {
  return new Request("http://localhost/api/e2e/auth-as-anon", {
    method: "POST",
  });
}

describe("POST /api/e2e/auth-as-anon", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_E2E_MODE;

  beforeEach(() => {
    clientState.signInResult = {
      data: {
        user: { id: "anon-user-uuid" },
        session: { expires_at: 1_800_000_000 },
      },
      error: null,
    };
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_E2E_MODE;
    else process.env.NEXT_PUBLIC_E2E_MODE = ORIGINAL;
  });

  it("returns 404 with empty body when flag is off", async () => {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    const res = await POST(makeReq() as any);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("returns 404 when flag is 'true ' (trailing space — strict compare)", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true ";
    const res = await POST(makeReq() as any);
    expect(res.status).toBe(404);
  });

  it("returns 200 with userId when flag is on and signIn succeeds", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    const res = await POST(makeReq() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.userId).toBe("anon-user-uuid");
  });

  it("returns 500 when signInAnonymously fails", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    clientState.signInResult = {
      data: null,
      error: { message: "anon signup disabled" },
    } as any;
    const res = await POST(makeReq() as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("signInAnonymously_failed");
  });

  it("returns 404 with empty body when NODE_ENV is production, even with flag on", async () => {
    // Defense in depth: NODE_ENV guard runs BEFORE the isE2eMode flag check.
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    const restore = jest.replaceProperty(process.env, "NODE_ENV", "production");
    try {
      const res = await POST(makeReq() as any);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("");
    } finally {
      restore.restore();
    }
  });
});
