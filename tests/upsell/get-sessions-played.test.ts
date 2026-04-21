/**
 * Epic 04 Story 04-B — `getSessionsPlayed` coverage.
 *
 * Target: `lib/upsell/get-sessions-played.ts`
 *
 * Scenarios
 *   1. Primary read happy path — matview returns sessions_played, returns it.
 *   2. Zero-row user — `my_sessions_played` yields null data, returns 0.
 *   3. Matview query error — returns 0 (silent fallback).
 *   4. Fresh matview (<= 5 min) — no fallback, returns matview value.
 *   5. Stale matview + user NOT newer than last_counted — returns matview.
 *   6. F19 stale matview + user newer → live COUNT fallback path runs
 *      (distinct session ids across defeated-encounter set).
 *   7. F19 fallback honours the "at least one defeated combatant" filter —
 *      encounter whose combatants are all is_defeated=false is excluded.
 *   8. F19 fallback — any sub-query error returns the matview snapshot,
 *      never throws.
 *   9. Defensive guard — empty/invalid userId returns 0 without touching DB.
 */

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

type BuilderResult<T = unknown> = {
  data?: T;
  error?: { message: string } | null;
};

interface PlayerCharRow { id: string }
interface CombatantRow { encounter_id: string | null; is_defeated?: boolean }
interface EncounterRow { session_id: string | null }

const state: {
  matview: BuilderResult<{ sessions_played: number; last_counted_session_at: string | null } | null>;
  userRow: BuilderResult<{ last_session_at: string | null } | null>;
  playerChars: BuilderResult<PlayerCharRow[]>;
  // Combatants keyed by the IN clause target column:
  //   `player_character_id` lookup returns state.combatantsByPc
  //   `encounter_id` + is_defeated=true lookup returns state.defeatedCombatants
  combatantsByPc: BuilderResult<CombatantRow[]>;
  defeatedCombatants: BuilderResult<CombatantRow[]>;
  encounters: BuilderResult<EncounterRow[]>;
  // Call trace so tests can assert the hot-path pipeline did run.
  calls: Array<{ table: string; op: string; args?: unknown }>;
} = {
  matview: { data: null, error: null },
  userRow: { data: null, error: null },
  playerChars: { data: [], error: null },
  combatantsByPc: { data: [], error: null },
  defeatedCombatants: { data: [], error: null },
  encounters: { data: [], error: null },
  calls: [],
};

// ---------------------------------------------------------------------------
// Supabase mock — minimal chain builder
// ---------------------------------------------------------------------------

function makeMyBuilder() {
  const b = {
    select: jest.fn(() => b),
    maybeSingle: jest.fn(() => {
      state.calls.push({ table: "my_sessions_played", op: "maybeSingle" });
      return Promise.resolve(state.matview);
    }),
  };
  return b;
}

function makeUsersBuilder() {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn(() => b),
    maybeSingle: jest.fn(() => {
      state.calls.push({ table: "users", op: "maybeSingle" });
      return Promise.resolve(state.userRow);
    }),
  };
  return b;
}

function makePlayerCharsBuilder() {
  const b = {
    select: jest.fn(() => b),
    eq: jest.fn((col: string, val: unknown) => {
      state.calls.push({
        table: "player_characters",
        op: "eq",
        args: { col, val },
      });
      return b;
    }),
    limit: jest.fn(() => b), // H5 — route calls .limit() before awaiting
    // Terminal — await returns state.playerChars
    then: (resolve: (v: BuilderResult<PlayerCharRow[]>) => unknown) =>
      resolve(state.playerChars),
  };
  return b;
}

function makeCombatantsBuilder() {
  const b = {
    select: jest.fn(() => b),
    in: jest.fn((col: string, vals: unknown[]) => {
      state.calls.push({
        table: "combatants",
        op: "in",
        args: { col, vals },
      });
      b._byColumn = col;
      return b;
    }),
    eq: jest.fn((col: string, val: unknown) => {
      state.calls.push({
        table: "combatants",
        op: "eq",
        args: { col, val },
      });
      b._isDefeatedFilter = col === "is_defeated" && val === true;
      return b;
    }),
    limit: jest.fn(() => b), // H5 — route calls .limit() before awaiting
    _byColumn: "",
    _isDefeatedFilter: false,
    then: (resolve: (v: BuilderResult<CombatantRow[]>) => unknown) => {
      // Dispatch based on which column was used for the IN clause and
      // whether is_defeated=true was added on top.
      if (b._byColumn === "player_character_id") {
        resolve(state.combatantsByPc);
      } else if (b._byColumn === "encounter_id" && b._isDefeatedFilter) {
        resolve(state.defeatedCombatants);
      } else {
        resolve({ data: [], error: null });
      }
      return b;
    },
  };
  return b;
}

