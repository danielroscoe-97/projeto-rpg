/**
 * Unit tests for lib/realtime/connection-state.ts.
 *
 * Covers CR-01 ACs:
 *   - AC6 Every valid transition
 *   - AC6 Invalid transition is ignored + warning
 *   - AC6 Sync emission
 *   - AC6 Unsubscribe works
 *   - AC6 Multiple listeners in registration order
 */

jest.mock("@/lib/errors/capture", () => ({
  captureWarning: jest.fn(),
  captureError: jest.fn(),
}));

import {
  getConnectionState,
  onConnectionStateChange,
  transitionTo,
  __resetForTests,
  type ConnectionState,
} from "../connection-state";
import { captureWarning } from "@/lib/errors/capture";

const captureWarningMock = captureWarning as jest.MockedFunction<typeof captureWarning>;

beforeEach(() => {
  __resetForTests();
  captureWarningMock.mockClear();
});

describe("getConnectionState", () => {
  it("starts idle", () => {
    expect(getConnectionState()).toEqual({ kind: "idle" });
  });
});

describe("valid transitions", () => {
  const cases: Array<[ConnectionState["kind"], ConnectionState, ConnectionState]> = [
    ["idle → connecting", { kind: "idle" }, { kind: "connecting", attempt: 1, since: 100 }],
    [
      "connecting → connected",
      { kind: "connecting", attempt: 1, since: 100 },
      { kind: "connected", subscribedAt: 200, currentSeq: 5 },
    ],
    [
      "connecting → reconnecting",
      { kind: "connecting", attempt: 1, since: 100 },
      { kind: "reconnecting", attempt: 2, since: 300, backoffMs: 1000 },
    ],
    [
      "connected → reconnecting",
      { kind: "connected", subscribedAt: 100, currentSeq: 0 },
      { kind: "reconnecting", attempt: 1, since: 200, backoffMs: 1000 },
    ],
    [
      "connected → degraded",
      { kind: "connected", subscribedAt: 100, currentSeq: 0 },
      { kind: "degraded", reason: "network_offline", since: 200 },
    ],
    [
      "reconnecting → connected",
      { kind: "reconnecting", attempt: 3, since: 100, backoffMs: 2000 },
      { kind: "connected", subscribedAt: 300, currentSeq: 10 },
    ],
    [
      "reconnecting → degraded",
      { kind: "reconnecting", attempt: 15, since: 100, backoffMs: 30000 },
      { kind: "degraded", reason: "ceiling_hit", since: 200 },
    ],
    [
      "degraded → connecting",
      { kind: "degraded", reason: "network_offline", since: 100 },
      { kind: "connecting", attempt: 1, since: 200 },
    ],
    ["connected → closed", { kind: "connected", subscribedAt: 100, currentSeq: 0 }, { kind: "closed" }],
    ["closed → idle", { kind: "closed" }, { kind: "idle" }],
  ];

  it.each(cases)("allows %s", (_name, from, to) => {
    // seed from state
    __resetForTests();
    // walk from idle → ... → from via known valid path using transitionTo
    // For simplicity, we directly force-set via the sequence the table permits.
    // A minimal path to each `from` is injected here:
    seedStateTo(from);
    transitionTo(to);
    expect(getConnectionState()).toEqual(to);
    expect(captureWarningMock).not.toHaveBeenCalled();
  });
});

describe("invalid transitions", () => {
  it("ignores idle → connected (must pass through connecting)", () => {
    const before = getConnectionState();
    transitionTo({ kind: "connected", subscribedAt: 100, currentSeq: 0 });
    expect(getConnectionState()).toEqual(before);
    expect(captureWarningMock).toHaveBeenCalledTimes(1);
    const [msg, ctx] = captureWarningMock.mock.calls[0];
    expect(msg).toContain("idle → connected");
    expect(ctx).toMatchObject({ component: "connection-state", action: "transitionTo" });
  });

  it("ignores connected → connecting (must go through reconnecting or closed)", () => {
    seedStateTo({ kind: "connected", subscribedAt: 100, currentSeq: 0 });
    captureWarningMock.mockClear();
    transitionTo({ kind: "connecting", attempt: 1, since: 200 });
    expect(getConnectionState().kind).toBe("connected");
    expect(captureWarningMock).toHaveBeenCalledTimes(1);
  });

  it("ignores degraded → connected (must go through connecting first)", () => {
    seedStateTo({ kind: "degraded", reason: "ceiling_hit", since: 100 });
    captureWarningMock.mockClear();
    transitionTo({ kind: "connected", subscribedAt: 200, currentSeq: 0 });
    expect(getConnectionState().kind).toBe("degraded");
    expect(captureWarningMock).toHaveBeenCalledTimes(1);
  });
});

