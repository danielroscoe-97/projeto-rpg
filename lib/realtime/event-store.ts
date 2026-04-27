/**
 * Event Store — client-side persistence of last-seen seq per session.
 *
 * Uses sessionStorage (NOT localStorage) because:
 *   - sessionStorage survives tab refresh but NOT tab close — matches the
 *     expected lifetime of a combat view
 *   - localStorage would persist across tabs / browser sessions and create
 *     confusing state when the user joins a new session from the same device
 *
 * SSR-safe: all accessors guard on `typeof window !== "undefined"`.
 *
 * Used by:
 *   - `useEventResume` hook to determine gap size on reconnect
 *   - broadcast event handlers to persist every accepted seq
 *
 * See: _bmad-output/estabilidade-combate/stories/CR-03-client-event-resume.md
 */

const STORAGE_PREFIX = "estcombate:lastseq:";
const storageKey = (sessionId: string): string => `${STORAGE_PREFIX}${sessionId}`;

/**
 * Get the last seen broadcast seq for a session. Returns 0 if the client
 * has never seen an event (or sessionStorage is unavailable in this env).
 */
export function getLastSeenSeq(sessionId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(storageKey(sessionId));
    const n = parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    // Private browsing, storage quota, etc. — fall through safely.
    return 0;
  }
}

/**
 * Persist the last seen seq for a session. Callers should invoke this after
 * successfully applying a broadcast event (live OR resumed).
 *
 * Silent failure is OK: worst case is "always fallback to /state refetch",
 * which is strictly worse than resume but still correct.
 */
export function setLastSeenSeq(sessionId: string, seq: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(seq) || seq < 0) return;
  try {
    window.sessionStorage.setItem(storageKey(sessionId), String(seq));
  } catch {
    // Ignore — see function contract above.
  }
}

/**
 * Clear the stored cursor for a session. Called on explicit leave / cleanup
 * to avoid cross-session confusion if the same tab joins a new session.
 */
export function clearLastSeenSeq(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // Ignore.
  }
}
