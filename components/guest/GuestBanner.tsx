"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const DISMISSED_KEY = "guest-banner-dismissed";
const SESSION_START_KEY = "guest-session-start";
const SESSION_LIMIT_MS = 4 * 60 * 60 * 1000; // 4 hours

export function GuestBanner() {
  const t = useTranslations("guest");
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
      if (wasDismissed) setDismissed(true);

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
      // Update more frequently when time is running low (every 10s under 15min, else 30s)
      intervalRef.current = setInterval(updateTimer, 10_000);
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

  // SSR: render nothing; client: show banner by default, hide only if previously dismissed
  if (!mounted || !showBanner) return null;

  return (
    <div
      role="status"
      className={`w-full border-b px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-4 gap-y-1.5 text-sm ${
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
          href="/auth/sign-up?from=guest-combat"
          className="text-gold hover:underline underline-offset-2 transition-colors font-medium"
        >
          {t("signup_cta")}
        </Link>
      </span>
      {/* Compact Google sign-in */}
      <button
        type="button"
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/confirm?from=guest-combat`,
              queryParams: { access_type: "offline", prompt: "consent" },
            },
          });
        }}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors min-h-[44px]"
        data-testid="guest-banner-google"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Google
      </button>
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
