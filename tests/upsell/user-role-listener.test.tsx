/**
 * Epic 04 Story 04-F — UserRoleListenerMount + Test 10 invariant.
 *
 * Test 10 contract (from epic-04 §Testes obrigatórios item 10):
 *   "Role flip broadcast + session preservation (D9): user com 2 tabs;
 *    tab A chama updateRole('player','both') → tab B recebe broadcast
 *    role_updated, re-lê role; sessionStorage de session_token_id
 *    idêntico em ambas as tabs antes e depois."
 *
 * We can't spin up two real browser tabs in Jest. We simulate the
 * receive side of the broadcast:
 *   1. Seed sessionStorage with a known `session_token_id`.
 *   2. Mount UserRoleListenerMount, which subscribes to `user:{userId}`.
 *   3. Capture the `broadcast` handler registered on the channel.
 *   4. Invoke the handler with a `role_updated` payload (simulating
 *      the broadcast arriving from another tab).
 *   5. Assert: the role store was asked to re-hydrate (initialized set
 *      to false, then loadRole called) — AND session_token_id in
 *      sessionStorage is unchanged byte-for-byte.
 *
 * The full multi-tab E2E lives in Story 04-J's Playwright suite; this
 * Jest test locks the unit-level invariant that listener teardown and
 * re-hydration NEVER touch sessionStorage.
 */

import React from "react";
import { render, act } from "@testing-library/react";

// Capture the channel.on registration so we can replay a broadcast.
const onMock = jest.fn();
const subscribeMock = jest.fn();
const unsubscribeMock = jest.fn();
const channelObj: {
  on: typeof onMock;
  subscribe: typeof subscribeMock;
  unsubscribe: typeof unsubscribeMock;
} = {
  on: onMock,
  subscribe: subscribeMock,
  unsubscribe: unsubscribeMock,
};
// `.on` returns the channel so the class is chainable (matches supabase-js).
onMock.mockReturnValue(channelObj);

const channelCreateMock = jest.fn(() => channelObj);
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (name: string, opts: unknown) => {
      channelCreateMock(name, opts);
      return channelObj;
    },
  }),
}));

const loadRoleMock = jest.fn();
const setStateMock = jest.fn();
jest.mock("@/lib/stores/role-store", () => ({
  useRoleStore: {
    getState: () => ({ loadRole: loadRoleMock }),
    setState: (...args: unknown[]) => setStateMock(...args),
  },
}));

import { UserRoleListenerMount } from "@/components/realtime/UserRoleListenerMount";

const USER_ID = "user-abc";
const SESSION_TOKEN_ID = "pre-flip-session-token-uuid";

describe("<UserRoleListenerMount /> — D9 receive side", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem("session_token_id", SESSION_TOKEN_ID);
  });

  it("subscribes to user:{userId} and registers a role_updated handler", () => {
    render(<UserRoleListenerMount userId={USER_ID} />);
    expect(channelCreateMock).toHaveBeenCalledWith(
      `user:${USER_ID}`,
      expect.objectContaining({
        config: expect.objectContaining({
          broadcast: expect.objectContaining({ self: false }),
        }),
      }),
    );
    // One .on registration for "broadcast" / event "role_updated".
    expect(onMock).toHaveBeenCalledWith(
      "broadcast",
      expect.objectContaining({ event: "role_updated" }),
      expect.any(Function),
    );
    expect(subscribeMock).toHaveBeenCalled();
  });

  it("does nothing when userId is empty string", () => {
    render(<UserRoleListenerMount userId="" />);
    expect(channelCreateMock).not.toHaveBeenCalled();
  });

  it("on receive: re-hydrates role store and NEVER touches session_token_id (Test 10)", async () => {
    render(<UserRoleListenerMount userId={USER_ID} />);

    // Third arg of channel.on(...) is the handler function.
    const [, , handler] = onMock.mock.calls.find(
      ([channelName, filter]) =>
        channelName === "broadcast" &&
        (filter as { event?: string }).event === "role_updated",
    ) as [string, { event: string }, (payload: unknown) => void];

    // Simulate the broadcast arriving from tab A.
    await act(async () => {
      handler({
        type: "broadcast",
        event: "role_updated",
        payload: { from: "player", to: "both" },
      });
    });

    // setState forces initialized=false so loadRole() will actually run.
    expect(setStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialized: false, loading: false }),
    );
    expect(loadRoleMock).toHaveBeenCalledTimes(1);

    // THE CORE INVARIANT — sessionStorage untouched.
    expect(sessionStorage.getItem("session_token_id")).toBe(SESSION_TOKEN_ID);
  });

  it("unsubscribes on unmount (no leaked channel)", () => {
    const { unmount } = render(<UserRoleListenerMount userId={USER_ID} />);
    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("survives a throwing unsubscribe on unmount (best-effort teardown)", () => {
    unsubscribeMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const { unmount } = render(<UserRoleListenerMount userId={USER_ID} />);
    expect(() => unmount()).not.toThrow();
  });
});
