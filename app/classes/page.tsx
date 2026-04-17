import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassesIndex } from "@/components/public/PublicClassesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getAllClassesFull } from "@/lib/srd/class-data-server";
import { collectionPageLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Classes — SRD Class Reference",
  description:
    "Complete reference for all 12 D&D 5e SRD classes: Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, and Wizard. Hit dice, proficiencies, saving throws, and subclasses.",
  openGraph: {
    title: "D&D 5e Classes — SRD Class Reference",
    description:
      "All 12 SRD classes with hit dice, proficiencies, and subclasses. Free reference.",
    type: "website",
    url: "/classes",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Classes — SRD Class Reference",
    description:
      "All 12 SRD classes with hit dice, proficiencies, and subclasses.",
  },
  alternates: {
    canonical: "/classes",
    languages: {
      en: "/classes",
      "pt-BR": "/classes-pt",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassesJsonLd() {
  const classes = getAllClassesFull();

  const jsonLd = collectionPageLd({
    name: "D&D 5e Classes",
    description: "All 12 classes in the Dungeons & Dragons 5th Edition Systems Reference Document",
    path: "/classes",
    locale: "en",
    items: classes.map((c) => ({ name: c.name, path: `/classes/${c.id}` })),
  });
  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Classes", path: "/classes" },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClassesIndexPage() {
  const classes = getAllClassesFull();

  return (
    <>
      <ClassesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Classes" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicClassesIndex classes={classes} locale="en" />

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href="/classes-pt" className="text-gold hover:underline">
              Português
            </Link>
          </p>

          <div className="mt-8">
            <PublicCTA entityName="D&D 5e Classes" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
