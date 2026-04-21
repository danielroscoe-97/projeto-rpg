/**
 * Guest migrate-pending storage — Wave 3a fix (Cluster α, W#2).
 *
 * Handshake surface between `GuestRecapFlow` (writes) and the post-auth paths
 * (reads: `AuthCallbackContinueClient`, `upgrade-context-storage`, dashboard
 * fallback). Covers two conversion paths where the modal unmounts before the
 * migrate POST can fire:
 *
 *   1. Email signup with `enable_confirmations = true` → `signUp()` returns
 *      without a session; the user has to click the confirmation email first.
 *      When they come back, we must remember which guest Combatant to migrate.
 *
 *   2. Google OAuth → `supabase.auth.signInWithOAuth` unmounts the entire
 *      tab (redirect to accounts.google.com), then returns via the callback
 *      route. The in-memory state of GuestRecapFlow is long gone.
 *
 * TTL of 10 minutes is chosen so that a human-timed sequence (pick → email
 * inbox → confirmation click) succeeds cleanly, but a stale record from a
 * forgotten tab a day later never auto-migrates.
 *
 * Contract owned by Cluster α; Cluster β consumes `readGuestMigratePending`
 * and `clearGuestMigratePending` inside the auth-callback continuation.
 */

import type { Combatant } from "@/lib/types/combat";

export const GUEST_MIGRATE_PENDING_KEY = "pocketdm_guest_migrate_pending_v1";
export const GUEST_MIGRATE_PENDING_TTL_MS = 10 * 60 * 1000; // 10 min

/**
 * sessionStorage key holding the per-session fingerprint UUID. This lets the
 * OAuth callback verify that the pending record was written by the same tab
 * that the user is now returning to — prevents a leaked `guest-migrate-pending`
 * from being consumed by a different user who signs in on the same device
 * within the 10-minute TTL window (Cluster Δ C4).
 */
export const GUEST_SESSION_FINGERPRINT_KEY =
  "pocketdm_guest_session_fingerprint_v1";

export type GuestMigratePending = {
  version: 1;
  guestCharacter: Combatant;
  campaignId?: string;
  /** ISO-8601 timestamp of when the user picked this character. */
  selectedAt: string;
  /**
   * UUID generated once per browsing session and kept in sessionStorage.
   * The OAuth callback compares this with its own sessionStorage entry to
   * detect cross-tab / cross-user contamination and abort the migrate.
   * Optional for backward compatibility — legacy pending records (pre-Cluster Δ)
   * will be accepted as-is, but new writes always populate it (Cluster Δ C4).
   */
  ownerFingerprint?: string;
};

/**
 * Returns a stable per-session fingerprint UUID, generating one the first time
 * it's called in the session. Uses sessionStorage so it's automatically
 * discarded when the tab closes (and therefore can't leak to other users).
 *
 * SSR / storage-disabled returns null; callers should tolerate that (the
 * fingerprint check degrades to a best-effort — absence of fingerprint on
 * either side is treated as "legacy / unknown" and doesn't block the migrate).
 */
export function getOrCreateGuestSessionFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.sessionStorage;
    const existing = storage.getItem(GUEST_SESSION_FINGERPRINT_KEY);
    if (existing && typeof existing === "string" && existing.length > 0) {
      return existing;
    }
    // crypto.randomUUID is widely available (Edge 92+, Firefox 95+, Safari 15.4+).
    // Fallback path uses getRandomValues — both produce unguessable UUIDs.
    let fp: string;
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      fp = crypto.randomUUID();
    } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      fp = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      fp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
    storage.setItem(GUEST_SESSION_FINGERPRINT_KEY, fp);
    return fp;
  } catch {
    return null;
  }
}

/**
 * Reads the fingerprint without writing. Used by the callback for comparison
 * — if the callback's sessionStorage is empty (different tab / new session)
 * this returns null and the caller detects mismatch.
 */
export function readGuestSessionFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.sessionStorage;
    const existing = storage.getItem(GUEST_SESSION_FINGERPRINT_KEY);
    return typeof existing === "string" && existing.length > 0 ? existing : null;
  } catch {
    return null;
  }
}

/** Safe storage accessor — SSR, iframe, ITP, storage-disabled all return null. */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Persists the selected guest character so the post-auth flow (email-confirm
 * bounce-back or OAuth redirect return) can finish the migration.
 *
 * Silently no-ops on storage failure — callers MUST NOT block the conversion
 * for a storage hiccup. The live-session path in GuestRecapFlow still POSTs
 * directly; this key only exists for the async return paths.
 */
export function writeGuestMigratePending(
  data: Omit<GuestMigratePending, "version" | "selectedAt" | "ownerFingerprint">,
): void {
  const storage = getStorage();
  if (!storage) return;

  // Cluster Δ C4 — stamp the current tab's fingerprint so the OAuth callback
  // can reject records consumed in a foreign tab / by a different user.
  const ownerFingerprint =
    getOrCreateGuestSessionFingerprint() ?? undefined;

  const payload: GuestMigratePending = {
    version: 1,
    guestCharacter: data.guestCharacter,
    campaignId: data.campaignId,
    selectedAt: new Date().toISOString(),
    ownerFingerprint,
  };

  try {
    storage.setItem(GUEST_MIGRATE_PENDING_KEY, JSON.stringify(payload));
  } catch {
    // quota / ITP / disabled — swallow; live-session path stays authoritative.
  }
}

/**
 * Reads the pending migrate record.
 *
 * Returns null if:
 *   - storage is unavailable,
 *   - key is missing,
 *   - payload is malformed,
 *   - version is not 1 (future-proofing against schema changes),
 *   - `selectedAt` is stale (> `GUEST_MIGRATE_PENDING_TTL_MS`).
 *
 * A stale record is silently removed so callers don't accumulate zombie
 * entries. Callers still MUST `clearGuestMigratePending()` after a
 * successful migrate to keep storage clean (TTL is a safety net, not a GC).
 */
export function readGuestMigratePending(): GuestMigratePending | null {
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(GUEST_MIGRATE_PENDING_KEY);
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
    (parsed as { version?: unknown }).version !== 1
  ) {
    return null;
  }

  const record = parsed as GuestMigratePending;

  // Validate required shape pieces so downstream code doesn't crash.
  if (
    !record.guestCharacter ||
    typeof record.guestCharacter !== "object" ||
    typeof record.selectedAt !== "string"
  ) {
    return null;
  }

  const ts = Date.parse(record.selectedAt);
  if (Number.isNaN(ts)) return null;

  if (Date.now() - ts > GUEST_MIGRATE_PENDING_TTL_MS) {
    // Stale — sweep it so we don't pile up dead entries.
    try {
      storage.removeItem(GUEST_MIGRATE_PENDING_KEY);
    } catch {
      // swallow
    }
    return null;
  }

  return record;
}

/**
 * Removes the pending record. Call after a successful migrate, or when the
 * user explicitly abandons the flow (future enhancement).
 */
export function clearGuestMigratePending(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(GUEST_MIGRATE_PENDING_KEY);
  } catch {
    // swallow
  }
}
