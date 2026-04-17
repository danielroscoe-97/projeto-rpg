import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { SpellTierRanking } from "@/components/methodology/SpellTierRanking";
import { getTranslations } from "next-intl/server";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("methodology");
  const title = t("spell_ranking_title");
  const description = t("spell_ranking_subtitle");
  return {
    title,
    description,
    alternates: {
      canonical: "/methodology/spell-tiers",
      languages: {
        "pt-BR": "/methodology/spell-tiers",
        en: "/methodology/spell-tiers",
      },
    },
    openGraph: {
      title,
      description,
      url: "/methodology/spell-tiers",
      type: "website",
    },
  };
}

export default async function SpellTiersPage() {
  const t = await getTranslations("methodology");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: t("spell_ranking_title"),
    description: t("spell_ranking_dataset_description"),
    url: siteUrl("/methodology/spell-tiers"),
    license: "https://creativecommons.org/licenses/by/4.0/",
    keywords: [
      "D&D 5e",
      "spell tier list",
      "spell ranking",
      "SRD 5.1",
      "community votes",
    ],
    creator: {
      "@type": "Organization",
      name: "Pocket DM",
      url: siteUrl("/"),
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script {...jsonLdScriptProps(jsonLd)} />
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monstros", label: "Monstros" },
          { href: "/magias", label: "Magias" },
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
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gold/[0.04] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
            {/* Breadcrumb */}
            <nav className="flex items-center justify-center gap-2 text-xs text-foreground/35 mb-6">
              <Link href="/methodology" className="hover:text-foreground/60 transition-colors">
                {t("breadcrumb_methodology")}
              </Link>
              <span aria-hidden="true">›</span>
              <span className="text-foreground/55">{t("breadcrumb_spell_tiers")}</span>
            </nav>

            <h1 className="font-display text-2xl md:text-3xl text-gold mb-3">
              {t("spell_ranking_title")}
            </h1>
            <p className="text-foreground/60 text-base md:text-lg max-w-xl mx-auto">
              {t("spell_ranking_subtitle")}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 max-w-3xl mx-auto px-6 pb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <span className="text-gold/40 text-xs" aria-hidden="true">&#9670; &#9670; &#9670;</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>

        {/* Tier legend */}
        <div className="max-w-3xl mx-auto px-6 pb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {(
              [
                { tier: "S", label: "S — Indispensável", colors: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
                { tier: "A", label: "A — Excelente",     colors: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
                { tier: "B", label: "B — Bom",           colors: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
                { tier: "C", label: "C — Situacional",   colors: "bg-green-500/20 text-green-300 border-green-500/40" },
                { tier: "D", label: "D — Fraco",         colors: "bg-gray-500/20 text-gray-300 border-gray-500/40" },
                { tier: "E", label: "E — Evitar",        colors: "bg-red-500/20 text-red-300 border-red-500/40" },
              ] as const
            ).map(({ label, colors }) => (
              <span
                key={label}
                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium ${colors}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Ranking table */}
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <SpellTierRanking
            translations={{
              spell_ranking_title: t("spell_ranking_title"),
              spell_ranking_subtitle: t("spell_ranking_subtitle"),
              spell_ranking_no_votes: t("spell_ranking_no_votes"),
              spell_ranking_consensus: t("spell_ranking_consensus"),
              spell_ranking_votes: t("spell_ranking_votes"),
              spell_ranking_spell: t("spell_ranking_spell"),
              spell_ranking_distribution: t("spell_ranking_distribution"),
              spell_ranking_your_vote: t("spell_ranking_your_vote"),
            }}
          />
        </div>

        {/* CTA */}
        <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
          <div className="rounded-xl border border-gold/10 bg-gradient-to-br from-gold/[0.03] to-transparent p-8">
            <p className="text-foreground/70 text-sm mb-5">
              {t("cta_text")}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/spells"
                className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                {t("browse_spells")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
              >
                {t("cta_signup")}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
