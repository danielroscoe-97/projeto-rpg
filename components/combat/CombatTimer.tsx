"use client";

import { useState, useEffect } from "react";

interface CombatTimerProps {
  startTime: number;
}

export function CombatTimer({ startTime }: CombatTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  const display = hours > 0
    ? `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <span
      className="text-muted-foreground/60 text-xs font-mono tabular-nums"
      aria-label={`Combat duration: ${display}`}
      data-testid="combat-timer"
    >
      ⏱ {display}
    </span>
  );
}
