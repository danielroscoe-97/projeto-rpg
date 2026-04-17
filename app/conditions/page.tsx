import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicConditionsGrid } from "@/components/public/PublicConditionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/data/srd/conditions.json";
import { PublicFooter } from "@/components/public/PublicFooter";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Conditions — Quick Reference",
  description:
    "Complete reference for all D&D 5e conditions: Blinded, Charmed, Frightened, Paralyzed, Stunned, and more. Compare 2014 vs 2024 rules side by side.",
  openGraph: {
    title: "D&D 5e Conditions — Quick Reference",
    description:
      "Complete reference for all D&D 5e conditions with 2014/2024 comparison.",
    type: "website",
    url: "/conditions",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Conditions — Quick Reference",
    description:
      "Complete reference for all D&D 5e conditions with 2014/2024 comparison.",
  },
  alternates: {
    canonical: "/conditions",
    languages: {
      en: "/conditions",
      "pt-BR": "/condicoes",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ConditionsJsonLd() {
  const conditions = (conditionsData as Array<{ id: string; name: string; category: string; ruleset_version: string }>)
    .filter((c) => c.category === "condition" && c.ruleset_version === "2024");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Conditions",
    description: "All conditions in Dungeons & Dragons 5th Edition",
    numberOfItems: conditions.length,
    itemListElement: conditions.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: siteUrl(`/conditions#${c.id}`),
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
export default function ConditionsPage() {
  const conditions = conditionsData as Array<{
    id: string;
    name: string;
    description: string;
    ruleset_version: "2014" | "2024";
    category: "condition" | "status" | "disease";
  }>;

  return (
    <>
      <ConditionsJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[{ label: "Conditions" }]}
        />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicConditionsGrid conditions={conditions} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Conditions" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
