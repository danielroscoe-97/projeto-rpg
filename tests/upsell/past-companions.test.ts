/**
 * @jest-environment node
 *
 * Epic 04 Story 04-D — unit tests for `lib/upsell/past-companions.ts`.
 *
 * The wrapper has two jobs:
 *   1. Call `supabase.rpc("get_past_companions", { p_limit, p_offset })`
 *      with the caller's pagination args.
 *   2. Return `[]` on any error (silent fallback so the UI hides the tab
 *      instead of crashing the dashboard).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const rpcMock = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({ rpc: rpcMock })),
}));

import { getPastCompanions } from "@/lib/upsell/past-companions";

describe("getPastCompanions — lib/upsell/past-companions.ts", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("forwards p_limit and p_offset to the RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getPastCompanions(10, 20);
    expect(rpcMock).toHaveBeenCalledWith("get_past_companions", {
      p_limit: 10,
      p_offset: 20,
    });
  });

  it("passes undefined through when caller omits pagination (SQL applies defaults)", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await getPastCompanions();
    expect(rpcMock).toHaveBeenCalledWith("get_past_companions", {
      p_limit: undefined,
      p_offset: undefined,
    });
  });

  it("returns rows on happy path", async () => {
    const rows = [
      {
        companion_user_id: "u-1",
        companion_display_name: "Ana",
        companion_avatar_url: null,
        sessions_together: 3,
        last_campaign_name: "Phandelver",
      },
      {
        companion_user_id: "u-2",
        companion_display_name: "Bruno",
        companion_avatar_url: "https://cdn/x.png",
        sessions_together: 1,
        last_campaign_name: "Dragonlance",
      },
    ];
    rpcMock.mockResolvedValueOnce({ data: rows, error: null });
    const out = await getPastCompanions();
    expect(out).toEqual(rows);
  });

  it("returns [] when the RPC returns an empty list", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const out = await getPastCompanions();
    expect(out).toEqual([]);
  });

  it("returns [] (silent fallback) when the RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" },
    });
    const out = await getPastCompanions();
    expect(out).toEqual([]);
  });

  it("returns [] when data is null even without an explicit error", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const out = await getPastCompanions();
    expect(out).toEqual([]);
  });
});
