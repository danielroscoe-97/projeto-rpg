/** HP status labels for monster combatants — players never see exact numbers. */
export type HpStatus = "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

/**
 * Calculate the HP status label for a combatant.
 * Thresholds: LIGHT >70%, MODERATE 40-70%, HEAVY 10-40%, CRITICAL <10%
 */
export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  const pct = currentHp / maxHp;
  if (pct > 0.7) return "LIGHT";
  if (pct > 0.4) return "MODERATE";
  if (pct > 0.1) return "HEAVY";
  return "CRITICAL";
}

