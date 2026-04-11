import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getSrdMonstersDeduped,
  getMonsterBySlug,
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

  const title = `${monster.name} — D&D 5e Stat Block`;
  const description = `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}. Full stat block with interactive dice roller.`;
  const ptSlug = toMonsterSlugPt(slug);

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/monsters/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/monsters/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/monsters/${slug}`,
        "pt-BR": `https://pocketdm.com.br/monstros/${ptSlug}`,
      },
    },
  };
}

// ── JSON-LD structured data ────────────────────────────────────────
function MonsterJsonLd({ monster, slug }: { monster: NonNullable<ReturnType<typeof getMonsterBySlug>>; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${monster.name} — D&D 5e Stat Block`,
    headline: `${monster.name} — D&D 5e Stat Block`,
    description: `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}.`,
    image: `https://pocketdm.com.br/monsters/${slug}/opengraph-image`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Monsters", item: "https://pocketdm.com.br/monsters" },
      { "@type": "ListItem", position: 3, name: monster.name, item: `https://pocketdm.com.br/monsters/${slug}` },
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
      <MonsterJsonLd monster={monster} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[
            { label: "Monsters", href: "/monsters" },
            { label: monster.name },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
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
          <PublicMonsterStatBlock monster={monster} locale="en" slug={slug} />

          {/* Lore tabs + CTA banner */}
          <PublicCTA entityName={monster.name} lore={lore ?? undefined} locale="en" compendiumHref="/app/compendium?tab=monsters" />

          <p className="text-xs text-muted-foreground mt-12 text-center">
            Also available in{" "}
            <Link href={`/monstros/${toMonsterSlugPt(slug)}`} className="text-[#D4A853] hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
