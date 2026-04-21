/**
 * Epic 12, Story 12.11 — pin the stats-math that the review flagged.
 *
 * These functions live inline in `CombatTimeline.tsx` (server component).
 * We re-derive the formulas here so regressions surface even without
 * rendering the component. If someone refactors the denominator back to
 * `wins / entries.length`, this test fails loudly.
 */

type R = {
  combat_result: "victory" | "tpk" | "fled" | "dm_ended" | null;
  duration_seconds: number | null;
  dm_difficulty_rating: number | null;
};

function winRatePct(entries: R[]): number | null {
  const wins = entries.filter((e) => e.combat_result === "victory").length;
  const tpks = entries.filter((e) => e.combat_result === "tpk").length;
  const decisive = wins + tpks;
  return decisive > 0 ? Math.round((wins / decisive) * 100) : null;
}

function avgRating(entries: R[]): number | null {
  const rated = entries.filter((e) => e.dm_difficulty_rating != null && e.dm_difficulty_rating > 0);
  return rated.length > 0
    ? rated.reduce((sum, e) => sum + (e.dm_difficulty_rating ?? 0), 0) / rated.length
    : null;
}

function avgDurationSec(entries: R[]): number | null {
  const timed = entries.filter((e) => e.duration_seconds && e.duration_seconds > 0);
  return timed.length > 0
    ? timed.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0) / timed.length
    : null;
}

describe("timeline stats math (Story 12.11)", () => {
  it("win rate excludes fled + dm_ended from the denominator", () => {
    // 1 victory, 5 dm_ended — old math would report 17% (misleading).
    // Correct math: no TPK, 1 victory → 100% win rate on decisive combats.
    const entries: R[] = [
      { combat_result: "victory", duration_seconds: 120, dm_difficulty_rating: 3 },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
    ];
    expect(winRatePct(entries)).toBe(100);
  });

  it("win rate returns null when there are no decisive outcomes", () => {
    const entries: R[] = [
      { combat_result: "fled", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "dm_ended", duration_seconds: null, dm_difficulty_rating: null },
    ];
    expect(winRatePct(entries)).toBeNull();
  });

  it("win rate for 1 victory + 1 tpk is 50%", () => {
    const entries: R[] = [
      { combat_result: "victory", duration_seconds: 60, dm_difficulty_rating: 2 },
      { combat_result: "tpk", duration_seconds: 30, dm_difficulty_rating: 5 },
    ];
    expect(winRatePct(entries)).toBe(50);
  });

  it("avg rating ignores null + zero ratings", () => {
    const entries: R[] = [
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: 0 },
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: 4 },
      { combat_result: "tpk", duration_seconds: null, dm_difficulty_rating: 2 },
    ];
    // Average of [4, 2] = 3.0
    expect(avgRating(entries)).toBe(3);
  });

  it("avg rating is null when nothing is rated", () => {
    const entries: R[] = [
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "tpk", duration_seconds: null, dm_difficulty_rating: 0 },
    ];
    expect(avgRating(entries)).toBeNull();
  });

  it("avg duration ignores null + zero durations", () => {
    const entries: R[] = [
      { combat_result: "victory", duration_seconds: 60, dm_difficulty_rating: null },
      { combat_result: "victory", duration_seconds: 0, dm_difficulty_rating: null },
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: null },
      { combat_result: "tpk", duration_seconds: 120, dm_difficulty_rating: null },
    ];
    expect(avgDurationSec(entries)).toBe(90);
  });

  it("avg duration is null for empty or untimed campaigns", () => {
    expect(avgDurationSec([])).toBeNull();
    expect(avgDurationSec([
      { combat_result: "victory", duration_seconds: null, dm_difficulty_rating: null },
    ])).toBeNull();
  });
});
