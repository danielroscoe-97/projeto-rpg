/**
 * Returns today's date in the user's browser timezone as YYYY-MM-DD.
 * Used to determine which session note to create/fetch.
 *
 * Note: this returns the LOCAL date. If the DM crosses a date line or
 * has a misconfigured clock, they may get a different "today" than the
 * server. The UNIQUE index on (campaign_id, session_date) prevents
 * duplicate notes, but the DM might see two notes in one calendar day
 * if they travel. Accepted edge case.
 */
export function getSessionDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
