// Uses jest globals (describe, it, expect, jest, beforeEach) — no import needed.

// ---------------------------------------------------------------------------
// Supabase mock plumbing
//
// We mock `@/lib/supabase/server` so `createServiceClient()` returns a stub
// whose chained query builder resolves to values we control per test. The
// builder mirrors the subset of the PostgREST API used by character-claim.ts
// (update/select/eq/is/range/order/count).
// ---------------------------------------------------------------------------

type BuilderResult = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

const state: {
  updateResult: BuilderResult;
  selectHeadResult: BuilderResult;
  selectRangeResult: BuilderResult;
} = {
  updateResult: { data: [], error: null },
  selectHeadResult: { count: 0, error: null },
  selectRangeResult: { data: [], error: null },
};

function makeUpdateBuilder() {
  const builder: {
    update: ReturnType<typeof jest.fn>;
    eq: ReturnType<typeof jest.fn>;
    is: ReturnType<typeof jest.fn>;
    select: ReturnType<typeof jest.fn>;
    then: (resolve: (value: BuilderResult) => unknown) => Promise<unknown>;
  } = {
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    is: jest.fn(() => builder),
    // Final terminating call for UPDATE paths.
    select: jest.fn(() => Promise.resolve(state.updateResult)),
    then: (resolve) => Promise.resolve(state.updateResult).then(resolve),
  };
  return builder;
}

function makeSelectBuilder() {
  // The builder is awaitable at two points: after the count-head chain, and
  // after the range chain. We return different stub values based on how the
  // chain is constructed.
  const builder: {
    select: ReturnType<typeof jest.fn>;
    eq: ReturnType<typeof jest.fn>;
    is: ReturnType<typeof jest.fn>;
    order: ReturnType<typeof jest.fn>;
    range: ReturnType<typeof jest.fn>;
    then: (resolve: (value: BuilderResult) => unknown) => Promise<unknown>;
    _mode: "head" | "range";
  } = {
    _mode: "head",
    select: jest.fn((_cols: string, opts?: { count?: string; head?: boolean }) => {
      builder._mode = opts?.head ? "head" : "range";
      return builder;
    }),
    eq: jest.fn(() => builder),
    is: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => Promise.resolve(state.selectRangeResult)),
    then: (resolve) => {
      const result = builder._mode === "head" ? state.selectHeadResult : state.selectRangeResult;
      return Promise.resolve(result).then(resolve);
    },
  };
  return builder;
}

const fromMock = jest.fn((_table: string) => {
  // Each call to .from() returns a fresh builder. The test controls behavior
  // via the shared `state` object — any builder path ultimately resolves to
  // state.updateResult / state.selectHeadResult / state.selectRangeResult.
  const builder: Record<string, unknown> = {};
  const updateBuilder = makeUpdateBuilder();
  const selectBuilder = makeSelectBuilder();

  builder.update = updateBuilder.update;
  builder.select = selectBuilder.select;
  // eq/is/order/range/then fall through to whichever sub-builder was used
  // first — we wire them to both so either chain resolves correctly.
  builder.eq = jest.fn((...args: unknown[]) => {
    updateBuilder.eq(...args);
    selectBuilder.eq(...args);
    return builder;
  });
  builder.is = jest.fn((...args: unknown[]) => {
    updateBuilder.is(...args);
    selectBuilder.is(...args);
    return builder;
  });
  builder.order = jest.fn((...args: unknown[]) => {
    selectBuilder.order(...args);
    return builder;
  });
  builder.range = jest.fn((...args: unknown[]) =>
    selectBuilder.range(...args),
  );
  // For UPDATE chain, `.select("id")` terminates with updateResult.
  // For SELECT count-head chain, the chain is awaited directly (via then).
  (builder as { then: unknown }).then = (resolve: (value: BuilderResult) => unknown) => {
    // Count-head chains await the builder after .is(); range chains await
    // after .range(). We can't perfectly disambiguate from here, so we rely
    // on the test setting selectHeadResult appropriately.
    return Promise.resolve(state.selectHeadResult).then(resolve);
  };
  // Override select to choose correct mode and terminator.
  builder.select = jest.fn(
    (cols: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        // count-head path — chain terminates when awaited via then
        return {
          eq: builder.eq,
          is: (...args: unknown[]) => {
            const inner = {
              is: (...a: unknown[]) => {
                (builder.is as (...x: unknown[]) => unknown)(...a);
                return Promise.resolve(state.selectHeadResult);
              },
            };
            (builder.is as (...x: unknown[]) => unknown)(...args);
            return inner;
          },
        };
      }
      if (cols === "id") {
        // UPDATE .select("id") terminator.
        return Promise.resolve(state.updateResult);
      }
      // SELECT "*" path — returns chain terminating at .range().
      return builder;
    },
  );

  return builder;
});

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

// ---------------------------------------------------------------------------
// Imports must come AFTER jest.mock so the mock is in place at module init.
// ---------------------------------------------------------------------------

import {
  claimCampaignCharacter,
  listClaimableCharacters,
} from "@/lib/supabase/character-claim";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CHAR_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_TOKEN_ID = "00000000-0000-0000-0000-000000000002";
const USER_ID = "00000000-0000-0000-0000-000000000003";
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000004";

