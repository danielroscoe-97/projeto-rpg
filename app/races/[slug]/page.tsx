import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRaceDetail } from "@/components/public/PublicRaceDetail";
import { getRaceSlugs, getRaceData } from "@/lib/srd/races-data";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

// ── Static generation ──────────────────────────────────────────────
export function generateStaticParams() {
  return getRaceSlugs().map((slug) => ({ slug }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const race = getRaceData(slug);
  if (!race) return { title: "Race Not Found" };

  const bonuses = race.abilityBonuses
    .map((b) => `${b.ability} ${b.bonus}`)
    .join(", ");
  const title = `${race.nameEn} — D&D 5e Race`;
  const description = `${race.nameEn}: ${bonuses}. ${race.size}, ${race.speed} ft speed${race.darkvision ? `, Darkvision ${race.darkvision} ft` : ""}. ${race.traits.map((t) => t.nameEn).join(", ")}.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `/races/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `/races/${slug}`,
      languages: {
        en: `/races/${slug}`,
        "pt-BR": `/racas/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function RaceJsonLd({ race, slug }: { race: NonNullable<ReturnType<typeof getRaceData>>; slug: string }) {
  const name = `${race.nameEn} — D&D 5e Race`;
  const description = `${race.nameEn}, ${race.size} race with ${race.abilityBonuses.map((b) => `${b.ability} ${b.bonus}`).join(", ")}. Speed ${race.speed} ft.`;
  const path = `/races/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: "/opengraph-image",
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Races", path: "/races" },
    { name: race.nameEn, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const race = getRaceData(slug);
  if (!race) notFound();

  return (
    <>
      <RaceJsonLd race={race} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[
            { label: "Races", href: "/races" },
            { label: race.nameEn },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicRaceDetail slug={slug} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName={race.nameEn} locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href={`/racas/${slug}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
