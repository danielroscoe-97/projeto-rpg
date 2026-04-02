"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Coffee, Smile, Swords, Flame, Skull, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DIFFICULTY_OPTIONS = [
  { value: 1 as const, icon: Coffee, labelKey: "poll_very_easy", color: "text-green-400", bgActive: "bg-green-500/20 border-green-500/50" },
  { value: 2 as const, icon: Smile, labelKey: "poll_easy", color: "text-blue-400", bgActive: "bg-blue-500/20 border-blue-500/50" },
  { value: 3 as const, icon: Swords, labelKey: "poll_balanced", color: "text-gold", bgActive: "bg-gold/20 border-gold/50" },
  { value: 4 as const, icon: Flame, labelKey: "poll_hard", color: "text-orange-400", bgActive: "bg-orange-500/20 border-orange-500/50" },
  { value: 5 as const, icon: Skull, labelKey: "poll_very_hard", color: "text-red-400", bgActive: "bg-red-500/20 border-red-500/50" },
] as const;

export { DIFFICULTY_OPTIONS };

interface DifficultyPollProps {
  onVote: (vote: 1 | 2 | 3 | 4 | 5) => void;
  onSkip: () => void;
  /** Guest/local-only mode — no broadcast, no waiting state */
  isLocalOnly?: boolean;
}

export function DifficultyPoll({ onVote, onSkip, isLocalOnly = false }: DifficultyPollProps) {
  const t = useTranslations("combat");
  const [myVote, setMyVote] = useState<number | null>(null);
  const hasVoted = myVote !== null;

  return (
    // UX.05 — entrance animation
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen bg-background flex items-center justify-center p-4"
    >
      <div className="bg-surface-overlay border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-center text-lg font-semibold text-foreground">
          {t("poll_title")}
        </h2>
        <div className="flex justify-center gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (!hasVoted) {
                    setMyVote(opt.value);
                    onVote(opt.value);
                  }
                }}
                disabled={hasVoted}
                className={cn(
                  // UX.14-style: minimum touch target
                  "flex flex-col items-center gap-1.5 px-2.5 py-2.5 rounded-lg border transition-all min-h-[44px] touch-manipulation",
                  myVote === opt.value
                    ? opt.bgActive
                    : hasVoted
                      ? "opacity-20 border-white/5"
                      : `border-white/10 hover:border-white/20 ${opt.color}`
                )}
              >
                <Icon className="w-6 h-6" />
                {/* UX.03 — text-xs not text-[10px] */}
                <span className="text-xs leading-tight font-medium">
                  {t(opt.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* UX.01 — waiting state after vote (player only, not local-only) */}
        {hasVoted && !isLocalOnly && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("poll_waiting_dm")}
          </div>
        )}
        {hasVoted && isLocalOnly && (
          <p className="text-center text-sm text-gold">{t("poll_thanks")}</p>
        )}

        {/* UX.02 — use invisible instead of conditional removal to avoid layout shift */}
        <button
          onClick={onSkip}
          className={cn(
            "w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors",
            hasVoted ? "invisible" : "visible"
          )}
        >
          {t("poll_skip")}
        </button>
      </div>
    </motion.div>
  );
}
