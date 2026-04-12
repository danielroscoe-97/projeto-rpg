import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRaceDetail } from "@/components/public/PublicRaceDetail";
import { getRaceSlugs, getRaceData } from "@/lib/srd/races-data";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";

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
      url: `https://pocketdm.com.br/races/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/races/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/races/${slug}`,
        "pt-BR": `https://pocketdm.com.br/racas/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function RaceJsonLd({ race, slug }: { race: NonNullable<ReturnType<typeof getRaceData>>; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${race.nameEn} — D&D 5e Race`,
    headline: `${race.nameEn} — D&D 5e Race`,
    description: `${race.nameEn}, ${race.size} race with ${race.abilityBonuses.map((b) => `${b.ability} ${b.bonus}`).join(", ")}. Speed ${race.speed} ft.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: {
        "@type": "ImageObject",
        url: "https://pocketdm.com.br/icons/icon-512.png",
      },
    },
    inLanguage: "en",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://pocketdm.com.br",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Races",
        item: "https://pocketdm.com.br/races",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: race.nameEn,
        item: `https://pocketdm.com.br/races/${slug}`,
      },
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
