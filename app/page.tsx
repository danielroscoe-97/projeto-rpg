import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Smartphone, BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { AnimatedCounter } from "@/components/marketing/AnimatedCounter";
import { HeroParticles } from "@/components/marketing/HeroParticles";
import { LandingPageTracker } from "@/components/analytics/LandingPageTracker";
import { LpPricingSection } from "@/components/marketing/LpPricingSection";
import { LandingLoggedInNav } from "@/components/marketing/LandingLoggedInNav";
import { LandingAuthRecovery } from "@/components/marketing/LandingAuthRecovery";
import { createClient } from "@/lib/supabase/server";
import { websiteLd, organizationLd, webApplicationLd, faqPageLd, jsonLdScriptProps } from "@/lib/seo/metadata";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFunc = (key: string) => string;

import { Button } from "@/components/ui/button";
import { RuneCircle, QuestPath, TorchGlow, FireTrail } from "@/components/ui/rpg";
import { getFireStepColor } from "@/lib/design/rpg-tokens";
import { StepMockup } from "@/components/marketing/HowItWorksMockups";
import { CompendiumMockup } from "@/components/marketing/CompendiumMockups";

// ── Inline SVG primitives ────────────────────────────────────────────────────
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// D4 — tetrahedron (triangle)
function D4Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <polygon points="24,6 44,42 4,42" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <text x="24" y="34" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" fontFamily="monospace" opacity="0.7">4</text>
    </svg>
  );
}

// D6 — isometric cube
function D6Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Top face */}
      <polygon points="24,6 40,16 24,26 8,16" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Left face */}
      <polygon points="8,16 24,26 24,42 8,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Right face */}
      <polygon points="40,16 24,26 24,42 40,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

// D8 — octahedron (diamond)
function D8Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <polygon points="24,4 44,24 24,44 4,24" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      <line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      <text x="24" y="28" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" fontFamily="monospace" opacity="0.7">8</text>
    </svg>
  );
}

// D10 — trapezohedron (elongated diamond with facets)
function D10Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Outer diamond */}
      <polygon points="24,2 44,22 24,46 4,22" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Upper facet lines */}
      <line x1="24" y1="2" x2="14" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="2" x2="34" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Mid belt */}
      <polyline points="4,22 14,22 24,26 34,22 44,22" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35" />
      {/* Lower facet lines */}
      <line x1="24" y1="46" x2="14" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <line x1="24" y1="46" x2="34" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}


function D20Icon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Outer silhouette — irregular pentagon (3D perspective) */}
      <polygon points="32,2 58,18 52,56 12,56 6,18" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
      {/* Top face — front triangle */}
      <polygon points="32,2 6,18 58,18" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.35" />
      {/* Upper-left facet */}
      <line x1="6" y1="18" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Upper-right facet */}
      <line x1="58" y1="18" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Lower-left facet */}
      <line x1="12" y1="56" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Lower-right facet */}
      <line x1="52" y1="56" x2="32" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
      {/* Bottom edge to center */}
      <line x1="6" y1="18" x2="12" y2="56" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
      <line x1="58" y1="18" x2="52" y2="56" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
    </svg>
  );
}


