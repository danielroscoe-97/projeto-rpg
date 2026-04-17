/**
 * S5.3 — Recharge dice roller parser
 *
 * Detects D&D 5e monster actions with `(Recharge X)` or `(Recharge X-Y)` patterns.
 * Extracts the d6 threshold and normalizes the action name into a state lookup key.
 *
 * Important: `(Recharges after a Short or Long Rest)` is NOT a recharge die — those
 * abilities refresh on rest, not on a d6 roll. The parser returns null for them so
 * no recharge UI is rendered.
 */

// Match `(Recharge 5-6)` / `(Recharge 6)` / `(Recharge 5–6)` (en-dash).
// Uses a negative lookahead for "Recharges" (plural) — short/long rest abilities
// use `(Recharges after ...)` or `(Recharges on ...)` which must not match.
// The `\b` before `Recharge` keeps the match anchored to the word (not "Recharges").
// We require the digit immediately after whitespace, so `Recharges after` can't satisfy.
const RECHARGE_RE = /\(Recharge\s+(\d)(?:[-\u2013](\d))?\)/i;

export interface RechargeInfo {
  /** Minimum d6 roll required to recharge (e.g. 5 for `(Recharge 5-6)`, 6 for `(Recharge 6)`). */
  threshold: number;
  /** Snake-case state lookup key derived from the action name with the `(Recharge ...)` suffix stripped. */
  key: string;
}

/**
 * Parse a monster action name for a recharge dice pattern.
 *
 * @returns `{ threshold, key }` when the name contains `(Recharge X)` or `(Recharge X-Y)`;
 *   `null` for plain names, rest-based recharges, or unrecognized patterns.
 */
export function parseRecharge(actionName: string): RechargeInfo | null {
  if (!actionName) return null;

  const match = actionName.match(RECHARGE_RE);
  if (!match) return null;

  const threshold = parseInt(match[1], 10);
  if (!Number.isFinite(threshold) || threshold < 2 || threshold > 6) return null;

  const key = actionName
    .replace(RECHARGE_RE, "")
    .trim()
    .toLowerCase()
    // Strip anything non-alphanumeric and collapse runs into a single underscore.
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) return null;
  return { threshold, key };
}

export interface RechargeRollResult {
  /** d6 face that was rolled (1-6). */
  roll: number;
  /** Whether the roll met or exceeded the threshold. */
  recharged: boolean;
}

/**
 * Roll a d6 against a recharge threshold.
 *
 * @param threshold - Minimum face required to recharge (typically 4, 5, or 6).
 * @returns `{ roll, recharged }` where `recharged = roll >= threshold`.
 */
export function rollRecharge(threshold: number): RechargeRollResult {
  const roll = Math.floor(Math.random() * 6) + 1;
  return { roll, recharged: roll >= threshold };
}
