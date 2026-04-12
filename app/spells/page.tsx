import type { Metadata } from "next";
import { getSrdSpells, spellSlug, toSlug, getSpellNamePt, getSpellDescriptionPt } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellGrid } from "@/components/public/PublicSpellGrid";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "D&D 5e Spell Compendium — SRD Spell List",
  description:
    "Complete D&D 5e SRD spell compendium with descriptions, range, components, and damage. Filter by level, school, and class. Free spell reference for game masters and players.",
  keywords: [
    "D&D 5e spells",
    "dnd spell list",
    "SRD spells",
    "5e spell compendium",
    "D&D spell reference",
    "magias D&D 5e",
  ],
  alternates: {
    canonical: "https://pocketdm.com.br/spells",
    languages: {
      en: "https://pocketdm.com.br/spells",
      "pt-BR": "https://pocketdm.com.br/magias",
    },
  },
  openGraph: {
    title: "D&D 5e Spell Compendium — SRD Spell List | Pocket DM",
    description:
      "Complete D&D 5e SRD spell compendium with descriptions, range, components, and damage. Filter by level, school, and class.",
    type: "website",
    url: "https://pocketdm.com.br/spells",
  },
};

export const revalidate = 86400;

export default function SpellsIndexPage() {
  const spells = getSrdSpells()
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((s) => {
      const enSlug = toSlug(s.name);
      const ptName = getSpellNamePt(enSlug, s.name);
      const ptDesc = getSpellDescriptionPt(enSlug);
      return {
        name: s.name,
        nameEn: s.name,
        namePt: ptName,
        level: s.level,
        school: s.school,
        classes: s.classes ?? [],
        concentration: s.concentration,
        ritual: s.ritual,
        slug: spellSlug(s),
        ruleset_version: s.ruleset_version,
        casting_time: s.casting_time,
        range: s.range,
        duration: s.duration,
        description: s.description?.slice(0, 200),
        descriptionEn: s.description?.slice(0, 200),
        descriptionPt: ptDesc?.slice(0, 300),
      };
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "D&D 5e Spell Compendium",
    description: "Complete D&D 5e SRD spell compendium with descriptions, damage, range, and components.",
    url: "https://pocketdm.com.br/spells",
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://www.pocketdm.com.br" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: spells.length,
      itemListElement: spells.slice(0, 10).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://pocketdm.com.br/spells/${s.slug}`,
        name: s.name,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="min-h-screen bg-background">
      <PublicNav breadcrumbs={[{ label: "Spells" }]} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            D&amp;D 5e Spell Compendium
          </h1>
          <p className="text-gray-400 text-lg">
            {spells.length} spells with interactive dice rollers and tier
            ratings. All SRD content is free under{" "}
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

        <PublicSpellGrid spells={spells} />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Track spells in combat
          </h2>
          <p className="text-gray-400 mb-5 max-w-lg mx-auto">
            Our free combat tracker lets you manage spell slots, concentration,
            and spell effects in real time — for every player at the table.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/try"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-gray-950 font-semibold hover:bg-gold/90 transition-colors"
            >
              Try Combat Tracker — Free
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-6 py-3 text-gold font-semibold hover:bg-gold/10 transition-colors"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
    </>
  );
}