function makeCharacter(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    campaign_id: CAMPAIGN_ID,
    user_id: null,
    claimed_by_session_token: null,
    name: "Hero",
    max_hp: 10,
    current_hp: 10,
    ac: 12,
    hp_temp: 0,
    speed: 30,
    initiative_bonus: 0,
    inspiration: false,
    conditions: [],
    spell_save_dc: null,
    dm_notes: "",
    race: null,
    class: null,
    level: null,
    subrace: null,
    subclass: null,
    background: null,
    alignment: null,
    notes: null,
    token_url: null,
    spell_slots: null,
    str: null,
    dex: null,
    con: null,
    int_score: null,
    wis: null,
    cha_score: null,
    traits: null,
    proficiencies: {},
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  state.updateResult = { data: [{ id: CHAR_ID }], error: null };
  state.selectHeadResult = { count: 0, error: null };
  state.selectRangeResult = { data: [], error: null };
});

describe("claimCampaignCharacter — identity validation", () => {
  it("throws when both sessionTokenId and userId are provided", async () => {
    await expect(
      claimCampaignCharacter(CHAR_ID, {
        sessionTokenId: SESSION_TOKEN_ID,
        userId: USER_ID,
      }),
    ).rejects.toThrow(/apenas sessionTokenId OU userId/);
  });

  it("throws when neither sessionTokenId nor userId is provided", async () => {
    await expect(claimCampaignCharacter(CHAR_ID, {})).rejects.toThrow(
      /forneça sessionTokenId ou userId/,
    );
  });
});

describe("claimCampaignCharacter — happy paths", () => {
  it("returns { claimedBy: 'anon' } when soft-claiming via sessionTokenId", async () => {
    state.updateResult = { data: [{ id: CHAR_ID }], error: null };

    const result = await claimCampaignCharacter(CHAR_ID, {
      sessionTokenId: SESSION_TOKEN_ID,
    });

    expect(result).toEqual({ claimedBy: "anon" });
    expect(fromMock).toHaveBeenCalledWith("player_characters");
  });

  it("returns { claimedBy: 'auth' } when hard-claiming via userId", async () => {
    state.updateResult = { data: [{ id: CHAR_ID }], error: null };

    const result = await claimCampaignCharacter(CHAR_ID, { userId: USER_ID });

    expect(result).toEqual({ claimedBy: "auth" });
    expect(fromMock).toHaveBeenCalledWith("player_characters");
  });
});

describe("claimCampaignCharacter — race (0 rows updated)", () => {
  it("throws 'Personagem já reivindicado' when UPDATE matches 0 rows", async () => {
    state.updateResult = { data: [], error: null };

    await expect(
      claimCampaignCharacter(CHAR_ID, { sessionTokenId: SESSION_TOKEN_ID }),
    ).rejects.toThrow("Personagem já reivindicado");
  });

  it("throws 'Personagem já reivindicado' when UPDATE returns null data", async () => {
    state.updateResult = { data: null, error: null };

    await expect(
      claimCampaignCharacter(CHAR_ID, { userId: USER_ID }),
    ).rejects.toThrow("Personagem já reivindicado");
  });
});

describe("listClaimableCharacters — identity validation", () => {
  it("throws when both sessionTokenId and userId are provided", async () => {
    await expect(
      listClaimableCharacters(
        CAMPAIGN_ID,
        { sessionTokenId: SESSION_TOKEN_ID, userId: USER_ID },
        { limit: 20, offset: 0 },
      ),
    ).rejects.toThrow(/apenas sessionTokenId OU userId/);
  });

  it("throws when neither sessionTokenId nor userId is provided", async () => {
    await expect(
      listClaimableCharacters(CAMPAIGN_ID, {}, { limit: 20, offset: 0 }),
    ).rejects.toThrow(/forneça sessionTokenId ou userId/);
  });
});

describe("listClaimableCharacters — empty result", () => {
  it("returns { characters: [], total: 0, hasMore: false } when nothing matches", async () => {
    state.selectHeadResult = { count: 0, error: null };
    state.selectRangeResult = { data: [], error: null };

    const result = await listClaimableCharacters(
      CAMPAIGN_ID,
      { sessionTokenId: SESSION_TOKEN_ID },
      { limit: 20, offset: 0 },
    );

    expect(result).toEqual({ characters: [], total: 0, hasMore: false });
  });
});

describe("listClaimableCharacters — pagination", () => {
  it("offset=0 limit=5 with total=10 returns first 5 and hasMore=true", async () => {
    const page = Array.from({ length: 5 }, (_, i) =>
      makeCharacter(`char-${i}`),
    );
    state.selectHeadResult = { count: 10, error: null };
    state.selectRangeResult = { data: page, error: null };

    const result = await listClaimableCharacters(
      CAMPAIGN_ID,
      { userId: USER_ID },
      { limit: 5, offset: 0 },
    );

    expect(result.characters).toHaveLength(5);
    expect(result.total).toBe(10);
    expect(result.hasMore).toBe(true);
  });

  it("last page (offset=5 limit=5 with total=10) returns last 5 and hasMore=false", async () => {
    const page = Array.from({ length: 5 }, (_, i) =>
      makeCharacter(`char-${i + 5}`),
    );
    state.selectHeadResult = { count: 10, error: null };
    state.selectRangeResult = { data: page, error: null };

    const result = await listClaimableCharacters(
      CAMPAIGN_ID,
      { userId: USER_ID },
      { limit: 5, offset: 5 },
    );

    expect(result.characters).toHaveLength(5);
    expect(result.total).toBe(10);
    expect(result.hasMore).toBe(false);
  });
});
