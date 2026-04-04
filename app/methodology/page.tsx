import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { MethodologyProgressBar } from "@/components/methodology/MethodologyProgressBar";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("methodology");
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    alternates: {
      canonical: "/methodology",
      languages: { "pt-BR": "/methodology", en: "/methodology" },
    },
    openGraph: {
      title: t("meta_title"),
      description: t("meta_description"),
      url: "https://pocketdm.com.br/methodology",
      type: "website",
    },
  };
}

export default async function MethodologyPage() {
  const t = await getTranslations("methodology");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ResearchProject",
    name: "Pocket DM Methodology",
    description:
      "Data-driven encounter difficulty calculation based on real combat data from thousands of D&D 5e sessions.",
    url: "https://pocketdm.com.br/methodology",
    funder: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monsters", label: "Monstros" },
          { href: "/spells", label: "Magias" },
          { href: "/pricing", label: "Preços" },
        ]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              Login
            </Link>
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              {t("cta_try_free")}
            </Link>
          </>
        }
      />

      <main className="flex-1 pt-[72px]">
        {/* Section 1: Golden Progress Bar (hero/hook) */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gold/[0.05] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-6">
            <MethodologyProgressBar />
          </div>
        </div>

        {/* Section 2: Headline */}
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <h1 className="font-display text-2xl md:text-3xl text-gold mb-3">
            {t("headline")}
          </h1>
          <p className="text-foreground/60 text-base md:text-lg max-w-xl mx-auto">
            {t("subheadline")}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 max-w-3xl mx-auto px-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>

        {/* Section 3: How It Works — 3 steps */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="font-display text-xl text-gold/90 mb-8 text-center">
            {t("how_it_works_title")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1 — Swords (combat) */}
            <div className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/30 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(212,168,83,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 group-hover:shadow-[0_0_24px_rgba(212,168,83,0.2)] transition-all duration-300">
                <svg className="w-7 h-7 text-gold group-hover:scale-110 group-hover:rotate-[-8deg] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                  <path d="M13 19l6-6" />
                  <path d="M16 16l4 4" />
                  <path d="M19 21l2-2" />
                  <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
                  <path d="M11 5l-6 6" />
                  <path d="M8 8L4 4" />
                  <path d="M5 3L3 5" />
                </svg>
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1 group-hover:text-gold transition-colors duration-300">
                {t("step_1_title")}
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                {t("step_1_desc")}
              </p>
            </div>

            {/* Step 2 — Star (vote) */}
            <div className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/30 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(212,168,83,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 group-hover:shadow-[0_0_24px_rgba(212,168,83,0.2)] transition-all duration-300">
                <svg className="w-7 h-7 text-gold group-hover:scale-125 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1 group-hover:text-gold transition-colors duration-300">
                {t("step_2_title")}
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                {t("step_2_desc")}
              </p>
            </div>

            {/* Step 3 — Brain/model (learning) */}
            <div className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/30 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(212,168,83,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 group-hover:shadow-[0_0_24px_rgba(212,168,83,0.2)] transition-all duration-300">
                <svg className="w-7 h-7 text-gold group-hover:scale-110 group-hover:rotate-[8deg] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
                  <path d="M9 21h6" />
                  <path d="M10 19h4" />
                  <path d="M12 2v3" />
                  <path d="M12 9l-2 2" />
                  <path d="M12 9l2 2" />
                </svg>
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1 group-hover:text-gold transition-colors duration-300">
                {t("step_3_title")}
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                {t("step_3_desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Why the DMG is wrong */}
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <h2 className="font-display text-xl text-gold/90 mb-6 text-center">
            {t("why_title")}
          </h2>
          <p className="text-foreground/60 text-sm text-center mb-6 max-w-lg mx-auto">
            {t("why_subtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DMG side */}
            <div className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-red-500/20 transition-all duration-300">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-foreground/30 mb-3 font-medium">
                <svg className="w-4 h-4 text-red-400/40 group-hover:text-red-400/70 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {t("compare_dmg_label")}
              </div>
              <div className="space-y-3 text-sm text-foreground/50">
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-400/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  {t("compare_dmg_1")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-400/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  {t("compare_dmg_2")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-400/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  {t("compare_dmg_3")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-red-400/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  {t("compare_dmg_4")}
                </p>
              </div>
            </div>

            {/* Pocket DM side */}
            <div className="group rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 hover:border-gold/40 hover:shadow-[0_4px_24px_rgba(212,168,83,0.08)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold/70 mb-3 font-medium">
                <svg className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" />
                </svg>
                {t("compare_pdm_label")}
              </div>
              <div className="space-y-3 text-sm text-foreground/70">
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gold/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  {t("compare_pdm_1")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gold/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  {t("compare_pdm_2")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gold/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  {t("compare_pdm_3")}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gold/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  {t("compare_pdm_4")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: CTA */}
        <div className="max-w-3xl mx-auto px-6 pb-8 text-center">
          <div className="rounded-xl border border-gold/10 bg-gradient-to-br from-gold/[0.03] to-transparent p-8 md:p-10">
            <p className="text-foreground/80 text-base mb-5">
              {t("cta_text")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/auth/sign-up"
                className="bg-gold text-surface-primary font-semibold px-8 py-3.5 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                {t("cta_signup")}
              </Link>
              <Link
                href="/try"
                className="border border-white/10 text-foreground/80 font-medium px-8 py-3.5 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                {t("cta_try_free")}
              </Link>
            </div>
          </div>
        </div>

        {/* Spell Tiers Teaser */}
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <div className="rounded-lg border border-dashed border-gold/15 bg-white/[0.01] p-4 text-center">
            <p className="text-foreground/35 text-xs">
              {t("spell_teaser")}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
