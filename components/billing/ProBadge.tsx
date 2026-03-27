"use client";

import { useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { UpsellCard, shouldShowUpsell } from "./UpsellCard";
import type { FeatureFlagKey } from "@/lib/types/subscription";

interface ProBadgeProps {
  flagKey: FeatureFlagKey;
  className?: string;
}

/**
 * Gold "Pro" badge with lock icon. Shows on Pro-gated features for Free users.
 * Click triggers contextual upsell (max 1x per session per feature).
 * Accessible: keyboard focusable, aria-label, tooltip.
 */
export function ProBadge({ flagKey, className = "" }: ProBadgeProps) {
  const t = useTranslations("pro");
  const [upsellOpen, setUpsellOpen] = useState(false);

  const handleClick = useCallback(() => {
    trackEvent("pro_badge_click", { feature: flagKey });
    if (shouldShowUpsell(flagKey)) {
      setUpsellOpen(true);
    }
  }, [flagKey]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
          bg-[#D4A853]/15 text-[#D4A853] border border-[#D4A853]/30
          hover:bg-[#D4A853]/25 transition-colors cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A853]/50
          ${className}`}
        aria-label={t("badge.tooltip")}
        title={t("badge.tooltip")}
      >
        <Lock className="w-3 h-3" aria-hidden="true" />
        <span>{t("badge.label")}</span>
      </button>

      <UpsellCard
        flagKey={flagKey}
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
      />
    </>
  );
}
