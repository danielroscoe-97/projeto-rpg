"use client";

import { useState, useRef } from "react";
import { Dice5 } from "lucide-react";
import { roll } from "@/lib/dice/roll";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const ROLL_RESULT_EVENT = "dice-roll-result";

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20, 100];

interface TrayState {
  [sides: number]: number;
}

export function DiceRoller() {
  const t = useTranslations("dice");
  const [tray, setTray] = useState<TrayState>({});
  const [lastTotal, setLastTotal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const increment = (sides: DieType) => {
    setTray((prev) => {
      const current = prev[sides] ?? 0;
      if (current >= 9) return prev;
      return { ...prev, [sides]: current + 1 };
    });
    if (typeof navigator !== "undefined") navigator.vibrate?.([30]);
  };

  const decrement = (sides: DieType) => {
    setTray((prev) => {
      const current = prev[sides] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev, [sides]: current - 1 };
      if (next[sides] === 0) delete next[sides];
      return next;
    });
  };

  const hasAnyDie = Object.values(tray).some((n) => n > 0);

  const handleRoll = () => {
    if (!hasAnyDie) return;
    if (typeof navigator !== "undefined") navigator.vibrate?.([80]);

    let total = 0;
    for (const [sides, count] of Object.entries(tray)) {
      if (count <= 0) continue;
      const notation = `${count}d${sides}`;
      const result = roll(notation, "Tray");
      total += result.total;
      window.dispatchEvent(
        new CustomEvent(ROLL_RESULT_EVENT, { detail: structuredClone(result) })
      );
    }

    setLastTotal(total);
    setTray({});

    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => {
      setOpen(false);
      setLastTotal(null);
    }, 2000);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (dismissRef.current) clearTimeout(dismissRef.current);
      setLastTotal(null);
      setTray({});
    }
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 px-2 py-2 bg-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.1] rounded-md transition-all duration-[250ms] min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
          aria-label={t("roller_title")}
          title={t("roller_title")}
          data-testid="dice-roller-btn"
        >
          <Dice5 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="grid grid-cols-4 gap-2">
          {DIE_TYPES.map((sides) => {
            const count = tray[sides] ?? 0;
            return (
              <div key={sides} className="flex flex-col items-center gap-1">
                {/* Die button — tap to increment */}
                <button
                  type="button"
                  onClick={() => increment(sides)}
                  className={`relative w-12 h-12 rounded-lg border transition-colors font-cinzel font-bold text-sm
                    ${
                      count > 0
                        ? "border-[#D4A853]/60 bg-[#D4A853]/10 text-[#D4A853]"
                        : "border-muted-foreground/30 text-muted-foreground hover:border-[#D4A853]/40"
                    }`}
                  aria-label={`d${sides}: ${count}`}
                >
                  d{sides}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#D4A853] text-background text-[10px] font-bold flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
                {/* Decrement button — only visible when count > 0 */}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => decrement(sides)}
                    className="text-muted-foreground hover:text-foreground text-xs leading-none"
                    aria-label={`Remove d${sides}`}
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Roll button + total */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            className="flex-1 bg-[#D4A853] hover:bg-[#D4A853]/80 text-background font-semibold"
            disabled={!hasAnyDie}
            onClick={handleRoll}
          >
            {t("roller_roll")}
          </Button>
          {lastTotal !== null && (
            <span className="text-2xl font-cinzel font-bold text-[#D4A853] min-w-[2.5rem] text-center">
              {lastTotal}
            </span>
          )}
        </div>

        {/* Summary of selected dice */}
        {hasAnyDie && (
          <p className="mt-1.5 text-xs text-center text-muted-foreground">
            {Object.entries(tray)
              .filter(([, n]) => n > 0)
              .map(([s, n]) => `${n}d${s}`)
              .join(" + ")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
