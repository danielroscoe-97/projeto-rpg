/**
 * DM-upsell CTA dismissal store (Epic 04 Story 04-E).
 *
 * Tracks per-user dismissal count + timestamps in localStorage so the
 * `BecomeDmCta` respects "not right now" without being annoying. Separate
 * storage namespace from the conversion dismissal store (Epic 03) because
 * the two CTAs target different audiences and different actions — mixing
 * them in one record would mean "I dismissed the DM upsell" silently
 * counted against the Pro/monetization nudge, or vice versa.
 *
 * Shape is simpler than the conversion store: the DM upsell is a single
 * decision per user (not per-campaign), so the record is flat.
 *
 * Precedence rules in `shouldShowCta` (top-down):
 *   1. Storage inaccessible / parse error → true (graceful — prefer show)
 *   2. No record                          → true (first time)
 *   3. TTL expired (> 90d since first dismissal) → true (fresh slate)
 *   4. count >= CAP (3)                   → false (cap wins cooldown)
 *   5. now - lastDismissedAt > COOLDOWN (7d) → true (cooldown passed)
 *   6. Default                            → false
 *
 * All storage access is wrapped in try/catch (Safari ITP, iframe, SSR safe).
 */

export const KEY = "pocketdm_dm_upsell_dismissal_v1";
export const TTL_DAYS = 90;
export const CAP = 3;
export const COOLDOWN_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type DismissalRecord = {
  count: number;
  lastDismissedAt: string; // ISO-8601
  firstDismissedAt: string; // ISO-8601 — TTL anchor
};

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the dismissal record. Returns null if storage unavailable, key
 * missing, malformed JSON, or the record is TTL-expired (in which case
 * we treat the slate as fresh).
 */
export function readDismissalRecord(): DismissalRecord | null {
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).count !== "number" ||
    typeof (parsed as Record<string, unknown>).lastDismissedAt !== "string" ||
    typeof (parsed as Record<string, unknown>).firstDismissedAt !== "string"
  ) {
    return null;
  }

  const record = parsed as DismissalRecord;
  const firstTs = Date.parse(record.firstDismissedAt);
  if (Number.isNaN(firstTs)) return null;

  // TTL: if the first dismissal was more than 90 days ago, drop the record
  // entirely so the user gets a clean chance to see the CTA again. The
  // cap-at-3 semantics are preserved within each 90-day window.
  if (Date.now() - firstTs > TTL_DAYS * MS_PER_DAY) {
    try {
      storage.removeItem(KEY);
    } catch {
      /* swallow */
    }
    return null;
  }

  return record;
}

function writeRecord(record: DismissalRecord): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* quota / ITP / disabled — swallow */
  }
}

/**
 * Records a dismissal click. Increments count and updates lastDismissedAt.
 * Anchors firstDismissedAt on the very first dismissal so the 90-day TTL
 * rolls against a stable reference.
 */
export function recordDismissal(): void {
  const now = new Date().toISOString();
  const existing = readDismissalRecord();

  const next: DismissalRecord = existing
    ? {
        count: existing.count + 1,
        lastDismissedAt: now,
        firstDismissedAt: existing.firstDismissedAt,
      }
    : {
        count: 1,
        lastDismissedAt: now,
        firstDismissedAt: now,
      };

  writeRecord(next);
}

/**
 * Called when the user actually converts (creates their first campaign).
 * Nukes the record so the CTA never re-nags a real DM if their role drops
 * back to 'player' later via settings.
 */
export function resetOnConversion(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    /* swallow */
  }
}

/**
 * Decides whether to show the DM-upsell CTA based on dismissal history.
 * See header for precedence.
 *
 * NOTE: this is the CLIENT-SIDE gate. The server-side gate (sessions,
 * role, onboarding) is in `lib/upsell/should-show-dm-cta.ts`. Both must
 * return true for the CTA to render.
 */
export function shouldShowCta(): boolean {
  const record = readDismissalRecord();

  // Rules 1, 2, 3 (via TTL-expired removal in readDismissalRecord): null → show.
  if (record === null) return true;

  // Rule 4: cap reached → permanent hide within the 90d TTL window.
  if (record.count >= CAP) return false;

  const lastTs = Date.parse(record.lastDismissedAt);
  if (Number.isNaN(lastTs)) return true;

  const cooldownMs = COOLDOWN_DAYS * MS_PER_DAY;
  // Rule 5: cooldown passed → show again.
  if (Date.now() - lastTs > cooldownMs) return true;

  // Rule 6: still within cooldown → hide.
  return false;
}
