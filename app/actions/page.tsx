import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicActionsGrid } from "@/components/public/PublicActionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";

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
    url: "https://pocketdm.com.br/actions",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Actions in Combat — Quick Reference",
    description:
      "Complete reference for all D&D 5e combat actions with 2014/2024 comparison.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/actions",
    languages: {
      en: "https://pocketdm.com.br/actions",
      "pt-BR": "https://pocketdm.com.br/acoes-em-combate",
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
export default function ActionsPage() {
  return (
    <>
      <ActionsJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Actions in Combat" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicActionsGrid locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Combat Actions" locale="en" />
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
            {" "}&mdash; The combat tracker for D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
