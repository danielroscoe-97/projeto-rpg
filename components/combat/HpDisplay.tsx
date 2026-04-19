"use client";

/**
 * S3.1 — Combat HP display component.
 *
 * Renders the HP surface for a single combatant in the initiative tracker.
 * Two modes selected via `revealExact`:
 *
 * - `revealExact=true`  → DM view OR player seeing themselves. Shows
 *   "current/max · NN%" text, progress bar, and optional temp-HP segment.
 * - `revealExact=false` → Player seeing a monster (anti-metagaming). Shows
 *   only the tier label (FULL/LIGHT/MODERATE/HEAVY/CRITICAL/DEFEATED) plus
 *   the colored progress bar — no numeric HP leaks.
 *
 * Threshold bands:
 * - Feature flag OFF (default): legacy 70/40/10 bands via `getHpStatus`.
 * - Feature flag ON: v2 75/50/25 bands via `getHpStatusWithFlag`.
 *
 * "DEFEATED" is derived client-side from `current_hp <= 0` — the underlying
 * `HpStatus` union stays immutable. See {@link deriveDisplayState}.
 *
 * Accessibility: progress bar uses `role="progressbar"` with aria-valuenow/
 * min/max; numeric values use `tabular-nums`; colors pair with icon glyph
 * (NFR21 — color is never the sole indicator).
 *
 * Combat parity: component is pure (no store access), so the 3 callers —
 * Guest (`GuestCombatClient`), Anon + Auth (`PlayerJoinClient` indirectly via
 * shared CombatantRow, plus DM `CombatSessionClient`) — share identical UX.
 */

import { useTranslations } from "next-intl";
import {
  getHpBarColor,
  getHpPercentage,
  getHpStatusWithFlag,
  deriveDisplayState,
  HP_STATUS_STYLES,
  type HpStatus,
} from "@/lib/utils/hp-status";
import { isFeatureFlagEnabled } from "@/lib/flags";

export interface HpDisplayProps {
  /** Raw current HP (full precision — callers decide whether to show it). */
  currentHp: number;
  /** Raw max HP — drives percentage + tier calculation. */
  maxHp: number;
  /** Temp HP segment (purple bar). Optional. */
  tempHp?: number;
  /**
   * When true, emit the numeric `current/max` value. When false, only the
   * status-tier label + bar render (anti-metagaming, player-vs-monster).
   */
  revealExact: boolean;
  /** Combatant display name — used to build aria labels. */
  name: string;
  /**
   * Marks the combatant as explicitly defeated (server-side flag). When set,
   * the display state is forced to "DEFEATED" regardless of HP math. Defaults
   * to `false` — the pure HP check still promotes HP≤0 to DEFEATED.
   */
  isDefeated?: boolean;
  /** Optional test id root — appended to sub-elements for stable selectors. */
  testIdRoot?: string;
  /** Optional override of the feature flag (used by tests). */
  forceFlagV2?: boolean;
  /** Optional classname for the outer container. */
  className?: string;
}

