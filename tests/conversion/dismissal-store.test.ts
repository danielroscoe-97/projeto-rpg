/**
 * Unit tests for `components/conversion/dismissal-store.ts` (Epic 03, Story 03-A).
 *
 * Validates the 5-rule precedence chain in `shouldShowCta`, TTL purging,
 * per-campaign cap (3) winning cooldown (7d), the `"__guest__"` sentinel,
 * `resetOnConversion` side-effect, and graceful localStorage failure.
 *
 * Uses jest + jsdom (not vitest — see `jest.config.ts` `testEnvironment`).
 */

import {
  KEY,
  TTL_DAYS,
  CAP_PER_CAMPAIGN,
  COOLDOWN_DAYS,
  readDismissalRecord,
  recordDismissal,
  resetOnConversion,
  shouldShowCta,
  migrateDismissalEntry,
  type DismissalRecord,
} from "@/components/conversion/dismissal-store";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * MS_PER_DAY).toISOString();
}

function seedStorage(record: DismissalRecord): void {
  window.localStorage.setItem(KEY, JSON.stringify(record));
}

describe("dismissal-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("constants", () => {
    it("exports KEY with the stable v1 prefix (D6)", () => {
      expect(KEY).toBe("pocketdm_conversion_dismissal_v1");
    });

    it("exports TTL_DAYS=90, CAP_PER_CAMPAIGN=3, COOLDOWN_DAYS=7", () => {
      expect(TTL_DAYS).toBe(90);
      expect(CAP_PER_CAMPAIGN).toBe(3);
      expect(COOLDOWN_DAYS).toBe(7);
    });
  });

  describe("readDismissalRecord", () => {
    it("returns null when the key is absent", () => {
      expect(readDismissalRecord()).toBeNull();
    });

    it("returns null when JSON is malformed", () => {
      window.localStorage.setItem(KEY, "{not-json");
      expect(readDismissalRecord()).toBeNull();
    });

    it("prunes entries older than TTL (90d) on read", () => {
      seedStorage({
        dismissalsByCampaign: {
          fresh: { count: 1, lastDismissedAt: daysAgo(10) },
          stale: { count: 2, lastDismissedAt: daysAgo(120) },
        },
        lastSeenCampaign: "stale",
      });

      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.fresh).toBeDefined();
      expect(record?.dismissalsByCampaign.stale).toBeUndefined();
    });

    it("is graceful when localStorage throws on getItem (Safari ITP)", () => {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error("QuotaExceededError");
      });
      try {
        expect(readDismissalRecord()).toBeNull();
      } finally {
        Storage.prototype.getItem = original;
      }
    });
  });

  describe("shouldShowCta — precedence", () => {
    it("rule 1: storage throws → true (graceful)", () => {
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error("storage blocked");
      });
      try {
        expect(shouldShowCta("c1")).toBe(true);
      } finally {
        Storage.prototype.getItem = original;
      }
    });

    it("rule 2: no record → true", () => {
      expect(shouldShowCta("c1")).toBe(true);
    });

    it("rule 3a: no entry for this campaign → true", () => {
      seedStorage({
        dismissalsByCampaign: {
          other: { count: 2, lastDismissedAt: daysAgo(1) },
        },
        lastSeenCampaign: "other",
      });
      expect(shouldShowCta("c1")).toBe(true);
    });

    it("rule 3b: entry older than TTL → true", () => {
      seedStorage({
        dismissalsByCampaign: {
          c1: { count: 3, lastDismissedAt: daysAgo(120) },
        },
        lastSeenCampaign: "c1",
      });
      // Even at cap — TTL expiry means we give a fresh slate.
      expect(shouldShowCta("c1")).toBe(true);
    });

    it("rule 4: cap (3) wins cooldown — no re-prompt even after 7d passes", () => {
      // Dismissed 3x, last dismissal 30 days ago → cooldown (7d) has passed
      // but cap is reached, so we must NOT re-prompt.
      seedStorage({
        dismissalsByCampaign: {
          c1: { count: 3, lastDismissedAt: daysAgo(30) },
        },
        lastSeenCampaign: "c1",
      });
      expect(shouldShowCta("c1")).toBe(false);
    });

    it("rule 5: under cap, cooldown elapsed → true", () => {
      seedStorage({
        dismissalsByCampaign: {
          c1: { count: 1, lastDismissedAt: daysAgo(10) },
        },
        lastSeenCampaign: "c1",
      });
      expect(shouldShowCta("c1")).toBe(true);
    });

    it("rule 6: under cap, within cooldown window → false", () => {
      seedStorage({
        dismissalsByCampaign: {
          c1: { count: 2, lastDismissedAt: daysAgo(3) },
        },
        lastSeenCampaign: "c1",
      });
      expect(shouldShowCta("c1")).toBe(false);
    });
  });

  describe("sentinel __guest__", () => {
    it("is treated like any other campaignId for recordDismissal", () => {
      recordDismissal("__guest__");
      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.__guest__).toEqual(
        expect.objectContaining({ count: 1 }),
      );
    });

    it("honors cap + cooldown precedence for __guest__ campaignId", () => {
      seedStorage({
        dismissalsByCampaign: {
          __guest__: { count: 3, lastDismissedAt: daysAgo(20) },
        },
        lastSeenCampaign: "__guest__",
      });
      // Cap reached → false regardless of cooldown.
      expect(shouldShowCta("__guest__")).toBe(false);
    });

    it("returns true for __guest__ on first dismissal check", () => {
      expect(shouldShowCta("__guest__")).toBe(true);
    });
  });

  describe("recordDismissal", () => {
    it("increments count and updates lastDismissedAt", () => {
      recordDismissal("c1");
      recordDismissal("c1");
      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.c1.count).toBe(2);
      expect(record?.lastSeenCampaign).toBe("c1");
    });

    it("keeps entries for different campaigns isolated", () => {
      recordDismissal("c1");
      recordDismissal("c2");
      recordDismissal("c2");
      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.c1.count).toBe(1);
      expect(record?.dismissalsByCampaign.c2.count).toBe(2);
    });
  });

  describe("resetOnConversion", () => {
    it("removes the entire record (both campaigns gone)", () => {
      recordDismissal("c1");
      recordDismissal("c2");
      resetOnConversion();
      expect(window.localStorage.getItem(KEY)).toBeNull();
      expect(readDismissalRecord()).toBeNull();
      // After reset both campaigns are "fresh" again.
      expect(shouldShowCta("c1")).toBe(true);
      expect(shouldShowCta("c2")).toBe(true);
    });

    it("is a no-op when storage is inaccessible", () => {
      const original = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error("blocked");
      });
      try {
        expect(() => resetOnConversion()).not.toThrow();
      } finally {
        Storage.prototype.removeItem = original;
      }
    });
  });

  // M15 (code review fix) — atomic re-keying of dismissal entry for the
  // `__guest__ → realCampaignId` transition post-upgrade.
  describe("migrateDismissalEntry (M15)", () => {
    it("moves the __guest__ entry under the new campaignId", () => {
      seedStorage({
        dismissalsByCampaign: {
          __guest__: { count: 2, lastDismissedAt: daysAgo(1) },
        },
        lastSeenCampaign: "__guest__",
      });

      const migrated = migrateDismissalEntry("__guest__", "camp-real");
      expect(migrated).toBe(true);

      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.__guest__).toBeUndefined();
      expect(record?.dismissalsByCampaign["camp-real"]).toEqual(
        expect.objectContaining({ count: 2 }),
      );
      // lastSeenCampaign follows the migration.
      expect(record?.lastSeenCampaign).toBe("camp-real");
    });

    it("merges counts when the destination already has an entry", () => {
      const newer = daysAgo(1);
      const older = daysAgo(5);
      seedStorage({
        dismissalsByCampaign: {
          __guest__: { count: 2, lastDismissedAt: older },
          "camp-real": { count: 1, lastDismissedAt: newer },
        },
        lastSeenCampaign: "camp-real",
      });

      migrateDismissalEntry("__guest__", "camp-real");

      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign.__guest__).toBeUndefined();
      expect(record?.dismissalsByCampaign["camp-real"].count).toBe(3);
      // Latest timestamp wins.
      expect(record?.dismissalsByCampaign["camp-real"].lastDismissedAt).toBe(
        newer,
      );
    });

    it("returns false and leaves storage alone when fromId has no entry", () => {
      seedStorage({
        dismissalsByCampaign: {
          "camp-real": { count: 1, lastDismissedAt: daysAgo(1) },
        },
        lastSeenCampaign: "camp-real",
      });

      const migrated = migrateDismissalEntry("__guest__", "camp-real");
      expect(migrated).toBe(false);

      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign["camp-real"].count).toBe(1);
    });

    it("returns false when storage is empty (no record)", () => {
      expect(migrateDismissalEntry("__guest__", "camp-real")).toBe(false);
      expect(readDismissalRecord()).toBeNull();
    });

    it("is a no-op when fromId === toId", () => {
      seedStorage({
        dismissalsByCampaign: {
          "camp-1": { count: 2, lastDismissedAt: daysAgo(1) },
        },
        lastSeenCampaign: "camp-1",
      });
      expect(migrateDismissalEntry("camp-1", "camp-1")).toBe(false);
      const record = readDismissalRecord();
      expect(record?.dismissalsByCampaign["camp-1"].count).toBe(2);
    });

    it("after migration, shouldShowCta on the new campaignId honors the migrated cap", () => {
      seedStorage({
        dismissalsByCampaign: {
          __guest__: { count: 3, lastDismissedAt: daysAgo(30) },
        },
        lastSeenCampaign: "__guest__",
      });
      migrateDismissalEntry("__guest__", "camp-real");

      // Cap of 3 carries over → CTA must NOT show for the real campaign.
      expect(shouldShowCta("camp-real")).toBe(false);
      // And the guest sentinel is now fresh (no entry).
      expect(shouldShowCta("__guest__")).toBe(true);
    });
  });
});
