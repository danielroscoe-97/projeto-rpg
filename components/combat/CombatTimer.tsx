"use client";

import { useState, useEffect } from "react";

interface CombatTimerProps {
  startTime: number;
  isPaused?: boolean;
}

export function CombatTimer({ startTime, isPaused = false }: CombatTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const display = hours > 0
    ? `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <span
      className={`text-xs font-mono tabular-nums ${isPaused ? "text-amber-400/60 animate-pulse" : "text-muted-foreground/60"}`}
      aria-label={`Combat duration: ${display}`}
      data-testid="combat-timer"
    >
      ⏱ {display}
    </span>
  );
}
