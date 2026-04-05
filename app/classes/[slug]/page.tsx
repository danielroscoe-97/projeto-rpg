import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassDetail } from "@/components/public/PublicClassDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import classesData from "@/data/srd/classes-srd.json";
import type { SrdClass } from "@/lib/types/srd-class";

const classes = classesData as SrdClass[];

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return classes.map((c) => ({ slug: c.id }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cls = classes.find((c) => c.id === slug);
  if (!cls) return { title: "Class Not Found" };

  const title = `${cls.name} — D&D 5e Class`;
  const description = `${cls.name}: ${cls.description_en} Hit Die: ${cls.hit_die}. Primary Ability: ${cls.primary_ability}. SRD Subclass: ${cls.srd_subclass}.`;

  return {
    title,
    description,
    keywords: [
      `${cls.name} 5e`,
      `D&D ${cls.name}`,
      `${cls.name} class`,
      `${cls.name} hit die`,
      `${cls.srd_subclass}`,
      "D&D 5e classes",
      "SRD class",
    ],
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://www.pocketdm.com.br/classes/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://www.pocketdm.com.br/classes/${slug}`,
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassJsonLd({ cls }: { cls: SrdClass }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${cls.name} — D&D 5e Class`,
    headline: `${cls.name} — D&D 5e Class`,
    description: `${cls.name}: ${cls.description_en}`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
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
export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cls = classes.find((c) => c.id === slug);
  if (!cls) notFound();

  return (
    <>
      <ClassJsonLd cls={cls} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          breadcrumbs={[
            { label: "Classes", href: "/classes" },
            { label: cls.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicClassDetail cls={cls} locale="en" />

          <div className="mt-8">
            <PublicCTA entityName={cls.name} locale="en" />
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
              href="https://www.pocketdm.com.br"
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
