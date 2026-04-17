/**
 * S5.4 — Guest recap persistence (localStorage + 24h TTL).
 *
 * Tests the persistence utility in isolation. UI/banner rendering is covered
 * by manual smoke in setup phase of GuestCombatClient.
 */

import {
  GUEST_LAST_RECAP_KEY,
  GUEST_LAST_RECAP_TTL_MS,
  saveGuestLastRecap,
  clearGuestLastRecap,
  readGuestLastRecap,
} from "./guest-last-recap";
import type { CombatReport } from "@/lib/types/combat-report";

const sampleReport: CombatReport = {
  awards: [],
  narratives: [],
  summary: {
    totalDuration: 120_000,
    totalRounds: 3,
    totalDamage: 45,
    pcsDown: 0,
    monstersDefeated: 2,
    totalCrits: 1,
    totalFumbles: 0,
    avgTurnTime: 10_000,
    matchup: "2 vs 2",
  },
  rankings: [],
  encounterName: "Test Encounter",
  timestamp: Date.now(),
};

describe("guest-last-recap persistence (S5.4)", () => {
  beforeEach(() => {
    // jsdom provides localStorage — clear it between tests.
    window.localStorage.clear();
  });

  it("mount with empty localStorage returns null (no banner state)", () => {
    expect(readGuestLastRecap()).toBeNull();
  });

  it("saveGuestLastRecap populates localStorage with the valid shape", () => {
    saveGuestLastRecap(sampleReport, "Encontro de teste");
    const raw = window.localStorage.getItem(GUEST_LAST_RECAP_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.encounterLabel).toBe("Encontro de teste");
    expect(parsed.report.encounterName).toBe("Test Encounter");
    expect(typeof parsed.savedAt).toBe("number");
    expect(parsed.savedAt).toBeGreaterThan(0);
  });

  it("readGuestLastRecap returns the payload when <24h old", () => {
    saveGuestLastRecap(sampleReport, "Label A");
    const loaded = readGuestLastRecap();
    expect(loaded).not.toBeNull();
    expect(loaded!.encounterLabel).toBe("Label A");
    expect(loaded!.report.encounterName).toBe("Test Encounter");
  });

  it("readGuestLastRecap returns null + clears localStorage when >24h old", () => {
    // Save with savedAt = now, then simulate "now" 25 hours later.
    saveGuestLastRecap(sampleReport, "Old label");
    const future = Date.now() + 25 * 60 * 60 * 1000;
    const result = readGuestLastRecap(future);
    expect(result).toBeNull();
    // Expired payload is proactively cleared.
    expect(window.localStorage.getItem(GUEST_LAST_RECAP_KEY)).toBeNull();
  });

  it("readGuestLastRecap treats corrupt JSON as missing and clears it", () => {
    window.localStorage.setItem(GUEST_LAST_RECAP_KEY, "not-json-at-all");
    const result = readGuestLastRecap();
    expect(result).toBeNull();
    expect(window.localStorage.getItem(GUEST_LAST_RECAP_KEY)).toBeNull();
  });

  it("clearGuestLastRecap removes the stored payload", () => {
    saveGuestLastRecap(sampleReport, "To be cleared");
    expect(window.localStorage.getItem(GUEST_LAST_RECAP_KEY)).not.toBeNull();
    clearGuestLastRecap();
    expect(window.localStorage.getItem(GUEST_LAST_RECAP_KEY)).toBeNull();
  });

  it("boundary: exactly 24h old is considered expired", () => {
    saveGuestLastRecap(sampleReport, "Edge");
    const exactlyTtl = Date.now() + GUEST_LAST_RECAP_TTL_MS;
    expect(readGuestLastRecap(exactlyTtl)).toBeNull();
  });
});
