"use client";

import { useState } from "react";
import Link from "next/link";
import { X, FlaskConical } from "lucide-react";

interface PostCombatMethodologyNudgeProps {
  text: string;
  linkText: string;
}

const DISMISS_KEY = "methodology_nudge_dismissed";
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

export function PostCombatMethodologyNudge({
  text,
  linkText,
}: PostCombatMethodologyNudgeProps) {
  const [visible, setVisible] = useState(() => !isDismissed());

  if (!visible) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  }

  return (
    <div className="relative rounded-lg border border-gold/15 bg-gold/[0.03] p-3 mt-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-foreground/30 hover:text-foreground/60 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-2.5 pr-6">
        <FlaskConical className="w-4 h-4 text-gold/60 shrink-0" />
        <p className="text-xs text-foreground/50">
          {text}{" "}
          <Link
            href="/methodology"
            className="text-gold/70 hover:text-gold transition-colors underline underline-offset-2"
          >
            {linkText}
          </Link>
        </p>
      </div>
    </div>
  );
}
