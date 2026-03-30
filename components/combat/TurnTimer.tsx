"use client";

import { useState, useEffect } from "react";

interface TurnTimerProps {
  startTime: number;
}

export function TurnTimer({ startTime }: TurnTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  useEffect(() => {
    setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  // Subtle urgency: text turns amber after 1 min, red after 3 min
  const colorClass = elapsed >= 180
    ? "text-red-400/80"
    : elapsed >= 60
      ? "text-amber-400/80"
      : "text-muted-foreground/60";

  return (
    <span
      className={`${colorClass} text-xs font-mono tabular-nums transition-colors duration-500`}
      aria-label={`Turn duration: ${display}`}
      data-testid="turn-timer"
    >
      {display}
    </span>
  );
}
