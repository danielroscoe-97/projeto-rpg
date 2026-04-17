import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicEncounterBuilder } from "@/components/public/PublicEncounterBuilder";
import { PublicCTA } from "@/components/public/PublicCTA";
import { getSrdMonsters, toSlug } from "@/lib/srd/srd-data-server";
import { PublicFooter } from "@/components/public/PublicFooter";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Encounter Builder — Difficulty Calculator",
  description:
    "Free encounter difficulty calculator and initiative tracker for D&D 5e. Add monsters from 1,100+ SRD creatures, set party size and level, and instantly see if your encounter is Easy, Medium, Hard, or Deadly.",
  keywords: [
    "encounter builder D&D 5e",
    "encounter calculator D&D 5e",
    "D&D encounter difficulty calculator",
    "encounter builder free",
    "D&D 5e encounter generator",
    "combat encounter builder",
    "DM encounter tools",
    "D&D encounter planner",
    "encounter difficulty 5e",
    "easy medium hard deadly D&D",
    "CR calculator D&D 5e",
    "Pocket DM encounter builder",
  ],
  openGraph: {
    title: "D&D 5e Encounter Builder — Difficulty Calculator",
    description:
      "Free encounter builder with 1,100+ SRD monsters and instant difficulty calculation.",
    type: "website",
    url: "/encounter-builder",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Encounter Builder",
    description:
      "Free encounter builder with 1,100+ SRD monsters and instant difficulty calculation.",
  },
  alternates: {
    canonical: "/encounter-builder",
    languages: {
      en: "/encounter-builder",
      "pt-BR": "/calculadora-encontro",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ─��──────────────────────────────────────────────────────
function EncounterBuilderJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "D&D 5e Encounter Builder",
    description: "Free encounter difficulty calculator for Dungeons & Dragons 5th Edition",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "/",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function EncounterBuilderPage() {
  // Minimal monster data for the search
  const monsters = getSrdMonsters().map((m) => ({
    name: m.name,
    cr: m.cr,
    type: m.type,
    slug: toSlug(m.name),
    token_url: m.token_url ?? null,
    fallback_token_url: m.fallback_token_url ?? null,
  }));

  return (
    <>
      <EncounterBuilderJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Encounter Builder" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicEncounterBuilder monsters={monsters} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Encounter Builder" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
