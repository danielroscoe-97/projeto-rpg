"use client";

import { useTranslations } from "next-intl";
import { DIFFICULTY_OPTIONS } from "@/components/combat/DifficultyPoll";

export function calculateAverage(votes: Map<string, number>): number {
  const values = Array.from(votes.values());
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface PollResultProps {
  votes: Map<string, number>;
  onClose: () => void;
}

export function PollResult({ votes, onClose }: PollResultProps) {
  const t = useTranslations("combat");
  const avg = calculateAverage(votes);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-center text-lg font-semibold text-foreground">
          {t("poll_result_title")}
        </h2>
        <div className="text-center">
          <span className="text-2xl font-bold text-gold">
            {avg.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground ml-1">/ 5</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("poll_votes_count", { count: votes.size })}
        </p>
        <div className="space-y-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const count = Array.from(votes.values()).filter(
              (v) => v === opt.value
            ).length;
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <Icon className={`w-4 h-4 flex-shrink-0 ${opt.color}`} />
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${opt.bgActive.split(" ")[0]} rounded-full transition-all`}
                    style={{
                      width: `${votes.size ? (count / votes.size) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-4 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-2 px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm font-medium hover:bg-gold/30 transition-colors"
        >
          {t("poll_close")}
        </button>
      </div>
    </div>
  );
}
