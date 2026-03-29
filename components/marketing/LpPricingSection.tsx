"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const proFeatureKeys = [
  "pro_feature_1",
  "pro_feature_2",
  "pro_feature_3",
  "pro_feature_4",
  "pro_feature_5",
  "pro_feature_6",
  "pro_feature_7",
  "pro_feature_8",
  "pro_feature_9",
  "pro_feature_10",
] as const;

export function LpPricingSection() {
  const t = useTranslations("lp_pricing");

  return (
    <section
      data-section="lp-pricing"
      id="precos"
      className="py-14 md:py-24 px-4 md:px-6 relative overflow-hidden bg-[#0d0d14]"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gold/[0.025] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Beta Banner — first element per spec: eliminate cost objection before anything */}
        <div
          className="mb-10 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-gold/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in"
          style={{ animationDelay: "0.05s" }}
        >
          <p className="text-sm sm:text-base text-foreground/90 text-center sm:text-left">
            <span className="mr-1.5" aria-hidden="true">
              &#10024;
            </span>
            {t("beta_banner")}
          </p>
          <Link
            href="/try"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-gold/40 text-gold text-sm font-semibold hover:bg-gold/10 transition-colors duration-200 min-h-[44px]"
          >
            {t("beta_cta")}
          </Link>
        </div>

        {/* Section heading */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-gold mb-4">
            {t("section_title")}
          </h2>
        </div>

        {/* Plan Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {/* ── Free Card ── */}
          <div
            className="relative rounded-2xl bg-card p-5 md:p-8 flex flex-col transition-all duration-200 hover:ring-2 hover:ring-gold/40"
            style={{
              background: "#13131f",
              border: "1px solid rgba(212,168,83,0.25)",
              boxShadow:
                "0 0 0 1px rgba(212,168,83,0.08), 0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            <h3 className="text-xl font-display text-foreground mb-3">
              {t("free_title")}
            </h3>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-mono font-bold text-foreground tracking-tight">
                {t("free_price")}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("free_period")}
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {(
                [
                  "free_feature_1",
                  "free_feature_2",
                  "free_feature_3",
                  "free_feature_4",
                  "free_feature_5",
                  "free_feature_6",
                  "free_feature_7",
                  "free_feature_8",
                ] as const
              ).map((key) => (
                <li key={key} className="flex items-start gap-2.5">
                  <CheckIcon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/80">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/try"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold text-surface-primary font-semibold rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 text-sm"
            >
              {t("free_cta")}
            </Link>
          </div>

          {/* ── Pro Card (dimmed) — collapsed on mobile ── */}
          <div
            className="relative rounded-2xl border border-border p-5 md:p-8 flex flex-col opacity-60 cursor-default"
            aria-disabled="true"
            style={{
              background: "#13131f",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-display text-foreground">
                {t("pro_title")}
              </h3>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/20"
                aria-label={t("pro_coming_soon")}
              >
                {t("pro_coming_soon")}
              </span>
            </div>

            {/* Mobile: compact summary */}
            <div className="md:hidden">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-mono font-bold text-foreground tracking-tight">
                  {t("pro_price")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("pro_period")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("pro_includes_free")}
              </p>
            </div>

            {/* Desktop: full feature list */}
            <div className="hidden md:block">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-mono font-bold text-foreground tracking-tight">
                  {t("pro_price")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("pro_period")}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {t("pro_includes_free")}
              </p>

              <ul className="space-y-2.5 flex-1">
                {proFeatureKeys.map((key) => (
                  <li key={key} className="flex items-start gap-2.5">
                    <CheckIcon className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/60">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
