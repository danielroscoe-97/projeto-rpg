"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Crown, Check, Swords, ArrowRight } from "lucide-react";

export default function CheckoutSuccessPage() {
  const t = useTranslations("billing");
  const router = useRouter();
  const [seconds, setSeconds] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/app");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  const unlockedFeatures = [
    t("features.persistent_campaigns"),
    t("features.saved_presets"),
    t("features.export_data"),
    t("features.homebrew"),
    t("features.session_analytics"),
    t("features.cr_calculator"),
    t("features.file_sharing"),
    t("features.email_invites"),
  ];

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Celebration header */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold/10 mb-4">
            <Crown className="w-10 h-10 text-gold" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("checkout_success_title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {t("checkout_success_subtitle")}
          </p>
        </div>

        {/* Unlocked features */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wider mb-4">
            {t("checkout_success_unlocked")}
          </h2>
          <ul className="space-y-3 text-left">
            {unlockedFeatures.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-foreground text-sm"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-gold" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            href="/app/campaigns"
            className="inline-flex items-center justify-center gap-2 bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
          >
            <Swords className="w-4 h-4" aria-hidden="true" />
            {t("checkout_success_create_campaign")}
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground font-semibold px-6 py-3 rounded-lg text-sm hover:border-white/20 hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
          >
            {t("checkout_success_dashboard")}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Countdown */}
        <p className="text-xs text-muted-foreground">
          {t("checkout_success_redirect", { seconds })}
        </p>
      </div>
    </div>
  );
}
