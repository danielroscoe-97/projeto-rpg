import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getSrdMonstersDeduped,
  getMonsterBySlug,
  toSlug,
} from "@/lib/srd/srd-data-server";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdMonstersDeduped().map((m) => ({ slug: toSlug(m.name) }));
}

export const revalidate = 86400; // ISR: revalidate every 24h

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) return { title: "Monster Not Found" };

  const title = `${monster.name} — D&D 5e Stat Block | Pocket DM`;
  const description = `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}. Full stat block and combat tracker.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/monsters/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `/monsters/${slug}`,
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────
function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function formatSpeed(speed: Record<string, string | number> | undefined): string {
  if (!speed) return "30 ft.";
  return Object.entries(speed)
    .map(([k, v]) => (k === "walk" ? String(v) : `${k} ${v}`))
    .join(", ");
}

// ── JSON-LD structured data ────────────────────────────────────────
function MonsterJsonLd({ monster }: { monster: NonNullable<ReturnType<typeof getMonsterBySlug>> }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${monster.name} — D&D 5e Stat Block`,
    headline: `${monster.name} — D&D 5e Stat Block`,
    description: `${monster.name}, ${monster.size} ${monster.type}, CR ${monster.cr}. AC ${monster.armor_class}, HP ${monster.hit_points}.`,
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
export default async function MonsterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) notFound();

  const abilities = [
    { label: "STR", value: monster.str ?? 10 },
    { label: "DEX", value: monster.dex ?? 10 },
    { label: "CON", value: monster.con ?? 10 },
    { label: "INT", value: monster.int ?? 10 },
    { label: "WIS", value: monster.wis ?? 10 },
    { label: "CHA", value: monster.cha ?? 10 },
  ];

  const savingThrows = monster.saving_throws
    ? Object.entries(monster.saving_throws)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
        .join(", ")
    : null;

  const skills = monster.skills
    ? Object.entries(monster.skills)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
        .join(", ")
    : null;

  return (
    <>
      <MonsterJsonLd monster={monster} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        {/* Nav bar */}
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
            <Link href="/" className="text-orange-400 font-semibold font-[family-name:var(--font-cinzel)]">
              Pocket DM
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/monsters" className="text-gray-400 hover:text-gray-200 text-sm">
              Monsters
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-gray-200 text-sm">{monster.name}</span>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Stat block card */}
          <article className="bg-srd-parchment text-srd-ink rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-srd-header px-6 py-4">
              <h1 className="text-2xl font-bold text-srd-parchment font-[family-name:var(--font-cinzel)]">
                {monster.name}
              </h1>
              <p className="text-srd-subtitle text-sm italic">
                {monster.size} {monster.type}
                {monster.alignment ? `, ${monster.alignment}` : ""}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Basic stats */}
              <div className="border-b-2 border-srd-header pb-3 space-y-1 text-sm">
                <p>
                  <strong className="text-srd-header">Armor Class</strong>{" "}
                  {monster.armor_class}
                </p>
                <p>
                  <strong className="text-srd-header">Hit Points</strong>{" "}
                  {monster.hit_points}
                  {monster.hp_formula ? ` (${monster.hp_formula})` : ""}
                </p>
                <p>
                  <strong className="text-srd-header">Speed</strong>{" "}
                  {formatSpeed(monster.speed)}
                </p>
              </div>

              {/* Ability scores */}
              <div className="border-b-2 border-srd-header pb-3">
                <div className="grid grid-cols-6 gap-2 text-center text-sm">
                  {abilities.map((a) => (
                    <div key={a.label}>
                      <div className="font-bold text-srd-header">{a.label}</div>
                      <div>
                        {a.value} ({abilityMod(a.value)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Properties */}
              <div className="border-b-2 border-srd-header pb-3 space-y-1 text-sm">
                {savingThrows && (
                  <p>
                    <strong className="text-srd-header">Saving Throws</strong>{" "}
                    {savingThrows}
                  </p>
                )}
                {skills && (
                  <p>
                    <strong className="text-srd-header">Skills</strong> {skills}
                  </p>
                )}
                {monster.damage_vulnerabilities && (
                  <p>
                    <strong className="text-srd-header">Damage Vulnerabilities</strong>{" "}
                    {monster.damage_vulnerabilities}
                  </p>
                )}
                {monster.damage_resistances && (
                  <p>
                    <strong className="text-srd-header">Damage Resistances</strong>{" "}
                    {monster.damage_resistances}
                  </p>
                )}
                {monster.damage_immunities && (
                  <p>
                    <strong className="text-srd-header">Damage Immunities</strong>{" "}
                    {monster.damage_immunities}
                  </p>
                )}
                {monster.condition_immunities && (
                  <p>
                    <strong className="text-srd-header">Condition Immunities</strong>{" "}
                    {monster.condition_immunities}
                  </p>
                )}
                {monster.senses && (
                  <p>
                    <strong className="text-srd-header">Senses</strong>{" "}
                    {monster.senses}
                  </p>
                )}
                {monster.languages && (
                  <p>
                    <strong className="text-srd-header">Languages</strong>{" "}
                    {monster.languages}
                  </p>
                )}
                <p>
                  <strong className="text-srd-header">Challenge</strong>{" "}
                  {monster.cr}
                  {monster.xp ? ` (${monster.xp.toLocaleString()} XP)` : ""}
                </p>
              </div>

              {/* Special abilities */}
              {monster.special_abilities && monster.special_abilities.length > 0 && (
                <div className="space-y-2 text-sm">
                  {monster.special_abilities.map((ability, i) => (
                    <p key={i}>
                      <strong className="italic">{ability.name}.</strong>{" "}
                      {ability.desc}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              {monster.actions && monster.actions.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-srd-header border-b border-srd-header pb-1 font-[family-name:var(--font-cinzel)]">
                    Actions
                  </h2>
                  {monster.actions.map((action, i) => (
                    <p key={i} className="text-sm">
                      <strong className="italic">{action.name}.</strong>{" "}
                      {action.desc}
                    </p>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {monster.reactions && monster.reactions.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-srd-header border-b border-srd-header pb-1 font-[family-name:var(--font-cinzel)]">
                    Reactions
                  </h2>
                  {monster.reactions.map((reaction, i) => (
                    <p key={i} className="text-sm">
                      <strong className="italic">{reaction.name}.</strong>{" "}
                      {reaction.desc}
                    </p>
                  ))}
                </div>
              )}

              {/* Legendary Actions */}
              {monster.legendary_actions && monster.legendary_actions.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-srd-header border-b border-srd-header pb-1 font-[family-name:var(--font-cinzel)]">
                    Legendary Actions
                  </h2>
                  {monster.legendary_actions.map((la, i) => (
                    <p key={i} className="text-sm">
                      <strong className="italic">{la.name}.</strong> {la.desc}
                    </p>
                  ))}
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

        {/* Footer */}
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
            . D&D and Dungeons & Dragons are trademarks of Wizards of the Coast.
          </p>
          <p className="mt-1">
            <Link href="/" className="underline hover:text-gray-300">
              Pocket DM
            </Link>{" "}
            — The combat tracker for D&D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
