/**
 * @jest-environment node
 */
// Uses jest globals — no import needed.
/* eslint-disable @typescript-eslint/no-explicit-any */

const svcState: {
  sessionTokensDelete: { count: number; error: null | { message: string } };
  playerCharactersDelete: { count: number; error: null | { message: string } };
  adminDeleteErrors: Record<string, string | null>;
} = {
  sessionTokensDelete: { count: 0, error: null },
  playerCharactersDelete: { count: 0, error: null },
  adminDeleteErrors: {},
};

function makeDeleteChain(res: { count: number; error: null | { message: string } }) {
  const chain: any = {
    delete: jest.fn(() => chain),
    in: jest.fn(() => Promise.resolve({ count: res.count, error: res.error, data: null })),
  };
  return chain;
}

jest.mock("@/lib/supabase/server", () => {
  return {
    createServiceClient: () => ({
      from: jest.fn((table: string) => {
        if (table === "session_tokens") return makeDeleteChain(svcState.sessionTokensDelete);
        if (table === "player_characters") return makeDeleteChain(svcState.playerCharactersDelete);
        throw new Error(`unexpected table ${table}`);
      }),
      auth: {
        admin: {
          deleteUser: jest.fn((uid: string) => {
            const errMsg = svcState.adminDeleteErrors[uid];
            if (errMsg) return Promise.resolve({ error: { message: errMsg } });
            return Promise.resolve({ error: null });
          }),
        },
      },
    }),
    // Keep createClient exported so other imports don't break.
    createClient: async () => ({}),
  };
});

import { DELETE } from "@/app/api/e2e/cleanup/route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/e2e/cleanup", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/e2e/cleanup", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_E2E_MODE;

  beforeEach(() => {
    svcState.sessionTokensDelete = { count: 0, error: null };
    svcState.playerCharactersDelete = { count: 0, error: null };
    svcState.adminDeleteErrors = {};
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_E2E_MODE;
    else process.env.NEXT_PUBLIC_E2E_MODE = ORIGINAL;
  });

  it("returns 404 empty body when flag off", async () => {
    delete process.env.NEXT_PUBLIC_E2E_MODE;
    const res = await DELETE(makeReq({ sessionTokenIds: ["st-1"] }) as any);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("returns 200 with deleted counts when flag on", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    svcState.sessionTokensDelete = { count: 2, error: null };
    svcState.playerCharactersDelete = { count: 1, error: null };
    svcState.adminDeleteErrors = {};
    const res = await DELETE(
      makeReq({
        sessionTokenIds: ["st-1", "st-2"],
        playerCharacterIds: ["pc-1"],
        anonUserIds: ["u-1", "u-2"],
      }) as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted.sessionTokens).toBe(2);
    expect(body.deleted.playerCharacters).toBe(1);
    expect(body.deleted.anonUsers).toBe(2);
  });

  it("returns 207 when some admin deletes fail", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    svcState.adminDeleteErrors = { "u-2": "not found" };
    const res = await DELETE(
      makeReq({
        anonUserIds: ["u-1", "u-2"],
      }) as any,
    );
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.deleted.anonUsers).toBe(1);
    expect(body.errors).toContain("auth.users[u-2]: not found");
  });

  it("accepts empty body when flag on (no-op cleanup)", async () => {
    process.env.NEXT_PUBLIC_E2E_MODE = "true";
    const req = new Request("http://localhost/api/e2e/cleanup", { method: "DELETE" });
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted.sessionTokens).toBe(0);
  });
});
