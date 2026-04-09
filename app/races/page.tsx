import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRacesIndex } from "@/components/public/PublicRacesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Races — Player Character Species",
  description:
    "All 9 SRD races for D&D 5e: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, and Tiefling. Ability scores, traits, and subraces.",
  keywords: [
    "D&D 5e races",
    "D&D character races",
    "SRD races 5e",
    "dwarf elf halfling",
    "D&D 5e species",
    "player character races",
  ],
  openGraph: {
    title: "D&D 5e Races — Player Character Species",
    description:
      "Complete reference for all 9 SRD races in D&D 5th Edition with ability scores and traits.",
    type: "website",
    url: "https://pocketdm.com.br/races",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Races — Player Character Species",
    description:
      "Complete reference for all 9 SRD races in D&D 5th Edition.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/races",
    languages: {
      en: "https://pocketdm.com.br/races",
      "pt-BR": "https://pocketdm.com.br/racas",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const RACE_NAMES = [
  "Dwarf",
  "Elf",
  "Halfling",
  "Human",
  "Dragonborn",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Tiefling",
];

function RacesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Races",
    description:
      "All player character races in the D&D 5th Edition SRD",
    numberOfItems: RACE_NAMES.length,
    itemListElement: RACE_NAMES.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      url: `https://pocketdm.com.br/races/${name.toLowerCase().replace(/\s+/g, "-")}`,
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
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
export default function RacesPage() {
  return (
    <>
      <RacesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Races" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicRacesIndex locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Races" locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/racas" className="text-[#D4A853] hover:underline">
              Português
            </Link>
          </p>
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
            . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of
            the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}&mdash; The combat tracker for D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
