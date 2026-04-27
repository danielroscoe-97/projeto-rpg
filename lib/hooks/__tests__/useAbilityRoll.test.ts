/**
 * Unit coverage for `useAbilityRoll` (Wave 3b · Story C7).
 *
 * Validates the orchestration responsibilities (roll → persist → broadcast)
 * without exercising the underlying engine (which has its own coverage in
 * `lib/utils/__tests__/dice-roller.test.ts`):
 *
 *   1. rollCheck / rollSave return synchronously with deterministic totals
 *      when Math.random is stubbed.
 *   2. sessionStorage is appended after each roll (24h TTL preserved on
 *      the entry).
 *   3. Expired entries are pruned on next read.
 *   4. Broadcast is fired with the right payload — and a failed broadcast
 *      does NOT throw or block the synchronous return.
 *   5. Missing campaignId / characterId / characterName silently skips the
 *      broadcast (UI still works for anon/preview contexts).
 */

import { renderHook, act } from "@testing-library/react";
import { useAbilityRoll, __clearAbilityRollHistory } from "@/lib/hooks/useAbilityRoll";

// ── Mock Supabase client so the broadcast path is observable ──────────
const mockSend = jest.fn().mockResolvedValue("ok");
const mockRemoveChannel = jest.fn().mockResolvedValue(undefined);
const mockChannel = jest.fn(() => ({ send: mockSend }));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: (topic: string) => mockChannel(topic),
    removeChannel: (ch: unknown) => mockRemoveChannel(ch),
  }),
}));

// ── Deterministic dice ─────────────────────────────────────────────
function forceRoll(value: number, faces = 20) {
  jest.spyOn(Math, "random").mockReturnValue((value - 1) / faces);
}

const CHARACTER_ID = "char-test-123";
const CAMPAIGN_ID = "camp-test-456";
const CHARACTER_NAME = "Capa Barsavi";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
  }
  __clearAbilityRollHistory(CHARACTER_ID);
  mockSend.mockClear();
  mockRemoveChannel.mockClear();
  mockChannel.mockClear();
  mockSend.mockResolvedValue("ok");
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useAbilityRoll — rollCheck", () => {
  it("rolls 1d20 + abilityMod and returns synchronously", () => {
    forceRoll(15);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 3,
      }),
    );
    let rollResult: ReturnType<typeof result.current.rollCheck> | null = null;
    act(() => {
      rollResult = result.current.rollCheck({ ability: "str", abilityMod: 2 });
    });
    expect(rollResult).not.toBeNull();
    expect(rollResult!.total).toBe(17);
    expect(rollResult!.ability).toBe("str");
    expect(rollResult!.rollType).toBe("check");
    expect(rollResult!.proficient).toBe(false);
  });

  it("appends each roll to sessionStorage history", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 2,
      }),
    );
    act(() => {
      result.current.rollCheck({ ability: "dex", abilityMod: 4 });
    });
    act(() => {
      result.current.rollCheck({ ability: "wis", abilityMod: 1 });
    });
    const history = result.current.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].ability).toBe("dex");
    expect(history[1].ability).toBe("wis");
    expect(history[0].total).toBe(14); // 10 + 4
    expect(history[1].total).toBe(11); // 10 + 1
  });

  it("fires broadcast with the right event payload", () => {
    forceRoll(12);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 3,
      }),
    );
    act(() => {
      result.current.rollCheck({ ability: "int", abilityMod: 0 });
    });
    expect(mockChannel).toHaveBeenCalledWith(`campaign:${CAMPAIGN_ID}`);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.type).toBe("broadcast");
    expect(callArg.event).toBe("player:ability_roll");
    expect(callArg.payload.characterId).toBe(CHARACTER_ID);
    expect(callArg.payload.characterName).toBe(CHARACTER_NAME);
    expect(callArg.payload.ability).toBe("int");
    expect(callArg.payload.rollType).toBe("check");
    expect(callArg.payload.result).toBe(12);
    expect(callArg.payload.proficient).toBe(false);
  });
});

describe("useAbilityRoll — rollSave", () => {
  it("includes proficiency bonus when proficient=true", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 3,
      }),
    );
    let rollResult: ReturnType<typeof result.current.rollSave> | null = null;
    act(() => {
      rollResult = result.current.rollSave({
        ability: "con",
        abilityMod: 4,
        proficient: true,
      });
    });
    expect(rollResult!.total).toBe(17); // 10 + 4 + 3 (prof)
    expect(rollResult!.proficient).toBe(true);
    expect(rollResult!.modifier).toBe(7);
  });

  it("excludes proficiency bonus when proficient=false", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 3,
      }),
    );
    let rollResult: ReturnType<typeof result.current.rollSave> | null = null;
    act(() => {
      rollResult = result.current.rollSave({
        ability: "str",
        abilityMod: 0,
        proficient: false,
      });
    });
    expect(rollResult!.total).toBe(10); // 10 + 0 (no prof)
    expect(rollResult!.proficient).toBe(false);
  });

  it("broadcast payload reflects proficient + rollType=save", () => {
    forceRoll(15);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 4,
      }),
    );
    act(() => {
      result.current.rollSave({
        ability: "wis",
        abilityMod: 2,
        proficient: true,
      });
    });
    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.payload.rollType).toBe("save");
    expect(callArg.payload.proficient).toBe(true);
    expect(callArg.payload.result).toBe(21); // 15 + 2 + 4
  });
});

describe("useAbilityRoll — broadcast resilience", () => {
  it("does NOT throw when broadcast send rejects", () => {
    mockSend.mockRejectedValue(new Error("network down"));
    forceRoll(8);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 2,
      }),
    );
    let rollResult: ReturnType<typeof result.current.rollCheck> | null = null;
    expect(() => {
      act(() => {
        rollResult = result.current.rollCheck({ ability: "cha", abilityMod: 1 });
      });
    }).not.toThrow();
    // Roll still completed and persisted to history
    expect(rollResult!.total).toBe(9);
    expect(result.current.getHistory()).toHaveLength(1);
  });

  it("skips broadcast entirely when campaignId is null", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: null,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 2,
      }),
    );
    act(() => {
      result.current.rollCheck({ ability: "str", abilityMod: 0 });
    });
    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("skips broadcast when characterId is null but still rolls", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: null,
        characterName: CHARACTER_NAME,
        profBonus: 2,
      }),
    );
    let rollResult: ReturnType<typeof result.current.rollCheck> | null = null;
    act(() => {
      rollResult = result.current.rollCheck({ ability: "dex", abilityMod: 3 });
    });
    expect(rollResult!.total).toBe(13);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("useAbilityRoll — history TTL", () => {
  it("prunes entries older than 24h on next read", () => {
    forceRoll(10);
    const { result } = renderHook(() =>
      useAbilityRoll({
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        characterName: CHARACTER_NAME,
        profBonus: 2,
      }),
    );
    act(() => {
      result.current.rollCheck({ ability: "str", abilityMod: 0 });
    });
    expect(result.current.getHistory()).toHaveLength(1);

    // Advance fake clock 25 hours forward — entry should expire.
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 25 * 60 * 60 * 1000;
      expect(result.current.getHistory()).toHaveLength(0);
    } finally {
      Date.now = realNow;
    }
  });
});