function makeEncountersBuilder() {
  const b = {
    select: jest.fn(() => b),
    in: jest.fn((col: string, vals: unknown[]) => {
      state.calls.push({
        table: "encounters",
        op: "in",
        args: { col, vals },
      });
      return b;
    }),
    limit: jest.fn(() => b), // H5 — route calls .limit() before awaiting
    then: (resolve: (v: BuilderResult<EncounterRow[]>) => unknown) =>
      resolve(state.encounters),
  };
  return b;
}

const createClientMock = jest.fn(async () => ({
  from: jest.fn((table: string) => {
    if (table === "my_sessions_played") return makeMyBuilder();
    if (table === "users") return makeUsersBuilder();
    if (table === "player_characters") return makePlayerCharsBuilder();
    if (table === "combatants") return makeCombatantsBuilder();
    if (table === "encounters") return makeEncountersBuilder();
    throw new Error(`Unexpected table in test: ${table}`);
  }),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => createClientMock(),
}));

// ---------------------------------------------------------------------------
// Imports — after mock
// ---------------------------------------------------------------------------

import { getSessionsPlayed } from "@/lib/upsell/get-sessions-played";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-0000-0000-00000000abcd";

function isoMinutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

beforeEach(() => {
  jest.clearAllMocks();
  state.matview = { data: null, error: null };
  state.userRow = { data: null, error: null };
  state.playerChars = { data: [], error: null };
  state.combatantsByPc = { data: [], error: null };
  state.defeatedCombatants = { data: [], error: null };
  state.encounters = { data: [], error: null };
  state.calls = [];
});

// ---------------------------------------------------------------------------
// 1. Primary read happy path
// ---------------------------------------------------------------------------

