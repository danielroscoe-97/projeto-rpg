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
import { monsterMetadata, articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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

  return monsterMetadata(monster, {
    slug,
    ptSlug: toMonsterSlugPt(slug),
    locale: "en",
  });
}

// ── JSON-LD structured data ────────────────────────────────────────
function MonsterJsonLd({ monster, slug }: { monster: NonNullable<ReturnType<typeof getMonsterBySlug>>; slug: string }) {
  const name = `${monster.name} — CR ${monster.cr} D&D 5e Stat Block`;
  const sizeType = [monster.size, monster.type].filter(Boolean).join(" ");
  const description = `${monster.name}, ${sizeType}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}.`;
  const path = `/monsters/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/monsters/${slug}/opengraph-image`,
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Monsters", path: "/monsters" },
    { name: monster.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
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
          <Link
            href="/monsters"
            className="inline-flex items-center gap-1 text-sm text-gold hover:underline mb-4"
          >
            <span aria-hidden>←</span> Back to Bestiary
          </Link>

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
            <Link href={`/monstros/${toMonsterSlugPt(slug)}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
