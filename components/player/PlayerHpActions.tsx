"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Shield, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlayerHpActionsProps {
  characterId: string;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  connectionStatus: string;
  onHpAction: (combatantId: string, action: "damage" | "heal" | "temp_hp", amount: number) => void;
}

type HpActionType = "damage" | "heal" | "temp_hp";

const ACTION_CONFIG: Record<HpActionType, { color: string; bgColor: string; borderColor: string }> = {
  damage: { color: "text-red-400", bgColor: "bg-red-600/80", borderColor: "border-red-500/30" },
  heal: { color: "text-green-400", bgColor: "bg-green-600/80", borderColor: "border-green-500/30" },
  temp_hp: { color: "text-blue-400", bgColor: "bg-blue-600/80", borderColor: "border-blue-500/30" },
};

export function PlayerHpActions({
  characterId,
  currentHp,
  maxHp,
  tempHp,
  connectionStatus,
  onHpAction,
}: PlayerHpActionsProps) {
  const t = useTranslations("player");
  const [activeAction, setActiveAction] = useState<HpActionType | null>(null);
  const [value, setValue] = useState("");
  // UX.11 — track popover placement direction
  const [popoverAbove, setPopoverAbove] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOffline = connectionStatus !== "connected";

  // Focus input when popover opens
  useEffect(() => {
    if (activeAction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeAction]);

  // UX.11 — detect viewport space when popover opens
  useEffect(() => {
    if (activeAction && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // If less than 80px above, open downward instead
      setPopoverAbove(rect.top > 80);
    }
  }, [activeAction]);

  // Close on click outside
  useEffect(() => {
    if (!activeAction) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveAction(null);
        setValue("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeAction]);

  const handleSubmit = useCallback(() => {
    const amount = parseInt(value, 10);
    if (!activeAction || !amount || amount <= 0 || amount > 9999 || !Number.isInteger(amount)) return;
    onHpAction(characterId, activeAction, amount);

    // UX.12 — toast confirmation after submit
    if (activeAction === "damage") toast(`−${amount} HP ${t("hp_sent_suffix")}`);
    else if (activeAction === "heal") toast(`+${amount} HP ${t("hp_sent_suffix")}`);
    else toast(`+${amount} Temp HP ${t("hp_sent_suffix")}`);

    setActiveAction(null);
    setValue("");
  }, [activeAction, value, characterId, onHpAction, t]);

  const isDisabledByCondition = (key: HpActionType) => {
    if (key === "heal") return false;
    return currentHp <= 0;
  };

  const actions: Array<{ key: HpActionType; label: string; icon: typeof Minus }> = [
    { key: "damage", label: t("hp_damage"), icon: Minus },
    { key: "heal", label: t("hp_heal"), icon: Plus },
    { key: "temp_hp", label: t("hp_temp"), icon: Shield },
  ];

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {actions.map(({ key, label, icon: Icon }) => {
        const config = ACTION_CONFIG[key];
        const disabledByCondition = isDisabledByCondition(key);
        const isDisabled = isOffline || disabledByCondition;

        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (activeAction === key) {
                setActiveAction(null);
                setValue("");
              } else {
                setActiveAction(key);
                setValue("");
              }
            }}
            disabled={isDisabled}
            // UX.15 — distinct tooltip for disabled reason
            title={
              isOffline
                ? t("hp_disabled_offline")
                : disabledByCondition
                  ? t("hp_disabled_unconscious")
                  : undefined
            }
            className={cn(
              // UX.14 — min touch target 44px, increased padding
              "flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium rounded border transition-colors min-h-[36px] touch-manipulation",
              // UX.16 — distinct visual for offline vs disabled-by-condition
              isOffline
                ? "opacity-30 pointer-events-none border-transparent text-muted-foreground"
                : disabledByCondition
                  ? "opacity-50 pointer-events-none border-transparent text-muted-foreground"
                  : activeAction === key
                    ? `${config.color} ${config.borderColor}`
                    : `${config.color} border-transparent hover:${config.borderColor}`
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        );
      })}

      {/* UX.16 — offline indicator icon */}
      {isOffline && (
        <WifiOff className="w-3 h-3 text-muted-foreground opacity-50" />
      )}

      {/* UX.11 — popover with viewport-aware positioning */}
      {activeAction && (
        <div
          className={cn(
            "absolute left-0 z-50 flex items-center gap-1.5 p-2 rounded-lg border shadow-xl bg-surface-overlay",
            popoverAbove ? "bottom-full mb-1" : "top-full mt-1",
            ACTION_CONFIG[activeAction].borderColor
          )}
        >
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {activeAction === "damage" ? t("hp_damage_title") :
             activeAction === "heal" ? t("hp_heal_title") :
             t("hp_temp_title")}
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setActiveAction(null);
                setValue("");
              }
            }}
            className={cn(
              "w-14 h-7 text-center text-sm font-mono bg-black/50 rounded border",
              ACTION_CONFIG[activeAction].borderColor
            )}
            placeholder={t("hp_amount_placeholder")}
          />
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              "h-7 px-2 text-xs font-medium rounded text-white",
              ACTION_CONFIG[activeAction].bgColor
            )}
          >
            {t("hp_apply")}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveAction(null);
              setValue("");
            }}
            className="h-7 px-2 text-xs font-medium bg-white/10 rounded text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
