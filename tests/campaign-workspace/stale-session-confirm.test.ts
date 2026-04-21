/**
 * Epic 12, Story 12.9 AC5 — staleness detection for the "resume combat" gate.
 *
 * Pinned against regressions on the 4h threshold. The modal itself requires
 * a DOM render (portal), so this file covers the pure logic only.
 */
import {
  STALE_SESSION_THRESHOLD_MS,
  staleIdleMinutes,
} from "@/components/campaign/StaleSessionConfirm";

const NOW = 1_700_000_000_000; // fixed clock

describe("staleIdleMinutes — 4h threshold (Story 12.9 AC5)", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it("returns null when input is null or undefined", () => {
    expect(staleIdleMinutes(null)).toBeNull();
    expect(staleIdleMinutes(undefined)).toBeNull();
  });

  it("returns null when input is not a parseable ISO", () => {
    expect(staleIdleMinutes("nope")).toBeNull();
    expect(staleIdleMinutes("")).toBeNull();
  });

  it("returns null when the session is fresh (< 4h)", () => {
    const freshIso = new Date(NOW - 60 * 60 * 1000).toISOString(); // 1h ago
    expect(staleIdleMinutes(freshIso)).toBeNull();
  });

  it("returns null right at the threshold boundary", () => {
    const atThreshold = new Date(NOW - STALE_SESSION_THRESHOLD_MS + 1).toISOString();
    expect(staleIdleMinutes(atThreshold)).toBeNull();
  });

  it("returns integer minutes once idle crosses the threshold", () => {
    const fourHoursAgo = new Date(NOW - STALE_SESSION_THRESHOLD_MS).toISOString();
    // Exactly at threshold — floor gives 240
    expect(staleIdleMinutes(fourHoursAgo)).toBe(240);
  });

  it("returns minutes for a day-old combat", () => {
    const dayAgo = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();
    expect(staleIdleMinutes(dayAgo)).toBe(24 * 60);
  });
});
