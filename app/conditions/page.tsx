import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicConditionsGrid } from "@/components/public/PublicConditionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/data/srd/conditions.json";

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
    url: "https://pocketdm.com.br/conditions",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Conditions — Quick Reference",
    description:
      "Complete reference for all D&D 5e conditions with 2014/2024 comparison.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/conditions",
    languages: {
      en: "https://pocketdm.com.br/conditions",
      "pt-BR": "https://pocketdm.com.br/condicoes",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ConditionsJsonLd() {
  const conditions = (conditionsData as Array<{ name: string; category: string; ruleset_version: string }>)
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
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
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

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          breadcrumbs={[{ label: "Conditions" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicConditionsGrid conditions={conditions} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Conditions" locale="en" />
          </div>
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
            . D&amp;D and Dungeons &amp; Dragons are trademarks of Wizards of
            the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}— The combat tracker for D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
