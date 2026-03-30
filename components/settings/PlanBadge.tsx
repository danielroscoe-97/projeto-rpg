"use client";

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import type { Plan, SubscriptionStatus } from "@/lib/types/subscription";

interface PlanBadgeProps {
  plan: Plan;
  status: SubscriptionStatus | null;
  trialEndsAt: string | null;
}

function getDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function PlanBadge({ plan, status, trialEndsAt }: PlanBadgeProps) {
  const t = useTranslations("profile");

  const isTrial = status === "trialing";
  const daysRemaining = isTrial ? getDaysRemaining(trialEndsAt) : null;

  if (isTrial) {
    return (
      <span
        data-testid="plan-badge-trial"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-400"
      >
        {t("plan_trial")}
        {daysRemaining !== null && (
          <span className="text-amber-400/70 font-normal">
            ({t("days_remaining", { days: daysRemaining })})
          </span>
        )}
      </span>
    );
  }

  if (plan === "pro" || plan === "mesa") {
    return (
      <span
        data-testid="plan-badge-pro"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-400"
      >
        <Crown className="w-3.5 h-3.5" aria-hidden="true" />
        {t("plan_pro")}
      </span>
    );
  }

  return (
    <span
      data-testid="plan-badge-free"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-700/50 text-zinc-400"
    >
      {t("plan_free")}
    </span>
  );
}
