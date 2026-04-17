/**
 * Shared helpers for the recap-persistence endpoint family.
 *
 * Keeps the serialization / size guard / NULL-byte guard in one testable
 * module that both `POST /api/encounters/[id]/recap` and its unit tests can
 * import, mirroring the `MAX_PAYLOAD_SIZE = 100_000` cap used by
 * `app/api/combat-reports/route.ts`.
 */

/** Matches combat-reports/route.ts MAX_PAYLOAD_SIZE (100KB). */
export const MAX_RECAP_PAYLOAD_SIZE = 100_000;

export type SerializeRecapResult =
  | { status: "ok"; payload: unknown; serialized: string; bytes: number }
  | { status: "too_large"; bytes: number }
  | { status: "null_bytes" };

/**
 * JSON-serialize a recap payload and apply the two persistence invariants:
 *   1. Size cap — Postgres JSONB would accept more, but we stay within the
 *      combat-reports budget to keep broadcasts + DB writes uniform.
 *   2. NULL byte guard — Postgres text / JSONB string values reject \u0000;
 *      we fail fast with a 400 rather than hit a DB-level error.
 */
export function serializeRecapSafely(report: unknown): SerializeRecapResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(report);
  } catch {
    // Circular refs or non-serializable values — shouldn't happen for the
    // CombatReport shape, but we degrade gracefully.
    return { status: "null_bytes" };
  }

  if (serialized.length > MAX_RECAP_PAYLOAD_SIZE) {
    return { status: "too_large", bytes: serialized.length };
  }

  // Postgres JSONB rejects strings containing U+0000 (NUL). `JSON.stringify`
  // escapes that code point into the 6-char sequence `\u0000`, so the raw
  // NUL won't appear in `serialized` — we must look for the escape instead.
  // We still check for raw NUL as defense in depth, and tolerate
  // `\u0000` / `\U0000` casing to match Postgres' rejection rule.
  if (serialized.includes("\u0000") || /\\u0000/i.test(serialized)) {
    return { status: "null_bytes" };
  }

  return {
    status: "ok",
    payload: report,
    serialized,
    bytes: serialized.length,
  };
}
