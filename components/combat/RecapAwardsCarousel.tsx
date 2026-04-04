"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Crown, Skull, Shield, Heart, Target, Dice5, Zap, Timer, ChevronRight } from "lucide-react";
import type { CombatReportAward, AwardType } from "@/lib/types/combat-report";

const AWARD_CONFIG: Record<AwardType, { icon: typeof Crown; color: string; bg: string }> = {
  mvp: { icon: Crown, color: "text-gold", bg: "bg-gold/20 border-gold/40" },
  assassin: { icon: Skull, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
  tank: { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  healer: { icon: Heart, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
  crit_king: { icon: Target, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
  unlucky: { icon: Dice5, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  speedster: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30" },
  slowpoke: { icon: Timer, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
};

const AUTO_ADVANCE_MS = 3000;

interface RecapAwardsCarouselProps {
  awards: CombatReportAward[];
  onComplete: () => void;
}

export function RecapAwardsCarousel({ awards, onComplete }: RecapAwardsCarouselProps) {
  const t = useTranslations("combat");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const advance = useCallback(() => {
    if (currentIndex < awards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsComplete(true);
      onComplete();
    }
  }, [currentIndex, awards.length, onComplete]);

  // Auto-advance timer
  useEffect(() => {
    if (isComplete) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, isComplete, advance]);

  // Tap/click anywhere to advance
  const handleTap = useCallback(() => {
    if (!isComplete) advance();
  }, [isComplete, advance]);

  // Handle empty awards via effect to avoid setState-during-render
  useEffect(() => {
    if (awards.length === 0) onComplete();
  }, [awards.length, onComplete]);

  if (awards.length === 0) return null;

  const award = awards[currentIndex];
  const config = AWARD_CONFIG[award.type];
  const Icon = config.icon;

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[280px] cursor-pointer select-none"
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTap(); }}
    >
      {/* Progress dots */}
      <div className="flex gap-1.5 mb-6">
        {awards.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? `w-6 ${config.bg.split(" ")[0].replace("/10", "/60").replace("/20", "/60")} bg-current ${config.color}` :
              i < currentIndex ? "w-1.5 bg-white/30" : "w-1.5 bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Award card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -30 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className={`flex flex-col items-center gap-4 rounded-2xl border-2 p-6 sm:p-8 w-full max-w-xs ${config.bg}`}
        >
          {/* Icon with pulse */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", bounce: 0.5 }}
            className={`flex items-center justify-center w-16 h-16 rounded-full ${config.bg.split(" ")[0]}`}
          >
            <Icon className={`size-8 ${config.color}`} />
          </motion.div>

          {/* Award title */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`text-xs font-bold uppercase tracking-widest ${config.color}`}
          >
            {t(`recap_award_${award.type}`)}
          </motion.p>

          {/* Combatant name */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-2xl font-display font-bold text-foreground"
          >
            {award.combatantName}
          </motion.p>

          {/* Value */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-sm text-muted-foreground font-mono"
          >
            {award.displayValue}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Tap hint */}
      {!isComplete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex items-center gap-1 mt-4 text-xs text-muted-foreground/50"
        >
          {t("recap_tap_to_continue")}
          <ChevronRight className="size-3" />
        </motion.p>
      )}
    </div>
  );
}
