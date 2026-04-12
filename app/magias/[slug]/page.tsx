import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSrdSpellsDeduped,
  getSpellBySlugPt,
  getSrdSpells,
  toSlug,
  toSpellSlugPt,
  getSpellNamePt,
  getSpellDescriptionPt,
  getSpellHigherLevelsPt,
} from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSpellCard } from "@/components/public/PublicSpellCard";
import { PublicSpellSearch } from "@/components/public/PublicSpellSearch";
import { PublicCTA } from "@/components/public/PublicCTA";
import { SpellTierVotingMini } from "@/components/methodology/SpellTierVotingMini";
import { PublicFooter } from "@/components/public/PublicFooter";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
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
  const ptName = getSpellNamePt(enSlug, spell.name);
  const levelStr = spell.level === 0 ? "Truque" : `Nível ${spell.level}`;
  const title = `${ptName} — Magia D&D 5e`;
  const ptDesc = getSpellDescriptionPt(enSlug);
  const description = `${ptName}, ${levelStr} de ${spell.school}. ${spell.casting_time}, alcance ${spell.range}.${(ptDesc ?? spell.description) ? ` ${(ptDesc ?? spell.description).slice(0, 120)}...` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/magias/${slug}`,
    },
    twitter: { card: "summary_large_image", title: `${title} | Pocket DM`, description },
    alternates: {
      canonical: `https://pocketdm.com.br/magias/${slug}`,
      languages: {
        "en": `https://pocketdm.com.br/spells/${enSlug}`,
        "pt-BR": `https://pocketdm.com.br/magias/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function SpellJsonLd({ spell, slug, ptName }: { spell: NonNullable<ReturnType<typeof getSpellBySlugPt>>; slug: string; ptName: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${ptName} — Magia D&D 5e`,
    headline: `${ptName} — Magia D&D 5e`,
    description: `${ptName}. ${spell.description.slice(0, 200)}`,
    image: `https://pocketdm.com.br/magias/${slug}/opengraph-image`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
    inLanguage: "pt-BR",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Magias", item: "https://pocketdm.com.br/magias" },
      { "@type": "ListItem", position: 3, name: ptName, item: `https://pocketdm.com.br/magias/${slug}` },
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
export default async function MagiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spell = getSpellBySlugPt(slug);
  if (!spell) notFound();

  const enSlug = toSlug(spell.name);
  const ptName = getSpellNamePt(enSlug, spell.name);
  const tier = getSpellTier(enSlug);
  const t = await getTranslations("methodology");

  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isLoggedIn = !!user && !user.is_anonymous;
  } catch {}

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
      <SpellJsonLd spell={spell} slug={slug} ptName={ptName} />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Magias", href: "/magias" },
            { label: ptName },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          {/* Collapsible search */}
          <PublicSpellSearch
            spells={allSpells}
            basePath="/magias"
            buttonLabel="Buscar mais magias"
          />

          {/* Spell card with dice rollers — PT-translated */}
          <PublicSpellCard
            spell={{
              ...spell,
              name: getSpellNamePt(enSlug, spell.name),
              description: getSpellDescriptionPt(enSlug) ?? spell.description,
              higher_levels: getSpellHigherLevelsPt(enSlug) ?? spell.higher_levels,
            }}
            tier={tier}
            locale="pt-BR"
          />

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
          <PublicCTA entityName={spell.name} locale="pt-BR" compendiumHref="/app/compendium?tab=spells" />

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href={`/spells/${enSlug}`} className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
