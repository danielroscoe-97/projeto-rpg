import type { Metadata } from "next";
import Link from "next/link";
import { getSrdFeats } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatGrid } from "@/components/public/PublicFeatGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "D&D 5e Feats — SRD Character Feats",
  description:
    "All SRD feats for D&D 5e — character abilities, boons, and special talents. Search and filter by prerequisite. Free under CC-BY-4.0.",
  keywords: [
    "D&D 5e feats",
    "dnd feats list",
    "SRD feats",
    "D&D character feats",
    "5e boons",
    "D&D talents",
  ],
  openGraph: {
    title: "D&D 5e Feats — SRD Character Feats",
    description:
      "Complete reference for all SRD feats in D&D 5th Edition with prerequisites and descriptions.",
    type: "website",
    url: "https://pocketdm.com.br/feats",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Feats — SRD Character Feats",
    description: "Complete reference for all SRD feats in D&D 5th Edition.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/feats",
    languages: {
      en: "https://pocketdm.com.br/feats",
      "pt-BR": "https://pocketdm.com.br/talentos",
    },
  },
};

export const revalidate = 86400;

function FeatsJsonLd({ count }: { count: number }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "D&D 5e Feats",
    description: "All SRD character feats for D&D 5th Edition",
    url: "https://pocketdm.com.br/feats",
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
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

export default function FeatsPage() {
  const feats = getSrdFeats()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      prerequisite: f.prerequisite,
      source: f.source,
      ruleset_version: f.ruleset_version,
    }));

  return (
    <>
      <FeatsJsonLd count={feats.length} />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Feats" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              D&amp;D 5e Feats
            </h1>
            <p className="text-gray-400 text-lg">
              {feats.length} feats — special abilities, boons, and talents for your
              character. All SRD content free under{" "}
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

          <PublicFeatGrid feats={feats} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Feats" locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/talentos" className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
