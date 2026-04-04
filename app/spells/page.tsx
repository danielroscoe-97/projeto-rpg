import type { Metadata } from "next";
import { getSrdSpells } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellGrid } from "@/components/public/PublicSpellGrid";
import Link from "next/link";

export const metadata: Metadata = {
  title: "D&D 5e Spell Compendium — SRD Spell List",
  description:
    "Complete D&D 5e SRD spell compendium with descriptions, range, components, and damage. Filter by level, school, and class. Free to use.",
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

export default function SpellsIndexPage() {
  const spells = getSrdSpells()
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((s) => ({
      name: s.name,
      level: s.level,
      school: s.school,
      classes: s.classes ?? [],
      concentration: s.concentration,
      ritual: s.ritual,
      ruleset_version: s.ruleset_version,
      casting_time: s.casting_time,
      range: s.range,
      duration: s.duration,
      description: s.description?.slice(0, 200),
    }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      <PublicNav breadcrumbs={[{ label: "Spells" }]} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            D&amp;D 5e Spell Compendium
          </h1>
          <p className="text-gray-400 text-lg">
            {spells.length} spells with interactive dice rollers and tier
            ratings. All SRD content is free under{" "}
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

        <PublicSpellGrid spells={spells} />

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-br from-[#D4A853]/[0.06] to-gray-800/50 border border-[#D4A853]/10 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
            Track spells in combat
          </h2>
          <p className="text-gray-400 mb-5 max-w-lg mx-auto">
            Our free combat tracker lets you manage spell slots, concentration,
            and spell effects in real time — for every player at the table.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/try"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4A853] px-6 py-3 text-white font-semibold hover:bg-[#D4A853]/90 transition-colors"
            >
              Try Combat Tracker — Free
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4A853]/30 px-6 py-3 text-[#D4A853] font-semibold hover:bg-[#D4A853]/10 transition-colors"
            >
              Create Free Account
            </Link>
          </div>
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
          . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of the Coast.
        </p>
        <p className="mt-1">
          <a href="https://www.pocketdm.com.br" className="underline hover:text-gray-300">
            Pocket DM
          </a>
          {" "}— The combat tracker for D&amp;D 5e
        </p>
      </footer>
    </div>
  );
}
