"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { OnboardingSource } from "@/lib/types/database";

interface GuestPreview {
  combatantCount: number;
  roundNumber: number;
}

interface WelcomeScreenProps {
  source: OnboardingSource;
  guestPreview?: GuestPreview | null;
  onContinue: () => void;
}

export function WelcomeScreen({ source, guestPreview, onContinue }: WelcomeScreenProps) {
  const t = useTranslations("onboarding_welcome");

  const isGuestCombat = source === "guest_combat";

  const title = isGuestCombat ? t("guest_title") : t("fresh_title");
  const subtitle = isGuestCombat ? t("guest_subtitle") : t("fresh_subtitle");
  const cta = isGuestCombat ? t("guest_cta") : t("fresh_cta");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md mx-auto flex flex-col items-center text-center gap-6 py-8 px-4"
      data-testid="welcome-screen"
    >
      <Image
        src="/art/icons/mvp-crown.png"
        alt=""
        width={72}
        height={72}
        className="pixel-art opacity-90"
        aria-hidden="true"
        unoptimized
      />

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Guest preview card */}
      {isGuestCombat && guestPreview && guestPreview.combatantCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full rounded-xl border border-gold/30 bg-gold/[0.06] px-5 py-4"
          data-testid="guest-preview-card"
        >
          <p className="text-sm font-medium text-gold">
            {t("guest_preview_label", {
              count: guestPreview.combatantCount,
              round: guestPreview.roundNumber,
            })}
          </p>
        </motion.div>
      )}

      <Button
        variant="gold"
        size="lg"
        onClick={onContinue}
        className="w-full sm:w-auto min-h-[48px] px-8"
        data-testid="welcome-cta"
      >
        {cta}
      </Button>
    </motion.div>
  );
}
