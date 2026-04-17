"use client";

/**
 * S4.4 — Contextual login nudge for the compendium.
 *
 * Shown at the top of the compendium for Guest / Anonymous users only.
 * Auth users never see it (mode="authenticated" → returns null).
 *
 * Dismissal persists for 3 days in localStorage (fallback sessionStorage).
 *
 * Canonical spec: docs/epic-2-combat-ux-hotfixes.md — Hotfix 14 (lines 1896–2136).
 *
 * Auth detection rule (from PlayerJoinClient.tsx:425):
 *   const isRealAuth = !!u && !u.is_anonymous;
 * We do NOT derive mode from `authReady && authUserId` — anon users also have a UID.
 */

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { sanitizeReturnUrl } from "@/lib/utils/returnUrl";

const DISMISS_KEY = "compendium_login_nudge_dismissed_at";
const DISMISS_TTL_DAYS = 3;
const DISMISS_TTL_MS = DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000;

export type CompendiumNudgeMode = "guest" | "anonymous" | "authenticated";

interface Props {
  mode: CompendiumNudgeMode;
  /** Internal return-url that the login/signup page should redirect back to. */
  returnUrl?: string;
}

/** Read dismissal timestamp — localStorage first, sessionStorage fallback. */
function getDismissTs(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : null;
    }
  } catch {
    /* localStorage blocked — fall through */
  }
  try {
    const raw = window.sessionStorage.getItem(DISMISS_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : null;
    }
  } catch {
    /* storage blocked — treat as no prior dismissal */
  }
  return null;
}

function setDismissTs(ts: number): void {
  if (typeof window === "undefined") return;
  const v = String(ts);
  try {
    window.localStorage.setItem(DISMISS_KEY, v);
    return;
  } catch {
    /* fall back to sessionStorage */
  }
  try {
    window.sessionStorage.setItem(DISMISS_KEY, v);
  } catch {
    /* both blocked — banner will re-appear next mount, acceptable */
  }
}

export function CompendiumLoginNudge({ mode, returnUrl }: Props) {
  const t = useTranslations("compendium");
  // SSR-safe default: assume dismissed until useEffect proves otherwise.
  // Prevents hydration flicker and banner-on-SSR for auth users.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (mode === "authenticated") return;
    const ts = getDismissTs();
    const expired = ts == null || Date.now() - ts > DISMISS_TTL_MS;
    if (expired) {
      setDismissed(false);
      trackEvent("compendium:login_nudge_shown", { mode });
    }
  }, [mode]);

  if (mode === "authenticated" || dismissed) return null;

  const safeReturn = sanitizeReturnUrl(returnUrl);
  const nextParam = safeReturn && safeReturn !== "/" ? `?next=${encodeURIComponent(safeReturn)}` : "";
  const loginHref = mode === "guest" ? `/auth/sign-up${nextParam}` : `/auth/login${nextParam}`;
  const ctaKey = mode === "guest" ? "login_nudge_cta_guest" : "login_nudge_cta_anon";

  const handleCtaClick = () => {
    trackEvent("compendium:login_nudge_cta_clicked", { mode });
  };

  const handleDismiss = () => {
    setDismissTs(Date.now());
    setDismissed(true);
    trackEvent("compendium:login_nudge_dismissed", { mode, ttl_days: DISMISS_TTL_DAYS });
  };

  return (
    <div
      role="note"
      aria-label={t("login_nudge_title")}
      className="flex items-start gap-3 p-3 mx-3 mt-3 mb-1 bg-gold/10 border border-gold/30 rounded-md"
      data-testid="compendium-login-nudge"
    >
      <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium">{t("login_nudge_title")}</p>
        <p className="text-xs text-foreground/70 mt-0.5">{t("login_nudge_desc")}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={loginHref}
          onClick={handleCtaClick}
          className={
            // bg-gold + text-surface-primary passes WCAG AA (text-white on gold fails).
            "px-3 py-2 text-xs font-semibold rounded bg-gold text-surface-primary " +
            "hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-gold/50 " +
            "min-w-[44px] min-h-[44px] md:min-h-[32px] inline-flex items-center justify-center"
          }
          data-testid="compendium-login-nudge-cta"
        >
          {t(ctaKey)}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("login_nudge_dismiss")}
          className={
            "min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] " +
            "inline-flex items-center justify-center rounded " +
            "text-muted-foreground hover:text-foreground " +
            "focus:outline-none focus:ring-2 focus:ring-gold/30"
          }
          data-testid="compendium-login-nudge-dismiss"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Test-only: reset state for Jest. Not referenced in production code. */
export const __TEST_ONLY__ = {
  DISMISS_KEY,
  DISMISS_TTL_MS,
  DISMISS_TTL_DAYS,
};
