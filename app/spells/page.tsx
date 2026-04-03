import Link from "next/link";
import type { Metadata } from "next";
import { getSrdSpells, toSlug } from "@/lib/srd/srd-data-server";

export const metadata: Metadata = {
  title: "D&D 5e Spell Compendium — SRD Spell List | Pocket DM",
  description:
    "Complete D&D 5e SRD spell compendium with descriptions, range, components, and damage. Search by school, level, or class. Free to use.",
  keywords: [
    "D&D 5e spells",
    "dnd spell list",
    "SRD spells",
    "5e spell compendium",
    "D&D spell reference",
    "magias D&D 5e",
  ],
  alternates: {
    canonical: "https://www.pocketdm.com.br/spells",
  },
};

export const revalidate = 86400;

function formatLevel(level: number): string {
  if (level === 0) return "Cantrip";
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${level}${suffixes[level] || "th"}`;
}

const SCHOOL_COLORS: Record<string, string> = {
  Abjuration: "text-blue-400",
  Conjuration: "text-yellow-400",
  Divination: "text-purple-400",
  Enchantment: "text-pink-400",
  Evocation: "text-red-400",
  Illusion: "text-indigo-400",
  Necromancy: "text-green-400",
  Transmutation: "text-orange-400",
};

export default function SpellsIndexPage() {
  const spells = getSrdSpells().sort((a, b) => a.name.localeCompare(b.name));

  // Group by level
  const byLevel = new Map<number, typeof spells>();
  for (const s of spells) {
    if (!byLevel.has(s.level)) byLevel.set(s.level, []);
    byLevel.get(s.level)!.push(s);
  }
  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-orange-400 font-semibold font-[family-name:var(--font-cinzel)]">
            Pocket DM
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-200 text-sm">Spells</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
          D&D 5e SRD Spells
        </h1>
        <p className="text-gray-400 mb-8">
          {spells.length} spells from the Systems Reference Document. Free under{" "}
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

        {/* Level navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {levels.map((level) => (
            <a
              key={level}
              href={`#level-${level}`}
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 text-sm hover:bg-orange-600 hover:text-white transition-colors"
            >
              {level === 0 ? "Cantrips" : `${formatLevel(level)} Level`}
            </a>
          ))}
        </div>

        {/* Spells by level */}
        {levels.map((level) => (
          <section key={level} id={`level-${level}`} className="mb-8">
            <h2 className="text-xl font-bold text-orange-400 border-b border-gray-800 pb-1 mb-3 font-[family-name:var(--font-cinzel)]">
              {level === 0 ? "Cantrips" : `${formatLevel(level)}-Level Spells`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {byLevel.get(level)!.map((s) => (
                <Link
                  key={s.id}
                  href={`/spells/${toSlug(s.name)}`}
                  className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 hover:bg-gray-700/50 transition-colors group"
                >
                  <span className="text-gray-200 group-hover:text-white text-sm">
                    {s.name}
                    {s.ritual && (
                      <span className="ml-1 text-xs text-gray-500">(R)</span>
                    )}
                    {s.concentration && (
                      <span className="ml-1 text-xs text-gray-500">(C)</span>
                    )}
                  </span>
                  <span
                    className={`text-xs ${SCHOOL_COLORS[s.school] || "text-gray-500"}`}
                  >
                    {s.school}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

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
