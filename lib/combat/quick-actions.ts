/**
 * Quick actions surfaced as one-tap chips for the player and the Mestre.
 *
 * Trimmed catalogue: only Dodge and Ready remain in the UI. Dash / Help /
 * Disengage / Hide were dropped because at a presencial table the player
 * narrates them aloud — the app does not need a button. Existing
 * combatants persisted with `action:dash` etc. stay valid in the schema
 * (free-form text); the player just can't self-apply those four anymore.
 *
 * Storage format: `action:<kind>` (e.g. `action:dodge`). Uses the dedicated
 * `action:` prefix to avoid colliding with:
 *   - standard SRD conditions ("Stunned", "Prone", …)
 *   - beneficial conditions ("Blessed", "Haste", …)
 *   - concentration (`concentrating`, `concentrating:<Spell>`)
 *   - DM custom conditions (`custom:Name|Desc`)
 *
 * Auto-cleanup contract:
 *   - **Dodge** auto-expires when the caster's NEXT turn begins
 *     (D&D 5e RAW — "until your next turn"). Cleared in `handleAdvanceTurn`
 *     on the combatant whose turn is starting.
 *   - **Ready** does NOT auto-expire. Lifetime is logical (player/Mestre
 *     removes manually when the trigger fires or combat ends).
 *
 * Player self-apply (anon + auth) is allowed for both. `custom:*` stays
 * Mestre-only.
 */

export const QUICK_ACTIONS = [
  "dodge",
  "ready",
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

export const ACTION_PREFIX = "action:";

/** Quick actions that auto-expire when the caster's next turn begins. */
export const AUTO_EXPIRE_ON_NEXT_TURN = new Set<QuickAction>(["dodge"]);

export function isQuickAction(condition: string): boolean {
  if (!condition.startsWith(ACTION_PREFIX)) return false;
  const kind = condition.slice(ACTION_PREFIX.length);
  return (QUICK_ACTIONS as readonly string[]).includes(kind);
}

export function getQuickActionKind(condition: string): QuickAction | null {
  if (!condition.startsWith(ACTION_PREFIX)) return null;
  const kind = condition.slice(ACTION_PREFIX.length);
  return (QUICK_ACTIONS as readonly string[]).includes(kind)
    ? (kind as QuickAction)
    : null;
}

export function formatQuickAction(kind: QuickAction): string {
  return `${ACTION_PREFIX}${kind}`;
}

/**
 * Return a conditions array with auto-expiring quick actions removed
 * (currently only `action:dodge`). Non-auto-expiring actions (Ready and
 * any legacy `action:*` rows persisted before the catalogue trim) are
 * preserved.
 *
 * Used by `handleAdvanceTurn` when a combatant's turn is starting — Dodge
 * is RAW "until your next turn", so we clean it up exactly at that point.
 */
export function stripExpiringQuickActions(conditions: string[]): string[] {
  return conditions.filter((c) => {
    const kind = getQuickActionKind(c);
    if (kind === null) return true;
    return !AUTO_EXPIRE_ON_NEXT_TURN.has(kind);
  });
}

/** Remove every `action:*` entry that matches the current `QUICK_ACTIONS`
 *  catalogue. After the 2026-04-27 trim, that's only `action:dodge` and
 *  `action:ready`. Legacy persisted rows like `action:dash` are NOT in the
 *  catalogue anymore and are preserved by this filter — see canonical
 *  doc §2.7 (combatants persisted before the trim stay valid in the schema). */
export function stripAllQuickActions(conditions: string[]): string[] {
  return conditions.filter((c) => !isQuickAction(c));
}

/**
 * S4.3 — Self-apply allowlist.
 *
 * Returns true if a player is allowed to self-apply this condition string.
 * REJECTS `custom:*` (DM-only per H11). Beneficial conditions / concentration
 * checks live in the caller (they depend on `BENEFICIAL_CONDITIONS` which
 * in turn lives in a client component to avoid server imports).
 *
 * This helper covers the quick-action subset; full allowlist logic composes
 * it with beneficial + concentrating checks in `PlayerInitiativeBoard`.
 */
export function isQuickActionSelfAppliable(condition: string): boolean {
  return isQuickAction(condition);
}

/**
 * S4.3 — Hard reject list for player self-apply.
 * Currently: `custom:*` (H11 — DM-only).
 */
export function isPlayerForbiddenCondition(condition: string): boolean {
  return condition.startsWith("custom:");
}
