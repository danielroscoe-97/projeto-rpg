"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface StickyTurnHeaderProps {
  currentCombatantName: string;
  isPcTurn: boolean;
  nextCombatantName?: string;
  roundNumber: number;
}

export function StickyTurnHeader({
  currentCombatantName,
  isPcTurn,
  nextCombatantName,
  roundNumber,
}: StickyTurnHeaderProps) {
  const t = useTranslations("combat");

  return (
    <div className="h-14 bg-background/95 border-b border-gold/20 px-3 sm:px-4 flex items-center gap-3 max-w-2xl mx-auto w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentCombatantName}-${roundNumber}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <span className="text-gold text-sm shrink-0" aria-hidden>
            ▶
          </span>
          <div className="flex flex-col min-w-0">
            <span
              className={`text-sm font-medium truncate max-w-[200px] ${
                isPcTurn ? "text-gold" : "text-foreground"
              }`}
            >
              {isPcTurn
                ? t("sticky_pc_turn", { name: currentCombatantName })
                : currentCombatantName}
            </span>
            {nextCombatantName && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {t("sticky_next", { name: nextCombatantName })}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <span className="text-xs text-muted-foreground/60 font-mono shrink-0">
        R{roundNumber}
      </span>
    </div>
  );
}
