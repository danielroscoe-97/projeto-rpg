import Link from "next/link";
import type { Metadata } from "next";
import { getSrdMonstersDeduped, toSlug } from "@/lib/srd/srd-data-server";
import monsterNamesPt from "@/data/srd/monster-descriptions-pt.json";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicMonsterGrid } from "@/components/public/PublicMonsterGrid";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "D&D 5e Monster Compendium — SRD Bestiary",
  description:
    "Complete D&D 5e SRD monster compendium with interactive stat blocks and dice rollers. Search by CR, creature type, and name. Free bestiary for game masters.",
  keywords: [
    "D&D 5e monsters",
    "dnd bestiary",
    "SRD monsters",
    "monster stat blocks",
    "D&D combat tracker",
    "5e monster list",
  ],
  alternates: {
    canonical: "https://pocketdm.com.br/monsters",
    languages: {
      en: "https://pocketdm.com.br/monsters",
      "pt-BR": "https://pocketdm.com.br/monstros",
    },
  },
  openGraph: {
    title: "D&D 5e Monster Compendium — SRD Bestiary | Pocket DM",
    description:
      "Complete D&D 5e SRD monster compendium with interactive stat blocks and dice rollers. Search by CR, creature type, and name.",
    type: "website",
    url: "https://pocketdm.com.br/monsters",
  },
};

export const revalidate = 86400;

export default function MonstersIndexPage() {
  const ptNames = monsterNamesPt as Record<string, { name?: string }>;
  const monsters = getSrdMonstersDeduped()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => {
      const enSlug = toSlug(m.name);
      return {
        name: m.name,
        nameEn: m.name,
        namePt: ptNames[enSlug]?.name ?? m.name,
        cr: m.cr,
        type: m.type,
        isMAD: !!m.monster_a_day_url,
        slug: toSlug(m.name),
        tokenUrl: m.token_url,
        fallbackTokenUrl: m.fallback_token_url,
      };
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "D&D 5e Monster Compendium",
    description: "Complete D&D 5e SRD monster compendium with interactive stat blocks and dice rollers.",
    url: "https://pocketdm.com.br/monsters",
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://pocketdm.com.br" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: monsters.length,
      itemListElement: monsters.slice(0, 10).map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://pocketdm.com.br/monsters/${m.slug}`,
        name: m.name,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="min-h-screen bg-background">
      <PublicNav breadcrumbs={[{ label: "Monsters" }]} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            D&amp;D 5e Monster Compendium
          </h1>
          <p className="text-gray-400 text-lg">
            {monsters.length} monsters with interactive stat blocks, dice
            rollers, and full SRD data. All free under{" "}
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

        {/* Interactive grid with filters */}
        <PublicMonsterGrid monsters={monsters} />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Use any monster in combat
          </h2>
          <p className="text-gray-400 mb-5 max-w-lg mx-auto">
            Add monsters directly to our free combat tracker. Auto-roll
            initiative, track HP, conditions, and legendary actions in real
            time.
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
