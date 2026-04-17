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
import { monsterMetadata, articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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

  return monsterMetadata(monster, {
    slug: enSlug,
    ptSlug: slug,
    ptName,
    locale: "pt-BR",
  });
}

// ── JSON-LD ────────────────────────────────────────────────────────
function MonsterJsonLd({ monster, ptName, slug }: { monster: NonNullable<ReturnType<typeof getMonsterBySlugPt>>; ptName: string; slug: string }) {
  const name = `${ptName} — CR ${monster.cr} Ficha D&D 5e`;
  const sizeType = [monster.size, monster.type].filter(Boolean).join(" ");
  const description = `${ptName}, ${sizeType}, CR ${monster.cr}.`;
  const path = `/monstros/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/monstros/${slug}/opengraph-image`,
    locale: "pt-BR",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Monstros", path: "/monstros" },
    { name: ptName, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
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
            <Link href={`/monsters/${enSlug}`} className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
