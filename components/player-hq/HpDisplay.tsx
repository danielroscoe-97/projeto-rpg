"use client";

import { useCallback } from "react";
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
  onHpChange: (newHp: number) => void;
  onTempHpChange: (newTemp: number) => void;
}

export function HpDisplay({
  currentHp,
  maxHp,
  hpTemp,
  readOnly = false,
  onHpChange,
  onTempHpChange,
}: HpDisplayProps) {
  const t = useTranslations("player_hq.sheet");

  const status = getHpStatus(currentHp, maxHp);
  const statusStyle = HP_STATUS_STYLES[status];
  const pct = getHpPercentage(currentHp, maxHp);
  const textColor = getHpTextColor(currentHp, maxHp);
  const barColor = getHpBarColor(currentHp, maxHp);

  const adjustHp = useCallback(
    (delta: number) => {
      if (readOnly) return;
      const newHp = Math.max(0, Math.min(maxHp, currentHp + delta));
      navigator.vibrate?.([30]);
      onHpChange(newHp);
    },
    [readOnly, currentHp, maxHp, onHpChange]
  );

  const adjustTemp = useCallback(
    (delta: number) => {
      if (readOnly) return;
      const newTemp = Math.max(0, hpTemp + delta);
      navigator.vibrate?.([30]);
      onTempHpChange(newTemp);
    },
    [readOnly, hpTemp, onTempHpChange]
  );

  return (
    <div className="space-y-3">
      {/* HP Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className={`w-4 h-4 ${textColor}`} aria-hidden="true" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>
              {t("hp_label")}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusStyle.bgClass} ${statusStyle.colorClass}`}>
              {t(statusStyle.labelKey)}
            </span>
          </div>
          <span className={`text-lg font-bold tabular-nums ${textColor}`}>
            {currentHp}/{maxHp}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Quick buttons */}
        {!readOnly && (
          <div className="flex items-center gap-2 justify-center">
            <button
              type="button"
              onClick={() => adjustHp(-5)}
              className="px-2 py-1 text-xs font-medium rounded-md bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors min-w-[44px] min-h-[44px]"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => adjustHp(-1)}
              className="px-3 py-1 rounded-md bg-red-900/30 text-red-300 hover:bg-red-900/50 transition-colors min-w-[44px] min-h-[44px]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustHp(1)}
              className="px-3 py-1 rounded-md bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors min-w-[44px] min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => adjustHp(5)}
              className="px-2 py-1 text-xs font-medium rounded-md bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors min-w-[44px] min-h-[44px]"
            >
              +5
            </button>
          </div>
        )}
      </div>

      {/* Temp HP */}
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
    </div>
  );
}
