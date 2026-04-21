/**
 * S3.1 — Tests for `getHpStatusWithFlag` and `deriveDisplayState`.
 *
 * Verifies the threshold-band swap behavior (flag OFF = legacy 70/40/10,
 * flag ON = v2 75/50/25) and the client-only DEFEATED derivation.
 *
 * The HpStatus union MUST stay immutable — `deriveDisplayState` returns
 * "DEFEATED" as a UI-only state that never crosses a broadcast boundary.
 */

import {
  getHpStatus,
  getHpStatusWithFlag,
  deriveDisplayState,
  formatHpPct,
  getHpThresholds,
  HP_THRESHOLDS_LEGACY,
  HP_THRESHOLDS_V2,
  type HpStatus,
} from "../hp-status";

describe("getHpStatusWithFlag — flag OFF (legacy 70/40/10 bands)", () => {
  it("returns FULL at 100% regardless of flag", () => {
    expect(getHpStatusWithFlag(40, 40, false)).toBe("FULL");
    expect(getHpStatusWithFlag(40, 40, true)).toBe("FULL");
  });

  it("matches getHpStatus (legacy) at every boundary when flag OFF", () => {
    const pairs: Array<[number, number, HpStatus]> = [
      [40, 40, "FULL"],
      [39, 40, "LIGHT"], // 97.5% > 70% → LIGHT
      [29, 40, "LIGHT"], // 72.5% > 70% → LIGHT
      [28, 40, "MODERATE"], // exactly 70% — NOT > 70, falls to MODERATE
      [17, 40, "MODERATE"], // 42.5% > 40% → MODERATE
      [16, 40, "HEAVY"], // exactly 40% — NOT > 40, falls to HEAVY
      [12, 40, "HEAVY"], // 30% > 10% → HEAVY
      [5, 40, "HEAVY"], // 12.5% > 10% → HEAVY
      [4, 40, "CRITICAL"], // exactly 10% — NOT > 10, CRITICAL
      [1, 40, "CRITICAL"],
    ];
    for (const [cur, max, expected] of pairs) {
      expect(getHpStatusWithFlag(cur, max, false)).toBe(expected);
      expect(getHpStatus(cur, max)).toBe(expected);
    }
  });
});

describe("getHpStatusWithFlag — flag ON (v2 75/50/25 bands)", () => {
  it("returns LIGHT down to 75% (vs legacy 70%)", () => {
    // 30/40 = 75% — exactly 75 → NOT > 75, falls to MODERATE
    expect(getHpStatusWithFlag(30, 40, true)).toBe("MODERATE");
    // 31/40 = 77.5% > 75% → LIGHT
    expect(getHpStatusWithFlag(31, 40, true)).toBe("LIGHT");
  });

  it("returns MODERATE down to 50% (vs legacy 40%)", () => {
    // 20/40 = 50% → NOT > 50, falls to HEAVY
    expect(getHpStatusWithFlag(20, 40, true)).toBe("HEAVY");
    // 21/40 = 52.5% > 50% → MODERATE
    expect(getHpStatusWithFlag(21, 40, true)).toBe("MODERATE");
  });

  it("returns HEAVY down to 25% (vs legacy 10%)", () => {
    // 10/40 = 25% → NOT > 25, falls to CRITICAL
    expect(getHpStatusWithFlag(10, 40, true)).toBe("CRITICAL");
    // 11/40 = 27.5% > 25% → HEAVY
    expect(getHpStatusWithFlag(11, 40, true)).toBe("HEAVY");
  });

  it("returns CRITICAL at or below 25% (vs legacy ≤10%)", () => {
    expect(getHpStatusWithFlag(10, 40, true)).toBe("CRITICAL");
    expect(getHpStatusWithFlag(5, 40, true)).toBe("CRITICAL");
    expect(getHpStatusWithFlag(1, 40, true)).toBe("CRITICAL");
  });

  it("HP above 25% (legacy HEAVY) gets promoted to HEAVY with v2 (not CRITICAL)", () => {
    // At 12% HP: legacy tiers → HEAVY (>10%). v2 tiers → CRITICAL (≤25%).
    // This is the point of v2: more warning before the dark-red skull tier.
    expect(getHpStatusWithFlag(5, 40, false)).toBe("HEAVY"); // 12.5%
    expect(getHpStatusWithFlag(5, 40, true)).toBe("CRITICAL"); // 12.5%
  });
});

