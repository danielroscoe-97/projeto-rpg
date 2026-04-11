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
import { PublicFooter } from "@/components/public/PublicFooter";
import monsterLore from "@/data/srd/monster-lore.json";
import monsterLorePt from "@/data/srd/monster-lore-pt.json";
import monsterNamesPt from "@/data/srd/monster-descriptions-pt.json";
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
  const ptName = (monsterNamesPt as Record<string, { name?: string }>)[enSlug]?.name ?? monster.name;
  const title = `${ptName} — Ficha D&D 5e`;
  const description = `${ptName}, ${monster.size} ${monster.type}, CR ${monster.cr}. CA ${monster.armor_class}, PV ${monster.hit_points}. Ficha completa com rolador de dados interativo.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/monstros/${slug}`,
    },
    twitter: { card: "summary_large_image", title: `${title} | Pocket DM`, description },
    alternates: {
      canonical: `https://pocketdm.com.br/monstros/${slug}`,
      languages: {
        "en": `https://pocketdm.com.br/monsters/${enSlug}`,
        "pt-BR": `https://pocketdm.com.br/monstros/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function MonsterJsonLd({ monster, ptName, slug }: { monster: NonNullable<ReturnType<typeof getMonsterBySlugPt>>; ptName: string; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${ptName} — Ficha D&D 5e`,
    headline: `${ptName} — Ficha D&D 5e`,
    description: `${ptName}, ${monster.size} ${monster.type}, CR ${monster.cr}.`,
    image: `https://pocketdm.com.br/monstros/${slug}/opengraph-image`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
    inLanguage: "pt-BR",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Monstros", item: "https://pocketdm.com.br/monstros" },
      { "@type": "ListItem", position: 3, name: ptName, item: `https://pocketdm.com.br/monstros/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
    </>
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
      <MonsterJsonLd monster={monster} ptName={ptName} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Monstros", href: "/monstros" },
            { label: ptName },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
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
          <PublicCTA entityName={ptName} lore={lore ?? undefined} locale="pt-BR" compendiumHref="/app/compendium?tab=monsters" />
          {/* Language link */}
          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href={`/monsters/${enSlug}`} className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
