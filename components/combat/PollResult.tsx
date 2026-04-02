"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { DIFFICULTY_OPTIONS } from "@/components/combat/DifficultyPoll";

// UX.08 — exclude DM key from average (DM is biased as encounter creator)
export function calculateAverage(votes: Map<string, number>): number {
  const values = Array.from(votes.entries())
    .filter(([key]) => key !== "DM")
    .map(([, v]) => v);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

interface PollResultProps {
  votes: Map<string, number>;
  onClose: () => void;
  /** Total players in session for live counter — optional */
  totalPlayers?: number;
}

export function PollResult({ votes, onClose, totalPlayers }: PollResultProps) {
  const t = useTranslations("combat");
  // UX.06 — disable button after first click to prevent double-fire of destructive action
  const [isClosing, setIsClosing] = useState(false);

  const avg = calculateAverage(votes);
  // UX.10 — count only player votes (exclude DM)
  const playerVoteCount = Array.from(votes.keys()).filter((k) => k !== "DM").length;
  const totalVotes = votes.size;

  // UX.07 — semantic anchor: find closest option to avg
  const closestOption = avg > 0
    ? DIFFICULTY_OPTIONS.reduce((prev, curr) =>
        Math.abs(curr.value - avg) < Math.abs(prev.value - avg) ? curr : prev
      )
    : null;

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface-overlay border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-center text-lg font-semibold text-foreground">
          {t("poll_result_title")}
        </h2>

        {/* UX.07 — avg with semantic anchor */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-gold">
            {avg > 0 ? avg.toFixed(1) : "—"}
          </span>
          <span className="text-sm text-muted-foreground">/ 5</span>
          {closestOption && (() => {
            const Icon = closestOption.icon;
            return (
              <span className={`flex items-center gap-1 text-sm ${closestOption.color} ml-1`}>
                <Icon className="w-4 h-4" />
                {t(closestOption.labelKey)}
              </span>
            );
          })()}
        </div>

        {/* UX.10 — live vote counter */}
        <p className="text-center text-sm text-muted-foreground">
          {totalPlayers != null
            ? `${playerVoteCount} / ${totalPlayers} ${t("poll_votes_received")}`
            : t("poll_votes_count", { count: totalVotes })}
        </p>

        <div className="space-y-2">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const count = Array.from(votes.values()).filter((v) => v === opt.value).length;
            // UX.09 — percentage alongside count
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <Icon className={`w-4 h-4 flex-shrink-0 ${opt.color}`} />
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    // P2.03: use dedicated bgBar field — not fragile split of bgActive
                    className={`h-full ${opt.bgBar} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                  {count > 0 ? `${count} (${pct}%)` : "—"}
                </span>
              </div>
            );
          })}
        </div>

        {/* UX.06 — loading state + intentional label "Encerrar Sessão" */}
        <button
          onClick={handleClose}
          disabled={isClosing}
          className="w-full mt-2 px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm font-medium hover:bg-gold/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isClosing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("poll_closing")}
            </>
          ) : (
            t("poll_end_session")
          )}
        </button>
      </div>
    </div>
  );
}
