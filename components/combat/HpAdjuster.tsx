"use client";

import { useState } from "react";

type HpMode = "damage" | "heal" | "temp";

interface HpAdjusterProps {
  onApplyDamage: (amount: number) => void;
  onApplyHealing: (amount: number) => void;
  onSetTempHp: (value: number) => void;
  onClose: () => void;
}

export function HpAdjuster({
  onApplyDamage,
  onApplyHealing,
  onSetTempHp,
  onClose,
}: HpAdjusterProps) {
  const [mode, setMode] = useState<HpMode>("damage");
  const [value, setValue] = useState("");

  const handleApply = () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return;
    if (mode === "damage") onApplyDamage(num);
    else if (mode === "heal") onApplyHealing(num);
    else onSetTempHp(num);
    setValue("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="flex items-center gap-2 mt-2 p-2 bg-white/[0.04] rounded-md"
      data-testid="hp-adjuster"
    >
      <div className="flex gap-1">
        {(["damage", "heal", "temp"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-2 py-1 text-xs rounded font-medium min-h-[32px] transition-colors ${
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
            {m === "damage" ? "Dmg" : m === "heal" ? "Heal" : "Temp"}
          </button>
        ))}
      </div>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="0"
        className="w-16 px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono text-center min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={`${mode === "damage" ? "Damage" : mode === "heal" ? "Healing" : "Temporary HP"} amount`}
        data-testid="hp-amount-input"
        autoFocus
      />
      <button
        type="button"
        onClick={handleApply}
        className="px-3 py-1 bg-gold text-foreground text-xs font-medium rounded transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[32px]"
        data-testid="hp-apply-btn"
      >
        Apply
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-2 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]"
        aria-label="Close HP adjuster"
        data-testid="hp-close-btn"
      >
        ✕
      </button>
    </div>
  );
}
