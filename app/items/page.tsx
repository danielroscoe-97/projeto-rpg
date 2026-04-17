import Link from "next/link";
import type { Metadata } from "next";
import { getSrdItems, getItemPtNameMap, toSlug } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicItemGrid } from "@/components/public/PublicItemGrid";
import { PublicFooter } from "@/components/public/PublicFooter";
import { collectionPageLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "D&D 5e Items Compendium — SRD Equipment & Magic Items",
  description:
    "Complete D&D 5e SRD item compendium — weapons, armor, magic items, potions, and adventuring gear. Search and filter by type and rarity. Free under CC-BY-4.0.",
  keywords: [
    "D&D 5e items",
    "dnd magic items",
    "SRD items",
    "D&D equipment",
    "5e weapons",
    "5e armor",
    "D&D potions",
    "D&D adventuring gear",
  ],
  alternates: {
    canonical: "/items",
    languages: {
      en: "/items",
      "pt-BR": "/itens",
    },
  },
  openGraph: {
    title: "D&D 5e Items Compendium — SRD Equipment & Magic Items",
    description:
      "Complete D&D 5e SRD item compendium — weapons, armor, magic items, potions, and adventuring gear. Search and filter by type and rarity.",
    type: "website",
    url: "/items",
  },
};

export const revalidate = 86400;

export default function ItemsIndexPage() {
  const ptNameMap = getItemPtNameMap();
  const items = getSrdItems()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
      namePt: ptNameMap[toSlug(item.name)] ?? item.name,
      type: item.type,
      rarity: item.rarity,
      isMagic: item.isMagic,
      value: item.value,
      weight: item.weight,
      entries: item.entries,
      reqAttune: item.reqAttune,
      edition: item.edition,
      ac: item.ac,
      dmg1: item.dmg1,
      dmgType: item.dmgType,
      property: item.property,
      range: item.range,
      weaponCategory: item.weaponCategory,
      charges: item.charges,
      recharge: item.recharge,
      bonusWeapon: item.bonusWeapon,
      bonusAc: item.bonusAc,
      curse: item.curse,
      sentient: item.sentient,
    }));

  const jsonLd = collectionPageLd({
    name: "D&D 5e Items Compendium",
    description:
      "Complete D&D 5e SRD item compendium with weapons, armor, magic items, and adventuring gear.",
    path: "/items",
    locale: "en",
    items: items.map((it) => ({ name: it.name, path: `/items/${it.id}` })),
  });
  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Items", path: "/items" },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Items" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              D&amp;D 5e Items Compendium
            </h1>
            <p className="text-gray-400 text-lg">
              {items.length} items — weapons, armor, magic items, and
              adventuring gear. All SRD content free under{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline hover:text-gray-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC-BY-4.0
              </a>
              .
            </p>
          </div>

          {/* Interactive grid with filters */}
          <PublicItemGrid items={items} />

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              Use any item in combat
            </h2>
            <p className="text-gray-400 mb-5 max-w-lg mx-auto">
              Add items and equipment to our free combat tracker. Track
              inventory, potions, and magic items during your sessions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/try"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-gray-950 font-semibold hover:bg-gold/90 transition-colors"
              >
                Try Combat Tracker — Free
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-6 py-3 text-gold font-semibold hover:bg-gold/10 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
