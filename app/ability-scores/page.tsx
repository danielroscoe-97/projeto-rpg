import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicAbilityScoresGrid } from "@/components/public/PublicAbilityScoresGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Ability Scores & Modifier Calculator",
  description:
    "Complete reference for all six D&D 5e ability scores: Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Interactive modifier calculator with full score-to-modifier table.",
  openGraph: {
    title: "D&D 5e Ability Scores & Modifier Calculator",
    description:
      "All six ability scores explained with interactive modifier calculator, associated skills, saving throws, and common uses.",
    type: "website",
    url: "https://pocketdm.com.br/ability-scores",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Ability Scores & Modifier Calculator",
    description:
      "All six ability scores explained with interactive modifier calculator, associated skills, saving throws, and common uses.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/ability-scores",
    languages: {
      en: "https://pocketdm.com.br/ability-scores",
      "pt-BR": "https://pocketdm.com.br/atributos",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function AbilityScoresJsonLd() {
  const abilities = [
    "Strength",
    "Dexterity",
    "Constitution",
    "Intelligence",
    "Wisdom",
    "Charisma",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Ability Scores",
    description:
      "The six ability scores in Dungeons & Dragons 5th Edition",
    numberOfItems: abilities.length,
    itemListElement: abilities.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
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
export default function AbilityScoresPage() {
  return (
    <>
      <AbilityScoresJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Ability Scores" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicAbilityScoresGrid locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Ability Scores" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
