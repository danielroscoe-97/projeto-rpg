/**
 * Conversion error-code allowlist (Cluster ε — Winston #7).
 *
 * All `conversion:failed` analytics MUST normalize their `error` field through
 * {@link normalizeConversionErrorCode} before firing. Without normalization a
 * backend evolution that returns dynamic codes like
 * `internal_db_error_${uuid}` would explode the cardinality of the analytics
 * `error` dimension, ballooning storage + breaking dashboards that bucket by
 * distinct error codes.
 *
 * Rules:
 *   - A fixed allowlist keeps the dimension bounded at design time.
 *   - Anything not on the allowlist collapses to `"unknown"` — still reaches
 *     the funnel as a breadcrumb but doesn't pollute the dimension.
 *   - HTTP-status codes are pre-registered for the common rejection paths so
 *     client-side `http_${response.status}` coding keeps working.
 *   - `null | undefined | ""` collapse to `"unknown"` (defensive).
 *
 * Add a new code here when:
 *   - The backend deliberately introduces a new stable code you want graphed.
 *   - A third-party error surface (Supabase, Sentry) emits a known class you
 *     want to trend separately.
 *
 * Never add:
 *   - Dynamic codes (UUIDs, user-ids, request-ids).
 *   - Error *messages* (those are locale-specific and belong in logs).
 */

export const CONVERSION_ERROR_CODES = new Set<string>([
  // Request shape / validation rejections (server-side).
  "invalid_input",
  "already_authenticated",
  "unauthorized",
  // Generic server fallbacks.
  "internal",
  "network",
  "unknown",
  // HTTP-status bucket codes — covers the most common response classes a
  // client sees. Anything else maps to `unknown` via normalize().
  "http_400",
  "http_401",
  "http_403",
  "http_404",
  "http_409",
  "http_410",
  "http_429",
  "http_500",
  "http_502",
  "http_503",
  "http_504",
  // Client-side sentinel codes (known, bounded — used by existing tests).
  "rate_limited",
  "rate_limit",
  "dup_id_dedupe",
  "storage_write_failed",
  "user_dismissed",
  "invalid_character_id",
  // Browser-thrown Error.name values we want to keep distinct. Only the most
  // common JS error classes land here; exotic subclasses collapse to unknown.
  "TypeError",
  "AbortError",
  "NetworkError",
  "SyntaxError",
]);

/**
 * Normalize an arbitrary raw error string into the allowlisted set.
 *
 * @param raw  The code produced by the caller (server `code`, `err.name`,
 *             `http_${status}` fallback, etc). `undefined | null | ""` are
 *             treated as "unknown".
 * @returns    Either the original code (if allowlisted) or `"unknown"`.
 */
export function normalizeConversionErrorCode(
  raw: string | null | undefined,
): string {
  if (!raw || typeof raw !== "string" || raw.length === 0) return "unknown";
  if (CONVERSION_ERROR_CODES.has(raw)) return raw;
  return "unknown";
}
