/**
 * Conversion CTA dismissal store (Epic 03, Story 03-A).
 *
 * Tracks per-campaign dismissal count + timestamp in localStorage so the
 * `WaitingRoomSignupCTA` / `RecapCtaCard` can respect user intent without
 * being annoying.
 *
 * Precedence rules in `shouldShowCta` (top-down, F9):
 *   1. Storage inaccessible / parse error → true (graceful — prefer show)
 *   2. No record                          → true (first time)
 *   3. Campaign entry missing OR TTL expired (> 90d) → true (fresh slate)
 *   4. count >= CAP_PER_CAMPAIGN (3)      → false (cap wins cooldown)
 *   5. now - lastDismissedAt > COOLDOWN_DAYS (7) → true (cooldown passed)
 *   6. Default                            → false
 *
 * Notes:
 * - The "__guest__" sentinel is treated as a valid campaignId for guest mode
 *   (no real campaignId available there).
 * - All storage access is wrapped in try/catch (Safari ITP, iframe, SSR safe).
 */

// Exported so tests can clear the key deterministically (F24).
export const KEY = "pocketdm_conversion_dismissal_v1";
export const TTL_DAYS = 90;
export const CAP_PER_CAMPAIGN = 3;
export const COOLDOWN_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CampaignDismissalEntry = {
  count: number;
  lastDismissedAt: string; // ISO-8601
};

export type DismissalRecord = {
  dismissalsByCampaign: Record<string, CampaignDismissalEntry>;
  lastSeenCampaign: string | null;
};

/** Safe access to localStorage — returns null if unavailable. */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the dismissal record from storage and prunes TTL-expired entries.
 *
 * @returns null if storage is unavailable, key missing, or JSON is malformed.
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
    !("dismissalsByCampaign" in parsed)
  ) {
    return null;
  }

  const record = parsed as DismissalRecord;
  const dismissals = record.dismissalsByCampaign ?? {};
  const now = Date.now();
  const ttlMs = TTL_DAYS * MS_PER_DAY;

  // Prune TTL-expired entries in-place on read (F18).
  const pruned: Record<string, CampaignDismissalEntry> = {};
  for (const [campaignId, entry] of Object.entries(dismissals)) {
    if (!entry || typeof entry.lastDismissedAt !== "string") continue;
    const ts = Date.parse(entry.lastDismissedAt);
    if (Number.isNaN(ts)) continue;
    if (now - ts > ttlMs) continue; // expired — drop it
    pruned[campaignId] = entry;
  }

  return {
    dismissalsByCampaign: pruned,
    lastSeenCampaign: record.lastSeenCampaign ?? null,
  };
}

/** Persists a record back to storage. Swallows storage errors. */
function writeRecord(record: DismissalRecord): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(record));
  } catch {
    /* quota / ITP / disabled — nothing we can do, swallow */
  }
}

/**
 * Records a dismissal for the given campaign (or `"__guest__"` sentinel).
 * Increments the per-campaign count and updates lastDismissedAt to now.
 */
export function recordDismissal(campaignId: string | "__guest__"): void {
  const existing = readDismissalRecord() ?? {
    dismissalsByCampaign: {},
    lastSeenCampaign: null,
  };

  const prev = existing.dismissalsByCampaign[campaignId];
  const next: CampaignDismissalEntry = {
    count: (prev?.count ?? 0) + 1,
    lastDismissedAt: new Date().toISOString(),
  };

  const updated: DismissalRecord = {
    dismissalsByCampaign: {
      ...existing.dismissalsByCampaign,
      [campaignId]: next,
    },
    lastSeenCampaign: campaignId,
  };

  writeRecord(updated);
}

/**
 * Called when the user actually converts (signup/upgrade succeeds).
 * Removes the entire record so CTAs don't nag a user who already did what we asked.
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
 * Decides whether the conversion CTA should be shown for this campaign.
 * See file header for precedence ordering — the order below matters.
 */
export function shouldShowCta(campaignId: string | "__guest__"): boolean {
  // Rule 1: storage inaccessible → true (graceful, prefer showing).
  const storage = getStorage();
  if (!storage) return true;

  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return true;
  }

  // Rule 2: no record at all → true.
  if (raw === null) return true;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Parse error → storage treated as inaccessible (Rule 1 semantics).
    return true;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("dismissalsByCampaign" in parsed)
  ) {
    return true;
  }

  const record = parsed as DismissalRecord;
  const entry = record.dismissalsByCampaign?.[campaignId];

  // Rule 3a: no entry for this campaign → first time for this campaign.
  if (!entry) return true;

  const ts = Date.parse(entry.lastDismissedAt);
  if (Number.isNaN(ts)) return true; // malformed → be lenient
  const ageMs = Date.now() - ts;
  const ttlMs = TTL_DAYS * MS_PER_DAY;

  // Rule 3b: TTL expired → fresh slate.
  if (ageMs > ttlMs) return true;

  // Rule 4: cap reached → false, even if cooldown has passed.
  // (Cap wins cooldown — explicit user intent.)
  if (entry.count >= CAP_PER_CAMPAIGN) return false;

  // Rule 5: cooldown passed → give another chance.
  const cooldownMs = COOLDOWN_DAYS * MS_PER_DAY;
  if (ageMs > cooldownMs) return true;

  // Rule 6: default — still within cooldown window, under cap.
  return false;
}
