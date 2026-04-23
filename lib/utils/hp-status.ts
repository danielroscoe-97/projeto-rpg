/**
 * HP status tiers — immutable business rule.
 *
 * Thresholds (% of max HP), legacy default:
 *   FULL     = 100%  — emerald (no damage taken)
 *   LIGHT    > 70%   — green
 *   MODERATE > 40%   — yellow / amber
 *   HEAVY    > 10%   — red
 *   CRITICAL ≤ 10%   — dark red
 *
 * When `ff_hp_thresholds_v2` is ON, bands shift to 75/50/25 (see
 * {@link getHpStatusWithFlag} and {@link HP_THRESHOLDS_V2}).
 *
 * These tiers and colors apply to ALL combat surfaces (DM view, player view,
 * logged, unlogged). Any percentage strings shown in UI MUST derive from
 * {@link formatHpPct} — never hardcode, otherwise the legend will desync from
 * the runtime classifier when the flag flips.
 */
export type HpStatus = "FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

export interface HpStatusStyle {
  colorClass: string;   // text color, e.g. "text-green-400"
  bgClass: string;      // badge background, e.g. "bg-green-400/10"
  barClass: string;     // progress bar fill, e.g. "bg-green-500"
  icon: "heartpulse" | "heart" | "warning" | "danger" | "skull";
  labelKey: string;     // i18n suffix, e.g. "hp_light"
}

/** Single source of truth for HP tier visual styles. */
export const HP_STATUS_STYLES: Record<HpStatus, HpStatusStyle> = {
  FULL:     { colorClass: "text-emerald-400", bgClass: "bg-emerald-400/20", barClass: "bg-emerald-400", icon: "heartpulse", labelKey: "hp_full" },
  LIGHT:    { colorClass: "text-green-400",   bgClass: "bg-green-400/10",   barClass: "bg-green-500",   icon: "heart",      labelKey: "hp_light" },
  MODERATE: { colorClass: "text-amber-400",   bgClass: "bg-amber-400/10",   barClass: "bg-amber-400",   icon: "warning",    labelKey: "hp_moderate" },
  HEAVY:    { colorClass: "text-red-500",     bgClass: "bg-red-500/10",     barClass: "bg-red-500",     icon: "danger",     labelKey: "hp_heavy" },
  CRITICAL: { colorClass: "text-white",       bgClass: "bg-red-700",        barClass: "bg-red-600",     icon: "skull",      labelKey: "hp_critical" },
};

/**
 * Runtime-numeric thresholds. Both sets feed {@link getHpStatusWithFlag} and
 * {@link formatHpPct} — keeping them together guarantees the visual legend
 * stays in lock-step with the classifier.
 */
export const HP_THRESHOLDS_LEGACY = { light: 0.7, moderate: 0.4, heavy: 0.1 } as const;
export const HP_THRESHOLDS_V2 = { light: 0.75, moderate: 0.5, heavy: 0.25 } as const;

export function getHpThresholds(flagV2: boolean): typeof HP_THRESHOLDS_LEGACY | typeof HP_THRESHOLDS_V2 {
  return flagV2 ? HP_THRESHOLDS_V2 : HP_THRESHOLDS_LEGACY;
}

/**
 * Render the percentage string for a given status + flag state as an inclusive
 * range (e.g. LIGHT legacy → "70–100%"). Readers understand ranges faster than
 * inequalities, and the range endpoints double as a visual anchor that the
 * legend is in sync with the classifier.
 *
 * This is the ONLY allowed way to display threshold percentages in UI —
 * hardcoding `"70-100%"` anywhere else will desync when the flag flips.
 */
export function formatHpPct(status: HpStatus, flagV2: boolean): string {
  if (status === "FULL") return "100%";
  const t = getHpThresholds(flagV2);
  const light = Math.round(t.light * 100);
  const moderate = Math.round(t.moderate * 100);
  const heavy = Math.round(t.heavy * 100);
  switch (status) {
    case "LIGHT":    return `${light}\u2013100%`;       // e.g. 70–100%
    case "MODERATE": return `${moderate}\u2013${light}%`; // e.g. 40–70%
    case "HEAVY":    return `${heavy}\u2013${moderate}%`; // e.g. 10–40%
    case "CRITICAL": return `0\u2013${heavy}%`;         // e.g. 0–10%
  }
}

/** Calculate the HP status tier for a combatant (legacy thresholds). */
export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  if (currentHp >= maxHp) return "FULL";
  const pct = currentHp / maxHp;
  if (pct > HP_THRESHOLDS_LEGACY.light) return "LIGHT";
  if (pct > HP_THRESHOLDS_LEGACY.moderate) return "MODERATE";
  if (pct > HP_THRESHOLDS_LEGACY.heavy) return "HEAVY";
  return "CRITICAL";
}

/**
 * S3.1 — Same as `getHpStatus`, but with toggled threshold bands when the
 * `ff_hp_thresholds_v2` feature flag is ON.
 *
 * - Flag OFF (default): legacy thresholds `LIGHT > 70%, MODERATE > 40%,
 *   HEAVY > 10%, CRITICAL ≤ 10%`.
 * - Flag ON: v2 thresholds `LIGHT > 75%, MODERATE > 50%, HEAVY > 25%,
 *   CRITICAL ≤ 25%` — gives players more warning at each tier transition.
 *
 * The `HpStatus` union is **immutable** (broadcast ABI). "DEFEATED" is a
 * display-only state derived via {@link deriveDisplayState}.
 */
export function getHpStatusWithFlag(
  currentHp: number,
  maxHp: number,
  flagV2: boolean,
): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  if (currentHp >= maxHp) return "FULL";
  const pct = currentHp / maxHp;
  const t = getHpThresholds(flagV2);
  if (pct > t.light) return "LIGHT";
  if (pct > t.moderate) return "MODERATE";
  if (pct > t.heavy) return "HEAVY";
  return "CRITICAL";
}

/**
 * S3.1 — Client-side display state derived from the immutable `HpStatus` plus
 * the combatant's current HP. Returns `"DEFEATED"` when HP hits 0 so UIs can
 * render the skull/gray state without polluting the broadcast-carrying union.
 *
 * Never add `"DEFEATED"` to the `HpStatus` union — broadcast clients cache
 * the narrower shape, and a new member would silently reject older PWA
 * installations until the service worker rotates.
 */
export type HpDisplayState = HpStatus | "DEFEATED";

export function deriveDisplayState(c: {
  hp_status: HpStatus;
  current_hp: number;
}): HpDisplayState {
  return c.current_hp <= 0 ? "DEFEATED" : c.hp_status;
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

/**
 * Calculate HP as a clamped [0, 1] fraction. Unlike {@link getHpPercentage}
 * this does NOT round, so the caller can feed the value directly into a
 * CSS `width` / `transform: scaleX(...)` calculation without introducing a
 * 1% rounding jitter during animations.
 *
 * The clamp + `maxHp <= 0 → 0` guard matches the ad-hoc inline expression
 * that had drifted across several components (PlayerBottomBar,
 * PlayerInitiativeBoard, MonsterGroupHeader's buildGroupHealth). Those
 * sites now delegate here.
 */
export function getHpFraction(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, currentHp / maxHp));
}

/** i18n key suffix for the HP threshold label (e.g. "hp_light"). */
export function getHpThresholdKey(currentHp: number, maxHp: number): string | null {
  if (maxHp <= 0) return null;
  const status = getHpStatus(currentHp, maxHp);
  return HP_STATUS_STYLES[status].labelKey;
}
