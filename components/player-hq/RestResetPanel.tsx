"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Moon, MoonStar, Sun } from "lucide-react";
import { toast } from "sonner";

interface RestResetPanelProps {
  resetByType: (types: string[]) => Promise<number>;
  countByResetType: (types: string[]) => number;
  spellSlots: Record<string, { max: number; used: number }> | null;
  onSpellSlotsReset: (slots: Record<string, { max: number; used: number }>) => void;
  /** Additional reset sources (e.g., abilities) */
  additionalResetByType?: (types: string[]) => Promise<number>;
  additionalCountByResetType?: (types: string[]) => number;
  /** Dismiss all active effects on long rest */
  onDismissAllEffects?: () => Promise<number>;
  activeEffectCount?: number;
}

export function RestResetPanel({
  resetByType,
  countByResetType,
  spellSlots,
  onSpellSlotsReset,
  additionalResetByType,
  additionalCountByResetType,
  onDismissAllEffects,
  activeEffectCount = 0,
}: RestResetPanelProps) {
  const t = useTranslations("player_hq.resources");
  // I-09 fix: use ref to avoid stale closure
  const confirmingRef = useRef<string | null>(null);
  const [confirming, setConfirmingState] = useState<string | null>(null);
  const setConfirming = (v: string | null) => {
    confirmingRef.current = v;
    setConfirmingState(v);
  };

  const shortRestCount = countByResetType(["short_rest"]) + (additionalCountByResetType?.( ["short_rest"]) ?? 0);
  const longRestCount = countByResetType(["short_rest", "long_rest"]) + (additionalCountByResetType?.(["short_rest", "long_rest"]) ?? 0);
  const dawnCount = countByResetType(["dawn"]) + (additionalCountByResetType?.(["dawn"]) ?? 0);

  // Count used spell slots
  const usedSlotCount = spellSlots
    ? Object.values(spellSlots).reduce((sum, s) => sum + s.used, 0)
    : 0;

  const handleRest = useCallback(
    async (type: "short" | "long" | "dawn") => {
      if (confirmingRef.current !== type) {
        setConfirming(type);
        setTimeout(() => setConfirming(null), 5000);
        return;
      }

      setConfirming(null);
      let count = 0;

      if (type === "short") {
        count = await resetByType(["short_rest"]);
        count += (await additionalResetByType?.(["short_rest"])) ?? 0;
        navigator.vibrate?.([50, 30, 50]);
      } else if (type === "long") {
        count = await resetByType(["short_rest", "long_rest"]);
        count += (await additionalResetByType?.(["short_rest", "long_rest"])) ?? 0;
        // Also reset spell slots
        if (spellSlots) {
          const reset = Object.fromEntries(
            Object.entries(spellSlots).map(([k, v]) => [k, { ...v, used: 0 }])
          );
          onSpellSlotsReset(reset);
        }
        count += usedSlotCount;
        // Dismiss all active spell effects on long rest
        count += (await onDismissAllEffects?.()) ?? 0;
        navigator.vibrate?.([100, 50, 100]);
      } else {
        count = await resetByType(["dawn"]);
        count += (await additionalResetByType?.(["dawn"])) ?? 0;
        navigator.vibrate?.([50, 30, 50]);
      }

      if (count > 0) {
        toast.success(t("reset_success", { count }));
      }
    },
    [resetByType, spellSlots, usedSlotCount, onSpellSlotsReset, onDismissAllEffects, t]
  );

  return (
    <div className="flex gap-2">
      {/* Short Rest */}
      <button
        type="button"
        onClick={() => handleRest("short")}
        disabled={shortRestCount === 0}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all min-h-[44px] ${
          confirming === "short"
            ? "border-blue-400 bg-blue-400/10 text-blue-300"
            : "border-blue-500/20 text-muted-foreground hover:border-blue-500/40 disabled:opacity-20"
        }`}
        aria-label={t("short_rest")}
      >
        <MoonStar className="w-3.5 h-3.5" />
        {confirming === "short" ? t("reset_confirm") : t("short_rest")}
        {shortRestCount > 0 && (
          <span className="bg-blue-400/20 text-blue-400 px-1.5 py-0.5 rounded-full text-[10px]">
            {shortRestCount}
          </span>
        )}
      </button>

      {/* Long Rest */}
      <button
        type="button"
        onClick={() => handleRest("long")}
        disabled={longRestCount === 0 && usedSlotCount === 0 && activeEffectCount === 0}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all min-h-[44px] ${
          confirming === "long"
            ? "border-amber-400 bg-amber-400/10 text-amber-400"
            : "border-amber-500/20 text-muted-foreground hover:border-amber-500/40 disabled:opacity-20"
        }`}
        aria-label={t("long_rest")}
      >
        <Moon className="w-3.5 h-3.5" />
        {confirming === "long" ? t("reset_confirm") : t("long_rest")}
        {(longRestCount > 0 || usedSlotCount > 0 || activeEffectCount > 0) && (
          <span className="bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px]">
            {longRestCount + usedSlotCount + activeEffectCount}
          </span>
        )}
      </button>

      {/* Dawn — distinct orange color */}
      <button
        type="button"
        onClick={() => handleRest("dawn")}
        disabled={dawnCount === 0}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all min-h-[44px] ${
          confirming === "dawn"
            ? "border-orange-400 bg-orange-400/10 text-orange-300"
            : "border-orange-500/20 text-muted-foreground hover:border-orange-500/40 disabled:opacity-20"
        }`}
        aria-label={t("dawn")}
      >
        <Sun className="w-3.5 h-3.5" />
        {confirming === "dawn" ? t("reset_confirm") : t("dawn")}
        {dawnCount > 0 && (
          <span className="bg-orange-400/20 text-orange-400 px-1.5 py-0.5 rounded-full text-[10px]">
            {dawnCount}
          </span>
        )}
      </button>
    </div>
  );
}