export const metadata = {
  title: { absolute: "Pocket DM — Free D&D 5e Combat & Initiative Tracker | Rastreador de Combate" },
  description:
    "Free D&D 5e combat & initiative tracker — no sign-up required. Track initiative, HP, conditions, and spells in real time on your players' phones. The best initiative tracker for in-person RPG sessions. Rastreador de combate e iniciativa grátis.",
  alternates: { canonical: "/" },
};

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection({ isLoggedIn, t }: { isLoggedIn: boolean; t: TFunc }) {
  return (
    <section data-section="hero" className="relative min-h-dvh flex items-center justify-center px-6 pt-[72px] overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/art/decorations/hero-figurines-map.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.18]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Floating particles */}
      <HeroParticles />

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cool/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center space-y-4">
        {/* Crown d20 Logo + Open Beta badge */}
        <div className="animate-fade-in flex flex-col items-center gap-2">
          {/* Open Beta — inline badge (emerald = live/open) */}
          <div className="relative px-4 py-1.5 bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-emerald-500/15 border border-emerald-400/40 rounded-full shadow-[0_4px_16px_rgba(52,211,153,0.12)] backdrop-blur-sm mb-1 overflow-hidden">
            {/* shimmer sweep */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" />
            <div className="relative flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="font-display font-bold text-emerald-300 text-[11px] tracking-[0.22em] uppercase leading-none">{t("open_beta")}</span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt="Pocket DM"
            className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_24px_rgba(212,168,83,0.35)] glow-pulse"
            width={96}
            height={96}
          />
          <span className="font-display text-gold text-lg sm:text-xl tracking-[0.15em] uppercase font-bold">Pocket DM</span>
          <span className="text-gold/40 text-xs sm:text-sm italic font-light tracking-[0.15em] -mt-1">{t("tagline")}</span>
        </div>

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-muted-foreground animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {t("live_badge")}
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display text-foreground leading-[1.1] tracking-tight animate-fade-in-up">
          {t("hero_headline_1")}
          <br />
          <span className="text-gold drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]">
            {t("hero_headline_2")}
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {t("hero_subheading")}
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 pt-2 animate-fade-in-up w-full max-w-md mx-auto" style={{ animationDelay: "0.2s" }}>
          {/* Primary escape-hatch — elongated, full width, gold-accented */}
          <Link
            href={isLoggedIn ? "/app/combat/new?quick=true" : "/try"}
            className="group relative overflow-hidden w-full py-3 bg-gold/[0.08] text-foreground font-semibold text-lg rounded-lg border border-gold/25 shadow-[0_0_20px_rgba(212,168,83,0.08)] hover:bg-gold/[0.14] hover:border-gold/40 hover:text-gold hover:shadow-[0_0_24px_rgba(212,168,83,0.15)] transition-all duration-[200ms] min-h-[48px] inline-flex items-center justify-center gap-2 btn-shimmer"
          >
            {isLoggedIn ? t("cta_quick_combat") : t("cta_try_free")}
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>

          {/* Secondary row */}
          {isLoggedIn ? (
            <Link
              href="/app/dashboard"
              className="group relative overflow-hidden w-full px-6 py-3 bg-gold text-surface-primary font-semibold text-sm rounded-lg hover:shadow-gold-glow hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[44px] inline-flex items-center justify-center gap-1.5 btn-shimmer"
            >
              <SparkleIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
              {t("cta_go_dashboard")}
              <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <Link
                href="/auth/sign-up"
                className="group relative overflow-hidden flex-1 px-6 py-3 bg-gold text-surface-primary font-semibold text-sm rounded-lg hover:shadow-gold-glow hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[44px] inline-flex items-center justify-center gap-1.5 btn-shimmer"
              >
                <SparkleIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
                {t("cta_save_campaigns")}
              </Link>
              <Link
                href="/auth/login"
                className="group px-6 py-3 bg-white/[0.04] text-muted-foreground font-medium text-sm rounded-lg border border-white/[0.07] hover:bg-white/[0.08] hover:text-foreground transition-all duration-[200ms] min-h-[44px] inline-flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity duration-200" />
                {t("cta_have_account")}
              </Link>
            </div>
          )}

        </div>

        {/* Stats strip */}
        <div className="flex items-center justify-center gap-0 pt-1 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          {[
            { value: 1100, label: t("stat_monsters") },
            { value: 600, label: t("stat_spells") },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <div className="w-px h-7 bg-white/[0.08] mx-5" />}
              <div className="text-center">
                <div className="text-gold font-mono font-bold text-sm leading-none">
                  <AnimatedCounter target={stat.value} duration={2200} />+
                </div>
                <div className="text-muted-foreground text-[10px] mt-0.5 tracking-wide uppercase">{stat.label}</div>
              </div>
            </React.Fragment>
          ))}
          <div className="w-px h-7 bg-white/[0.08] mx-5" />
          <div className="text-center">
            <div className="text-gold font-mono font-bold text-sm leading-none">{t("stat_price")}</div>
            <div className="text-muted-foreground text-[10px] mt-0.5 tracking-wide uppercase">{t("stat_price_label")}</div>
          </div>
        </div>


      </div>
    </section>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <div className="hidden md:flex justify-center items-center gap-4 py-4" aria-hidden="true">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/20 to-gold/20" />
      {/* SVG d6 diamond ornament */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gold/30">
        <path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" strokeWidth="1" fill="rgba(212,168,83,0.08)" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" opacity="0.6" />
      </svg>
      <div className="h-px w-24 bg-gradient-to-l from-transparent via-gold/20 to-gold/20" />
    </div>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────
function FeaturesSection({ t }: { t: TFunc }) {
  const features: { icon: React.ComponentType<{ className?: string }>; tag: string | null; title: string; description: string; hoverAnim: string }[] = [
    {
      icon: D20Icon,
      tag: null,
      title: t("feature_1_title"),
      description: t("feature_1_description"),
      hoverAnim: "icon-anim-roll",
    },
    {
      icon: Smartphone,
      tag: t("feature_2_tag"),
      title: t("feature_2_title"),
      description: t("feature_2_description"),
      hoverAnim: "icon-anim-buzz",
    },
    {
      icon: SparkleIcon,
      tag: null,
      title: t("feature_3_title"),
      description: t("feature_3_description"),
      hoverAnim: "icon-anim-sparkle",
    },
    {
      icon: D8Icon,
      tag: t("feature_4_tag"),
      title: t("feature_4_title"),
      description: t("feature_4_description"),
      hoverAnim: "icon-anim-flip",
    },
    {
      icon: D6Icon,
      tag: null,
      title: t("feature_5_title"),
      description: t("feature_5_description"),
      hoverAnim: "icon-anim-bounce",
    },
    {
      icon: BarChart3,
      tag: t("feature_6_tag"),
      title: t("feature_6_title"),
      description: t("feature_6_description"),
      hoverAnim: "icon-anim-swing",
    },
  ];

  return (
    <section data-section="features" className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden" id="features">
      {/* Decorative layer — floating RPG dice (desktop only) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" aria-hidden="true">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-gold/[0.04] rounded-full blur-[120px]" />
        <D20Icon className="absolute top-10 right-10 w-24 h-24 text-gold/20 float-drift-3" style={{ animationDelay: "-1s" }} />
        <SparkleIcon className="absolute bottom-16 left-16 w-10 h-10 text-gold/20 float-gentle" />
        <D4Icon className="absolute top-8 left-[8%] w-16 h-16 text-gold/15 float-drift-1" />
        <D6Icon className="absolute top-1/3 right-[5%] w-14 h-14 text-gold/12 float-drift-2" />
        <D8Icon className="absolute bottom-12 right-[12%] w-16 h-16 text-gold/15 float-drift-3" />
        <D10Icon className="absolute top-[55%] left-[3%] w-14 h-14 text-gold/12 float-drift-4" />
        <SparkleIcon className="absolute top-[20%] right-[25%] w-7 h-7 text-gold/15 float-drift-1" style={{ animationDelay: "-1.5s" }} />
        <SparkleIcon className="absolute bottom-[30%] left-[20%] w-8 h-8 text-gold/12 float-drift-3" style={{ animationDelay: "-3s" }} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-2 md:mb-4">
            {t("features_heading")}
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto hidden md:block">
            {t("features_subheading")}
          </p>
        </div>

        {/* Desktop: full cards with descriptions */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="relative bg-card border border-border rounded-xl p-6 hover:border-gold/50 hover:shadow-[0_16px_48px_rgba(212,168,83,0.15),0_4px_16px_rgba(0,0,0,0.4)] hover:-translate-y-3 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              {f.tag && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {f.tag}
                </span>
              )}
              <div className="bg-amber-400/10 rounded-full p-3.5 w-fit mb-4 group-hover:bg-amber-400/20 group-hover:shadow-[0_0_32px_rgba(251,191,36,0.35)] transition-all duration-300">
                <f.icon className={`w-7 h-7 text-amber-400 group-hover:text-amber-300 transition-colors duration-[200ms] ${f.hoverAnim}`} />
              </div>
              <h3 className="font-display text-foreground text-lg mb-2 group-hover:text-gold transition-colors duration-300">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile: visual mini-cards with icon + description visible */}
        <div className="grid grid-cols-2 gap-2.5 md:hidden">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="relative bg-card border border-border rounded-xl p-3.5 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {f.tag && (
                <span className="absolute top-2.5 right-2.5 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {f.tag}
                </span>
              )}
              <div className="bg-amber-400/10 rounded-full p-2 w-fit mb-2.5">
                <f.icon className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <h3 className="font-display text-foreground text-[13px] leading-tight mb-1">{f.title}</h3>
              <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-3">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Compendium Showcase ─────────────────────────────────────────────────────

