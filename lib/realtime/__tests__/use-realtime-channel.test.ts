/**
 * Tests for useRealtimeChannel hook — subscribe/unsubscribe lifecycle and polling fallback.
 * Story A1-2: Realtime layer tests
 */

import { renderHook, act } from "@testing-library/react";

// ── Supabase channel mock ────────────────────────────────────────
type SubscribeCallback = (status: string) => void;
type BroadcastHandler = (msg: { payload: unknown }) => void;

let subscribeCallback: SubscribeCallback;
const broadcastHandlers: Record<string, BroadcastHandler> = {};

const mockUnsubscribe = jest.fn();
const mockSubscribe = jest.fn((cb: SubscribeCallback) => {
  subscribeCallback = cb;
  return mockChannel;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOn: jest.Mock<any, any> = jest.fn(
  (_type: string, opts: { event: string }, handler: BroadcastHandler) => {
    broadcastHandlers[opts.event] = handler;
    return mockChannel;
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChannel: any = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => mockChannel,
  }),
}));

import { useRealtimeChannel } from "../use-realtime-channel";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  Object.keys(broadcastHandlers).forEach((k) => delete broadcastHandlers[k]);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────

describe("useRealtimeChannel", () => {
  const defaultProps = {
    sessionId: "session-1",
    onEvent: jest.fn(),
    enabled: true,
  };

  it("subscribes to channel on mount", () => {
    renderHook(() => useRealtimeChannel(defaultProps));

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalled();
    // Should register handlers for known event types
    expect(broadcastHandlers["combat:hp_update"]).toBeDefined();
    expect(broadcastHandlers["session:state_sync"]).toBeDefined();
    expect(broadcastHandlers["combat:turn_advance"]).toBeDefined();
  });

  it("unsubscribes from channel on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeChannel(defaultProps));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when enabled is false", () => {
    renderHook(() =>
      useRealtimeChannel({ ...defaultProps, enabled: false })
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("does not subscribe when sessionId is empty", () => {
    renderHook(() =>
      useRealtimeChannel({ ...defaultProps, sessionId: "" })
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("reports 'connected' status after SUBSCRIBED callback", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    act(() => {
      subscribeCallback("SUBSCRIBED");
    });

    expect(result.current.status).toBe("connected");
  });

  it("reports 'disconnected' status after CLOSED callback", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    act(() => {
      subscribeCallback("SUBSCRIBED");
    });
    act(() => {
      subscribeCallback("CLOSED");
    });

    expect(result.current.status).toBe("disconnected");
  });

  it("reports 'connecting' for intermediate status", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    act(() => {
      subscribeCallback("JOINING");
    });

    expect(result.current.status).toBe("connecting");
  });

  // ── Polling fallback tests ──────────────────────────────────────

  it("activates polling after 3s disconnect", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    // Simulate disconnect
    act(() => {
      subscribeCallback("CLOSED");
    });
    expect(result.current.shouldPoll).toBe(false);

    // Advance past the 3s threshold
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.shouldPoll).toBe(true);
  });

  it("does not activate polling if reconnect happens before 3s", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    // Disconnect
    act(() => {
      subscribeCallback("CLOSED");
    });

    // Reconnect before 3s
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    act(() => {
      subscribeCallback("SUBSCRIBED");
    });

    // Advance past the original 3s timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.shouldPoll).toBe(false);
  });

  it("deactivates polling on reconnect", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    // Disconnect and wait for polling to activate
    act(() => {
      subscribeCallback("CLOSED");
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.shouldPoll).toBe(true);

    // Reconnect
    act(() => {
      subscribeCallback("SUBSCRIBED");
    });

    expect(result.current.shouldPoll).toBe(false);
    expect(result.current.status).toBe("connected");
  });

  it("activates polling on CHANNEL_ERROR after 3s", () => {
    const { result } = renderHook(() => useRealtimeChannel(defaultProps));

    act(() => {
      subscribeCallback("CHANNEL_ERROR");
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.shouldPoll).toBe(true);
    expect(result.current.status).toBe("disconnected");
  });

  // ── Event forwarding ──────────────────────────────────────────

  it("forwards broadcast events to onEvent callback", () => {
    const onEvent = jest.fn();
    renderHook(() =>
      useRealtimeChannel({ ...defaultProps, onEvent })
    );

    const payload = { type: "combat:hp_update", combatant_id: "c1", current_hp: 30, temp_hp: 0 };
    act(() => {
      broadcastHandlers["combat:hp_update"]({ payload });
    });

    expect(onEvent).toHaveBeenCalledWith(payload);
  });

  // ── Cleanup ────────────────────────────────────────────────────

  it("clears poll timer on unmount", () => {
    const { result, unmount } = renderHook(() => useRealtimeChannel(defaultProps));

    act(() => {
      subscribeCallback("CLOSED");
    });

    unmount();

    // Advancing timers after unmount should not cause errors
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
