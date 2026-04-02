import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getSrdSpellsDeduped,
  getSpellBySlug,
  toSlug,
} from "@/lib/srd/srd-data-server";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdSpellsDeduped().map((s) => ({ slug: toSlug(s.name) }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const spell = getSpellBySlug(slug);
  if (!spell) return { title: "Spell Not Found" };

  const levelStr = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;
  const title = `${spell.name} — D&D 5e Spell | Pocket DM`;
  const desc = spell.description ? spell.description.slice(0, 120) : "";
  const description = `${spell.name}, ${levelStr} ${spell.school}. ${spell.casting_time}, ${spell.range}.${desc ? ` ${desc}...` : ""}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article", url: `/spells/${slug}` },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `/spells/${slug}` },
  };
}

// ── Helpers ────────────────────────────────────────────────────────
function formatLevel(level: number): string {
  if (level === 0) return "Cantrip";
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${level}${suffixes[level] || "th"}-level`;
}

function SpellJsonLd({ spell }: { spell: NonNullable<ReturnType<typeof getSpellBySlug>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${spell.name} — D&D 5e Spell`,
    headline: `${spell.name} — D&D 5e Spell`,
    description: `${spell.name}, ${formatLevel(spell.level)} ${spell.school}. ${spell.description.slice(0, 200)}`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: { "@type": "Organization", name: "Pocket DM" },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function SpellPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spell = getSpellBySlug(slug);
  if (!spell) notFound();

  const levelSchool = spell.level === 0
    ? `${spell.school} cantrip`
    : `${formatLevel(spell.level)} ${spell.school.toLowerCase()}`;

  return (
    <>
      <SpellJsonLd spell={spell} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-orange-400 font-semibold font-[family-name:var(--font-cinzel)]">
              Pocket DM
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/spells" className="text-gray-400 hover:text-gray-200 text-sm">
              Spells
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-200 text-sm">{spell.name}</span>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-4 py-8">
          <article className="bg-srd-parchment text-srd-ink rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-srd-header px-6 py-4">
              <h1 className="text-2xl font-bold text-srd-parchment font-[family-name:var(--font-cinzel)]">
                {spell.name}
              </h1>
              <p className="text-srd-subtitle text-sm italic">
                {levelSchool}
                {spell.ritual ? " (ritual)" : ""}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Properties */}
              <div className="border-b-2 border-srd-header pb-3 space-y-1 text-sm">
                <p>
                  <strong className="text-srd-header">Casting Time</strong>{" "}
                  {spell.casting_time}
                </p>
                <p>
                  <strong className="text-srd-header">Range</strong>{" "}
                  {spell.range}
                </p>
                <p>
                  <strong className="text-srd-header">Components</strong>{" "}
                  {spell.components}
                </p>
                <p>
                  <strong className="text-srd-header">Duration</strong>{" "}
                  {spell.duration}
                  {spell.concentration ? " (concentration)" : ""}
                </p>
              </div>

              {/* Classes */}
              {spell.classes?.length > 0 && (
                <div className="border-b-2 border-srd-header pb-3 text-sm">
                  <p>
                    <strong className="text-srd-header">Classes</strong>{" "}
                    {spell.classes.join(", ")}
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {spell.description}
              </div>

              {/* At Higher Levels */}
              {spell.higher_levels && (
                <div className="text-sm">
                  <p>
                    <strong className="italic">At Higher Levels.</strong>{" "}
                    {spell.higher_levels}
                  </p>
                </div>
              )}
            </div>
          </article>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/try"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-white font-semibold hover:bg-orange-500 transition-colors"
            >
              Use in Combat Tracker
            </Link>
            <p className="mt-2 text-gray-400 text-sm">
              Free D&D 5e combat tracker — no signup required
            </p>
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
    </>
  );
}
