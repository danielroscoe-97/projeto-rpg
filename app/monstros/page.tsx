import type { Metadata } from "next";
import {
  getSrdMonstersDeduped,
  toSlug,
  toMonsterSlugPt,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { CompendiumMonsterHydrator } from "@/components/public/CompendiumMonsterHydrator";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";
import { MonsterHeroCount } from "@/components/public/MonsterHeroCount";
import monsterNamesPt from "@/data/srd/monster-descriptions-pt.json";
import monsterSlugsPt from "@/data/srd/monster-names-pt.json";

export const metadata: Metadata = {
  title: "Bestiário D&D 5e — Lista de Monstros SRD",
  description:
    "Bestiário completo do D&D 5e com blocos de estatísticas interativos, roladores de dados e descrições táticas. Filtre por CR, tipo e muito mais. Gratuito.",
  keywords: [
    "monstros D&D 5e",
    "bestiário D&D",
    "monstros SRD 5e",
    "ficha de monstro D&D",
    "D&D 5e bestiary",
    "monstros dungeons and dragons",
  ],
  alternates: {
    canonical: "https://pocketdm.com.br/monstros",
    languages: {
      "en": "https://pocketdm.com.br/monsters",
      "pt-BR": "https://pocketdm.com.br/monstros",
    },
  },
  openGraph: {
    title: "Bestiário D&D 5e — Lista de Monstros SRD | Pocket DM",
    description:
      "Bestiário completo do D&D 5e com blocos de estatísticas interativos e roladores de dados. Filtre por CR, tipo e muito mais.",
    type: "website",
    url: "https://pocketdm.com.br/monstros",
  },
};

export const revalidate = 86400;

export default function MonstrosIndexPage() {
  const deduped = getSrdMonstersDeduped();
  const ptNames = monsterNamesPt as Record<string, { name?: string }>;
  const allPtSlugs = monsterSlugsPt as Record<string, string>;

  const monsters = deduped.map((m) => {
    const enSlug = toSlug(m.name);
    const ptName = ptNames[enSlug]?.name ?? m.name;
    return {
      name: ptName,
      nameEn: m.name,
      namePt: ptName,
      cr: m.cr,
      type: m.type,
      isMAD: !!m.monster_a_day_url,
      slug: toMonsterSlugPt(enSlug),
      tokenUrl: m.token_url,
      fallbackTokenUrl: m.fallback_token_url,
      entityId: m.id,
      rulesetVersion: m.ruleset_version,
      hasPage: true,
    };
  });

  // Only include PT names for SRD monsters in SSR props (non-SRD names are auth-gated)
  const srdSlugs = new Set(monsters.map((m) => toSlug(m.nameEn ?? m.name)));
  const ptNameMap: Record<string, string> = {};
  const ptSlugMap: Record<string, string> = {};
  for (const slug of srdSlugs) {
    const ptName = ptNames[slug]?.name;
    if (ptName) ptNameMap[slug] = ptName;
    if (allPtSlugs[slug]) ptSlugMap[slug] = allPtSlugs[slug];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bestiário D&D 5e — Monstros SRD",
    description: "Bestiário completo do D&D 5e com blocos de estatísticas interativos e roladores de dados.",
    url: "https://pocketdm.com.br/monstros",
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://pocketdm.com.br" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: monsters.length,
      itemListElement: monsters.slice(0, 10).map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://pocketdm.com.br/monstros/${m.slug}`,
        name: m.name,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="min-h-screen bg-background">
      <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Monstros" }]} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Bestiário D&amp;D 5e
          </h1>
          <p className="text-gray-400 text-lg">
            <MonsterHeroCount ssrCount={deduped.length} /> monstros com roladores de dados interativos e fichas táticas. Todo conteúdo SRD é gratuito sob{" "}
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

        <CompendiumMonsterHydrator
          ssrMonsters={monsters}
          ptNameMap={ptNameMap}
          ptSlugMap={ptSlugMap}
          basePath="/monstros"
          locale="pt-BR"
          labels={{
            searchPlaceholder: "Buscar monstros pelo nome...",
            crLabel: "CR:",
            typeLabel: "Tipo:",
            noResults: "Nenhum monstro encontrado com esses filtros.",
            clearAll: "Limpar filtros",
            of: "de",
            monsters: "monstros",
            filters: "Filtros",
          }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Gerencie monstros em combate
          </h2>
          <p className="text-gray-400 mb-5 max-w-lg mx-auto">
            O Pocket DM é o rastreador de combate gratuito para D&D 5e. Controle iniciativa,
            HP, condições e magias em tempo real — para todos os jogadores.
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
          <Link href="/monsters" className="text-gold hover:underline">
            English
          </Link>
        </p>
      </main>

      <PublicFooter locale="pt-BR" />
    </div>
    </>
  );
}
