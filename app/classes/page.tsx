import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassesIndex } from "@/components/public/PublicClassesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getAllClassesFull } from "@/lib/srd/class-data-server";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Classes — SRD Class Reference",
  description:
    "Complete reference for all 12 D&D 5e SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, and Wizard. Hit dice, proficiencies, saving throws, and subclasses.",
  keywords: [
    "D&D 5e classes",
    "dnd classes",
    "SRD classes",
    "D&D class list",
    "5e class reference",
    "D&D combat tracker",
  ],
  openGraph: {
    title: "D&D 5e Classes — SRD Class Reference",
    description:
      "All 12 SRD classes with hit dice, proficiencies, and subclasses. Free reference.",
    type: "website",
    url: "https://pocketdm.com.br/classes",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Classes — SRD Class Reference",
    description:
      "All 12 SRD classes with hit dice, proficiencies, and subclasses.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/classes",
    languages: {
      en: "https://pocketdm.com.br/classes",
      "pt-BR": "https://pocketdm.com.br/classes-pt",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassesJsonLd() {
  const classes = getAllClassesFull();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Classes",
    description:
      "All 12 classes in the Dungeons & Dragons 5th Edition Systems Reference Document",
    numberOfItems: classes.length,
    itemListElement: classes.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `https://pocketdm.com.br/classes/${c.id}`,
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: {
        "@type": "ImageObject",
        url: "https://pocketdm.com.br/icons/icon-512.png",
      },
    },
    inLanguage: "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClassesIndexPage() {
  const classes = getAllClassesFull();

  return (
    <>
      <ClassesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Classes" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicClassesIndex classes={classes} locale="en" />

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/classes-pt" className="text-[#D4A853] hover:underline">
              Português
            </Link>
          </p>

          <div className="mt-8">
            <PublicCTA entityName="D&D 5e Classes" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
