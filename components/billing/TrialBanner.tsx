"use client";

import { useTranslations } from "next-intl";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Non-dismissable trial banner. Shows countdown in days.
 * - Active trial: "Trial Pro: X dias restantes" + subscribe CTA
 * - Expired trial: "Seu trial expirou" + subscribe CTA
 * - Amber when ≤2 days, red when expired
 */
export function TrialBanner() {
  const t = useTranslations("billing");
  const subscription = useSubscriptionStore((s) => s.subscription);
  const status = useSubscriptionStore((s) => s.status);

  // Only show for trial or recently-expired trial
  if (!subscription) return null;
  if (status !== "trialing" && status !== "canceled") return null;
  if (status === "canceled" && !subscription.trial_ends_at) return null;

  const trialEnd = subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at)
    : null;

  if (!trialEnd) return null;

  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const isExpired = daysLeft === 0 || status === "canceled";
  const isUrgent = daysLeft <= 2 && !isExpired;

  const bgColor = isExpired
    ? "bg-red-500/10 border-red-500/30"
    : isUrgent
      ? "bg-amber-500/10 border-amber-500/30"
      : "bg-[#D4A853]/10 border-[#D4A853]/30";

  const textColor = isExpired
    ? "text-red-400"
    : isUrgent
      ? "text-amber-400"
      : "text-[#D4A853]";

  return (
    <div
      className={`w-full px-4 py-2.5 flex items-center justify-between border-b ${bgColor}`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
        <Clock className="w-4 h-4" aria-hidden="true" />
        {isExpired
          ? t("trial_expired")
          : t("trial_days_left", { days: daysLeft })}
      </div>
      <Link
        href="/app/settings?tab=billing"
        className={`inline-flex items-center gap-1 text-sm font-medium ${textColor} hover:underline`}
      >
        {t("subscribe_now")}
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
