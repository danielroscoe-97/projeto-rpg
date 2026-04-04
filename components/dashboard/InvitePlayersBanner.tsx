"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Users, X } from "lucide-react";

const DISMISS_KEY = "pocketdm:invite-banner-dismissed";

interface InvitePlayersBannerProps {
  /** Number of campaigns with unlinked players (characters without real user accounts) */
  campaignsWithPlayers: number;
}

export function InvitePlayersBanner({ campaignsWithPlayers }: InvitePlayersBannerProps) {
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed || campaignsWithPlayers === 0) return null;

  return (
    <div className="relative rounded-xl border border-gold/20 bg-gold/[0.04] px-4 py-3.5 sm:px-5 mb-6">
      <button
        type="button"
        onClick={() => { setDismissed(true); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }}
        className="absolute top-2 right-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
        aria-label={t("invite_banner_dismiss")}
      >
        <X className="size-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gold/10">
          <Users className="size-4 text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t("invite_banner_title")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {t("invite_banner_description")}
          </p>
        </div>
      </div>
    </div>
  );
}
