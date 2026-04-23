/**
 * HP status dedup tests — EP-0 C0.1.
 *
 * Covers:
 * - the new `getHpFraction` helper used by PlayerBottomBar,
 *   PlayerInitiativeBoard, and MonsterGroupHeader's buildGroupHealth.
 * - the 5-tier classifier boundaries for `getHpStatus` (legacy thresholds)
 *   to lock the labels FULL/LIGHT/MODERATE/HEAVY/CRITICAL against any
 *   future drift. (The v2 thresholds already have their own suite in
 *   hp-status-v2.test.ts.)
 */

import {
  getHpFraction,
  getHpPercentage,
  getHpStatus,
  type HpStatus,
} from "../hp-status";

describe("getHpFraction", () => {
  it("returns 0 when maxHp is 0 (guards against NaN)", () => {
    expect(getHpFraction(10, 0)).toBe(0);
  });

  it("returns 0 when maxHp is negative (defensive)", () => {
    expect(getHpFraction(10, -5)).toBe(0);
  });

  it("clamps fractions above 1 down to 1 (currentHp > maxHp)", () => {
    expect(getHpFraction(50, 40)).toBe(1);
  });

  it("clamps fractions below 0 up to 0 (negative currentHp)", () => {
    expect(getHpFraction(-5, 40)).toBe(0);
  });

  it("returns the exact fraction for normal inputs (no rounding)", () => {
    expect(getHpFraction(20, 40)).toBe(0.5);
    expect(getHpFraction(10, 40)).toBe(0.25);
    expect(getHpFraction(1, 3)).toBeCloseTo(1 / 3, 10);
  });

  it("is consistent with getHpPercentage (to within rounding)", () => {
    // getHpPercentage rounds to an integer; getHpFraction does not. The
    // relationship that holds is: round(fraction * 100) === getHpPercentage.
    const pairs = [
      [40, 40],
      [30, 40],
      [20, 40],
      [10, 40],
      [1, 40],
      [0, 40],
    ];
    for (const [cur, max] of pairs) {
      const fraction = getHpFraction(cur, max);
      expect(Math.round(fraction * 100)).toBe(getHpPercentage(cur, max));
    }
  });
});

describe("getHpStatus — 5-tier legacy classifier", () => {
  it("FULL when currentHp === maxHp", () => {
    expect(getHpStatus(40, 40)).toBe<HpStatus>("FULL");
    expect(getHpStatus(1, 1)).toBe<HpStatus>("FULL");
  });

  it("LIGHT when 70% < pct < 100%", () => {
    expect(getHpStatus(39, 40)).toBe<HpStatus>("LIGHT"); // 97.5%
    expect(getHpStatus(29, 40)).toBe<HpStatus>("LIGHT"); // 72.5%
  });

  it("MODERATE when 40% < pct <= 70%", () => {
    expect(getHpStatus(28, 40)).toBe<HpStatus>("MODERATE"); // exactly 70% (not > 70)
    expect(getHpStatus(17, 40)).toBe<HpStatus>("MODERATE"); // 42.5%
  });

  it("HEAVY when 10% < pct <= 40%", () => {
    expect(getHpStatus(16, 40)).toBe<HpStatus>("HEAVY"); // exactly 40% (not > 40)
    expect(getHpStatus(5, 40)).toBe<HpStatus>("HEAVY"); // 12.5%
  });

  it("CRITICAL when pct <= 10%", () => {
    expect(getHpStatus(4, 40)).toBe<HpStatus>("CRITICAL"); // exactly 10%
    expect(getHpStatus(1, 40)).toBe<HpStatus>("CRITICAL");
    expect(getHpStatus(0, 40)).toBe<HpStatus>("CRITICAL");
  });

  it("CRITICAL when maxHp <= 0 (defensive; matches v2 classifier)", () => {
    expect(getHpStatus(10, 0)).toBe<HpStatus>("CRITICAL");
    expect(getHpStatus(10, -1)).toBe<HpStatus>("CRITICAL");
  });
});
