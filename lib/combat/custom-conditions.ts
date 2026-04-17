/**
 * S4.2 — Custom conditions created by the DM.
 *
 * Storage format: `custom:Name|Description` (description optional → `custom:Name`).
 * The `|` separator is used instead of `:` to avoid colliding with existing
 * condition parsers like `concentrating:Fireball` or `exhaustion:3`.
 *
 * The full string lives in `Combatant.conditions: string[]` — no schema
 * migration required; existing broadcast types carry it as a plain string.
 *
 * Feature flag: `ff_custom_conditions_v1` (default OFF). UI must gate the
 * creation affordance on `isFeatureFlagEnabled("ff_custom_conditions_v1")`.
 *
 * Telemetry (LGPD-safe): log `name_length` ONLY, never the raw name — custom
 * names may contain player / campaign data.
 */
export const CUSTOM_CONDITION_PREFIX = "custom:";
export const CUSTOM_CONDITION_SEPARATOR = "|";
export const CUSTOM_NAME_MAX_LENGTH = 32;
export const CUSTOM_DESC_MAX_LENGTH = 200;

export function isCustomCondition(condition: string): boolean {
  return condition.startsWith(CUSTOM_CONDITION_PREFIX);
}

export interface ParsedCustomCondition {
  name: string;
  description?: string;
}

/**
 * Parse a storage-format string into `{ name, description }`.
 *
 * Guarantees:
 * - Non-custom input returns `{ name: "" }` (defensive) — callers MUST guard
 *   with `isCustomCondition` first for correct semantics.
 * - A malformed entry like `custom:` (empty payload) returns `{ name: "" }`.
 * - Whitespace-only description is normalised to `undefined`.
 */
export function parseCustomCondition(condition: string): ParsedCustomCondition {
  if (!isCustomCondition(condition)) return { name: "" };
  const raw = condition.slice(CUSTOM_CONDITION_PREFIX.length);
  const sepIdx = raw.indexOf(CUSTOM_CONDITION_SEPARATOR);
  if (sepIdx === -1) return { name: raw.trim(), description: undefined };
  const name = raw.slice(0, sepIdx).trim();
  const description = raw.slice(sepIdx + 1).trim();
  return { name, description: description.length > 0 ? description : undefined };
}

/**
 * Format a `{ name, description? }` tuple into storage format with:
 * - trim()
 * - separator sanitisation (strip `|` from both fields)
 * - max-length enforcement (32 for name, 200 for description)
 * - empty-name rejection via thrown Error (caller validates UI before call)
 */
export function formatCustomCondition(name: string, description?: string): string {
  const safeName = name
    .trim()
    .slice(0, CUSTOM_NAME_MAX_LENGTH)
    .replace(new RegExp(`\\${CUSTOM_CONDITION_SEPARATOR}`, "g"), "");
  if (safeName.length === 0) {
    throw new Error("formatCustomCondition: name must be non-empty after trim");
  }
  const rawDesc = (description ?? "")
    .trim()
    .slice(0, CUSTOM_DESC_MAX_LENGTH)
    .replace(new RegExp(`\\${CUSTOM_CONDITION_SEPARATOR}`, "g"), "");
  return rawDesc.length > 0
    ? `${CUSTOM_CONDITION_PREFIX}${safeName}${CUSTOM_CONDITION_SEPARATOR}${rawDesc}`
    : `${CUSTOM_CONDITION_PREFIX}${safeName}`;
}
