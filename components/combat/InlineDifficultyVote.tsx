"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_OPTIONS } from "@/components/combat/DifficultyPoll";
import { castLateVote } from "@/lib/supabase/encounter";

interface InlineDifficultyVoteProps {
  encounterId: string;
  /** Existing vote value (1-5) if user already voted */
  existingVote?: number | null;
  /** Existing aggregate avg for the encounter */
  currentAvg?: number | null;
  translations: {
    rateThis: string;
    yourVote: string;
    avg: string;
    error: string;
  };
}

export function InlineDifficultyVote({
  encounterId,
  existingVote,
  currentAvg,
  translations: t,
}: InlineDifficultyVoteProps) {
  const [expanded, setExpanded] = useState(false);
  const [myVote, setMyVote] = useState<number | null>(existingVote ?? null);
  const [avg, setAvg] = useState<number | null>(currentAvg ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const hasVoted = myVote !== null;

  // Show compact result if already voted
  if (hasVoted && !expanded) {
    const opt = DIFFICULTY_OPTIONS.find((o) => o.value === myVote);
    if (opt) {
      const Icon = opt.icon;
      return (
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
          {avg != null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {avg.toFixed(1)}
            </span>
          )}
        </div>
      );
    }
  }

  // Compact CTA button
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-gold hover:text-gold/80 transition-colors whitespace-nowrap"
      >
        {t.rateThis}
      </button>
    );
  }

  // Expanded vote buttons
  return (
    <div className="flex items-center gap-1">
      {DIFFICULTY_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(false);
              try {
                const result = await castLateVote(encounterId, opt.value);
                setMyVote(opt.value);
                setAvg(result.avg);
                setExpanded(false);
              } catch {
                setError(true);
              } finally {
                setLoading(false);
              }
            }}
            className={cn(
              "p-1.5 rounded transition-all touch-manipulation",
              loading
                ? "opacity-30 cursor-not-allowed"
                : `hover:bg-white/10 ${opt.color}`
            )}
            title={opt.labelKey}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1" />}
      {error && <span className="text-xs text-red-400 ml-1">{t.error}</span>}
      <button
        onClick={() => setExpanded(false)}
        className="text-xs text-muted-foreground hover:text-foreground ml-1"
      >
        &times;
      </button>
    </div>
  );
}
