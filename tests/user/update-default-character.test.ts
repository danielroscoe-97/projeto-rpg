/**
 * Story 02-G — updateDefaultCharacter server action tests.
 *
 * Coverage (4 tests):
 *  - unauthenticated caller → error "unauthenticated"
 *  - character does not belong to user → error "not_owner"
 *  - success path → revalidatePath called + ok:true
 *  - write failure on users.update → error "write_failed"
 *
 * Supabase + revalidatePath are mocked at module scope. The test drives the
 * mock state per-case via mutable `state` object (same pattern used by
 * player-identity tests).
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

type BuilderResult = {
  data?: unknown;
  error?: { message: string } | null;
};

const state: {
  user: { id: string } | null;
  selectResult: BuilderResult;
  updateResult: BuilderResult;
} = {
  user: { id: "user-1" },
  selectResult: { data: null, error: null },
  updateResult: { data: null, error: null },
};

const revalidatePathMock = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));

const fromMock = jest.fn((table: string) => {
  if (table === "player_characters") {
    // select().eq().eq().maybeSingle() chain
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      maybeSingle: jest.fn(() => Promise.resolve(state.selectResult)),
    } as const;
    return builder;
  }
  // users.update().eq()
  const builder = {
    update: jest.fn(() => builder),
    eq: jest.fn(() => Promise.resolve(state.updateResult)),
  } as const;
  return builder;
});

const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  from: fromMock,
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { updateDefaultCharacter } from "@/lib/user/update-default-character";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateDefaultCharacter", () => {
  beforeEach(() => {
    state.user = { id: "user-1" };
    state.selectResult = { data: null, error: null };
    state.updateResult = { data: null, error: null };
    revalidatePathMock.mockClear();
    fromMock.mockClear();
  });

  it("returns unauthenticated error when no user", async () => {
    state.user = null;
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: false, error: "unauthenticated" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns not_owner when character does not belong to user", async () => {
    state.selectResult = { data: null, error: null };
    const res = await updateDefaultCharacter("char-belongs-to-someone-else");
    expect(res).toEqual({ ok: false, error: "not_owner" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("succeeds when character belongs to user + revalidates both paths", async () => {
    state.selectResult = { data: { id: "char-1" }, error: null };
    state.updateResult = { data: null, error: null };
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/dashboard/settings/default-character",
    );
  });

  it("returns write_failed when users.update errors", async () => {
    state.selectResult = { data: { id: "char-1" }, error: null };
    state.updateResult = { data: null, error: { message: "boom" } };
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: false, error: "write_failed" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
