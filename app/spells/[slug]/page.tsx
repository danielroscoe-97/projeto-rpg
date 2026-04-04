import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSrdSpellStaticParams,
  getSpellBySlug,
  getSrdSpells,
  toSlug,
  toSpellSlugPt,
  spellSlug,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellCard } from "@/components/public/PublicSpellCard";
import { PublicSpellSearch } from "@/components/public/PublicSpellSearch";
import { PublicCTA } from "@/components/public/PublicCTA";
import { SpellTierVotingMini } from "@/components/methodology/SpellTierVotingMini";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { getSpellTier } from "@/lib/srd/spell-tiers";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getSrdSpellStaticParams();
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
  const title = `${spell.name} — D&D 5e Spell`;
  const desc = spell.description ? spell.description.slice(0, 150) : "";
  const description = `${spell.name}, ${levelStr} ${spell.school}. ${spell.casting_time}, ${spell.range}.${desc ? ` ${desc}...` : ""}`;

  return {
    title,
    description,
    openGraph: { title: `${title} | Pocket DM`, description, type: "article", url: `https://www.pocketdm.com.br/spells/${slug}`, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pocket DM" }] },
    twitter: { card: "summary_large_image", title: `${title} | Pocket DM`, description, images: ["/opengraph-image"] },
    alternates: {
      canonical: `https://www.pocketdm.com.br/spells/${slug}`,
      languages: {
        en: `https://www.pocketdm.com.br/spells/${slug}`,
        "pt-BR": `https://www.pocketdm.com.br/magias/${toSpellSlugPt(toSlug(spell.name))}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function SpellJsonLd({ spell, slug }: { spell: NonNullable<ReturnType<typeof getSpellBySlug>>; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${spell.name} — D&D 5e Spell`,
    headline: `${spell.name} — D&D 5e Spell`,
    description: `${spell.name}. ${spell.description.slice(0, 200)}`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: { "@type": "Organization", name: "Pocket DM", url: "https://www.pocketdm.com.br" },
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Spells", item: "https://www.pocketdm.com.br/spells" },
      { "@type": "ListItem", position: 3, name: spell.name, item: `https://www.pocketdm.com.br/spells/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
    </>
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

  const tier = getSpellTier(slug);
  const t = await getTranslations("methodology");

  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user && !user.is_anonymous;
  } catch {}

  // Minimal data for the search bar
  const allSpells = getSrdSpells().map((s) => ({
    name: s.name,
    level: s.level,
    school: s.school,
    classes: s.classes ?? [],
    concentration: s.concentration,
    ritual: s.ritual,
  }));

  return (
    <>
      <SpellJsonLd spell={spell} slug={slug} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          breadcrumbs={[
            { label: "Spells", href: "/spells" },
            { label: spell.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          {/* Collapsible search */}
          <PublicSpellSearch spells={allSpells} />

          {/* Spell card with dice rollers */}
          <PublicSpellCard spell={spell} tier={tier} />

          {/* Community tier voting */}
          <SpellTierVotingMini
            spellName={spell.name}
            isLoggedIn={isLoggedIn}
            translations={{
              title: t("mini_vote_title"),
              confirm: t("mini_vote_confirm"),
              edit: t("mini_vote_edit"),
              save: t("mini_vote_save"),
              cancel: t("mini_vote_cancel"),
              vote_thanks: t("mini_vote_thanks"),
              vote_error: t("mini_vote_error"),
              login_to_vote: t("mini_vote_login"),
              votes_label: t("mini_vote_count"),
              voted_label: t("mini_vote_voted"),
            }}
          />

          {/* Two-box CTA */}
          <PublicCTA entityName={spell.name} />
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
    </>
  );
}
