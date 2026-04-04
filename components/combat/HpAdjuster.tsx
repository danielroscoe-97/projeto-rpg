"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Combatant } from "@/lib/types/combat";

export type HpMode = "damage" | "heal" | "temp";

/** Module-level variable so the last-used mode persists across open/close cycles. */
let lastUsedMode: HpMode = "damage";

/** Programmatically set the initial mode for the next HpAdjuster open (used by keyboard shortcuts). */
export function setLastHpMode(mode: HpMode) {
  lastUsedMode = mode;
}

interface HpAdjusterProps {
  onApplyDamage: (amount: number) => void;
  onApplyHealing: (amount: number) => void;
  onSetTempHp: (value: number) => void;
  onClose: () => void;
  /** All combatants in the encounter — enables multi-target AoE section. */
  allCombatants?: Combatant[];
  /** ID of the combatant this HpAdjuster is attached to (excluded from the multi-target checklist). */
  primaryTargetId?: string;
  /** Callback to apply HP change to multiple targets at once. */
  onApplyToMultiple?: (targetIds: string[], amount: number, mode: HpMode) => void;
}

export function HpAdjuster({
  onApplyDamage,
  onApplyHealing,
  onSetTempHp,
  onClose,
  allCombatants,
  primaryTargetId,
  onApplyToMultiple,
}: HpAdjusterProps) {
  const t = useTranslations("combat");
  const [mode, setModeState] = useState<HpMode>(lastUsedMode);
  const setMode = (m: HpMode) => {
    lastUsedMode = m;
    setModeState(m);
  };
  const [value, setValue] = useState("");
  const [multiTargetOpen, setMultiTargetOpen] = useState(false);
  const [checkedTargets, setCheckedTargets] = useState<Set<string>>(new Set());

  // Primary target combatant (for display at top of multi-target list)
  const primaryTarget = allCombatants?.find((c) => c.id === primaryTargetId);

  // Other combatants eligible for multi-target (non-defeated, not the primary target)
  const otherCombatants = allCombatants?.filter(
    (c) => c.id !== primaryTargetId && !c.is_defeated
  ) ?? [];
  const hasMultiTargetOption = otherCombatants.length > 0;

  const toggleTarget = (id: string) => {
    setCheckedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedTargets.size === otherCombatants.length) {
      setCheckedTargets(new Set());
    } else {
      setCheckedTargets(new Set(otherCombatants.map((c) => c.id)));
    }
  };

  /** Resolve the effective mode and amount from the raw input value. */
  const resolveAction = (): { effectiveMode: HpMode; amount: number } | null => {
    const rawValue = value.trim();
    if (!rawValue) return null;
    const num = parseInt(rawValue, 10);
    if (isNaN(num)) return null;

    if (rawValue.startsWith("-")) {
      return { effectiveMode: "damage", amount: Math.abs(num) };
    }
    if (rawValue.startsWith("+")) {
      return { effectiveMode: "heal", amount: Math.abs(num) };
    }
    if (num <= 0) return null;
    return { effectiveMode: mode, amount: num };
  };

  const handleApply = () => {
    const action = resolveAction();
    if (!action) return;
    const { effectiveMode, amount } = action;

    const additionalTargets = Array.from(checkedTargets);
    const hasAdditionalTargets = additionalTargets.length > 0;

    if (hasAdditionalTargets && onApplyToMultiple) {
      // Multi-target path: primary + checked targets
      const allTargetIds = primaryTargetId
        ? [primaryTargetId, ...additionalTargets]
        : additionalTargets;
      onApplyToMultiple(allTargetIds, amount, effectiveMode);
    } else if (hasAdditionalTargets && !onApplyToMultiple) {
      // Fallback: apply individually to primary then each additional target
      console.warn("HpAdjuster: multi-target checked but onApplyToMultiple not provided");
      if (effectiveMode === "damage") {
        onApplyDamage(amount);
        // Additional targets cannot be applied via single-target callbacks
        // (they only know about the primary). This is the degraded path.
      } else if (effectiveMode === "heal") {
        onApplyHealing(amount);
      } else {
        onSetTempHp(amount);
      }
    } else {
      // Single target only (original behavior)
      if (effectiveMode === "damage") onApplyDamage(amount);
      else if (effectiveMode === "heal") onApplyHealing(amount);
      else onSetTempHp(amount);
    }

    setValue("");
    setCheckedTargets(new Set());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="mt-2 p-2 bg-white/[0.04] rounded-md"
      data-testid="hp-adjuster"
    >
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(["damage", "heal", "temp"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2 py-1 text-xs rounded font-medium min-h-[44px] inline-flex items-center transition-colors ${
                mode === m
                  ? m === "damage"
                    ? "bg-red-600 text-white"
                    : m === "heal"
                      ? "bg-green-600 text-white"
                      : "bg-purple-600 text-white"
                  : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
              }`}
              data-testid={`hp-mode-${m}`}
            >
              {m === "damage" ? t("hp_mode_damage") : m === "heal" ? t("hp_mode_heal") : t("hp_mode_temp")}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          placeholder="0"
          className="w-16 px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono text-center min-h-[44px] focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("hp_amount_aria", { mode: mode === "damage" ? t("hp_mode_damage") : mode === "heal" ? t("hp_mode_heal") : t("hp_mode_temp") })}
          data-testid="hp-amount-input"
          autoFocus
        />
        <button
          type="button"
          onClick={handleApply}
          className={`px-3 py-1 text-white text-xs font-medium rounded transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] ${
            mode === "damage"
              ? "bg-red-600 hover:bg-red-500"
              : mode === "heal"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-purple-600 hover:bg-purple-500"
          }`}
          data-testid="hp-apply-btn"
        >
          {t("hp_apply")}
          {checkedTargets.size > 0 && (
            <span className="ml-1 opacity-80">
              (+{checkedTargets.size})
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[44px]"
          aria-label={t("hp_close")}
          data-testid="hp-close-btn"
        >
          ✕
        </button>
      </div>

      {/* Multi-target AoE section — collapsed by default */}
      {hasMultiTargetOption && (
        <div className="mt-2" data-testid="hp-multi-target-section">
          <button
            type="button"
            onClick={() => setMultiTargetOpen((prev) => !prev)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="hp-multi-target-toggle"
          >
            <span className="text-[10px]">{multiTargetOpen ? "▼" : "▶"}</span>
            {t("hp_multi_target")}
          </button>

          {multiTargetOpen && (
            <div className="mt-1.5 border border-white/10 rounded-md bg-surface-secondary p-2">
              {/* Current target — always checked, shown at top */}
              {primaryTarget && (
                <div
                  className="flex items-center gap-2 px-1.5 py-1 rounded bg-white/[0.08] mb-1.5"
                  data-testid="hp-multi-target-primary"
                >
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="rounded border-white/20 bg-white/[0.06] text-gold focus:ring-gold/40 h-3.5 w-3.5 flex-shrink-0 opacity-60"
                  />
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {primaryTarget.name}
                    <span className="ml-1 text-[10px] opacity-60">— {t("hp_current_target")}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                    {primaryTarget.current_hp}/{primaryTarget.max_hp}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="hp-multi-target-toggle-all"
                >
                  {checkedTargets.size === otherCombatants.length
                    ? t("hp_deselect_all")
                    : t("hp_select_all")}
                </button>
                {checkedTargets.size > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {checkedTargets.size}/{otherCombatants.length}
                  </span>
                )}
              </div>
              <div
                className="space-y-0.5 max-h-[160px] overflow-y-auto"
                data-testid="hp-multi-target-list"
              >
                {otherCombatants.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                    data-testid={`hp-multi-target-${c.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedTargets.has(c.id)}
                      onChange={() => toggleTarget(c.id)}
                      className="rounded border-white/20 bg-white/[0.06] text-gold focus:ring-gold/40 h-3.5 w-3.5 flex-shrink-0"
                    />
                    <span className="text-xs text-foreground truncate flex-1">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                      {c.current_hp}/{c.max_hp}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
