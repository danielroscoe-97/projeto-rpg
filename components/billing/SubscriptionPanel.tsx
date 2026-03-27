"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import { invalidateFlagCache } from "@/lib/feature-flags";
import { trackEvent } from "@/lib/analytics/track";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import {
  Crown,
  Lock,
  CreditCard,
  ExternalLink,
  Clock,
  Check,
} from "lucide-react";

const PRO_FEATURES = [
  "persistent_campaigns",
  "saved_presets",
  "export_data",
  "homebrew",
  "session_analytics",
  "cr_calculator",
  "file_sharing",
  "email_invites",
] as const;

export function SubscriptionPanel() {
  const t = useTranslations("billing");
  const {
    plan,
    status,
    subscription,
    loading: subLoading,
    loadSubscription,
  } = useSubscriptionStore();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleStartTrial = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/trial", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "trial_already_used") {
          toast.error(t("trial_already_used"));
        } else {
          toast.error(t("trial_error"));
        }
        return;
      }

      toast.success(t("trial_activated"));
      trackEvent("trial_activated");
      invalidateFlagCache();
      // Reload subscription state
      useSubscriptionStore.setState({ initialized: false });
      loadSubscription();
    } catch (error) {
      captureError(error, { component: "SubscriptionPanel", action: "startTrial", category: "payment" });
      toast.error(t("trial_error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async (interval: "month" | "year") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        toast.error(t("checkout_error"));
        return;
      }

      trackEvent("checkout_started", { interval });
      window.location.href = data.url;
    } catch (error) {
      captureError(error, { component: "SubscriptionPanel", action: "checkout", category: "payment" });
      toast.error(t("checkout_error"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManage = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        toast.error(t("portal_error"));
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      captureError(error, { component: "SubscriptionPanel", action: "manageBilling", category: "payment" });
      toast.error(t("portal_error"));
    } finally {
      setActionLoading(false);
    }
  };

  if (subLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-white/5 rounded w-48" />
        <div className="h-32 bg-white/5 rounded" />
      </div>
    );
  }

  // Calculate trial days left
  const trialDaysLeft =
    status === "trialing" && subscription?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Calculate cancel date
  const cancelDate =
    subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : null;

  const isCanceling = status === "active" && subscription?.current_period_end &&
    new Date(subscription.current_period_end).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Current Plan */}
      <section className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-[#D4A853]" aria-hidden="true" />
          <h2 className="text-foreground font-semibold">{t("plan_title")}</h2>
        </div>

        {/* Pro Active */}
        {plan === "pro" && status === "active" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-[#D4A853]/15 text-[#D4A853]">
                {t("plan.pro")}
              </span>
              {cancelDate && (
                <span className="text-sm text-muted-foreground">
                  {t("renewal_date", { date: cancelDate })}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleManage}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-foreground hover:bg-white/[0.06] transition-colors min-h-[44px] disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" aria-hidden="true" />
                {t("manage")}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleManage}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border text-muted-foreground hover:bg-white/[0.06] transition-colors min-h-[44px] disabled:opacity-50"
              >
                {t("history")}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Trial Active */}
        {status === "trialing" && trialDaysLeft > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-[#D4A853]/15 text-[#D4A853]">
                {t("plan.trial")}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                {t("trial_days_left", { days: trialDaysLeft })}
              </span>
            </div>
            {/* Trial progress bar */}
            <div className="w-full bg-white/5 rounded-full h-2">
              <div
                className="bg-[#D4A853] h-2 rounded-full transition-all duration-500"
                style={{ width: `${((14 - trialDaysLeft) / 14) * 100}%` }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCheckout("month")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[#D4A853] hover:bg-[#C49A48] text-black transition-colors min-h-[44px] disabled:opacity-50"
              >
                {t("subscribe_now")}
              </button>
            </div>
          </div>
        )}

        {/* Free Plan */}
        {plan === "free" && status !== "trialing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-white/5 text-muted-foreground">
                {t("plan.free")}
              </span>
            </div>

            {/* Pro feature list with locks */}
            <div className="grid gap-2 py-2">
              {PRO_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Lock className="w-3.5 h-3.5 text-[#D4A853]/50" aria-hidden="true" />
                  {t(`features.${feature}`)}
                </div>
              ))}
            </div>

            {/* Pricing + CTAs */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-baseline gap-3">
                <div className="text-center">
                  <span className="text-2xl font-bold text-foreground">R$14,90</span>
                  <span className="text-sm text-muted-foreground">/{t("month")}</span>
                </div>
                <span className="text-muted-foreground">{t("or")}</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-foreground">R$119,90</span>
                  <span className="text-sm text-muted-foreground">/{t("year")}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!subscription?.trial_ends_at && (
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-[#D4A853] hover:bg-[#C49A48] text-black transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    {t("trial_cta")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCheckout("month")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-[#D4A853]/30 text-[#D4A853] hover:bg-[#D4A853]/10 transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {t("upgrade_cta")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canceled but still active until period end */}
        {status === "canceled" && cancelDate && isCanceling && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-amber-500/15 text-amber-400">
                {t("plan.pro")}
              </span>
              <span className="text-sm text-amber-400">
                {t("cancels_on", { date: cancelDate })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("cancel_info")}</p>
          </div>
        )}
      </section>

      {/* Pro features list (for Pro users) */}
      {plan === "pro" && (
        <section className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-foreground font-semibold mb-3">{t("your_features")}</h3>
          <div className="grid gap-2">
            {PRO_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                {t(`features.${feature}`)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
