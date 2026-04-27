/**
 * Unit coverage for `useCampaignCombatState` (Issue #90 P2-3 race fix).
 *
 * The hook subscribes to `campaign:${id}` and forwards the most recent
 * `round` observed via broadcast into the `onCombatEnded` callback —
 * synchronously, from inside the broadcast handler, BEFORE setState.
 * That defeats the fast-TPK race where `combat:started (round=1)` and
 * `combat:ended` arrive in the same microtask: pre-fix, the consumer
 * read `round` from a ref written during render and lost it because
 * React hadn't committed the state update yet.
 *
 * We mount the hook against a mock Supabase channel that captures the
 * registered broadcast handlers, then invoke them in sequence
 * synchronously to reproduce the race.
 */

import { renderHook } from "@testing-library/react";

type BroadcastHandler = (msg: { payload: unknown }) => void;
const broadcastHandlers: Record<string, BroadcastHandler> = {};

const mockSubscribe = jest.fn((cb: (status: string) => void) => {
  cb("SUBSCRIBED");
  return mockChannel;
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOn: jest.Mock<any, any> = jest.fn(
  (_type: string, opts: { event: string }, handler: BroadcastHandler) => {
    broadcastHandlers[opts.event] = handler;
    return mockChannel;
  },
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChannel: any = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: jest.fn(),
};

const mockRemoveChannel = jest.fn();
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => mockChannel,
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { useCampaignCombatState } from "../useCampaignCombatState";

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(broadcastHandlers).forEach((k) => delete broadcastHandlers[k]);
});

describe("useCampaignCombatState — P2-3 race fix", () => {
  it("registers handlers for combat:started, combat:ended, combat:turn_advance", () => {
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
      }),
    );
    expect(broadcastHandlers["combat:started"]).toBeDefined();
    expect(broadcastHandlers["combat:ended"]).toBeDefined();
    expect(broadcastHandlers["combat:turn_advance"]).toBeDefined();
  });

  it("forwards lastKnownRound from combat:started into onCombatEnded synchronously (fast TPK)", () => {
    const onCombatEnded = jest.fn();
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
        onCombatEnded,
      }),
    );
    // Reproduce the race: combat:started → combat:ended in the same
    // microtask, with React not having committed any state in between.
    broadcastHandlers["combat:started"]({
      payload: {
        type: "combat:started",
        combat_id: "enc-1",
        session_id: "sess-1",
        round: 1,
        current_turn: { combatant_id: "c-1", name: "Goblin" },
      },
    });
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-1",
        session_id: "sess-1",
      },
    });
    expect(onCombatEnded).toHaveBeenCalledTimes(1);
    // The second argument is `lastKnownRound` — must be 1, not undefined.
    expect(onCombatEnded).toHaveBeenCalledWith(undefined, 1);
  });

  it("forwards lastKnownRound bumped by combat:turn_advance into onCombatEnded", () => {
    const onCombatEnded = jest.fn();
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
        onCombatEnded,
      }),
    );
    broadcastHandlers["combat:started"]({
      payload: {
        type: "combat:started",
        combat_id: "enc-1",
        session_id: "sess-1",
        round: 1,
      },
    });
    // Round advanced via turn_advance mirror — ref must reflect the
    // newer value before combat:ended fires.
    broadcastHandlers["combat:turn_advance"]({
      payload: {
        type: "combat:turn_advance",
        combat_id: "enc-1",
        session_id: "sess-1",
        round_number: 4,
        current_turn_index: 0,
        current_combatant_id: "c-1",
        current_combatant_name: "Goblin",
      },
    });
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-1",
        session_id: "sess-1",
      },
    });
    expect(onCombatEnded).toHaveBeenCalledWith(undefined, 4);
  });

  it("forwards the broadcast snapshot when present (A6 bridge)", () => {
    const onCombatEnded = jest.fn();
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
        onCombatEnded,
      }),
    );
    const snapshot = {
      endedAt: 1700000000000,
      campaignId: "camp-1",
      characterName: "Hero",
      hp: { current: 10, max: 20 },
    };
    broadcastHandlers["combat:started"]({
      payload: {
        type: "combat:started",
        combat_id: "enc-1",
        session_id: "sess-1",
        round: 2,
      },
    });
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-1",
        session_id: "sess-1",
        snapshot,
      },
    });
    expect(onCombatEnded).toHaveBeenCalledWith(snapshot, 2);
  });

  it("passes undefined lastKnownRound when combat:ended fires without a prior start", () => {
    const onCombatEnded = jest.fn();
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
        onCombatEnded,
      }),
    );
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-1",
        session_id: "sess-1",
      },
    });
    expect(onCombatEnded).toHaveBeenCalledWith(undefined, undefined);
  });

  it("resets lastKnownRound after firing onCombatEnded so the next combat starts fresh", () => {
    const onCombatEnded = jest.fn();
    renderHook(() =>
      useCampaignCombatState({
        campaignId: "camp-1",
        onCombatEnded,
      }),
    );
    // First combat: start → end with round 3
    broadcastHandlers["combat:started"]({
      payload: {
        type: "combat:started",
        combat_id: "enc-1",
        session_id: "sess-1",
        round: 3,
      },
    });
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-1",
        session_id: "sess-1",
      },
    });
    // Second combat ends without a fresh start — the ref must NOT
    // carry over round 3 from the previous combat.
    broadcastHandlers["combat:ended"]({
      payload: {
        type: "combat:ended",
        combat_id: "enc-2",
        session_id: "sess-2",
      },
    });
    expect(onCombatEnded).toHaveBeenNthCalledWith(1, undefined, 3);
    expect(onCombatEnded).toHaveBeenNthCalledWith(2, undefined, undefined);
  });
});