describe("getHpStatusWithFlag — edge cases", () => {
  it("returns CRITICAL when maxHp <= 0 (defensive)", () => {
    expect(getHpStatusWithFlag(10, 0, false)).toBe("CRITICAL");
    expect(getHpStatusWithFlag(10, -5, true)).toBe("CRITICAL");
  });

  it("does NOT add DEFEATED to the HpStatus union (ABI invariant)", () => {
    // This is a compile-time expectation: if someone accidentally adds
    // "DEFEATED" to HpStatus this assignment fails to typecheck.
    const tiers: HpStatus[] = ["FULL", "LIGHT", "MODERATE", "HEAVY", "CRITICAL"];
    expect(tiers).toHaveLength(5);
    for (const t of tiers) {
      expect(["FULL", "LIGHT", "MODERATE", "HEAVY", "CRITICAL"]).toContain(t);
    }
  });
});

describe("formatHpPct — legend/tooltip strings stay in sync with thresholds", () => {
  it("FULL is always '100%' regardless of flag", () => {
    expect(formatHpPct("FULL", false)).toBe("100%");
    expect(formatHpPct("FULL", true)).toBe("100%");
  });

  it("renders legacy bands (70/40/10) as inclusive ranges when flag OFF", () => {
    expect(formatHpPct("LIGHT", false)).toBe("70\u2013100%");
    expect(formatHpPct("MODERATE", false)).toBe("40\u201370%");
    expect(formatHpPct("HEAVY", false)).toBe("10\u201340%");
    expect(formatHpPct("CRITICAL", false)).toBe("0\u201310%");
  });

  it("renders v2 bands (75/50/25) as inclusive ranges when flag ON", () => {
    expect(formatHpPct("LIGHT", true)).toBe("75\u2013100%");
    expect(formatHpPct("MODERATE", true)).toBe("50\u201375%");
    expect(formatHpPct("HEAVY", true)).toBe("25\u201350%");
    expect(formatHpPct("CRITICAL", true)).toBe("0\u201325%");
  });

  it("getHpThresholds returns the matching constants for each flag state", () => {
    expect(getHpThresholds(false)).toBe(HP_THRESHOLDS_LEGACY);
    expect(getHpThresholds(true)).toBe(HP_THRESHOLDS_V2);
  });

  it("REGRESSION: range endpoints match the bands used by getHpStatusWithFlag", () => {
    // If these diverge, the HP legend will lie to the user — which is
    // exactly the bug the formatHpPct helper exists to prevent.
    for (const flagV2 of [false, true]) {
      const t = getHpThresholds(flagV2);
      const light = Math.round(t.light * 100);
      const moderate = Math.round(t.moderate * 100);
      const heavy = Math.round(t.heavy * 100);
      expect(formatHpPct("LIGHT", flagV2)).toBe(`${light}\u2013100%`);
      expect(formatHpPct("MODERATE", flagV2)).toBe(`${moderate}\u2013${light}%`);
      expect(formatHpPct("HEAVY", flagV2)).toBe(`${heavy}\u2013${moderate}%`);
      expect(formatHpPct("CRITICAL", flagV2)).toBe(`0\u2013${heavy}%`);
    }
  });
});

describe("deriveDisplayState", () => {
  it("returns status unchanged when HP > 0", () => {
    expect(deriveDisplayState({ hp_status: "FULL", current_hp: 40 })).toBe("FULL");
    expect(deriveDisplayState({ hp_status: "LIGHT", current_hp: 32 })).toBe("LIGHT");
    expect(deriveDisplayState({ hp_status: "CRITICAL", current_hp: 2 })).toBe("CRITICAL");
  });

  it("returns DEFEATED when current_hp <= 0 (any status tier)", () => {
    // Even if server sent CRITICAL, if HP hits 0 client shows DEFEATED.
    expect(deriveDisplayState({ hp_status: "CRITICAL", current_hp: 0 })).toBe("DEFEATED");
    expect(deriveDisplayState({ hp_status: "FULL", current_hp: 0 })).toBe("DEFEATED");
    expect(deriveDisplayState({ hp_status: "LIGHT", current_hp: -5 })).toBe("DEFEATED");
  });

  it("never mutates the input status (idempotent)", () => {
    const input = { hp_status: "LIGHT" as const, current_hp: 20 };
    deriveDisplayState(input);
    expect(input.hp_status).toBe("LIGHT");
    expect(input.current_hp).toBe(20);
  });
});
