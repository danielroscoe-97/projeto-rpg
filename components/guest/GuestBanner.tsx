"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const DISMISSED_KEY = "guest-banner-dismissed";
const SESSION_START_KEY = "guest-session-start";
const SESSION_LIMIT_MS = 60 * 60 * 1000; // 60 minutes

export function GuestBanner() {
  const t = useTranslations("guest");
  const [dismissed, setDismissed] = useState(true);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
      if (!wasDismissed) setDismissed(false);

      // Track session start time
      let startTime = localStorage.getItem(SESSION_START_KEY);
      if (!startTime) {
        startTime = String(Date.now());
        localStorage.setItem(SESSION_START_KEY, startTime);
      }

      const updateTimer = () => {
        const elapsed = Date.now() - Number(startTime);
        const remaining = Math.max(0, SESSION_LIMIT_MS - elapsed);
        setMinutesLeft(Math.ceil(remaining / 60000));
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 30000);
    } catch {
      setDismissed(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // storage unavailable
    }
    setDismissed(true);
  };

  // Show urgent warning when 10 minutes or less remain, even if banner was dismissed
  const isUrgent = minutesLeft !== null && minutesLeft <= 10;
  const showBanner = !dismissed || isUrgent;

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className={`w-full border-b px-4 py-2 flex items-center justify-between gap-4 text-sm ${
        isUrgent
          ? "bg-red-900/30 border-red-500/30"
          : "bg-white/[0.04] border-white/[0.06]"
      }`}
      data-testid="guest-banner"
    >
      <span className={isUrgent ? "text-red-300" : "text-muted-foreground"}>
        {isUrgent && minutesLeft !== null
          ? t("time_warning", { minutes: minutesLeft })
          : t("guest_notice")
        }
        {" "}
        <Link
          href="/auth/sign-up"
          className="text-gold hover:underline underline-offset-2 transition-colors font-medium"
        >
          {t("signup_cta")}
        </Link>
      </span>
      {minutesLeft !== null && (
        <span
          className={`text-xs shrink-0 font-mono ${
            isUrgent ? "text-red-300 font-bold" : "text-muted-foreground/60"
          }`}
          aria-live="polite"
        >
          {minutesLeft}min
        </span>
      )}
      {!isUrgent && (
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 min-h-[44px] px-2 flex items-center"
          aria-label={t("dismiss")}
        >
          ×
        </button>
      )}
    </div>
  );
}
