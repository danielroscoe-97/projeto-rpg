/**
 * Story 02-G — updateDefaultCharacter server action tests.
 *
 * Coverage (5 tests):
 *  - unauthenticated caller → error "unauthenticated"
 *  - RPC returns not_owner → error "not_owner"
 *  - RPC returns ok → revalidatePath called + ok:true
 *  - RPC returns postgres error → error "write_failed"
 *  - RPC returns null payload → error "write_failed"
 *
 * Wave 2 M11 update: the action now delegates to the atomic
 * `update_default_character_if_owner` RPC (migration 156) which performs
 * ownership + UPDATE in a single round trip. Tests mock `supabase.rpc`
 * directly instead of the old two-step `from("player_characters").select()`
 * + `from("users").update()` flow.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

type RpcResult = {
  data?: unknown;
  error?: { message: string } | null;
};

const state: {
  user: { id: string } | null;
  rpcResult: RpcResult;
} = {
  user: { id: "user-1" },
  rpcResult: { data: { ok: true, reason: null }, error: null },
};

const revalidatePathMock = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: (p: string) => revalidatePathMock(p),
}));

const rpcMock = jest.fn(async (_fn: string, _args: Record<string, unknown>) => state.rpcResult);

const createClientMock = jest.fn(async () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user }, error: null }),
  },
  rpc: rpcMock,
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
    state.rpcResult = { data: { ok: true, reason: null }, error: null };
    revalidatePathMock.mockClear();
    rpcMock.mockClear();
  });

  it("returns unauthenticated error when no user", async () => {
    state.user = null;
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: false, error: "unauthenticated" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns not_owner when RPC reports character does not belong to user", async () => {
    state.rpcResult = { data: { ok: false, reason: "not_owner" }, error: null };
    const res = await updateDefaultCharacter("char-belongs-to-someone-else");
    expect(res).toEqual({ ok: false, error: "not_owner" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("update_default_character_if_owner", {
      p_character_id: "char-belongs-to-someone-else",
    });
  });

  it("succeeds when RPC reports ok + revalidates both paths", async () => {
    state.rpcResult = { data: { ok: true, reason: null }, error: null };
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/app/dashboard/settings/default-character",
    );
    expect(rpcMock).toHaveBeenCalledWith("update_default_character_if_owner", {
      p_character_id: "char-1",
    });
  });

  it("returns write_failed when RPC errors", async () => {
    state.rpcResult = { data: null, error: { message: "boom" } };
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: false, error: "write_failed" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns write_failed when RPC returns null payload", async () => {
    state.rpcResult = { data: null, error: null };
    const res = await updateDefaultCharacter("char-1");
    expect(res).toEqual({ ok: false, error: "write_failed" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
