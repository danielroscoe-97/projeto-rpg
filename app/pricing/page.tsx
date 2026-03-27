"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

/* ── Billing toggle ──────────────────────────────────────────────────────── */

function BillingToggle({
  yearly,
  onToggle,
  monthlyLabel,
  yearlyLabel,
}: {
  yearly: boolean;
  onToggle: () => void;
  monthlyLabel: string;
  yearlyLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.10] bg-white/[0.04] p-1">
      <button
        type="button"
        onClick={() => !yearly || onToggle()}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-[250ms] min-h-[36px] ${
          !yearly
            ? "bg-white/[0.10] text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {monthlyLabel}
      </button>
      <button
        type="button"
        onClick={() => yearly || onToggle()}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-[250ms] min-h-[36px] ${
          yearly
            ? "bg-white/[0.10] text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {yearlyLabel}
      </button>
    </div>
  );
}

/* ── Feature item ────────────────────────────────────────────────────────── */

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground/80">
      <Check
        className="w-4 h-4 mt-0.5 text-gold shrink-0"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

/* ── FAQ item ────────────────────────────────────────────────────────────── */

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left min-h-[44px] group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-foreground group-hover:text-gold transition-colors duration-[250ms]">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "max-h-[500px] opacity-100 pb-5" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function PricingPage() {
  const t = useTranslations("pricing");
  const [yearly, setYearly] = useState(false);

  const freeFeatures = [
    t("free_features.combat_tracker"),
    t("free_features.oracle_srd"),
    t("free_features.clickable_dice"),
  ];

  const proFeatures = [
    t("pro_features.persistent_campaigns"),
    t("pro_features.saved_presets"),
    t("pro_features.export_data"),
    t("pro_features.homebrew"),
    t("pro_features.cr_calculator"),
    t("pro_features.file_sharing"),
    t("pro_features.email_invites"),
    t("pro_features.soundboard"),
    t("pro_features.dm_notes"),
    t("pro_features.session_analytics"),
  ];

  const faqs = [
    { q: t("faq_1_q"), a: t("faq_1_a") },
    { q: t("faq_2_q"), a: t("faq_2_a") },
    { q: t("faq_3_q"), a: t("faq_3_a") },
  ];

  return (
    <div className="bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-10 text-center">
        {/* Subtle radial glow behind the header */}
        <div
          className="pointer-events-none absolute inset-0 -top-20 mx-auto max-w-2xl opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.25) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <h1 className="font-display text-3xl sm:text-4xl text-gold tracking-tight relative">
          {t("title")}
        </h1>
        <p className="mt-3 text-muted-foreground text-base sm:text-lg max-w-md mx-auto relative">
          {t("subtitle")}
        </p>

        {/* Billing toggle */}
        <div className="mt-8 flex justify-center items-center gap-3 relative">
          <BillingToggle
            yearly={yearly}
            onToggle={() => setYearly((v) => !v)}
            monthlyLabel={t("monthly")}
            yearlyLabel={t("yearly")}
          />
          {yearly && (
            <span className="text-xs font-semibold text-gold bg-gold/10 border border-gold/20 rounded-full px-2.5 py-0.5 animate-in fade-in slide-in-from-left-2 duration-200">
              {t("save_badge")}
            </span>
          )}
        </div>
      </section>

      {/* ── Plan cards ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* ─── Free plan ────────────────────────────────────────────── */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 flex flex-col">
            <h2 className="font-display text-xl text-foreground tracking-tight">
              {t("free_title")}
            </h2>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {t("free_price")}
              </span>
            </div>

            {/* CTA */}
            <Link
              href="/auth/sign-up"
              className="mt-6 inline-flex items-center justify-center w-full min-h-[44px] rounded-lg border border-white/[0.10] bg-white/[0.06] text-foreground text-sm font-semibold hover:bg-white/[0.10] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              {t("free_cta")}
            </Link>

            {/* Features */}
            <ul className="mt-8 flex flex-col gap-3" role="list">
              {freeFeatures.map((feat) => (
                <FeatureItem key={feat}>{feat}</FeatureItem>
              ))}
            </ul>
          </div>

          {/* ─── Pro plan ─────────────────────────────────────────────── */}
          <div className="relative rounded-2xl border border-gold/30 bg-white/[0.02] p-6 sm:p-8 flex flex-col shadow-[0_0_40px_-12px_rgba(212,168,83,0.15)]">
            {/* "Most popular" badge */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-surface-primary bg-gold rounded-full px-3 py-1 shadow-gold-glow">
              {t("most_popular")}
            </span>

            <h2 className="font-display text-xl text-gold tracking-tight mt-1">
              {t("pro_title")}
            </h2>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {yearly ? t("pro_price_yearly") : t("pro_price_monthly")}
              </span>
              <span className="text-muted-foreground text-sm">
                {yearly ? t("per_year") : t("per_month")}
              </span>
            </div>
            {yearly && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("yearly_equivalent")}
              </p>
            )}

            {/* CTA */}
            <Link
              href="/auth/sign-up?plan=pro"
              className="mt-6 inline-flex items-center justify-center w-full min-h-[44px] rounded-lg bg-gold text-surface-primary text-sm font-semibold hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              {t("pro_cta")}
            </Link>

            {/* Features */}
            <p className="mt-8 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("includes_free")}
            </p>
            <ul className="mt-4 flex flex-col gap-3" role="list">
              {proFeatures.map((feat) => (
                <FeatureItem key={feat}>{feat}</FeatureItem>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-2xl mx-auto">
        <h2 className="font-display text-2xl text-foreground tracking-tight text-center mb-8">
          {t("faq_title")}
        </h2>
        <div className="border-t border-white/[0.06]">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>
    </div>
  );
}
