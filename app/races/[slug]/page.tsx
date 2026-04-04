import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRaceDetail, getRaceSlugs, getRaceData } from "@/components/public/PublicRaceDetail";
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
  if (!race) return { title: "Race Not Found" };

  const bonuses = race.abilityBonuses
    .map((b) => `${b.ability} ${b.bonus}`)
    .join(", ");
  const title = `${race.nameEn} — D&D 5e Race | Pocket DM`;
  const description = `${race.nameEn}: ${bonuses}. ${race.size}, ${race.speed} ft speed${race.darkvision ? `, Darkvision ${race.darkvision} ft` : ""}. ${race.traits.map((t) => t.nameEn).join(", ")}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.pocketdm.com.br/races/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `https://www.pocketdm.com.br/races/${slug}`,
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
    name: `${race.nameEn} — D&D 5e Race`,
    headline: `${race.nameEn} — D&D 5e Race`,
    description: `${race.nameEn}, ${race.size} race with ${race.abilityBonuses.map((b) => `${b.ability} ${b.bonus}`).join(", ")}. Speed ${race.speed} ft.`,
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
      <RaceJsonLd race={race} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          breadcrumbs={[
            { label: "Races", href: "/races" },
            { label: race.nameEn },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Also available in{" "}
            <Link
              href={`/racas/${slug}`}
              className="text-[#D4A853] hover:underline"
            >
              Portugues
            </Link>
          </p>

          <PublicRaceDetail slug={slug} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName={race.nameEn} locale="en" />
          </div>
        </main>

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
            . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of
            the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://www.pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}&mdash; The combat tracker for D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
