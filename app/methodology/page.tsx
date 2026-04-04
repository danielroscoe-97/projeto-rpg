import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
            {/* Step 1 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/20 transition-colors duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gold/10 flex items-center justify-center">
                <Image
                  src="/art/icons/chibi-knight.png"
                  alt=""
                  width={28}
                  height={28}
                  className="pixel-art"
                  unoptimized
                />
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1">
                {t("step_1_title")}
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                {t("step_1_desc")}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/20 transition-colors duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gold/10 flex items-center justify-center">
                <span className="text-gold text-xl">&#9733;</span>
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1">
                {t("step_2_title")}
              </p>
              <p className="text-foreground/50 text-xs leading-relaxed">
                {t("step_2_desc")}
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 text-center hover:border-gold/20 transition-colors duration-300">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-gold/10 flex items-center justify-center">
                <Image
                  src="/art/icons/potion.png"
                  alt=""
                  width={28}
                  height={28}
                  className="pixel-art"
                  unoptimized
                />
              </div>
              <p className="text-foreground/90 font-medium text-sm mb-1">
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
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="text-xs uppercase tracking-wider text-foreground/30 mb-3 font-medium">
                {t("compare_dmg_label")}
              </div>
              <div className="space-y-3 text-sm text-foreground/50">
                <p className="flex items-center gap-2">
                  <span className="text-foreground/25">&#9670;</span>
                  {t("compare_dmg_1")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-foreground/25">&#9670;</span>
                  {t("compare_dmg_2")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-foreground/25">&#9670;</span>
                  {t("compare_dmg_3")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-foreground/25">&#9670;</span>
                  {t("compare_dmg_4")}
                </p>
              </div>
            </div>

            {/* Pocket DM side */}
            <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/[0.04] to-transparent p-6">
              <div className="text-xs uppercase tracking-wider text-gold/70 mb-3 font-medium">
                {t("compare_pdm_label")}
              </div>
              <div className="space-y-3 text-sm text-foreground/70">
                <p className="flex items-center gap-2">
                  <span className="text-gold/60">&#9670;</span>
                  {t("compare_pdm_1")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold/60">&#9670;</span>
                  {t("compare_pdm_2")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold/60">&#9670;</span>
                  {t("compare_pdm_3")}
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-gold/60">&#9670;</span>
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
