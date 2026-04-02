"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Shield } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOffline = connectionStatus !== "connected";

  // Focus input when popover opens
  useEffect(() => {
    if (activeAction && inputRef.current) {
      inputRef.current.focus();
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
    setActiveAction(null);
    setValue("");
  }, [activeAction, value, characterId, onHpAction]);

  const actions: Array<{ key: HpActionType; label: string; icon: typeof Minus; disabled: boolean }> = [
    { key: "damage", label: t("hp_damage"), icon: Minus, disabled: currentHp <= 0 },
    { key: "heal", label: t("hp_heal"), icon: Plus, disabled: false },
    { key: "temp_hp", label: t("hp_temp"), icon: Shield, disabled: currentHp <= 0 },
  ];

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {actions.map(({ key, label, icon: Icon, disabled }) => {
        const config = ACTION_CONFIG[key];
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
            disabled={isOffline || disabled}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded border transition-colors",
              isOffline || disabled
                ? "opacity-30 pointer-events-none border-transparent"
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

      {/* Inline popover — appears above the buttons */}
      {activeAction && (
        <div
          className={cn(
            "absolute bottom-full mb-1 left-0 z-50 flex items-center gap-1.5 p-2 rounded-lg border shadow-xl bg-[#1a1a2e]",
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
