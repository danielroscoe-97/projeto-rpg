/**
 * Tests for lib/stores/dm-upsell-dismissal.ts — Epic 04 Story 04-E client
 * dismissal gate.
 */

import {
  KEY,
  CAP,
  COOLDOWN_DAYS,
  TTL_DAYS,
  readDismissalRecord,
  recordDismissal,
  resetOnConversion,
  shouldShowCta,
} from "@/lib/stores/dm-upsell-dismissal";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("dm-upsell-dismissal store", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useRealTimers();
  });

  describe("shouldShowCta", () => {
    it("returns true when storage is empty (first time)", () => {
      expect(shouldShowCta()).toBe(true);
    });

    it("returns true when stored JSON is malformed (graceful)", () => {
      localStorage.setItem(KEY, "not-json");
      expect(shouldShowCta()).toBe(true);
    });

    it("returns true when record shape is invalid (missing fields)", () => {
      localStorage.setItem(KEY, JSON.stringify({ count: 1 }));
      expect(shouldShowCta()).toBe(true);
    });

    it("returns false immediately after a single dismissal", () => {
      recordDismissal();
      expect(shouldShowCta()).toBe(false);
    });

    it("returns true after COOLDOWN_DAYS have passed", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      recordDismissal();
      // Advance past the cooldown
      jest.setSystemTime(
        new Date(Date.now() + (COOLDOWN_DAYS + 1) * MS_PER_DAY),
      );
      expect(shouldShowCta()).toBe(true);
    });

    it("returns false within cooldown window even on re-check", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      recordDismissal();
      jest.setSystemTime(new Date(Date.now() + (COOLDOWN_DAYS - 1) * MS_PER_DAY));
      expect(shouldShowCta()).toBe(false);
    });

    it("returns false PERMANENTLY once CAP is reached (within TTL)", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      // Dismiss CAP times (with cooldown between each — mimicking realistic UX).
      for (let i = 0; i < CAP; i++) {
        recordDismissal();
        jest.setSystemTime(
          new Date(Date.now() + (COOLDOWN_DAYS + 1) * MS_PER_DAY),
        );
      }
      // Advance further — still capped.
      jest.setSystemTime(new Date(Date.now() + 30 * MS_PER_DAY));
      expect(shouldShowCta()).toBe(false);
    });

    it("resets to show=true once TTL from FIRST dismissal expires", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      recordDismissal();
      recordDismissal();
      recordDismissal(); // 3 dismissals — at cap
      expect(shouldShowCta()).toBe(false);
      // Jump past TTL — the record self-cleans on read and we get a fresh slate.
      jest.setSystemTime(new Date(Date.now() + (TTL_DAYS + 1) * MS_PER_DAY));
      expect(shouldShowCta()).toBe(true);
      // And the record was actually removed.
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });

  describe("recordDismissal", () => {
    it("creates a record on first dismissal with count=1", () => {
      recordDismissal();
      const record = readDismissalRecord();
      expect(record?.count).toBe(1);
      expect(record?.firstDismissedAt).toBe(record?.lastDismissedAt);
    });

    it("increments count and updates lastDismissedAt on subsequent dismissals", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      recordDismissal();
      const firstAt = readDismissalRecord()?.firstDismissedAt;
      jest.setSystemTime(new Date("2026-01-10T00:00:00Z"));
      recordDismissal();
      const record = readDismissalRecord();
      expect(record?.count).toBe(2);
      expect(record?.firstDismissedAt).toBe(firstAt); // anchor preserved
      expect(record?.lastDismissedAt).not.toBe(firstAt); // advanced
    });
  });

  describe("resetOnConversion", () => {
    it("removes the record so CTA shows again (if user reverts to player)", () => {
      recordDismissal();
      expect(localStorage.getItem(KEY)).not.toBeNull();
      resetOnConversion();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(shouldShowCta()).toBe(true);
    });

    it("is a no-op when no record exists", () => {
      expect(() => resetOnConversion()).not.toThrow();
    });
  });

  describe("storage error handling", () => {
    it("readDismissalRecord returns null when JSON.parse throws", () => {
      localStorage.setItem(KEY, "{malformed");
      expect(readDismissalRecord()).toBeNull();
    });

    it("readDismissalRecord returns null when firstDismissedAt is unparseable", () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          count: 1,
          lastDismissedAt: new Date().toISOString(),
          firstDismissedAt: "not-a-date",
        }),
      );
      expect(readDismissalRecord()).toBeNull();
    });
  });

  describe("tamper resistance (adversarial review)", () => {
    function writeRawRecord(obj: unknown) {
      localStorage.setItem(KEY, JSON.stringify(obj));
    }
    const validDates = {
      lastDismissedAt: new Date().toISOString(),
      firstDismissedAt: new Date().toISOString(),
    };

    it("rejects a record with negative count (treats as no record → show)", () => {
      writeRawRecord({ count: -1, ...validDates });
      expect(readDismissalRecord()).toBeNull();
      expect(shouldShowCta()).toBe(true);
    });

    it("rejects a record with Infinity count", () => {
      writeRawRecord({ count: Number.POSITIVE_INFINITY, ...validDates });
      expect(readDismissalRecord()).toBeNull();
      expect(shouldShowCta()).toBe(true);
    });

    it("rejects a record with NaN count", () => {
      writeRawRecord({ count: Number.NaN, ...validDates });
      expect(readDismissalRecord()).toBeNull();
    });

    it("rejects a record with non-integer count (fractional)", () => {
      writeRawRecord({ count: 1.5, ...validDates });
      expect(readDismissalRecord()).toBeNull();
    });
  });
});