/* Heraldic dragon silhouette — real traced SVG from reference image */
function DragonSilhouette({ side }: { side: "left" | "right" }) {
  const isRight = side === "right";
  return (
    <div
      className={`absolute pointer-events-none hidden md:block ${
        isRight
          ? "-right-64 -bottom-36 -scale-x-100"
          : "-left-64 -top-12"
      }`}
      aria-hidden="true"
    >
      {/* Fire glow behind dragon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[200px] h-[200px] rounded-full dragon-fire-bg" />
      </div>
      <Image
        src="/art/decorations/dragon-silhouette.svg"
        alt=""
        width={360}
        height={360}
        className="relative w-[320px] h-[320px] opacity-[0.14] dragon-fire"
      />
    </div>
  );
}

/* Large thematic SVG shown inside card — replaced by mockup on hover */
function CompendiumCardIcon({ type }: { type: "monsters" | "spells" | "classes" | "races" }) {
  const cls = "w-full h-full";
  switch (type) {
    case "monsters":
      return (
        <Image
          src="/art/decorations/orc-silhouette.svg"
          alt=""
          width={80}
          height={80}
          className="w-full h-full opacity-60"
        />
      );
    case "spells":
      return (
        <svg viewBox="0 0 80 80" fill="none" className={cls}>
          {/* Star burst */}
          <path d="M40 8l4 16 16 4-16 4-4 16-4-16-16-4 16-4z" stroke="#A855F7" strokeWidth="1.5" fill="#A855F7" fillOpacity="0.06" />
          {/* Inner star */}
          <path d="M40 20l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" stroke="#A855F7" strokeWidth="0.8" fill="#A855F7" fillOpacity="0.1" />
          {/* Orbit rings */}
          <circle cx="40" cy="40" r="24" stroke="#A855F7" strokeWidth="0.8" opacity="0.15" strokeDasharray="4 4" />
          <circle cx="40" cy="40" r="32" stroke="#A855F7" strokeWidth="0.5" opacity="0.1" strokeDasharray="2 6" />
          {/* Sparkle dots */}
          <circle cx="18" cy="30" r="1.5" fill="#A855F7" opacity="0.25" />
          <circle cx="62" cy="50" r="1.5" fill="#A855F7" opacity="0.25" />
          <circle cx="52" cy="18" r="1" fill="#A855F7" opacity="0.2" />
          <circle cx="28" cy="62" r="1" fill="#A855F7" opacity="0.2" />
        </svg>
      );
    case "classes":
      return (
        <svg viewBox="0 0 80 80" fill="none" className={`${cls} text-gold`}>
          {/* Shield shape */}
          <path d="M40 10L14 24v18c0 14 10 24 26 30 16-6 26-16 26-30V24L40 10z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
          {/* Inner cross */}
          <path d="M40 24v32M28 40h24" stroke="currentColor" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
          {/* Sword behind shield */}
          <path d="M40 6v8M38 8h4" stroke="currentColor" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
          {/* Decorative arcs */}
          <path d="M24 28c4-2 10-4 16-4s12 2 16 4" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
          <path d="M22 52c6 6 12 10 18 12 6-2 12-6 18-12" stroke="currentColor" strokeWidth="0.6" opacity="0.12" />
        </svg>
      );
    case "races":
      return (
        <svg viewBox="0 0 80 80" fill="none" className={cls}>
          {/* Central face circle */}
          <circle cx="40" cy="32" r="14" stroke="#22C55E" strokeWidth="1.5" fill="#22C55E" fillOpacity="0.06" />
          {/* Pointed ears */}
          <path d="M26 28c-4-6-4-14 0-18M54 28c4-6 4-14 0-18" stroke="#22C55E" strokeWidth="1" opacity="0.25" strokeLinecap="round" />
          {/* Eyes */}
          <ellipse cx="35" cy="30" rx="2.5" ry="1.5" fill="#22C55E" opacity="0.3" />
          <ellipse cx="45" cy="30" rx="2.5" ry="1.5" fill="#22C55E" opacity="0.3" />
          {/* Body silhouette */}
          <path d="M24 68c0-12 7-20 16-22 9 2 16 10 16 22" stroke="#22C55E" strokeWidth="1.2" fill="#22C55E" fillOpacity="0.04" strokeLinecap="round" />
          {/* Crown / circlet */}
          <path d="M30 20c2-2 6-4 10-4s8 2 10 4" stroke="#22C55E" strokeWidth="0.8" opacity="0.2" />
          <circle cx="40" cy="16" r="1.5" fill="#22C55E" opacity="0.2" />
        </svg>
      );
  }
}

/* Corner flourish — medieval filigree arc */
function CornerFlourish({ position }: { position: "top-left" | "bottom-right" }) {
  const isTopLeft = position === "top-left";
  return (
    <svg
      width="28" height="28" viewBox="0 0 28 28" fill="none"
      className={`absolute pointer-events-none w-5 h-5 md:w-7 md:h-7 text-gold opacity-[0.18] group-hover:opacity-[0.38] transition-opacity duration-300 ${
        isTopLeft ? "top-0 left-0" : "bottom-0 right-0 rotate-180"
      }`}
      aria-hidden="true"
    >
      <path d="M2 26V10C2 5.6 5.6 2 10 2h16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2 18V10C2 5.6 5.6 2 10 2h8" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="2" cy="26" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="26" cy="2" r="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

/* Golden seam — horizontal divider between mockup and text */
function GoldenSeam() {
  return (
    <div className="relative h-[8px] mx-3 flex items-center" aria-hidden="true">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <svg width="8" height="8" viewBox="0 0 8 8" className="mx-1 shrink-0 text-gold">
        <path d="M4 0.5L7.5 4L4 7.5L0.5 4Z" fill="currentColor" opacity="0.3" />
        <circle cx="4" cy="4" r="1" fill="currentColor" opacity="0.5" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
    </div>
  );
}

/* Thematic mini-icon for each compendium category */
function CompendiumBadgeIcon({ type }: { type: "monsters" | "spells" | "classes" | "races" }) {
  const cls = "w-2.5 h-2.5 shrink-0";
  switch (type) {
    case "monsters":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={cls}>
          <path d="M8 2C5.5 2 3 4 3 7c0 2 1 3.5 2 4.5L6 14h4l1-2.5C12 10.5 13 9 13 7c0-3-2.5-5-5-5z" stroke="#EF4444" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="6" cy="6.5" r="0.8" fill="#EF4444" opacity="0.7" />
          <circle cx="10" cy="6.5" r="0.8" fill="#EF4444" opacity="0.7" />
        </svg>
      );
    case "spells":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={cls}>
          <path d="M8 1L9.2 6.2L14 8L9.2 9.8L8 15L6.8 9.8L2 8L6.8 6.2Z" stroke="#A855F7" strokeWidth="1" fill="none" opacity="0.8" />
        </svg>
      );
    case "classes":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={`${cls} text-gold`}>
          <path d="M8 2L3 6v4l5 4 5-4V6L8 2z" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.8" />
          <path d="M8 5v6M5.5 8h5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        </svg>
      );
    case "races":
      return (
        <svg viewBox="0 0 16 16" fill="none" className={cls}>
          <circle cx="8" cy="6" r="3" stroke="#22C55E" strokeWidth="1.2" fill="none" opacity="0.8" />
          <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
        </svg>
      );
  }
}

function CompendiumShowcaseSection({ t }: { t: TFunc }) {
  const cards: { title: string; count: number; suffix: string; description: string; href: string; mockup: "monsters" | "spells" | "classes" | "races"; borderHover: string; gradient: string }[] = [
    {
      title: t("compendium_monsters_title"),
      count: 1100,
      suffix: "+",
      description: t("compendium_monsters_description"),
      href: "/monstros",
      mockup: "monsters",
      borderHover: "hover:border-red-500/30",
      gradient: "from-red-500/20 via-orange-500/10 to-transparent",
    },
    {
      title: t("compendium_spells_title"),
      count: 600,
      suffix: "+",
      description: t("compendium_spells_description"),
      href: "/magias",
      mockup: "spells",
      borderHover: "hover:border-purple-500/30",
      gradient: "from-purple-500/20 via-violet-500/10 to-transparent",
    },
    {
      title: t("compendium_classes_title"),
      count: 12,
      suffix: "",
      description: t("compendium_classes_description"),
      href: "/classes",
      mockup: "classes",
      borderHover: "hover:border-gold/30",
      gradient: "from-amber-500/20 via-gold/10 to-transparent",
    },
    {
      title: t("compendium_races_title"),
      count: 9,
      suffix: "",
      description: t("compendium_races_description"),
      href: "/racas",
      mockup: "races",
      borderHover: "hover:border-emerald-500/30",
      gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    },
  ];

  return (
    <section data-section="compendium-showcase" id="compendio" className="py-14 md:py-28 px-4 md:px-6 relative overflow-x-clip overflow-y-visible md:overflow-visible">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* P2: Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          aria-hidden="true"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,168,83,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 72%)",
          }}
        />

        {/* Floating D20 accent — desktop only */}
        <D20Icon className="hidden md:block absolute -top-6 -right-10 w-14 h-14 text-gold/[0.08] float-gentle pointer-events-none" aria-hidden="true" />
        <SparkleIcon className="hidden md:block absolute -bottom-4 -left-8 w-8 h-8 text-gold/[0.06] float-drift-2 pointer-events-none" aria-hidden="true" />

        {/* Golden dragon silhouettes — decorative background */}
        <DragonSilhouette side="left" />
        <DragonSilhouette side="right" />

        {/* Heading */}
        <div className="text-center mb-8 md:mb-14 animate-fade-in relative">
          <span className="inline-block text-[10px] md:text-xs font-semibold uppercase tracking-widest text-gold/80 bg-gold/10 border border-gold/20 rounded-full px-3 py-1 mb-3 md:mb-4">
            {t("compendium_badge")}
          </span>
          <h2 className="text-2xl md:text-3xl sm:text-4xl font-display text-foreground mb-2 md:mb-4">
            {t("compendium_heading")}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            {t("compendium_subheading")}
          </p>
        </div>

        {/* Cards grid — 2 cols mobile, 4 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 relative">
          {cards.map((card, i) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group relative border border-border rounded-xl transition-all duration-300 ${card.borderHover} hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-fade-in-up overflow-hidden`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Card gradient bg on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              {/* P1: Corner flourishes */}
              <CornerFlourish position="top-left" />
              <CornerFlourish position="bottom-right" />

              <div className="relative">
                {/* Mockup area — fixed height so all cards align */}
                <div className="relative overflow-hidden h-[160px]">
                  {/* Thematic SVG icon — visible by default, fades on hover */}
                  <div className="absolute inset-0 flex items-center justify-center p-6 transition-all duration-500 ease-out opacity-100 scale-100 group-hover:opacity-0 group-hover:scale-90 z-10 pointer-events-none">
                    <div className="w-16 h-16 md:w-20 md:h-20">
                      <CompendiumCardIcon type={card.mockup} />
                    </div>
                  </div>
                  {/* HTML mockup — hidden by default, appears on hover like a lens reveal */}
                  <div className="transition-all duration-500 ease-out opacity-0 scale-[0.92] blur-[2px] group-hover:opacity-100 group-hover:scale-100 group-hover:blur-0">
                    <CompendiumMockup type={card.mockup} />
                  </div>
                </div>

                {/* Golden seam between mockup and text */}
                <GoldenSeam />

                {/* Text overlay below mockup */}
                <div className="px-4 pb-4 pt-3">
                  {/* Counter + Badge Icon + Title */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-display text-xl md:text-2xl text-foreground">
                      <AnimatedCounter target={card.count} suffix={card.suffix} duration={1800} />
                    </span>
                    <div className="flex items-center gap-1">
                      <CompendiumBadgeIcon type={card.mockup} />
                      <h3 className="font-display text-gold text-sm">{card.title}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                    {card.description}
                  </p>

                  {/* Arrow CTA */}
                  <div className="mt-2 flex items-center gap-1 text-gold/60 group-hover:text-gold text-xs transition-colors">
                    <span>{t("compendium_explore")}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Social Proof ─────────────────────────────────────────────────────────────
function SocialProofSection({ t }: { t: TFunc }) {
  const testimonials = [
    {
      quote: t("testimonial_1_quote"),
      author: t("testimonial_1_author"),
      role: t("testimonial_1_role"),
      icon: "🛡️",
      accent: "from-amber-500/20 to-amber-700/10",
    },
    {
      quote: t("testimonial_2_quote"),
      author: t("testimonial_2_author"),
      role: t("testimonial_2_role"),
      icon: "⚔️",
      accent: "from-red-500/20 to-red-700/10",
    },
    {
      quote: t("testimonial_3_quote"),
      author: t("testimonial_3_author"),
      role: t("testimonial_3_role"),
      icon: "✨",
      accent: "from-purple-500/20 to-purple-700/10",
    },
  ];

  return (
    <section data-section="social-proof" className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cool/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-6 md:mb-14 animate-fade-in">
          <h2 className="text-2xl md:text-3xl sm:text-4xl font-display text-foreground mb-2 md:mb-4">
            {t("social_proof_heading")}
          </h2>
          <p className="text-muted-foreground text-sm hidden md:block">
            {t("social_proof_subheading")}
          </p>
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {testimonials.map((tm, i) => (
            <div
              key={i}
              className="relative bg-card border border-border rounded-xl p-6 h-full flex flex-col animate-fade-in-up hover:border-gold/30 transition-colors duration-300"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* RPG class icon + quote mark */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tm.accent} flex items-center justify-center text-lg border border-white/[0.08]`}>
                  {tm.icon}
                </div>
                <svg width="24" height="18" viewBox="0 0 32 24" fill="none" className="text-gold/25 shrink-0" aria-hidden="true">
                  <path d="M0 24V14.4C0 5.33 5.33 1.07 12 0l1.33 3.73C8.53 5.07 7.07 8.53 6.93 12H12v12H0zm18 0V14.4C18 5.33 23.33 1.07 30 0l1.33 3.73C26.53 5.07 25.07 8.53 24.93 12H30v12H18z" fill="currentColor" />
                </svg>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed flex-1 italic">
                &ldquo;{tm.quote}&rdquo;
              </p>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-sm font-medium text-foreground">{tm.author}</p>
                <p className="text-xs text-muted-foreground">{tm.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: horizontal scroll-snap carousel */}
        <div className="md:hidden">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
            {testimonials.map((tm, i) => (
              <div
                key={i}
                className="relative bg-card border border-border rounded-xl p-5 flex flex-col snap-center shrink-0 w-[85vw] max-w-[320px]"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${tm.accent} flex items-center justify-center text-sm border border-white/[0.08]`}>
                    {tm.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{tm.author}</p>
                    <p className="text-[10px] text-muted-foreground">{tm.role}</p>
                  </div>
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed flex-1 italic">
                  &ldquo;{tm.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
          {/* Scroll indicator dots */}
          <div className="flex justify-center gap-1.5 mt-3" aria-hidden="true">
            {testimonials.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-gold/60" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksSection({ isLoggedIn, t }: { isLoggedIn: boolean; t: TFunc }) {
  const TOTAL_STEPS = 4;
  const steps = [
    {
      step: 1,
      title: t("step_1_title"),
      description: t("step_1_description"),
      time: t("step_1_time"),
    },
    {
      step: 2,
      title: t("step_2_title"),
      description: t("step_2_description"),
      time: t("step_2_time"),
    },
    {
      step: 3,
      title: t("step_3_title"),
      description: t("step_3_description"),
      time: t("step_3_time"),
    },
    {
      step: 4,
      title: t("step_4_title"),
      description: t("step_4_description"),
      time: t("step_4_time"),
    },
  ];

  return (
    <section data-section="how-it-works" id="como-funciona" className="py-12 md:py-24 px-4 md:px-6 bg-surface-secondary/50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cool/[0.04] rounded-full blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(212,168,83,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,83,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-2 md:mb-4">
            {t("how_it_works_heading")}
          </h2>
          <p className="text-muted-foreground">{t("how_it_works_subheading")}</p>
        </div>

        {/* Desktop: horizontal flow */}
        <div className="hidden md:block relative">
          {/* ── Full-width fire trail (edge-to-edge, behind everything) ── */}
          <FireTrail className="z-[5] top-0" />

          {/* ── Fire gradient quest path connector ── */}
          <div className="absolute top-0 left-0 w-full z-10">
            <QuestPath steps={TOTAL_STEPS} currentStep={TOTAL_STEPS} />
          </div>

          {/* Step cards */}
          <div className="relative z-20 flex items-start gap-0">
            {steps.map((s, i) => {
              const isLast = s.step === TOTAL_STEPS;
              const stepColor = getFireStepColor(s.step, TOTAL_STEPS);
              const circle = (
                <RuneCircle step={s.step} total={TOTAL_STEPS} size="lg" active={isLast} />
              );

              return (
                <div
                  key={s.step}
                  className="flex-1 flex flex-col items-center text-center group animate-fade-in-up px-6 cursor-default transition-transform duration-300 ease-out hover:-translate-y-2"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {/* Step circle */}
                  <div className="relative mb-2 transition-transform duration-300 group-hover:scale-110">
                    {isLast ? (
                      <TorchGlow intensity="high" className="rounded-full">
                        {circle}
                      </TorchGlow>
                    ) : (
                      circle
                    )}
                  </div>
                  {/* Time badge — color matches fire step progression */}
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest mb-3 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: stepColor, opacity: 0.75 }}
                  >
                    {s.time}
                  </span>
                  {/* Mini-mockup illustration */}
                  <div className="w-full max-w-[240px] mb-3 rounded-xl transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(212,168,83,0.2),0_8px_32px_rgba(0,0,0,0.4)] group-hover:ring-1 group-hover:ring-gold/30">
                    <StepMockup step={s.step} />
                  </div>
                  <h3 className="font-display text-foreground text-base mb-1 group-hover:text-gold transition-colors duration-200">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px] transition-colors duration-300 group-hover:text-foreground/70">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: visual timeline with fire progression */}
        <div className="md:hidden flex flex-col gap-0 animate-fade-in-up">
          {steps.map((s) => {
            const stepColor = getFireStepColor(s.step, TOTAL_STEPS);
            const isLast = s.step === TOTAL_STEPS;

            return (
              <div
                key={s.step}
                className="flex flex-col gap-2 py-3.5 border-b border-white/[0.06] last:border-b-0"
              >
                {/* Top row: step circle + text */}
                <div className="flex items-start gap-3.5">
                  {/* Step circle with number */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono"
                      style={{
                        color: stepColor,
                        border: `1.5px solid ${stepColor}`,
                        background: `${stepColor}12`,
                        boxShadow: isLast ? `0 0 16px ${stepColor}40` : `0 0 8px ${stepColor}15`,
                      }}
                    >
                      {String(s.step).padStart(2, "0")}
                    </div>
                    {/* Fire connector line */}
                    {!isLast && (
                      <div
                        className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-3.5"
                        style={{ background: `linear-gradient(to bottom, ${stepColor}60, transparent)` }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-display text-foreground text-sm">{s.title}</h3>
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider shrink-0"
                        style={{ color: stepColor, opacity: 0.8 }}
                      >
                        {s.time}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                  </div>
                </div>
                {/* Mini-mockup illustration — offset = w-10 (40px) + gap-3.5 (14px) */}
                <div className="ml-[54px] max-w-[240px]">
                  <StepMockup step={s.step} />
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA after steps */}
        <div className="text-center mt-12">
          <Button variant="gold" size="lg" asChild>
            <Link href={isLoggedIn ? "/app/dashboard" : "/try"}>
              {isLoggedIn ? t("cta_go_dashboard") : t("how_it_works_cta")}
            </Link>
          </Button>
          {!isLoggedIn && (
            <p className="text-muted-foreground text-sm mt-3">
              {t("no_account_needed")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Comparison ────────────────────────────────────────────────────────────────
type CellValue =
  | { type: "check"; label: string }
  | { type: "cross"; label: string }
  | { type: "partial"; label: string };

function CompCell({ val, highlight }: { val: CellValue; highlight?: boolean }) {
  const textClass = highlight && val.type === "check"
    ? "text-white font-semibold text-sm leading-snug"
    : "text-white/70 text-sm leading-snug";

  return (
    <div className="flex items-center gap-2.5 py-3">
      {val.type === "check" && highlight && (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 drop-shadow-[0_0_6px_rgba(74,158,92,0.5)]">
          <circle cx="10" cy="10" r="9" fill="rgba(74,158,92,0.15)" stroke="#4A9E5C" strokeWidth="1.5" />
          <path d="M6 10.5l2.8 2.8 5-5.6" stroke="#4A9E5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {val.type === "check" && !highlight && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
          <path d="M5.5 9l2.5 2.5 4.5-5" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {val.type === "cross" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" fill="rgba(196,60,60,0.08)" stroke="rgba(196,60,60,0.4)" strokeWidth="1.5" />
          <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="rgba(196,60,60,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {val.type === "partial" && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
          <circle cx="9" cy="9" r="8.25" fill="rgba(232,155,45,0.06)" stroke="rgba(232,155,45,0.35)" strokeWidth="1.5" />
          <path d="M5.5 9h7" stroke="rgba(232,155,45,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className={textClass}>{val.label}</span>
    </div>
  );
}

function ComparisonSection({ t }: { t: TFunc }) {
  const rows: {
    icon: string;
    feature: string;
    featureTooltip?: string;
    roll20: CellValue;
    beyond: CellValue;
    pocketdm: CellValue;
    knockout?: boolean;
  }[] = [
      {
        icon: "⚔️",
        feature: t("comparison_row_1_feature"),
        roll20: { type: "partial", label: t("comparison_row_1_roll20") },
        beyond: { type: "partial", label: t("comparison_row_1_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_1_pocketdm") },
      },
      {
        icon: "📱",
        feature: t("comparison_row_2_feature"),
        roll20: { type: "cross", label: t("comparison_row_2_roll20") },
        beyond: { type: "cross", label: t("comparison_row_2_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_2_pocketdm") },
      },
      {
        icon: "🎯",
        feature: t("comparison_row_3_feature"),
        roll20: { type: "cross", label: t("comparison_row_3_roll20") },
        beyond: { type: "cross", label: t("comparison_row_3_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_3_pocketdm") },
      },
      {
        icon: "📚",
        feature: t("comparison_row_4_feature"),
        featureTooltip: "SRD completo 2014 + 2024",
        roll20: { type: "partial", label: t("comparison_row_4_roll20") },
        beyond: { type: "partial", label: t("comparison_row_4_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_4_pocketdm") },
      },
      {
        icon: "📊",
        feature: t("comparison_row_5_feature"),
        roll20: { type: "cross", label: t("comparison_row_5_roll20") },
        beyond: { type: "cross", label: t("comparison_row_5_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_5_pocketdm") },
      },
      {
        icon: "📶",
        feature: t("comparison_row_6_feature"),
        roll20: { type: "cross", label: t("comparison_row_6_roll20") },
        beyond: { type: "cross", label: t("comparison_row_6_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_6_pocketdm") },
      },
      {
        icon: "⏱️",
        feature: t("comparison_row_7_feature"),
        roll20: { type: "cross", label: t("comparison_row_7_roll20") },
        beyond: { type: "partial", label: t("comparison_row_7_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_7_pocketdm") },
      },
      {
        icon: "💰",
        feature: t("comparison_row_8_feature"),
        roll20: { type: "cross", label: t("comparison_row_8_roll20") },
        beyond: { type: "cross", label: t("comparison_row_8_beyond") },
        pocketdm: { type: "check", label: t("comparison_row_8_pocketdm") },
        knockout: true,
      },
    ];

  return (
    // Darker "stage" bg — breaks visual monotony from the rest of the page
    <section data-section="comparison" id="comparativo" className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden bg-surface-deep">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gold/[0.025] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-14 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-display text-foreground mb-4">
            {t("comparison_heading")}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            {t("comparison_subheading_prefix")} <span className="text-foreground font-medium">{t("comparison_subheading_emphasis")}</span> {t("comparison_subheading_suffix")}
          </p>
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div
          className="hidden md:block overflow-hidden rounded-2xl animate-fade-in-up relative"
          style={{
            background: "#181825",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 0 0 1px rgba(212,168,83,0.1), 0 0 40px rgba(212,168,83,0.06), 0 32px 80px rgba(0,0,0,0.5)",
            animationDelay: "0.1s",
          }}
        >
          {/* Column headers */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1.15fr]">
            <div className="px-7 py-4 border-b border-white/[0.10]" />
            <div className="px-6 py-4 text-center border-b border-l border-white/[0.10] flex items-center justify-center">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                {t("comparison_col_roll20")}
              </span>
            </div>
            <div className="px-6 py-4 text-center border-b border-l border-white/[0.10] flex items-center justify-center">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
                {t("comparison_col_beyond")}
              </span>
            </div>
            {/* Pocket DM header — gold gradient with glow */}
            <div
              className="px-6 py-3.5 text-center flex flex-col items-center gap-1.5 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.07) 100%)",
                borderTop: "2px solid rgba(212,168,83,0.7)",
                borderLeft: "1px solid rgba(212,168,83,0.25)",
                borderBottom: "1px solid rgba(212,168,83,0.2)",
                boxShadow: "inset 0 0 30px rgba(212,168,83,0.05)",
              }}
            >
              <span className="text-[11px] font-bold text-gold uppercase tracking-widest inline-flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(212,168,83,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/art/brand/logo-icon.svg" alt="" width={20} height={20} className="drop-shadow-[0_0_8px_rgba(212,168,83,0.5)]" aria-hidden="true" />
                Pocket DM
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-gold/20 text-gold border border-gold/30 shadow-[0_0_12px_rgba(212,168,83,0.15)]">
                {t("comparison_pocketdm_badge")}
              </span>
            </div>
          </div>

          {/* Data rows */}
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            const isEven = i % 2 === 0;
            return (
              <div
                key={row.feature}
                className={`grid grid-cols-[1.3fr_1fr_1fr_1.15fr] group transition-all duration-300 hover:scale-[1.005] ${row.knockout ? "border-t-2 border-t-gold/30" : ""}`}
                style={{ background: row.knockout ? "rgba(212,168,83,0.06)" : isEven ? "transparent" : "rgba(255,255,255,0.02)" }}
              >
                {/* Feature name — gold left border on hover */}
                <div className={`px-7 py-1 flex items-center gap-3 transition-all duration-300 border-l-2 border-l-transparent group-hover:border-l-gold/60 group-hover:bg-white/[0.03] ${isLast ? "" : "border-b border-white/[0.07]"}`}>
                  <span className="text-xl leading-none shrink-0 transition-transform duration-300 group-hover:scale-110">{row.icon}</span>
                  <span className="text-[15px] font-semibold text-white/90 transition-colors duration-300 group-hover:text-white" title={row.featureTooltip}>{row.feature}</span>
                </div>
                {/* Competitor cells — dim on hover to contrast with Pocket DM */}
                <div className={`px-6 border-l border-white/[0.07] transition-all duration-300 group-hover:bg-white/[0.02] group-hover:opacity-70 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.roll20} />
                </div>
                <div className={`px-6 border-l border-white/[0.07] transition-all duration-300 group-hover:bg-white/[0.02] group-hover:opacity-70 ${isLast ? "" : "border-b"}`}>
                  <CompCell val={row.beyond} />
                </div>
                {/* Pocket DM cell — glow brighter on hover */}
                <div
                  className={`px-6 transition-all duration-300 group-hover:brightness-150 group-hover:shadow-[inset_0_0_20px_rgba(212,168,83,0.1)] ${isLast ? "" : "border-b border-b-gold/15"}`}
                  style={{
                    background: row.knockout
                      ? "linear-gradient(90deg, rgba(212,168,83,0.16), rgba(212,168,83,0.10))"
                      : "linear-gradient(90deg, rgba(212,168,83,0.10), rgba(212,168,83,0.06))",
                    borderLeft: "1px solid rgba(212,168,83,0.25)",
                  }}
                >
                  <CompCell val={row.pocketdm} highlight />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mobile: 3 killer differentiators ── */}
        <div className="md:hidden flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {[
            {
              icon: "💰",
              title: t("comparison_mobile_1_title"),
              description: t("comparison_mobile_1_description"),
            },
            {
              icon: "📱",
              title: t("comparison_mobile_2_title"),
              description: t("comparison_mobile_2_description"),
            },
            {
              icon: "📊",
              title: t("comparison_mobile_3_title"),
              description: t("comparison_mobile_3_description"),
            },
            {
              icon: "⏱️",
              title: t("comparison_mobile_4_title"),
              description: t("comparison_mobile_4_description"),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl px-4 py-3.5"
              style={{
                background: "#13131f",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-xl leading-none shrink-0 mt-0.5">{item.icon}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 text-center">
          <p className="text-xs text-white/50 italic">
            {t("comparison_footer")}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Beyond Combat ────────────────────────────────────────────────────────────
function BeyondCombatSection({ t }: { t: TFunc }) {
  const pillars = [
    {
      icon: "📊",
      title: t("beyond_1_title"),
      description: t("beyond_1_description"),
    },
    {
      icon: "⚖️",
      title: t("beyond_2_title"),
      description: t("beyond_2_description"),
    },
    {
      icon: "🧪",
      title: t("beyond_3_title"),
      description: t("beyond_3_description"),
    },
  ];

  return (
    <section data-section="beyond-combat" id="alem-do-combate" className="py-12 md:py-20 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gold/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[11px] font-semibold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {t("beyond_combat_badge")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-foreground mb-3">
            {t("beyond_combat_heading")}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            {t("beyond_combat_subheading")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="flex md:flex-col items-start md:items-center md:text-center gap-3.5 md:gap-3 rounded-xl px-4 py-4 md:p-6 bg-card border border-border hover:border-gold/30 transition-colors duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <span className="text-2xl md:text-3xl shrink-0">{p.icon}</span>
              <div>
                <h3 className="font-display text-foreground text-sm md:text-base mb-1">{p.title}</h3>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA — Methodology */}
        <div className="text-center mt-8 md:mt-10 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <Link
            href="/methodology"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gold/30 bg-gold/[0.06] text-gold font-semibold text-sm hover:bg-gold/[0.12] hover:border-gold/50 transition-all duration-200 min-h-[44px]"
          >
            {t("beyond_cta")}
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
          <p className="text-muted-foreground text-xs mt-2">
            {t("beyond_cta_subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCtaSection({ isLoggedIn, t }: { isLoggedIn: boolean; t: TFunc }) {
  return (
    <section data-section="final-cta" className="py-10 md:py-24 px-4 md:px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gold/[0.06] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-2xl mx-auto text-center space-y-4 md:space-y-6 animate-fade-in-up">
        <h2 className="text-2xl md:text-3xl sm:text-4xl font-display text-foreground">
          {t("final_cta_heading_prefix")}{" "}
          <span className="text-gold drop-shadow-[0_0_16px_rgba(212,168,83,0.4)]">{t("final_cta_heading_accent")}</span>?
        </h2>
        <p className="text-muted-foreground text-sm md:text-lg hidden md:block">
          {isLoggedIn
            ? t("final_cta_subheading_logged_in")
            : t("final_cta_subheading_logged_out")}
        </p>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href={isLoggedIn ? "/app/dashboard" : "/auth/sign-up"}
            className="group relative overflow-hidden inline-flex items-center gap-2.5 px-8 md:px-10 py-3 md:py-4 bg-gold text-surface-primary font-semibold text-base md:text-lg rounded-lg hover:shadow-gold-glow-lg hover:-translate-y-[2px] active:translate-y-0 transition-all duration-[200ms] min-h-[48px] md:min-h-[52px] btn-shimmer"
          >
            <SparkleIcon className="w-4 h-4 md:w-5 md:h-5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
            {isLoggedIn ? t("cta_go_dashboard") : t("cta_start_now_free")}
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
          <Link
            href={isLoggedIn ? "/app/combat/new?quick=true" : "/try"}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1 min-h-[44px]"
          >
            {isLoggedIn ? t("cta_quick_combat") : t("cta_try_no_account")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  const t = await getTranslations("landing") as unknown as TFunc;
  let isLoggedIn = false;
  let displayName = "";
  let authFailed = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (claims?.sub) {
      isLoggedIn = true;
      const { data: userData } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", claims.sub)
        .maybeSingle();
      displayName =
        (userData?.display_name as string | null) ??
        claims.email?.split("@")[0] ??
        "Usuário";
    }
  } catch {
    // Supabase unavailable — render logged-out version, retry client-side
    authFailed = true;
  }

  const jsonLdWebSite = websiteLd({
    description: t("meta_description"),
    searchPath: "/monsters",
  });

  const jsonLdOrganization = organizationLd({
    description: t("meta_description"),
    sameAs: ["https://www.instagram.com/pocket.dm"],
  });

  const jsonLdWebApplication = webApplicationLd({
    description: t("meta_description"),
    featureList: [
      "Rastreador de iniciativa em tempo real",
      "Gerenciamento de HP e condições",
      "Oráculo de magias D&D 5e",
      "Bestiário SRD completo + Monster a Day",
      "Música ambiente integrada",
      "Sem cadastro para começar",
    ],
  });

  const jsonLdFaq = faqPageLd({
    questions: [
      { question: t("faq_1_question"), answer: t("faq_1_answer") },
      { question: t("faq_2_question"), answer: t("faq_2_answer") },
      { question: t("faq_3_question"), answer: t("faq_3_answer") },
      { question: t("faq_4_question"), answer: t("faq_4_answer") },
      { question: t("faq_5_question"), answer: t("faq_5_answer") },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <script {...jsonLdScriptProps(jsonLdWebSite)} />
      <script {...jsonLdScriptProps(jsonLdOrganization)} />
      <script {...jsonLdScriptProps(jsonLdWebApplication)} />
      <script {...jsonLdScriptProps(jsonLdFaq)} />
<Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "#features", label: t("nav_features") },
          { href: "#como-funciona", label: t("nav_how_it_works") },
          { href: "#comparativo", label: t("nav_comparison") },
          { href: "#compendio", label: t("nav_compendium") },
          { href: "#alem-do-combate", label: t("nav_methodology") },
          { href: "#precos", label: t("nav_pricing") },
        ]}
        rightSlot={
          isLoggedIn ? (
            <LandingLoggedInNav displayName={displayName} />
          ) : (
            <>
              <Link
                href="/auth/login"
                className="group text-muted-foreground hover:text-foreground transition-all duration-[200ms] min-h-[44px] inline-flex items-center gap-1.5 text-sm"
              >
                <UserIcon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity duration-200" />
                {t("nav_login")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="group bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center gap-1.5 text-sm hover:shadow-gold-glow hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[200ms]"
              >
                <SparkleIcon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-200" />
                {t("cta_primary")}
              </Link>
            </>
          )
        }
      />

      <HeroSection isLoggedIn={isLoggedIn} t={t} />
      <SectionDivider />
      <FeaturesSection t={t} />
      <SectionDivider />
      <HowItWorksSection isLoggedIn={isLoggedIn} t={t} />
      <SectionDivider />
      <ComparisonSection t={t} />
      <SectionDivider />
      <CompendiumShowcaseSection t={t} />
      <SocialProofSection t={t} />
      <SectionDivider />
      <BeyondCombatSection t={t} />
      <SectionDivider />
      <LpPricingSection isLoggedIn={isLoggedIn} />
      <FinalCtaSection isLoggedIn={isLoggedIn} t={t} />

      <LandingPageTracker />
      <Footer />
      {authFailed && <LandingAuthRecovery />}
    </div>
  );
}
