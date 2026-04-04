import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDamageTypesGrid } from "@/components/public/PublicDamageTypesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Damage Types — Complete Reference | Pocket DM",
  description:
    "Complete reference for all 13 D&D 5e damage types: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, and thunder. Resistances, immunities, and common sources.",
  openGraph: {
    title: "D&D 5e Damage Types — Complete Reference | Pocket DM",
    description:
      "All 13 damage types in D&D 5e with resistances, immunities, and common sources.",
    type: "website",
    url: "https://www.pocketdm.com.br/damage-types",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Damage Types — Complete Reference | Pocket DM",
    description:
      "All 13 damage types in D&D 5e with resistances, immunities, and common sources.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/damage-types",
    languages: {
      en: "https://www.pocketdm.com.br/damage-types",
      "pt-BR": "https://www.pocketdm.com.br/tipos-de-dano",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const DAMAGE_TYPE_NAMES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
];

function DamageTypesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Damage Types",
    description:
      "All 13 damage types in Dungeons & Dragons 5th Edition",
    numberOfItems: DAMAGE_TYPE_NAMES.length,
    itemListElement: DAMAGE_TYPE_NAMES.map((name, i) => ({
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
export default function DamageTypesPage() {
  return (
    <>
      <DamageTypesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Damage Types" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDamageTypesGrid locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Damage Types" locale="en" />
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
