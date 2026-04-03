import Link from "next/link";
import type { Metadata } from "next";
import { getSrdMonsters, toSlug } from "@/lib/srd/srd-data-server";

export const metadata: Metadata = {
  title: "Monstros D&D 5e — Bestiário SRD Completo | Pocket DM",
  description:
    "Bestiário completo de D&D 5e com 3000+ monstros SRD — stat blocks, CR, HP e habilidades. Pesquise e use direto no combat tracker. Free D&D 5e monster compendium with full stat blocks.",
  keywords: [
    "monstros D&D 5e",
    "bestiário D&D",
    "dnd 5e monsters",
    "stat block D&D",
    "compêndio de monstros",
    "monster manual 5e",
    "D&D bestiary",
    "SRD monsters",
  ],
  alternates: {
    canonical: "/monsters",
    languages: { "pt-BR": "/monsters", en: "/monsters" },
  },
};

export const revalidate = 86400;

function crSortValue(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

export default function MonstersIndexPage() {
  const monsters = getSrdMonsters().sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Group by first letter
  const grouped = new Map<string, typeof monsters>();
  for (const m of monsters) {
    const letter = m.name[0]?.toUpperCase() || "#";
    if (!grouped.has(letter)) grouped.set(letter, []);
    grouped.get(letter)!.push(m);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="text-orange-400 font-semibold font-[family-name:var(--font-cinzel)]"
          >
            Pocket DM
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-200 text-sm">Monsters</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
          D&D 5e SRD Monsters
        </h1>
        <p className="text-gray-400 mb-8">
          {monsters.length} monsters from the Systems Reference Document. All
          content is free to use under{" "}
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

        {/* Letter navigation */}
        <div className="flex flex-wrap gap-1 mb-8">
          {Array.from(grouped.keys()).map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 text-gray-300 text-sm hover:bg-orange-600 hover:text-white transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Monster grid by letter */}
        {Array.from(grouped.entries()).map(([letter, group]) => (
          <section key={letter} id={`letter-${letter}`} className="mb-8">
            <h2 className="text-xl font-bold text-orange-400 border-b border-gray-800 pb-1 mb-3 font-[family-name:var(--font-cinzel)]">
              {letter}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.map((m) => (
                <Link
                  key={m.id}
                  href={`/monsters/${toSlug(m.name)}`}
                  className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 hover:bg-gray-700/50 transition-colors group"
                >
                  <span className="text-gray-200 group-hover:text-white text-sm">
                    {m.name}
                  </span>
                  <span className="text-gray-500 text-xs">
                    CR {m.cr} · {m.type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/try"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-500 transition-colors"
          >
            Try the Combat Tracker — Free
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
        <p>
          SRD content used under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="underline hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC-BY-4.0
          </a>
          . D&D and Dungeons & Dragons are trademarks of Wizards of the Coast.
        </p>
        <p className="mt-1">
          <Link href="/" className="underline hover:text-gray-300">
            Pocket DM
          </Link>
        </p>
      </footer>
    </div>
  );
}