export function HpDisplay({
  currentHp,
  maxHp,
  tempHp = 0,
  revealExact,
  name,
  isDefeated = false,
  testIdRoot,
  forceFlagV2,
  className = "",
}: HpDisplayProps) {
  const t = useTranslations("combat");

  const flagV2 =
    forceFlagV2 !== undefined
      ? forceFlagV2
      : isFeatureFlagEnabled("ff_hp_thresholds_v2");

  // Derive tier + display state. Defeated flag dominates.
  const hpStatus: HpStatus = getHpStatusWithFlag(currentHp, maxHp, flagV2);
  const effectiveCurrent = isDefeated ? 0 : currentHp;
  const displayState = deriveDisplayState({
    hp_status: hpStatus,
    current_hp: effectiveCurrent,
  });

  // Visual styling — DEFEATED uses a neutral gray; other tiers use shared
  // palette from HP_STATUS_STYLES so the whole app stays in sync.
  const barColor =
    displayState === "DEFEATED"
      ? "bg-muted-foreground/40"
      : getHpBarColor(effectiveCurrent, maxHp);

  const labelKey =
    displayState === "DEFEATED"
      ? "hp_defeated"
      : HP_STATUS_STYLES[displayState].labelKey;
  const colorClass =
    displayState === "DEFEATED"
      ? "text-muted-foreground"
      : HP_STATUS_STYLES[displayState].colorClass;

  const pct = getHpPercentage(effectiveCurrent, maxHp);
  const hasTempHp = tempHp > 0;
  const totalPool = maxHp + tempHp;
  const hpPctOfTotal =
    totalPool > 0
      ? Math.max(0, Math.min(1, effectiveCurrent / totalPool))
      : 0;
  const tempPctOfTotal =
    totalPool > 0 ? Math.max(0, Math.min(1, tempHp / totalPool)) : 0;

  const testId = testIdRoot ? `${testIdRoot}-hp` : undefined;
  const barTestId = testIdRoot ? `${testIdRoot}-hp-bar` : undefined;
  const tempTestId = testIdRoot ? `${testIdRoot}-hp-temp` : undefined;

  const ariaLabel = revealExact
    ? `${name}: ${effectiveCurrent}/${maxHp} HP (${pct}%)`
    : `${name}: ${t(labelKey as Parameters<typeof t>[0])}`;

  return (
    <div
      className={`flex flex-col gap-0.5 ${className}`}
      data-testid={testId}
      data-hp-display-state={displayState}
      data-hp-flag-v2={flagV2 ? "true" : "false"}
    >
      {/* Row 1 — textual readout */}
      <div className="flex items-center gap-1 text-xs font-mono leading-none">
        {revealExact ? (
          <>
            <span
              className={`tabular-nums ${colorClass}`}
              data-testid={testIdRoot ? `${testIdRoot}-hp-current` : undefined}
            >
              {effectiveCurrent}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span
              className="text-muted-foreground/70 tabular-nums"
              data-testid={testIdRoot ? `${testIdRoot}-hp-max` : undefined}
            >
              {maxHp}
            </span>
            {maxHp > 0 && (
              <span
                className={`ml-1 text-[10px] ${colorClass}`}
                data-testid={
                  testIdRoot ? `${testIdRoot}-hp-pct` : undefined
                }
              >
                · {pct}% {t(labelKey as Parameters<typeof t>[0])}
              </span>
            )}
            {hasTempHp && (
              <span
                className="ml-1 text-[10px] text-purple-300"
                data-testid={
                  testIdRoot ? `${testIdRoot}-hp-temp-label` : undefined
                }
              >
                +{tempHp}
              </span>
            )}
          </>
        ) : (
          <span
            className={`text-[11px] font-medium uppercase tracking-wide ${colorClass}`}
            data-testid={
              testIdRoot ? `${testIdRoot}-hp-status-label` : undefined
            }
          >
            {t(labelKey as Parameters<typeof t>[0])}
          </span>
        )}
      </div>

      {/* Row 2 — progress bar */}
      <div
        className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex"
        role="progressbar"
        aria-valuenow={revealExact ? effectiveCurrent : pct}
        aria-valuemin={0}
        aria-valuemax={revealExact ? maxHp : 100}
        aria-label={ariaLabel}
      >
        <div
          className={`h-full transition-all ${barColor} ${
            hasTempHp ? "rounded-l-full" : "rounded-full"
          }`}
          style={{ width: `${hpPctOfTotal * 100}%` }}
          data-testid={barTestId}
        />
        {hasTempHp && (
          <div
            className="h-full bg-purple-500 rounded-r-full transition-all"
            style={{ width: `${tempPctOfTotal * 100}%` }}
            data-testid={tempTestId}
          />
        )}
      </div>
    </div>
  );
}
