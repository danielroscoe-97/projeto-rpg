/**
 * HP status tiers — immutable business rule.
 *
 * Thresholds (% of max HP):
 *   LIGHT    > 70%   — green
 *   MODERATE > 40%   — yellow / amber
 *   HEAVY    > 10%   — red
 *   CRITICAL ≤ 10%   — black / skull
 *
 * These tiers, thresholds and colors apply to ALL combat surfaces
 * (DM view, player view, logged, unlogged).
 */
export type HpStatus = "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

/** Calculate the HP status tier for a combatant. */
export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  const pct = currentHp / maxHp;
  if (pct > 0.7) return "LIGHT";
  if (pct > 0.4) return "MODERATE";
  if (pct > 0.1) return "HEAVY";
  return "CRITICAL";
}

/** Tailwind bg-color class for the HP progress bar. */
export function getHpBarColor(currentHp: number, maxHp: number): string {
  if (maxHp <= 0) return "bg-gray-500";
  const status = getHpStatus(currentHp, maxHp);
  switch (status) {
    case "LIGHT":    return "bg-green-500";
    case "MODERATE": return "bg-amber-400";
    case "HEAVY":    return "bg-red-500";
    case "CRITICAL": return "bg-gray-900";
  }
}

/** i18n key suffix for the HP threshold label (e.g. "hp_light"). */
export function getHpThresholdKey(currentHp: number, maxHp: number): string | null {
  if (maxHp <= 0) return null;
  const status = getHpStatus(currentHp, maxHp);
  return `hp_${status.toLowerCase()}`;
}

