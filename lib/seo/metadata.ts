import type { Metadata } from "next";
import type { SrdMonster, SrdSpell, SrdFeat, SrdBackground, SrdItem } from "@/lib/srd/srd-loader";
import { siteUrl, SITE_URL } from "./site-url";

type Locale = "en" | "pt-BR";

/**
 * Build a Metadata object for a detail page. Centralizes canonical,
 * hreflang, OpenGraph, and Twitter tags so every SRD route stays consistent.
 *
 * - `path`: canonical path on current locale (e.g. "/monsters/axe-beak")
 * - `alternatePath`: the same page on the other locale (e.g. "/monstros/bico-de-machado")
 * - `locale`: which locale this page is
 *
 * Canonical always resolves via `metadataBase` (set in app/layout.tsx) so
 * URLs move with the canonical domain if it ever changes.
 */
export function buildMetadata({
  title,
  description,
  path,
  alternatePath,
  locale,
}: {
  title: string;
  description: string;
  path: string;
  alternatePath?: string;
  locale: Locale;
}): Metadata {
  const canonical = path;
  const ogLocale = locale === "pt-BR" ? "pt_BR" : "en_US";
  const altLocale = locale === "pt-BR" ? "en" : "pt-BR";

  const languages: Record<string, string> = { [locale]: path };
  if (alternatePath) languages[altLocale] = alternatePath;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: path,
      locale: ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
  };
}

// ── Monster ────────────────────────────────────────────────────────────
export function monsterMetadata(
  monster: SrdMonster,
  opts: { slug: string; ptSlug: string; ptName?: string; locale: Locale },
): Metadata {
  const { slug, ptSlug, ptName, locale } = opts;
  const displayName = locale === "pt-BR" && ptName ? ptName : monster.name;

  const title =
    locale === "pt-BR"
      ? `${displayName} — CR ${monster.cr} Ficha D&D 5e`
      : `${displayName} — CR ${monster.cr} D&D 5e Stat Block`;

  const sizeType = [monster.size, monster.type].filter(Boolean).join(" ");
  const description =
    locale === "pt-BR"
      ? `Ficha de ${displayName}: ${sizeType}, CA ${monster.armor_class}, PV ${monster.hit_points}, CR ${monster.cr}. Rolador de dados interativo. Bestiário D&D 5e grátis.`
      : `${displayName} stat block: ${sizeType}, AC ${monster.armor_class}, HP ${monster.hit_points}, CR ${monster.cr}. Interactive dice roller. Free D&D 5e bestiary.`;

  return buildMetadata({
    title,
    description,
    path: locale === "pt-BR" ? `/monstros/${ptSlug}` : `/monsters/${slug}`,
    alternatePath: locale === "pt-BR" ? `/monsters/${slug}` : `/monstros/${ptSlug}`,
    locale,
  });
}

// ── Spell ──────────────────────────────────────────────────────────────
const SCHOOL_PT: Record<string, string> = {
  abjuration: "Abjuração",
  conjuration: "Conjuração",
  divination: "Adivinhação",
  enchantment: "Encantamento",
  evocation: "Evocação",
  illusion: "Ilusão",
  necromancy: "Necromancia",
  transmutation: "Transmutação",
};

