import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicActionsGrid } from "@/components/public/PublicActionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Actions in Combat — Quick Reference",
  description:
    "Complete reference for all D&D 5e combat actions: Attack, Cast a Spell, Dash, Dodge, Disengage, Help, Hide, Ready, Search and more. Compare 2014 vs 2024 rules.",
  openGraph: {
    title: "D&D 5e Actions in Combat — Quick Reference",
    description:
      "Complete reference for all D&D 5e combat actions with 2014/2024 comparison.",
    type: "website",
    url: "/actions",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Actions in Combat — Quick Reference",
    description:
      "Complete reference for all D&D 5e combat actions with 2014/2024 comparison.",
  },
  alternates: {
    canonical: "/actions",
    languages: {
      en: "/actions",
      "pt-BR": "/acoes-em-combate",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ActionsJsonLd() {
  const actions = [
    "Attack",
    "Cast a Spell",
    "Dash",
    "Disengage",
    "Dodge",
    "Help",
    "Hide",
    "Ready",
    "Search",
    "Use an Object",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Actions in Combat",
    description:
      "All actions available during combat in Dungeons & Dragons 5th Edition",
    numberOfItems: actions.length,
    itemListElement: actions.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      url: siteUrl(`/actions#${name.toLowerCase().replace(/\s+/g, "-")}`),
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: siteUrl("/"),
    },
  };

  return (
    <script {...jsonLdScriptProps(jsonLd)} />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ActionsPage() {
  return (
    <>
      <ActionsJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Actions in Combat" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicActionsGrid locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Combat Actions" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