describe("listeners", () => {
  it("fires immediately on subscribe with current state", () => {
    const cb = jest.fn();
    onConnectionStateChange(cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ kind: "idle" });
  });

  it("fires on every valid transition", () => {
    const cb = jest.fn();
    onConnectionStateChange(cb);
    cb.mockClear();
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    transitionTo({ kind: "connected", subscribedAt: 200, currentSeq: 0 });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[0][0]).toMatchObject({ kind: "connecting" });
    expect(cb.mock.calls[1][0]).toMatchObject({ kind: "connected" });
  });

  it("does NOT fire on invalid transitions", () => {
    const cb = jest.fn();
    onConnectionStateChange(cb);
    cb.mockClear();
    // idle → connected is invalid
    transitionTo({ kind: "connected", subscribedAt: 200, currentSeq: 0 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("emits synchronously — listener sees new state before transitionTo returns", () => {
    let seen: ConnectionState | null = null;
    onConnectionStateChange((s) => {
      if (s.kind === "connecting") seen = s;
    });
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    // if emission were async, seen would still be null at this line
    expect(seen).not.toBeNull();
  });

  it("unsubscribe works — listener stops being called", () => {
    const cb = jest.fn();
    const unsubscribe = onConnectionStateChange(cb);
    cb.mockClear();
    unsubscribe();
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("multiple listeners fire in registration order", () => {
    const order: number[] = [];
    onConnectionStateChange(() => order.push(1));
    onConnectionStateChange(() => order.push(2));
    onConnectionStateChange(() => order.push(3));
    order.length = 0; // clear initial emits
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    expect(order).toEqual([1, 2, 3]);
  });

  it("a throwing listener does not block subsequent listeners", () => {
    const calls: string[] = [];
    onConnectionStateChange(() => {
      calls.push("a");
      throw new Error("boom");
    });
    onConnectionStateChange(() => calls.push("b"));
    calls.length = 0;
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    expect(calls).toEqual(["a", "b"]);
    // warning was captured for the throw
    expect(captureWarningMock).toHaveBeenCalledWith(
      expect.stringContaining("listener threw"),
      expect.any(Object),
    );
  });

  it("unsubscribe during emission does not skip subsequent listeners", () => {
    const calls: string[] = [];
    let unsubB: () => void = () => {};
    onConnectionStateChange(() => {
      calls.push("a");
      unsubB(); // remove B while we're iterating
    });
    unsubB = onConnectionStateChange(() => calls.push("b"));
    onConnectionStateChange(() => calls.push("c"));
    calls.length = 0;
    transitionTo({ kind: "connecting", attempt: 1, since: 100 });
    // B was removed during iteration but snapshot preserved the invocation
    expect(calls).toEqual(["a", "b", "c"]);
  });
});

// ───── Helper ─────────────────────────────────────────────────
/**
 * Forces state to `target` by walking through the minimal valid path from idle.
 * The transition table is small enough that we hardcode the paths used by tests.
 */
function seedStateTo(target: ConnectionState): void {
  __resetForTests();
  const path = pathFromIdle(target);
  for (const s of path) {
    transitionTo(s);
  }
}

function pathFromIdle(target: ConnectionState): ConnectionState[] {
  switch (target.kind) {
    case "idle":
      return [];
    case "connecting":
      return [target];
    case "connected":
      return [{ kind: "connecting", attempt: 1, since: 1 }, target];
    case "reconnecting":
      return [
        { kind: "connecting", attempt: 1, since: 1 },
        { kind: "connected", subscribedAt: 2, currentSeq: 0 },
        target,
      ];
    case "degraded":
      return [
        { kind: "connecting", attempt: 1, since: 1 },
        { kind: "connected", subscribedAt: 2, currentSeq: 0 },
        target,
      ];
    case "closed":
      return [
        { kind: "connecting", attempt: 1, since: 1 },
        { kind: "connected", subscribedAt: 2, currentSeq: 0 },
        { kind: "closed" },
      ];
  }
}
