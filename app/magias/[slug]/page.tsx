import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSrdSpellsDeduped,
  getSpellBySlugPt,
  getSrdSpells,
  toSlug,
  toSpellSlugPt,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellCard } from "@/components/public/PublicSpellCard";
import { PublicSpellSearch } from "@/components/public/PublicSpellSearch";
import { PublicCTA } from "@/components/public/PublicCTA";
import { getSpellTier } from "@/lib/srd/spell-tiers";
import Link from "next/link";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdSpellsDeduped().map((s) => ({
    slug: toSpellSlugPt(toSlug(s.name)),
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
  const spell = getSpellBySlugPt(slug);
  if (!spell) return { title: "Magia Não Encontrada" };

  const enSlug = toSlug(spell.name);
  const levelStr = spell.level === 0 ? "Truque" : `Nível ${spell.level}`;
  const title = `${spell.name} — Magia D&D 5e | Pocket DM`;
  const description = `${spell.name}, ${levelStr} de ${spell.school}. ${spell.casting_time}, alcance ${spell.range}.${spell.description ? ` ${spell.description.slice(0, 120)}...` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.pocketdm.com.br/magias/${slug}`,
    },
    twitter: { card: "summary", title, description },
    alternates: {
      canonical: `https://www.pocketdm.com.br/magias/${slug}`,
      languages: {
        "en": `https://www.pocketdm.com.br/spells/${enSlug}`,
        "pt-BR": `https://www.pocketdm.com.br/magias/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function SpellJsonLd({ spell }: { spell: NonNullable<ReturnType<typeof getSpellBySlugPt>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${spell.name} — Magia D&D 5e`,
    headline: `${spell.name} — Magia D&D 5e`,
    description: `${spell.name}. ${spell.description.slice(0, 200)}`,
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
export default async function MagiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spell = getSpellBySlugPt(slug);
  if (!spell) notFound();

  const enSlug = toSlug(spell.name);
  const tier = getSpellTier(enSlug);

  const allSpells = getSrdSpells().map((s) => {
    const es = toSlug(s.name);
    return {
      name: s.name,
      level: s.level,
      school: s.school,
      classes: s.classes ?? [],
      concentration: s.concentration,
      ritual: s.ritual,
      slug: toSpellSlugPt(es),
    };
  });

  return (
    <>
      <SpellJsonLd spell={spell} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Magias", href: "/magias" },
            { label: spell.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Página disponível em{" "}
            <Link href={`/spells/${enSlug}`} className="text-orange-400 hover:underline">
              English
            </Link>
          </p>

          {/* Collapsible search */}
          <PublicSpellSearch
            spells={allSpells}
            basePath="/magias"
            buttonLabel="Buscar mais magias"
          />

          {/* Spell card with dice rollers */}
          <PublicSpellCard spell={spell} tier={tier} />

          {/* Two-box CTA */}
          <PublicCTA entityName={spell.name} locale="pt-BR" />
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
