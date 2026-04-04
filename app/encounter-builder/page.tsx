import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicEncounterBuilder } from "@/components/public/PublicEncounterBuilder";
import { PublicCTA } from "@/components/public/PublicCTA";
import { getSrdMonsters, toSlug } from "@/lib/srd/srd-data-server";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Encounter Builder — Difficulty Calculator",
  description:
    "Free encounter difficulty calculator for D&D 5e. Add monsters from 1,100+ SRD creatures, set party size and level, and instantly see if your encounter is Easy, Medium, Hard, or Deadly.",
  openGraph: {
    title: "D&D 5e Encounter Builder — Difficulty Calculator",
    description:
      "Free encounter builder with 1,100+ SRD monsters and instant difficulty calculation.",
    type: "website",
    url: "https://www.pocketdm.com.br/encounter-builder",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Encounter Builder",
    description:
      "Free encounter builder with 1,100+ SRD monsters and instant difficulty calculation.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/encounter-builder",
    languages: {
      en: "https://www.pocketdm.com.br/encounter-builder",
      "pt-BR": "https://www.pocketdm.com.br/calculadora-encontro",
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
      url: "https://www.pocketdm.com.br",
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

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Encounter Builder" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicEncounterBuilder monsters={monsters} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Encounter Builder" locale="en" />
          </div>
        </main>

        <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
          <p>
            SRD content used under the{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0 License
            </a>
            . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of the Coast.
          </p>
          <p className="mt-1">
            <a href="https://www.pocketdm.com.br" className="underline hover:text-gray-300">
              Pocket DM
            </a>
            {" "}— The combat tracker for D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