export function spellMetadata(
  spell: SrdSpell,
  opts: { slug: string; ptSlug: string; ptName?: string; locale: Locale },
): Metadata {
  const { slug, ptSlug, ptName, locale } = opts;
  const displayName = locale === "pt-BR" && ptName ? ptName : spell.name;
  const schoolLower = spell.school.toLowerCase();
  const schoolPt = SCHOOL_PT[schoolLower] ?? spell.school;

  const levelLabel =
    locale === "pt-BR"
      ? spell.level === 0
        ? "Truque"
        : `Magia Nível ${spell.level}`
      : spell.level === 0
        ? "Cantrip"
        : `Level ${spell.level}`;

  const title =
    locale === "pt-BR"
      ? `${displayName} — ${levelLabel} ${schoolPt} D&D 5e`
      : `${displayName} — ${levelLabel} ${spell.school} D&D 5e Spell`;

  const descSnippet = spell.description ? spell.description.slice(0, 110).replace(/\s+/g, " ").trim() : "";

  const description =
    locale === "pt-BR"
      ? `${displayName} D&D 5e: ${levelLabel.toLowerCase()} ${schoolPt.toLowerCase()}, ${spell.casting_time}, ${spell.range}.${descSnippet ? ` ${descSnippet}...` : ""}`
      : `${displayName} 5e: ${levelLabel.toLowerCase()} ${spell.school.toLowerCase()}, ${spell.casting_time}, ${spell.range}.${descSnippet ? ` ${descSnippet}...` : ""}`;

  return buildMetadata({
    title,
    description: description.slice(0, 300),
    path: locale === "pt-BR" ? `/magias/${ptSlug}` : `/spells/${slug}`,
    alternatePath: locale === "pt-BR" ? `/spells/${slug}` : `/magias/${ptSlug}`,
    locale,
  });
}

// ── Feat ───────────────────────────────────────────────────────────────
export function featMetadata(
  feat: SrdFeat,
  opts: { slug: string; ptName?: string; locale: Locale },
): Metadata {
  const { slug, ptName, locale } = opts;
  const displayName = locale === "pt-BR" && ptName ? ptName : feat.name;

  const title =
    locale === "pt-BR"
      ? `${displayName} — Talento D&D 5e`
      : `${displayName} — D&D 5e Feat`;

  const descSnippet = feat.description ? feat.description.slice(0, 130).replace(/\s+/g, " ").trim() : "";
  const description =
    locale === "pt-BR"
      ? `Talento ${displayName} D&D 5e.${descSnippet ? ` ${descSnippet}...` : ""}${feat.prerequisite ? ` Pré-requisito: ${feat.prerequisite}.` : ""}`
      : `${displayName} D&D 5e feat.${descSnippet ? ` ${descSnippet}...` : ""}${feat.prerequisite ? ` Prerequisite: ${feat.prerequisite}.` : ""}`;

  return buildMetadata({
    title,
    description: description.slice(0, 300),
    path: locale === "pt-BR" ? `/talentos/${slug}` : `/feats/${slug}`,
    alternatePath: locale === "pt-BR" ? `/feats/${slug}` : `/talentos/${slug}`,
    locale,
  });
}

// ── Background ─────────────────────────────────────────────────────────
export function backgroundMetadata(
  bg: SrdBackground,
  opts: { slug: string; ptName?: string; locale: Locale },
): Metadata {
  const { slug, ptName, locale } = opts;
  const displayName = locale === "pt-BR" && ptName ? ptName : bg.name;

  const title =
    locale === "pt-BR"
      ? `${displayName} — Antecedente D&D 5e`
      : `${displayName} — D&D 5e Background`;

  const descSnippet = bg.description ? bg.description.slice(0, 140).replace(/\s+/g, " ").trim() : "";
  const description =
    locale === "pt-BR"
      ? `Antecedente ${displayName} D&D 5e.${descSnippet ? ` ${descSnippet}...` : ""}`
      : `${displayName} D&D 5e background.${descSnippet ? ` ${descSnippet}...` : ""}`;

  return buildMetadata({
    title,
    description: description.slice(0, 300),
    path: locale === "pt-BR" ? `/antecedentes/${slug}` : `/backgrounds/${slug}`,
    alternatePath: locale === "pt-BR" ? `/backgrounds/${slug}` : `/antecedentes/${slug}`,
    locale,
  });
}

