"use client";

import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import type { FeatureFlagKey } from "@/lib/types/subscription";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface UpsellCardProps {
  flagKey: FeatureFlagKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Contextual upsell modal shown when a Free user tries to use a Pro feature.
 * Max 1x per session per feature (sessionStorage dedup).
 * NEVER shown as random popup — always triggered by user action.
 */
export function UpsellCard({ flagKey, open, onOpenChange }: UpsellCardProps) {
  const t = useTranslations("upsell");
  const status = useSubscriptionStore((s) => s.status);

  const handleShow = () => {
    markUpsellShown(flagKey);
    trackEvent("upsell_shown", { feature: flagKey });
  };

  const handleTrialClick = () => {
    trackEvent("upsell_clicked", { feature: flagKey });
    // Navigate to trial activation or checkout
    window.location.href = "/app/settings?tab=billing&action=trial";
  };

  const handlePlansClick = () => {
    trackEvent("upsell_clicked", { feature: flagKey });
    window.location.href = "/app/settings?tab=billing";
  };

  const handleDismiss = () => {
    trackEvent("upsell_dismissed", { feature: flagKey });
    onOpenChange(false);
  };

  // Has the user already used their trial?
  const hasUsedTrial = status === "canceled";
  const primaryCta = hasUsedTrial ? t("see_plans") : t("start_trial");
  const primaryAction = hasUsedTrial ? handlePlansClick : handleTrialClick;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="max-w-md"
        onAnimationEnd={() => {
          if (open) handleShow();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg">
            {t(`${flagKey}.title`)}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {t(`${flagKey}.description`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>
            {t("not_now")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={primaryAction}
            className="bg-[#D4A853] hover:bg-[#C49A48] text-black font-medium"
          >
            {primaryCta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Check if upsell has already been shown for this feature in this session. */
export function hasShownUpsell(flagKey: FeatureFlagKey): boolean {
  if (typeof window === "undefined") return true;
  return !!sessionStorage.getItem(`upsell_shown_${flagKey}`);
}

/** Mark upsell as shown — call when the dialog actually opens. */
export function markUpsellShown(flagKey: FeatureFlagKey): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`upsell_shown_${flagKey}`, "1");
}

/** Convenience: check + mark in one call (legacy compat) */
export function shouldShowUpsell(flagKey: FeatureFlagKey): boolean {
  if (hasShownUpsell(flagKey)) return false;
  return true;
}
