/**
 * HP status tiers — immutable business rule.
 *
 * Thresholds (% of max HP):
 *   FULL     = 100%  — emerald (no damage taken)
 *   LIGHT    > 70%   — green
 *   MODERATE > 40%   — yellow / amber
 *   HEAVY    > 10%   — red
 *   CRITICAL ≤ 10%   — dark red
 *
 * These tiers, thresholds and colors apply to ALL combat surfaces
 * (DM view, player view, logged, unlogged).
 */
export type HpStatus = "FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

export interface HpStatusStyle {
  colorClass: string;   // text color, e.g. "text-green-400"
  bgClass: string;      // badge background, e.g. "bg-green-400/10"
  barClass: string;     // progress bar fill, e.g. "bg-green-500"
  icon: "heartpulse" | "heart" | "warning" | "danger" | "skull";
  labelKey: string;     // i18n suffix, e.g. "hp_light"
  pct: string;          // threshold description, e.g. ">70%"
}

/** Single source of truth for HP tier visual styles. */
export const HP_STATUS_STYLES: Record<HpStatus, HpStatusStyle> = {
  FULL:     { colorClass: "text-emerald-400", bgClass: "bg-emerald-400/20", barClass: "bg-emerald-400", icon: "heartpulse", labelKey: "hp_full",     pct: "100%" },
  LIGHT:    { colorClass: "text-green-400",   bgClass: "bg-green-400/10",   barClass: "bg-green-500",   icon: "heart",      labelKey: "hp_light",    pct: ">70%" },
  MODERATE: { colorClass: "text-amber-400",   bgClass: "bg-amber-400/10",   barClass: "bg-amber-400",   icon: "warning",    labelKey: "hp_moderate", pct: ">40%" },
  HEAVY:    { colorClass: "text-red-500",     bgClass: "bg-red-500/10",     barClass: "bg-red-500",     icon: "danger",     labelKey: "hp_heavy",    pct: ">10%" },
  CRITICAL: { colorClass: "text-white",       bgClass: "bg-red-700",        barClass: "bg-red-600",     icon: "skull",      labelKey: "hp_critical", pct: "≤10%" },
};

/** Calculate the HP status tier for a combatant. */
export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  if (currentHp >= maxHp) return "FULL";
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
  return HP_STATUS_STYLES[status].barClass;
}

/** Tailwind text-color class for HP labels/values. */
export function getHpTextColor(currentHp: number, maxHp: number): string {
  if (maxHp <= 0) return "text-muted-foreground";
  const status = getHpStatus(currentHp, maxHp);
  return HP_STATUS_STYLES[status].colorClass;
}

/** Calculate HP percentage as integer (0-100), clamped and rounded. */
export function getHpPercentage(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, (currentHp / maxHp) * 100)));
}

/** i18n key suffix for the HP threshold label (e.g. "hp_light"). */
export function getHpThresholdKey(currentHp: number, maxHp: number): string | null {
  if (maxHp <= 0) return null;
  const status = getHpStatus(currentHp, maxHp);
  return HP_STATUS_STYLES[status].labelKey;
}
