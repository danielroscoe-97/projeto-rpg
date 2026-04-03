import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSrdMonstersDeduped,
  getMonsterBySlugPt,
  getSrdMonsters,
  toSlug,
  toMonsterSlugPt,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicMonsterStatBlock } from "@/components/public/PublicMonsterStatBlock";
import { PublicMonsterSearch } from "@/components/public/PublicMonsterSearch";
import { PublicCTA } from "@/components/public/PublicCTA";
import { MonsterADayAttribution } from "@/components/public/MonsterADayAttribution";
import monsterLore from "@/public/srd/monster-lore.json";
import monsterLorePt from "@/public/srd/monster-lore-pt.json";
import monsterNamesPt from "@/public/srd/monster-descriptions-pt.json";
import Link from "next/link";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdMonstersDeduped().map((m) => ({
    slug: toMonsterSlugPt(toSlug(m.name)),
  }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const monster = getMonsterBySlugPt(slug);
  if (!monster) return { title: "Monstro Não Encontrado" };

  const enSlug = toSlug(monster.name);
  const title = `${monster.name} — Ficha D&D 5e | Pocket DM`;
  const description = `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. CA ${monster.armor_class}, PV ${monster.hit_points}. Ficha completa com rolador de dados interativo.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.pocketdm.com.br/monstros/${slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://www.pocketdm.com.br/monstros/${slug}`,
      languages: {
        "en": `https://www.pocketdm.com.br/monsters/${enSlug}`,
        "pt-BR": `https://www.pocketdm.com.br/monstros/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function MonsterJsonLd({ monster }: { monster: NonNullable<ReturnType<typeof getMonsterBySlugPt>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${monster.name} — Ficha D&D 5e`,
    headline: `${monster.name} — Ficha D&D 5e`,
    description: `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://www.pocketdm.com.br" },
    inLanguage: "pt-BR",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function MonstroPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monster = getMonsterBySlugPt(slug);
  if (!monster) notFound();

  const enSlug = toSlug(monster.name);
  const ptName = (monsterNamesPt as Record<string, { name?: string }>)[enSlug]?.name ?? monster.name;

  const allMonsters = getSrdMonsters().map((m) => {
    const es = toSlug(m.name);
    return {
      name: m.name,
      cr: m.cr,
      type: m.type,
      slug: toMonsterSlugPt(es),
    };
  });

  type LoreMap = Record<string, { overview: string; combat: string[]; world: string[]; dmTips: string[] }>;
  const isMAD = !!monster.monster_a_day_url;
  // Prefer PT lore, fall back to EN lore
  const lore = (monsterLorePt as LoreMap)[enSlug] ?? (monsterLore as LoreMap)[enSlug] ?? null;

  return (
    <>
      <MonsterJsonLd monster={monster} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Monstros", href: "/monstros" },
            { label: ptName },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Página disponível em{" "}
            <Link href={`/monsters/${enSlug}`} className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>

          {/* Collapsible search */}
          <PublicMonsterSearch
            monsters={allMonsters}
            basePath="/monstros"
            buttonLabel="Buscar mais monstros"
          />

          {/* MAD attribution */}
          {isMAD && monster.monster_a_day_url && (
            <MonsterADayAttribution
              postUrl={monster.monster_a_day_url}
              author={monster.monster_a_day_author}
              dayId={monster.monster_a_day_day_id}
            />
          )}

          {/* Stat block with token + dice rollers */}
          <PublicMonsterStatBlock monster={monster} locale="pt-BR" slug={enSlug} />

          {/* Two-box CTA */}
          <PublicCTA entityName={ptName} lore={lore ?? undefined} locale="pt-BR" />
        </main>

        <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
          <p>
            Conteúdo SRD utilizado sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . D&amp;D e Dungeons &amp; Dragons são marcas registradas da Wizards of the Coast.
          </p>
          <p className="mt-1">
            <a href="https://www.pocketdm.com.br" className="underline hover:text-gray-300">
              Pocket DM
            </a>
            {" "}— O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
