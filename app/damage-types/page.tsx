import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDamageTypesGrid } from "@/components/public/PublicDamageTypesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Damage Types — Complete Reference",
  description:
    "Complete reference for all 13 D&D 5e damage types: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, and thunder. Resistances, immunities, and common sources.",
  openGraph: {
    title: "D&D 5e Damage Types — Complete Reference",
    description:
      "All 13 damage types in D&D 5e with resistances, immunities, and common sources.",
    type: "website",
    url: "/damage-types",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Damage Types — Complete Reference",
    description:
      "All 13 damage types in D&D 5e with resistances, immunities, and common sources.",
  },
  alternates: {
    canonical: "/damage-types",
    languages: {
      en: "/damage-types",
      "pt-BR": "/tipos-de-dano",
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
      url: siteUrl("/"),
    },
  };

  return (
    <script {...jsonLdScriptProps(jsonLd)} />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function DamageTypesPage() {
  return (
    <>
      <DamageTypesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Damage Types" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDamageTypesGrid locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Damage Types" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
