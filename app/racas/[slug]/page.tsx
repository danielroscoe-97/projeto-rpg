import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRaceDetail } from "@/components/public/PublicRaceDetail";
import { getRaceSlugs, getRaceData } from "@/lib/srd/races-data";
import { PublicCTA } from "@/components/public/PublicCTA";
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
      url: `https://www.pocketdm.com.br/racas/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://www.pocketdm.com.br/racas/${slug}`,
      languages: {
        en: `https://www.pocketdm.com.br/races/${slug}`,
        "pt-BR": `https://www.pocketdm.com.br/racas/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function RaceJsonLd({ race }: { race: NonNullable<ReturnType<typeof getRaceData>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${race.namePt} — Raça D&D 5e`,
    headline: `${race.namePt} — Raça D&D 5e`,
    description: `${race.namePt} (${race.nameEn}), raça ${race.size === "Small" ? "Pequena" : "Média"} com ${race.abilityBonuses.map((b) => `${b.ability} ${b.bonus}`).join(", ")}. Velocidade ${race.speed} ft.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
    },
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
      <RaceJsonLd race={race} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Raças", href: "/racas" },
            { label: race.namePt },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Página disponível em{" "}
            <Link
              href={`/races/${slug}`}
              className="text-[#D4A853] hover:underline"
            >
              English
            </Link>
          </p>

          <PublicRaceDetail slug={slug} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName={race.namePt} locale="pt-BR" />
          </div>
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
            . D&amp;D e Dungeons &amp; Dragons são marcas registradas da Wizards
            of the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://www.pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}&mdash; O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
