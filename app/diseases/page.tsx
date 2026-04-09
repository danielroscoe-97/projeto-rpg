import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDiseasesGrid } from "@/components/public/PublicDiseasesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/data/srd/conditions.json";

// -- Metadata -----------------------------------------------------------------
export const metadata: Metadata = {
  title: "D&D 5e Diseases — Reference",
  description:
    "Complete reference for D&D 5e diseases: Cackle Fever, Sewer Plague, Sight Rot, and more. Compare 2014 vs 2024 rules side by side.",
  openGraph: {
    title: "D&D 5e Diseases — Reference",
    description:
      "Complete reference for all D&D 5e diseases with 2014/2024 comparison.",
    type: "website",
    url: "https://pocketdm.com.br/diseases",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Diseases — Reference",
    description:
      "Complete reference for all D&D 5e diseases with 2014/2024 comparison.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/diseases",
    languages: {
      en: "https://pocketdm.com.br/diseases",
      "pt-BR": "https://pocketdm.com.br/doencas",
    },
  },
};

export const revalidate = 86400;

// -- JSON-LD ------------------------------------------------------------------
function DiseasesJsonLd() {
  const diseases = (
    conditionsData as Array<{
      name: string;
      category: string;
      ruleset_version: string;
    }>
  ).filter((c) => c.category === "disease" && c.ruleset_version === "2014");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "D&D 5e Diseases",
    description: "Diseases, plagues, and afflictions in Dungeons & Dragons 5th Edition",
    numberOfItems: diseases.length,
    itemListElement: diseases.map((c, i) => ({
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

// -- Page ---------------------------------------------------------------------
export default function DiseasesPage() {
  const diseases = conditionsData as Array<{
    id: string;
    name: string;
    description: string;
    source?: string;
    ruleset_version: "2014" | "2024";
    category: "condition" | "status" | "disease";
  }>;

  return (
    <>
      <DiseasesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav breadcrumbs={[{ label: "Diseases" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDiseasesGrid diseases={diseases} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Diseases" locale="en" />
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
