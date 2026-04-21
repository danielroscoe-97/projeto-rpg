/**
 * Epic 12, Story 12.6a — CombatTimeline relativeKey() bucketing.
 *
 * Pinned against regressions on the "how long ago" bucket boundaries, which
 * the Wave 2 review flagged as an off-by-one-prone area (30→60 day slot,
 * future-dated edge, month rounding). Runs as a server-component helper but
 * is a pure function, so unit-tests it cleanly.
 */
import { relativeKey } from "@/components/campaign/CombatTimeline";

const HOUR = 3_600_000;
const DAY = HOUR * 24;

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

function isoFromNow(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

describe("relativeKey — bucket boundaries (Story 12.6a)", () => {
  it("returns 'just_now' for timestamps under 1 hour old", () => {
    expect(relativeKey(isoAgo(0)).key).toBe("timeline_relative_just_now");
    expect(relativeKey(isoAgo(HOUR * 0.5)).key).toBe("timeline_relative_just_now");
  });

  it("returns 'today' between 1h and 24h", () => {
    expect(relativeKey(isoAgo(HOUR * 1.01)).key).toBe("timeline_relative_today");
    expect(relativeKey(isoAgo(HOUR * 23)).key).toBe("timeline_relative_today");
  });

  it("returns 'yesterday' between 24h and 48h", () => {
    expect(relativeKey(isoAgo(DAY * 1)).key).toBe("timeline_relative_yesterday");
    expect(relativeKey(isoAgo(DAY * 1.5)).key).toBe("timeline_relative_yesterday");
  });

  it("returns 'days_ago' with count between 2 and 29 days", () => {
    const r3 = relativeKey(isoAgo(DAY * 3));
    expect(r3).toEqual({ key: "timeline_relative_days_ago", vars: { count: 3 } });
    const r15 = relativeKey(isoAgo(DAY * 15));
    expect(r15).toEqual({ key: "timeline_relative_days_ago", vars: { count: 15 } });
    const r29 = relativeKey(isoAgo(DAY * 29));
    expect(r29).toEqual({ key: "timeline_relative_days_ago", vars: { count: 29 } });
  });

  it("returns 'month_ago' between 30 and 59 days (inclusive)", () => {
    // Tighter than the Wave 2 review's flag — 30 days → floor(30/30)=1 → month_ago
    expect(relativeKey(isoAgo(DAY * 30)).key).toBe("timeline_relative_month_ago");
    expect(relativeKey(isoAgo(DAY * 45)).key).toBe("timeline_relative_month_ago");
    expect(relativeKey(isoAgo(DAY * 59)).key).toBe("timeline_relative_month_ago");
  });

  it("returns 'months_ago' with count ≥ 2 for 60+ days", () => {
    const r60 = relativeKey(isoAgo(DAY * 60));
    expect(r60).toEqual({ key: "timeline_relative_months_ago", vars: { count: 2 } });
    const r120 = relativeKey(isoAgo(DAY * 120));
    expect(r120).toEqual({ key: "timeline_relative_months_ago", vars: { count: 4 } });
  });

  it("normalizes future-dated timestamps to 'just_now' (clock drift)", () => {
    expect(relativeKey(isoFromNow(HOUR * 2)).key).toBe("timeline_relative_just_now");
    expect(relativeKey(isoFromNow(DAY)).key).toBe("timeline_relative_just_now");
  });
});