// ── Item ───────────────────────────────────────────────────────────────
export function itemMetadata(
  item: SrdItem,
  opts: { slug: string; ptName?: string; locale: Locale },
): Metadata {
  const { slug, ptName, locale } = opts;
  const displayName = locale === "pt-BR" && ptName ? ptName : item.name;

  const title =
    locale === "pt-BR"
      ? `${displayName} — Item D&D 5e`
      : `${displayName} — D&D 5e Item`;

  const description =
    locale === "pt-BR"
      ? `${displayName} D&D 5e: ${item.type}, raridade ${item.rarity}. Guia completo de itens mágicos e equipamentos.`
      : `${displayName} D&D 5e: ${item.type}, ${item.rarity} rarity. Complete guide to magic items and equipment.`;

  return buildMetadata({
    title,
    description: description.slice(0, 300),
    path: locale === "pt-BR" ? `/itens/${slug}` : `/items/${slug}`,
    alternatePath: locale === "pt-BR" ? `/items/${slug}` : `/itens/${slug}`,
    locale,
  });
}

// ── JSON-LD helpers (consume SITE_URL) ─────────────────────────────────
export function orgNode() {
  return {
    "@type": "Organization",
    name: "Pocket DM",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: siteUrl("/icons/icon-512.png") },
  };
}

export function breadcrumbList(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: i.name,
      item: siteUrl(i.path),
    })),
  };
}

export function articleLd({
  name,
  description,
  path,
  imagePath,
  locale,
}: {
  name: string;
  description: string;
  path: string;
  imagePath: string;
  locale: Locale;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: name,
    description,
    image: siteUrl(imagePath),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: orgNode(),
    inLanguage: locale,
    mainEntityOfPage: siteUrl(path),
  };
}

// ── WebSite + Organization + WebApplication (homepage) ────────────────
export function websiteLd({
  description,
  searchPath,
}: {
  description?: string;
  searchPath?: string;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pocket DM",
    alternateName: "Pocket DM — Combat Tracker D&D 5e",
    url: SITE_URL,
  };
  if (description) node.description = description;
  if (searchPath) {
    node.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: siteUrl(`${searchPath}?q={search_term_string}`),
      },
      "query-input": "required name=search_term_string",
    };
  }
  return node;
}

export function organizationLd({
  description,
  sameAs,
}: {
  description?: string;
  sameAs?: string[];
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pocket DM",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: siteUrl("/icons/icon-512.png") },
  };
  if (description) node.description = description;
  if (sameAs && sameAs.length > 0) node.sameAs = sameAs;
  return node;
}

export function webApplicationLd({
  description,
  featureList,
}: {
  description?: string;
  featureList?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pocket DM",
    url: SITE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    ...(description ? { description } : {}),
    ...(featureList ? { featureList } : {}),
  };
}

// ── CollectionPage (compendium indexes) ───────────────────────────────
export function collectionPageLd({
  name,
  description,
  path,
  locale,
  items,
}: {
  name: string;
  description: string;
  path: string;
  locale: Locale;
  items: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: siteUrl(path),
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      // Must match itemListElement.length — Google flags mismatches as
      // structured-data incoherence. We cap at 10 items to keep schemas
      // SERP-sized; total collection size is not required.
      numberOfItems: Math.min(items.length, 10),
      itemListElement: items.slice(0, 10).map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: it.name,
        url: siteUrl(it.path),
      })),
    },
  };
}

// ── FAQPage ───────────────────────────────────────────────────────────
export function faqPageLd({
  questions,
  description,
}: {
  questions: Array<{ question: string; answer: string }>;
  description?: string;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
  if (description) node.description = description;
  return node;
}

// ── JSON-LD script renderer ───────────────────────────────────────────
/**
 * Return props for a JSON-LD <script> tag with consistent XSS-safe escaping.
 * Always use this rather than inline `dangerouslySetInnerHTML` — every caller
 * forgetting the `</` escape creates a latent script-injection risk.
 *
 * Usage: `<script {...jsonLdScriptProps(myLd)} />`
 */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json" as const,
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  };
}
