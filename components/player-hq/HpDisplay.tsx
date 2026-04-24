"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Shield, Minus, Plus } from "lucide-react";
import {
  getHpStatus,
  getHpBarColor,
  getHpTextColor,
  getHpPercentage,
  HP_STATUS_STYLES,
} from "@/lib/utils/hp-status";

interface HpDisplayProps {
  currentHp: number;
  maxHp: number;
  hpTemp: number;
  readOnly?: boolean;
  /**
   * Visual density variant. `ribbon` tightens padding for use inside
   * the future Ribbon Vivo composite (sprint 3 Ribbon work); `default` keeps
   * the card-style layout used today in CharacterStatusPanel.
   */
  variant?: "default" | "ribbon";
  onHpChange: (newHp: number) => void;
  onTempHpChange: (newTemp: number) => void;
}

/**
 * HP edit pattern (EP-1 A5, 2026-04-23).
 *
 * Canonical reference: `components/combat/CombatantRow.tsx:540-587`. Click the
 * current-HP number → inline `<input type="number">` opens in-place. On blur
 * or Enter, compute the delta and apply: lower value = damage, higher = heal.
 * Escape cancels.
 *
 * Replaces the legacy `[−5][−1][+1][+5]` button row removed per spec
 * 08-design-tokens-delta.md §14. HP Temp controls stay as `[−][+]` because
 * Temp HP is additive-only (no delta semantics apply).
 *
 * Mobile tap target pinned at min-h-[44px] via the button class; desktop
 * shrinks to min-h-[28px] mirroring the CombatantRow spec.
 */
export function HpDisplay({
  currentHp,
  maxHp,
  hpTemp,
  readOnly = false,
  variant = "default",
  onHpChange,
  onTempHpChange,
}: HpDisplayProps) {
  const t = useTranslations("player_hq.sheet");

  const status = getHpStatus(currentHp, maxHp);
  const statusStyle = HP_STATUS_STYLES[status];
  const pct = getHpPercentage(currentHp, maxHp);
  const textColor = getHpTextColor(currentHp, maxHp);
  const barColor = getHpBarColor(currentHp, maxHp);

  // Inline HP edit state — mirrors the CombatantRow pattern (guard flag via
  // ref so a blur triggered by Escape-cancel doesn't re-commit the value).
  const [editing, setEditing] = useState(false);
  const [inlineValue, setInlineValue] = useState("");
  const editingRef = useRef(false);

  const openEdit = useCallback(() => {
    if (readOnly) return;
    editingRef.current = true;
    setInlineValue(String(currentHp));
    setEditing(true);
  }, [readOnly, currentHp]);

  const closeEdit = useCallback(() => {
    editingRef.current = false;
    setEditing(false);
    setInlineValue("");
  }, []);

  const commit = useCallback(() => {
    if (!editingRef.current) return;
    const desired = parseInt(inlineValue, 10);
    if (!isNaN(desired) && desired >= 0) {
      const clamped = Math.max(0, Math.min(maxHp, desired));
      // Delta calculation per spec §14.2 — onHpChange is the unified setter
      // in the Player HQ context so we pass the clamped absolute value. The
      // `delta < 0 = damage` / `delta > 0 = heal` semantics from CombatantRow
      // are encoded by the consumer's `updateHp` hook (see useCharacterStatus).
      if (clamped !== currentHp) {
        navigator.vibrate?.([30]);
        onHpChange(clamped);
      }
    }
    closeEdit();
  }, [inlineValue, maxHp, currentHp, onHpChange, closeEdit]);

  const adjustTemp = useCallback(
    (delta: number) => {
      if (readOnly) return;
      const newTemp = Math.max(0, hpTemp + delta);
      navigator.vibrate?.([30]);
      onTempHpChange(newTemp);
    },
    [readOnly, hpTemp, onTempHpChange]
  );

  const isRibbon = variant === "ribbon";
  const rootSpacing = isRibbon ? "space-y-2" : "space-y-3";
  const barSpacing = isRibbon ? "space-y-1" : "space-y-1.5";

  return (
    <div className={rootSpacing} data-testid="hp-display" data-variant={variant}>
      {/* HP Bar */}
      <div className={barSpacing}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Heart className={`w-4 h-4 flex-shrink-0 ${textColor}`} aria-hidden="true" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>
              {t("hp_label")}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyle.bgClass} ${statusStyle.colorClass}`}>
              {t(statusStyle.labelKey)}
            </span>
          </div>
          {/* Click-to-edit current HP; max HP stays read-only in the Player HQ
              context (max is edited via CharacterEditSheet — a dedicated form
              with validation — not via inline drag). */}
          <div className="flex items-center gap-0.5 tabular-nums">
            {editing ? (
              <input
                type="number"
                value={inlineValue}
                onChange={(e) => setInlineValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") closeEdit();
                }}
                className={`w-14 bg-transparent border border-amber-400/60 rounded px-1 py-0.5 text-center text-lg font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${textColor}`}
                autoFocus
                aria-label={t("hp_edit_aria")}
                data-testid="inline-current-hp-input"
              />
            ) : (
              <button
                type="button"
                onClick={openEdit}
                disabled={readOnly}
                title={!readOnly ? t("hp_edit_title") : undefined}
                aria-label={!readOnly ? t("hp_edit_title") : undefined}
                className={`min-h-[44px] sm:min-h-[28px] inline-flex items-center text-lg font-bold tabular-nums rounded focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
                  readOnly
                    ? "cursor-default"
                    : "cursor-pointer hover:text-amber-300 transition-colors"
                } ${textColor}`}
                data-testid="current-hp-btn"
              >
                {currentHp}
              </button>
            )}
            <span className={`text-lg font-bold ${textColor}`} aria-hidden>/</span>
            <span className={`text-lg font-bold tabular-nums ${textColor}`}>{maxHp}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Temp HP — stays as +/- because temp HP is additive, no delta semantics */}
      {(hpTemp > 0 || !readOnly) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-950/20 border border-blue-500/20 rounded-md">
          <Shield className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
          <span className="text-xs text-blue-300 font-medium">{t("temp_hp")}</span>
          <span className="text-sm font-bold tabular-nums text-blue-200 ml-auto">
            {hpTemp}
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => adjustTemp(-1)}
                disabled={hpTemp <= 0}
                className="min-w-[36px] min-h-[36px] rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-500/20 transition-colors disabled:opacity-40 text-xs flex items-center justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => adjustTemp(1)}
                className="min-w-[36px] min-h-[36px] rounded bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-500/20 transition-colors text-xs flex items-center justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
