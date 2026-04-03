import type { Metadata } from "next";
import { getSrdSpells, toSlug, toSpellSlugPt } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellGrid } from "@/components/public/PublicSpellGrid";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Magias D&D 5e — Compêndio SRD | Pocket DM",
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
    canonical: "https://www.pocketdm.com.br/magias",
    languages: {
      "en": "https://www.pocketdm.com.br/spells",
      "pt-BR": "https://www.pocketdm.com.br/magias",
    },
  },
};

export const revalidate = 86400;

export default function MagiasIndexPage() {
  const spells = getSrdSpells()
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((s) => {
      const enSlug = toSlug(s.name);
      return {
        name: s.name,
        level: s.level,
        school: s.school,
        classes: s.classes ?? [],
        concentration: s.concentration,
        ritual: s.ritual,
        slug: toSpellSlugPt(enSlug),
      };
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
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
          <p className="text-gray-500 text-sm mt-1">
            Página disponível em{" "}
            <Link href="/spells" className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>
        </div>

        <PublicSpellGrid
          spells={spells}
          basePath="/magias"
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
          }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-[#D4A853]/[0.06] to-gray-800/50 border border-[#D4A853]/10 p-8 text-center">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4A853] px-6 py-3 text-white font-semibold hover:bg-[#D4A853]/90 transition-colors"
            >
              Testar Gratuitamente
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4A853]/30 px-6 py-3 text-[#D4A853] font-semibold hover:bg-[#D4A853]/10 transition-colors"
            >
              Criar Conta Gratuita
            </Link>
          </div>
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
            CC-BY-4.0
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
  );
}
