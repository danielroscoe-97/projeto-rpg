import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassesIndex } from "@/components/public/PublicClassesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import classesData from "@/public/srd/classes-srd.json";
import type { SrdClass } from "@/lib/types/srd-class";

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
    url: "https://www.pocketdm.com.br/classes",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Classes — SRD Class Reference",
    description:
      "All 12 SRD classes with hit dice, proficiencies, and subclasses.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/classes",
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassesJsonLd() {
  const classes = classesData as SrdClass[];

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
      url: `https://www.pocketdm.com.br/classes/${c.id}`,
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
export default function ClassesIndexPage() {
  const classes = classesData as SrdClass[];

  return (
    <>
      <ClassesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Classes" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicClassesIndex classes={classes} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Classes" locale="en" />
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
            . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of
            the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://www.pocketdm.com.br"
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
