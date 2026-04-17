import type { Metadata } from "next";
import Link from "next/link";
import { getSrdBackgrounds } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicBackgroundGrid } from "@/components/public/PublicBackgroundGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "D&D 5e Backgrounds — SRD Character Backgrounds",
  description:
    "All SRD backgrounds for D&D 5e — skill proficiencies, tool proficiencies, languages, equipment, and features. Free under CC-BY-4.0.",
  keywords: [
    "D&D 5e backgrounds",
    "dnd backgrounds list",
    "SRD backgrounds",
    "D&D character backgrounds",
    "5e background features",
    "D&D background skills",
  ],
  openGraph: {
    title: "D&D 5e Backgrounds — SRD Character Backgrounds",
    description:
      "Complete reference for all SRD backgrounds in D&D 5th Edition with skills, features, and equipment.",
    type: "website",
    url: "/backgrounds",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Backgrounds — SRD Character Backgrounds",
    description: "Complete reference for all SRD backgrounds in D&D 5th Edition.",
  },
  alternates: {
    canonical: "/backgrounds",
    languages: {
      en: "/backgrounds",
      "pt-BR": "/antecedentes",
    },
  },
};

export const revalidate = 86400;

function BackgroundsJsonLd({ count }: { count: number }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "D&D 5e Backgrounds",
    description: "All SRD character backgrounds for D&D 5th Edition",
    url: "/backgrounds",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "/",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function BackgroundsPage() {
  const backgrounds = getSrdBackgrounds()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((bg) => ({
      id: bg.id,
      name: bg.name,
      skill_proficiencies: bg.skill_proficiencies,
      tool_proficiencies: bg.tool_proficiencies,
      languages: bg.languages,
      feature_name: bg.feature_name,
      source: bg.source,
      ruleset_version: bg.ruleset_version,
    }));

  return (
    <>
      <BackgroundsJsonLd count={backgrounds.length} />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Backgrounds" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              D&amp;D 5e Backgrounds
            </h1>
            <p className="text-gray-400 text-lg">
              {backgrounds.length} backgrounds — character origins with skill
              proficiencies, tools, and features. All SRD content free under{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline hover:text-gray-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC-BY-4.0
              </a>
              .
            </p>
          </div>

          <PublicBackgroundGrid backgrounds={backgrounds} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Backgrounds" locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/antecedentes" className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
