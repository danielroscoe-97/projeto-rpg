import type { Metadata } from "next";
import { getSrdSpells, toSlug, toSpellSlugPt, getSpellNamePt, getSpellDescriptionPt } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellGrid } from "@/components/public/PublicSpellGrid";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Magias D&D 5e — Compêndio SRD",
  description:
    "Compêndio completo de magias do D&D 5e com descrições, alcance, componentes e tier de poder. Filtre por nível, escola e classe. Gratuito.",
  keywords: [
    "magias D&D 5e",
    "lista de magias D&D",
    "magias SRD 5e",
    "feitiços D&D",
    "magias dungeons and dragons",
    "compêndio de magias 5e",
  ],
  alternates: {
    canonical: "https://pocketdm.com.br/magias",
    languages: {
      "en": "https://pocketdm.com.br/spells",
      "pt-BR": "https://pocketdm.com.br/magias",
    },
  },
  openGraph: {
    title: "Magias D&D 5e — Compêndio SRD | Pocket DM",
    description:
      "Compêndio completo de magias do D&D 5e com descrições, alcance, componentes e tier de poder. Filtre por nível, escola e classe.",
    type: "website",
    url: "https://pocketdm.com.br/magias",
  },
};

export const revalidate = 86400;

export default function MagiasIndexPage() {
  const spells = getSrdSpells()
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((s) => {
      const enSlug = toSlug(s.name);
      const ptName = getSpellNamePt(enSlug, s.name);
      const ptDesc = getSpellDescriptionPt(enSlug);
      return {
        name: ptName,
        nameEn: s.name,
        namePt: ptName,
        level: s.level,
        school: s.school,
        classes: s.classes ?? [],
        concentration: s.concentration,
        ritual: s.ritual,
        slug: toSpellSlugPt(enSlug),
        ruleset_version: s.ruleset_version,
        casting_time: s.casting_time,
        range: s.range,
        components: s.components,
        duration: s.duration,
        description: ptDesc?.slice(0, 300) ?? s.description?.slice(0, 200),
        descriptionEn: s.description?.slice(0, 300),
        descriptionPt: ptDesc?.slice(0, 300) ?? s.description?.slice(0, 200),
      };
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Compêndio de Magias D&D 5e",
    description: "Compêndio completo de magias do D&D 5e com descrições, alcance, componentes e tier de poder.",
    url: "https://pocketdm.com.br/magias",
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://www.pocketdm.com.br" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: spells.length,
      itemListElement: spells.slice(0, 10).map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://pocketdm.com.br/magias/${s.slug}`,
        name: s.name,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="min-h-screen bg-background">
      <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Magias" }]} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Compêndio de Magias D&amp;D 5e
          </h1>
          <p className="text-gray-400 text-lg">
            {spells.length} magias com roladores de dados interativos e avaliações de tier.
            Todo conteúdo SRD é gratuito sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC-BY-4.0
            </a>
            .
          </p>
        </div>

        <PublicSpellGrid
          spells={spells}
          basePath="/magias"
          locale="pt-BR"
          labels={{
            searchPlaceholder: "Buscar magias pelo nome...",
            levelLabel: "Nível:",
            schoolLabel: "Escola:",
            classLabel: "Classe:",
            concentrationLabel: "© Concentração",
            ritualLabel: "® Ritual",
            of: "de",
            spells: "magias",
            clearAll: "Limpar filtros",
            noResults: "Nenhuma magia encontrada com esses filtros.",
            filtersLabel: "Filtros",
            langEn: "English",
            langPt: "Português",
            editionAll: "Ambas",
          }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Gerencie magias em combate
          </h2>
          <p className="text-gray-400 mb-5 max-w-lg mx-auto">
            O Pocket DM é o rastreador de combate gratuito para D&D 5e. Controle slots de magia,
            concentração e efeitos em tempo real — para todos os jogadores.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/try"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-gray-950 font-semibold hover:bg-gold/90 transition-colors"
            >
              Testar Gratuitamente
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-6 py-3 text-gold font-semibold hover:bg-gold/10 transition-colors"
            >
              Criar Conta Gratuita
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-12 text-center">
          Página disponível em{" "}
          <Link href="/spells" className="text-gold hover:underline">
            English
          </Link>
        </p>
      </main>

      <PublicFooter locale="pt-BR" />
    </div>
    </>
  );
}
