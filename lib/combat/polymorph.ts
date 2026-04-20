/**
 * S5.1 — Polymorph / Wild Shape pure logic helpers.
 *
 * Single source of truth for damage + healing math when a combatant is
 * transformed. Used by BOTH the authenticated combat store
 * (`lib/stores/combat-store.ts`) and the guest combat store
 * (`lib/stores/guest-combat-store.ts`) so that Parity is guaranteed by
 * construction rather than by reconciliation.
 *
 * Rules (per `docs/spec-polymorph-wildshape.md`):
 *
 * - While `polymorph.enabled === true`, damage subtracts from
 *   `polymorph.temp_current_hp` first. `temp_hp` (shield-of-faith style
 *   temp HP) and `current_hp` are NOT touched by the damage until the form
 *   is destroyed.
 *
 * - When the form reaches 0 HP:
 *     * variant `"polymorph"` (spell) — spell ends, overflow damage is
 *       DISCARDED. Original HP is preserved exactly as it was.
 *     * variant `"wildshape"` (druid) — wildshape ends, overflow damage
 *       CARRIES to the original combatant (temp_hp absorbs first as usual).
 *
 * - Healing while transformed ONLY raises `temp_current_hp` (capped at
 *   `temp_max_hp`). The original `current_hp` stays frozen at whatever it
 *   was when transformation started. After revert, healing hits original
 *   HP normally (existing applyHealing behavior).
 *
 * These helpers are pure — they take a combatant and return the next
 * combatant. Stores call them from inside `set(...)` updaters. Keeping the
 * logic here means:
 *   1. We can unit-test the combat rules without wiring a Zustand store.
 *   2. Guest + auth behavior cannot drift — both stores import the same
 *      function.
 *   3. Reviewers can verify compliance with `spec-polymorph-wildshape.md`
 *      by reading one ~100-line file.
 */

import type { Combatant } from "@/lib/types/combat";

/**
 * Result of applying damage to a polymorphed combatant. The `ended` flag
 * plus `overflow` allow the caller to emit the right combat-log entry
 * (form destroyed vs partial form damage) without re-deriving it.
 */
export interface PolymorphDamageResult {
  /** The updated combatant (polymorph cleared if `ended` is true). */
  next: Combatant;
  /** Whether the transformation ended as a result of this damage application. */
  ended: boolean;
  /** Overflow damage to emit in the combat log (0 for Polymorph variant on end). */
  overflow: number;
  /** Resolved variant at time of damage — convenience for telemetry / log copy. */
  variant?: "polymorph" | "wildshape";
}

/**
 * Apply damage to a combatant who is currently polymorphed.
 * Returns the updated combatant plus metadata about whether the form ended.
 *
 * Call site MUST check `combatant.polymorph?.enabled` BEFORE invoking this
 * helper — it assumes an active transformation and will return `combatant`
 * unchanged otherwise (for robustness, not correctness).
 */
export function applyPolymorphDamage(combatant: Combatant, amount: number): PolymorphDamageResult {
  const poly = combatant.polymorph;
  if (!poly || !poly.enabled) {
    return { next: combatant, ended: false, overflow: 0 };
  }
  if (amount <= 0) {
    return { next: combatant, ended: false, overflow: 0, variant: poly.variant };
  }

  const newTempCurrent = poly.temp_current_hp - amount;

  // Form survives the hit — just reduce form HP.
  if (newTempCurrent > 0) {
    return {
      next: {
        ...combatant,
        polymorph: { ...poly, temp_current_hp: newTempCurrent },
      },
      ended: false,
      overflow: 0,
      variant: poly.variant,
    };
  }

  // Form destroyed — compute overflow then decide based on variant.
  const overflow = -newTempCurrent; // amount past 0

  if (poly.variant === "polymorph") {
    // Spell ends, overflow discarded. Original HP/temp_hp untouched.
    const { polymorph: _dropped, ...withoutPoly } = combatant;
    return {
      next: withoutPoly as Combatant,
      ended: true,
      overflow: 0,
      variant: "polymorph",
    };
  }

  // Wildshape: overflow carries to original HP via standard damage math
  // (temp_hp absorbs before current_hp).
  let carryRemaining = overflow;
  let newTempHp = combatant.temp_hp;
  if (newTempHp > 0 && carryRemaining > 0) {
    const absorbed = Math.min(newTempHp, carryRemaining);
    newTempHp -= absorbed;
    carryRemaining -= absorbed;
  }
  const newCurrentHp = Math.max(0, combatant.current_hp - carryRemaining);

  const { polymorph: _dropped, ...withoutPoly } = combatant;
  return {
    next: {
      ...(withoutPoly as Combatant),
      current_hp: newCurrentHp,
      temp_hp: newTempHp,
    },
    ended: true,
    overflow, // report the TOTAL overflow for telemetry / log (even if absorbed by temp_hp)
    variant: "wildshape",
  };
}

/**
 * Apply healing to a combatant who is currently polymorphed.
 * Only `temp_current_hp` rises (capped at `temp_max_hp`). Original HP is
 * frozen while transformed — post-revert healing flows through the normal
 * applyHealing path.
 */
export function applyPolymorphHealing(combatant: Combatant, amount: number): Combatant {
  const poly = combatant.polymorph;
  if (!poly || !poly.enabled) return combatant;
  if (amount <= 0) return combatant;
  const next = Math.min(poly.temp_max_hp, poly.temp_current_hp + amount);
  return {
    ...combatant,
    polymorph: { ...poly, temp_current_hp: next },
  };
}

/**
 * Initialize a polymorph transformation object. Caller is responsible for
 * embedding this into the combatant via a store set().
 */
export function createPolymorphState(params: {
  variant: "polymorph" | "wildshape";
  form_name: string;
  temp_max_hp: number;
  temp_ac?: number;
  started_at_turn: number;
}): NonNullable<Combatant["polymorph"]> {
  return {
    enabled: true,
    variant: params.variant,
    form_name: params.form_name,
    temp_current_hp: Math.max(1, params.temp_max_hp),
    temp_max_hp: Math.max(1, params.temp_max_hp),
    temp_ac: params.temp_ac,
    started_at_turn: params.started_at_turn,
  };
}

/**
 * Clear polymorph object from a combatant without applying overflow.
 * Used for manual "End Polymorph" path.
 */
export function clearPolymorph(combatant: Combatant): Combatant {
  if (!combatant.polymorph) return combatant;
  const { polymorph: _dropped, ...rest } = combatant;
  return rest as Combatant;
}
