import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSrdMonstersDeduped,
  getMonsterBySlug,
  getSrdMonsters,
  toSlug,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicMonsterStatBlock } from "@/components/public/PublicMonsterStatBlock";
import { PublicMonsterSearch } from "@/components/public/PublicMonsterSearch";
import { PublicCTA } from "@/components/public/PublicCTA";
import { MonsterADayAttribution } from "@/components/public/MonsterADayAttribution";
import monsterLore from "@/public/srd/monster-lore.json";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdMonstersDeduped().map((m) => ({ slug: toSlug(m.name) }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) return { title: "Monster Not Found" };

  const title = `${monster.name} — D&D 5e Stat Block | Pocket DM`;
  const description = `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}. Full stat block with interactive dice roller.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.pocketdm.com.br/monsters/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `https://www.pocketdm.com.br/monsters/${slug}`,
    },
  };
}

// ── JSON-LD structured data ────────────────────────────────────────
function MonsterJsonLd({ monster }: { monster: NonNullable<ReturnType<typeof getMonsterBySlug>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${monster.name} — D&D 5e Stat Block`,
    headline: `${monster.name} — D&D 5e Stat Block`,
    description: `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}.`,
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
export default async function MonsterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) notFound();

  // Minimal data for the search bar
  const allMonsters = getSrdMonsters().map((m) => ({
    name: m.name,
    cr: m.cr,
    type: m.type,
  }));

  const isMAD = !!monster.monster_a_day_url;
  const lore = (monsterLore as Record<string, { overview: string; combat: string[]; world: string[]; dmTips: string[] }>)[slug] ?? null;

  return (
    <>
      <MonsterJsonLd monster={monster} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          breadcrumbs={[
            { label: "Monsters", href: "/monsters" },
            { label: monster.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Collapsible search */}
          <PublicMonsterSearch monsters={allMonsters} />

          {/* MAD attribution */}
          {isMAD && monster.monster_a_day_url && (
            <MonsterADayAttribution
              postUrl={monster.monster_a_day_url}
              author={monster.monster_a_day_author}
              dayId={monster.monster_a_day_day_id}
            />
          )}

          {/* Stat block with token + dice rollers */}
          <PublicMonsterStatBlock monster={monster} locale="pt-BR" slug={slug} />

          {/* Lore tabs + CTA banner */}
          <PublicCTA entityName={monster.name} lore={lore ?? undefined} locale="pt-BR" />
        </main>

        {/* Footer */}
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
