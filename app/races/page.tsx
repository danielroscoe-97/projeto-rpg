import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRacesIndex } from "@/components/public/PublicRacesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";
import { collectionPageLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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
    url: "/races",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Races — Player Character Species",
    description:
      "Complete reference for all 9 SRD races in D&D 5th Edition.",
  },
  alternates: {
    canonical: "/races",
    languages: {
      en: "/races",
      "pt-BR": "/racas",
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
  const jsonLd = collectionPageLd({
    name: "D&D 5e Races",
    description: "All player character races in the D&D 5th Edition SRD",
    path: "/races",
    locale: "en",
    items: RACE_NAMES.map((name) => ({
      name,
      path: `/races/${name.toLowerCase().replace(/\s+/g, "-")}`,
    })),
  });
  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Races", path: "/races" },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function RacesPage() {
  return (
    <>
      <RacesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Races" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicRacesIndex locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Races" locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/racas" className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