describe("getSessionsPlayed — primary read", () => {
  it("returns the matview's sessions_played when matview is fresh", async () => {
    state.matview = {
      data: {
        sessions_played: 5,
        // 30 seconds old = well within the 5-min threshold
        last_counted_session_at: isoMinutesAgo(0.5),
      },
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(5);
    // No hot-path pipeline was run
    expect(
      state.calls.find((c) => c.table === "player_characters"),
    ).toBeUndefined();
  });

  it("returns 0 when matview emits zero rows (new user)", async () => {
    state.matview = { data: null, error: null };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(0);
  });

  it("returns 0 when the matview query errors (silent fallback)", async () => {
    state.matview = { data: null, error: { message: "boom" } };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(0);
  });

  it("returns 0 for empty/invalid userId without touching the DB", async () => {
    const result = await getSessionsPlayed("");
    expect(result).toBe(0);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. F19 — hot-path fallback gates
// ---------------------------------------------------------------------------

describe("getSessionsPlayed — F19 hot-path fallback gates", () => {
  it("stays on matview when stale but user activity is NOT newer", async () => {
    state.matview = {
      data: {
        sessions_played: 2,
        last_counted_session_at: isoMinutesAgo(10), // stale
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(20) }, // older than matview
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(2);
    // Pipeline must NOT have run — the "user newer" gate short-circuited.
    expect(
      state.calls.find((c) => c.table === "player_characters"),
    ).toBeUndefined();
  });

  it("stays on matview when users.last_session_at is null", async () => {
    state.matview = {
      data: {
        sessions_played: 4,
        last_counted_session_at: isoMinutesAgo(30),
      },
      error: null,
    };
    state.userRow = { data: { last_session_at: null }, error: null };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 3. F19 — live COUNT happy path
// ---------------------------------------------------------------------------

describe("getSessionsPlayed — F19 live COUNT fallback", () => {
  it("runs the pipeline and returns distinct session count when matview is stale AND user is newer", async () => {
    state.matview = {
      data: {
        sessions_played: 2, // stale snapshot
        last_counted_session_at: isoMinutesAgo(10),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };

    // User owns 2 characters
    state.playerChars = {
      data: [{ id: "pc-1" }, { id: "pc-2" }],
      error: null,
    };
    // Each char appears in combatants for 2 encounters (e1, e2, e3 distinct)
    state.combatantsByPc = {
      data: [
        { encounter_id: "e1" },
        { encounter_id: "e2" },
        { encounter_id: "e3" },
        { encounter_id: "e1" }, // dup; should be deduped by Set
      ],
      error: null,
    };
    // All 3 encounters had at least one defeated combatant (EXISTS proxy)
    state.defeatedCombatants = {
      data: [
        { encounter_id: "e1" },
        { encounter_id: "e2" },
        { encounter_id: "e3" },
      ],
      error: null,
    };
    // e1+e2 in same session, e3 in another → 2 distinct sessions
    state.encounters = {
      data: [
        { session_id: "sess-A" },
        { session_id: "sess-A" },
        { session_id: "sess-B" },
      ],
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(2);

    // Confirm mirror of the matview WHERE-clause shape:
    //   - filtered player_characters by user_id
    //   - combatants IN player_character_id
    //   - defeated combatants IN encounter_id + is_defeated=true
    //   - encounters IN id (for the "session_id" projection)
    const tables = state.calls.map((c) => `${c.table}.${c.op}`);
    expect(tables).toContain("player_characters.eq");
    expect(tables).toContain("combatants.in");
    expect(tables).toContain("combatants.eq"); // the is_defeated=true guard
    expect(tables).toContain("encounters.in");

    const defeatedCall = state.calls.find(
      (c) =>
        c.table === "combatants" &&
        c.op === "eq" &&
        (c.args as { col: string }).col === "is_defeated",
    );
    expect(defeatedCall).toBeTruthy();
    expect((defeatedCall!.args as { val: unknown }).val).toBe(true);
  });

  it("excludes encounters that never had a defeated combatant (EXISTS proxy mirror)", async () => {
    state.matview = {
      data: {
        sessions_played: 1,
        last_counted_session_at: isoMinutesAgo(10),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };
    state.playerChars = { data: [{ id: "pc-1" }], error: null };
    // Two candidate encounters …
    state.combatantsByPc = {
      data: [{ encounter_id: "e-played" }, { encounter_id: "e-draft" }],
      error: null,
    };
    // … but only ONE ever saw a defeated combatant. The draft must be dropped.
    state.defeatedCombatants = {
      data: [{ encounter_id: "e-played" }],
      error: null,
    };
    state.encounters = {
      data: [{ session_id: "sess-only" }],
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(1);
  });

  it("falls back to matview snapshot when any sub-query errors", async () => {
    state.matview = {
      data: {
        sessions_played: 7,
        last_counted_session_at: isoMinutesAgo(20),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };
    // Pipeline starts … then errors at combatants step
    state.playerChars = { data: [{ id: "pc-1" }], error: null };
    state.combatantsByPc = { data: undefined, error: { message: "rls" } };

    const result = await getSessionsPlayed(USER_ID);
    // Returns snapshot rather than 0 or throws
    expect(result).toBe(7);
  });

  it("falls back to matview when user has no player_characters row", async () => {
    state.matview = {
      data: {
        sessions_played: 3,
        last_counted_session_at: isoMinutesAgo(10),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };
    state.playerChars = { data: [], error: null };

    const result = await getSessionsPlayed(USER_ID);
    expect(result).toBe(3);
  });

  it("H4 — monotonicity: never returns a count LOWER than the matview", async () => {
    // Matview says 5; live pipeline walks 3 distinct sessions (e.g. user's
    // earlier PCs were soft-deleted / archived but the matview still has
    // their contribution from before the drop).
    state.matview = {
      data: {
        sessions_played: 5,
        last_counted_session_at: isoMinutesAgo(10),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };
    state.playerChars = {
      data: [{ id: "pc-1" }],
      error: null,
    };
    state.combatantsByPc = {
      data: [{ encounter_id: "enc-a" }, { encounter_id: "enc-b" }, { encounter_id: "enc-c" }],
      error: null,
    };
    state.defeatedCombatants = {
      data: [
        { encounter_id: "enc-a" },
        { encounter_id: "enc-b" },
        { encounter_id: "enc-c" },
      ],
      error: null,
    };
    state.encounters = {
      data: [
        { session_id: "sess-1" },
        { session_id: "sess-2" },
        { session_id: "sess-3" },
      ],
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    // Live would say 3, matview says 5. Math.max = 5.
    expect(result).toBe(5);
  });

  it("H5 — aborts to matview when a pipeline stage hits FALLBACK_ROW_LIMIT", async () => {
    // The implementation caps each SELECT at 10_000. We simulate a user
    // with exactly that many combatants (absurd but the defensive edge).
    state.matview = {
      data: {
        sessions_played: 7,
        last_counted_session_at: isoMinutesAgo(10),
      },
      error: null,
    };
    state.userRow = {
      data: { last_session_at: isoMinutesAgo(1) },
      error: null,
    };
    state.playerChars = {
      data: [{ id: "pc-1" }],
      error: null,
    };
    // 10_000 combatants → hits the cap, abort live path.
    state.combatantsByPc = {
      data: Array.from({ length: 10_000 }, (_, i) => ({
        encounter_id: `enc-${i}`,
      })),
      error: null,
    };

    const result = await getSessionsPlayed(USER_ID);
    // Abort → matview snapshot.
    expect(result).toBe(7);
  });
});
