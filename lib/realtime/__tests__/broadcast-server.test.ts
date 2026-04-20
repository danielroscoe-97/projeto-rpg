/**
 * Unit tests for broadcast-server (Beta 4 fix C1).
 *
 * Covers the silent 401 → refreshSession() → retry path mirrored from
 * fetch-orchestrator. The module is side-effect free apart from the
 * single-flight refresh latch, so tests reset the handler between cases.
 */

// ── Supabase mock ────────────────────────────────────────────────
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  }),
}));

jest.mock("@/lib/analytics/track", () => ({
  trackEvent: jest.fn(),
}));

import {
  broadcastViaServer,
  setBroadcastUnauthorizedHandler,
} from "../broadcast-server";
import { trackEvent } from "@/lib/analytics/track";
import type { RealtimeEvent } from "@/lib/types/realtime";

type FakeResponse = { ok: boolean; status: number };

function makeRes(status: number): FakeResponse {
  return { ok: status >= 200 && status < 300, status };
}

function fakeEvent(): RealtimeEvent {
  return {
    type: "combat:turn_advance",
    current_turn_index: 0,
    round_number: 1,
  } as RealtimeEvent;
}

function mockSessionWithToken(token: string) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: token } },
    error: null,
  });
}

describe("broadcastViaServer (401 silent refresh)", () => {
  const origFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    mockGetSession.mockReset();
    mockRefreshSession.mockReset();
    (trackEvent as jest.Mock).mockReset();
    // Reset handler to default between tests.
    setBroadcastUnauthorizedHandler(null);
  });

  afterAll(() => {
    global.fetch = origFetch;
  });

  it("401 + handler succeeds → refetches and returns true", async () => {
    mockSessionWithToken("old-token");
    setBroadcastUnauthorizedHandler(async () => {
      mockSessionWithToken("new-token");
      return true;
    });

    fetchMock
      .mockResolvedValueOnce(makeRes(401))
      .mockResolvedValueOnce(makeRes(200));

    const ok = await broadcastViaServer("sess-1", fakeEvent());

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 2nd fetch uses the refreshed token.
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall[1].headers.Authorization).toBe("Bearer new-token");
    expect(trackEvent).toHaveBeenCalledWith(
      "auth:silent_refresh_success",
      expect.objectContaining({ actor: "dm", trigger: "401_intercept" }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      "broadcast:401_retry_success",
      expect.objectContaining({ session_id: "sess-1" }),
    );
  });

  it("401 + handler fails → returns false, does NOT refetch", async () => {
    mockSessionWithToken("old-token");
    const handler = jest.fn(async () => false);
    setBroadcastUnauthorizedHandler(handler);

    fetchMock.mockResolvedValueOnce(makeRes(401));

    const ok = await broadcastViaServer("sess-1", fakeEvent());

    expect(ok).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      "auth:silent_refresh_failed",
      expect.objectContaining({ actor: "dm" }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      "broadcast:401_retry_failed",
      expect.objectContaining({ reason: "refresh_failed" }),
    );
  });

  it("401 + handler succeeds but 2nd fetch is also 401 → returns false (no retry loop)", async () => {
    mockSessionWithToken("old-token");
    setBroadcastUnauthorizedHandler(async () => {
      mockSessionWithToken("new-token");
      return true;
    });

    fetchMock
      .mockResolvedValueOnce(makeRes(401))
      .mockResolvedValueOnce(makeRes(401));

    const ok = await broadcastViaServer("sess-1", fakeEvent());

    expect(ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenCalledWith(
      "broadcast:401_retry_failed",
      expect.objectContaining({ reason: "status_401" }),
    );
  });

  it("race: 2 concurrent 401s share ONE refresh (single-flight)", async () => {
    mockSessionWithToken("old-token");

    const handler = jest.fn(async () => {
      // Simulate async refresh; bump the session token before resolving.
      await new Promise((r) => setTimeout(r, 5));
      mockSessionWithToken("new-token");
      return true;
    });
    setBroadcastUnauthorizedHandler(handler);

    // First fetch per caller returns 401; retries return 200.
    fetchMock
      .mockResolvedValueOnce(makeRes(401))
      .mockResolvedValueOnce(makeRes(401))
      .mockResolvedValueOnce(makeRes(200))
      .mockResolvedValueOnce(makeRes(200));

    const [a, b] = await Promise.all([
      broadcastViaServer("sess-1", fakeEvent()),
      broadcastViaServer("sess-1", fakeEvent()),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("200 → handler is never invoked", async () => {
    mockSessionWithToken("old-token");
    const handler = jest.fn(async () => true);
    setBroadcastUnauthorizedHandler(handler);

    fetchMock.mockResolvedValueOnce(makeRes(200));

    const ok = await broadcastViaServer("sess-1", fakeEvent());

    expect(ok).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("429 → preserves existing rate-limit path, handler not invoked", async () => {
    mockSessionWithToken("old-token");
    const handler = jest.fn(async () => true);
    setBroadcastUnauthorizedHandler(handler);

    fetchMock.mockResolvedValueOnce(makeRes(429));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const ok = await broadcastViaServer("sess-1", fakeEvent());

    expect(ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
