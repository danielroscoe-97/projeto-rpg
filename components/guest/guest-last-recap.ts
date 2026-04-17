/**
 * S5.4 — Guest Recap Persistence
 *
 * Persist the last-ended guest combat recap to localStorage with a 24h TTL
 * so a user who closes the tab after combat can recover the recap on return.
 *
 * Only used by `components/guest/GuestCombatClient.tsx`. The persistence is
 * Guest-only — Anon/Auth already persist via Track A's `/api/session/[id]/latest-recap`.
 */

import type { CombatReport } from "@/lib/types/combat-report";

export const GUEST_LAST_RECAP_KEY = "pdm:guest:last-recap:v1";
export const GUEST_LAST_RECAP_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface GuestLastRecapPayload {
  report: CombatReport;
  savedAt: number;
  encounterLabel: string;
}

/** Best-effort write. Silently no-ops if localStorage is unavailable. */
export function saveGuestLastRecap(
  report: CombatReport,
  encounterLabel: string,
): void {
  if (typeof window === "undefined") return;
  try {
    // Defensive: never persist an empty label — banner falls back on read-side
    // but keeping data clean at write-time avoids surprises in downstream consumers.
    const safeLabel =
      encounterLabel?.trim() || report.encounterName?.trim() || "";
    const payload: GuestLastRecapPayload = {
      report,
      savedAt: Date.now(),
      encounterLabel: safeLabel,
    };
    window.localStorage.setItem(GUEST_LAST_RECAP_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded, disabled storage, etc. — intentionally swallowed.
  }
}

/** Best-effort clear. */
export function clearGuestLastRecap(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_LAST_RECAP_KEY);
  } catch {
    // ignore
  }
}

/**
 * Read the last-recap payload if present AND not expired.
 * Returns null in all other cases (missing, corrupt, expired).
 * Expired payloads are proactively cleared as a side effect.
 */
export function readGuestLastRecap(
  now: number = Date.now(),
): GuestLastRecapPayload | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(GUEST_LAST_RECAP_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: GuestLastRecapPayload | null = null;
  try {
    parsed = JSON.parse(raw) as GuestLastRecapPayload;
  } catch {
    // Corrupt — clear and treat as missing.
    clearGuestLastRecap();
    return null;
  }
  if (
    !parsed ||
    typeof parsed.savedAt !== "number" ||
    !parsed.report ||
    typeof parsed.encounterLabel !== "string"
  ) {
    clearGuestLastRecap();
    return null;
  }
  if (now - parsed.savedAt >= GUEST_LAST_RECAP_TTL_MS) {
    // Expired — clear and return null.
    clearGuestLastRecap();
    return null;
  }
  return parsed;
}
