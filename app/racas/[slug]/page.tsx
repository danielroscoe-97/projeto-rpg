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
  if (!race) return { title: "Raça Não Encontrada" };

  const bonuses = race.abilityBonuses
    .map((b) => `${b.ability} ${b.bonus}`)
    .join(", ");
  const title = `${race.namePt} — Raça D&D 5e`;
  const description = `${race.namePt} (${race.nameEn}): ${bonuses}. ${race.size === "Small" ? "Pequeno" : "Médio"}, ${race.speed} ft${race.darkvision ? `, Visão no Escuro ${race.darkvision} ft` : ""}. ${race.traits.map((t) => t.namePt).join(", ")}.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/racas/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/racas/${slug}`,
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
    name: `${race.namePt} — Raça D&D 5e`,
    headline: `${race.namePt} — Raça D&D 5e`,
    description: `${race.namePt} (${race.nameEn}), raça ${race.size === "Small" ? "Pequena" : "Média"} com ${race.abilityBonuses.map((b) => `${b.ability} ${b.bonus}`).join(", ")}. Velocidade ${race.speed} ft.`,
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
    inLanguage: "pt-BR",
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
        name: "Raças",
        item: "https://pocketdm.com.br/racas",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: race.namePt,
        item: `https://pocketdm.com.br/racas/${slug}`,
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
export default async function RacaDetailPage({
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
          locale="pt-BR"
          breadcrumbs={[
            { label: "Raças", href: "/racas" },
            { label: race.namePt },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicRaceDetail slug={slug} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName={race.namePt} locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href={`/races/${slug}`} className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
