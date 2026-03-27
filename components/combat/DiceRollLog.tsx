"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Dices } from "lucide-react";

export interface DiceRollEntry {
  id: string;
  timestamp: number;
  /** Description like "Brass Greatwyrm — Bite Attack" */
  label: string;
  /** The dice expression like "2d6+5" */
  expression: string;
  /** Individual die results */
  rolls: number[];
  /** Modifier/bonus */
  modifier: number;
  /** Final total */
  total: number;
  /** Optional type for styling */
  type?: "attack" | "damage" | "save" | "check" | "initiative";
}

interface DiceRollLogProps {
  entries: DiceRollEntry[];
  className?: string;
}

export function DiceRollLog({ entries, className }: DiceRollLogProps) {
  const t = useTranslations("combat");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center text-muted-foreground/40 py-8 ${className ?? ""}`}>
        <Dices className="w-8 h-8 mb-2" />
        <p className="text-sm">{t("no_rolls_yet")}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${className ?? ""}`}>
      <div className="space-y-2 p-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-surface-secondary/50 rounded-lg p-2.5 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gold/70 font-medium truncate">{entry.label}</span>
              <span className="text-xs text-muted-foreground/40">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/60 font-mono">{entry.expression}</span>
              <span className="text-muted-foreground/30">&rarr;</span>
              <div className="flex items-center gap-1">
                {entry.rolls.map((roll, i) => (
                  <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-tertiary text-xs font-mono text-foreground border border-white/10">
                    {roll}
                  </span>
                ))}
                {entry.modifier !== 0 && (
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    {entry.modifier > 0 ? "+" : ""}{entry.modifier}
                  </span>
                )}
              </div>
              <span className="text-foreground font-bold text-sm ml-auto">{entry.total}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
