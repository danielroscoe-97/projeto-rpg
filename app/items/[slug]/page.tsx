import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicItemDetail } from "@/components/public/PublicItemDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdItems, getItemBySlug } from "@/lib/srd/srd-data-server";

// Only generate the first 200 statically; the rest are on-demand ISR.
export function generateStaticParams() {
  return getSrdItems()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 200)
    .map((i) => ({ slug: i.id }));
}

export const dynamicParams = true;
export const revalidate = 86400;

function formatTypeName(type: string): string {
  return type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) return { title: "Item Not Found" };

  const title = `${item.name} — D&D 5e Item`;
  const rarity = item.rarity !== "none" ? ` (${item.rarity})` : "";
  const description = `${item.name}${rarity}. ${formatTypeName(item.type)}. ${item.entries[0]?.slice(0, 120) ?? ""}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/items/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/items/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/items/${slug}`,
        "pt-BR": `https://pocketdm.com.br/itens/${slug}`,
      },
    },
  };
}

function ItemJsonLd({ item, slug }: { item: { name: string; type: string; rarity: string }; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${item.name} — D&D 5e Item`,
    headline: `${item.name} — D&D 5e Item`,
    description: `${item.name}, ${formatTypeName(item.type)}${item.rarity !== "none" ? `, ${item.rarity}` : ""}. D&D 5e SRD item.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
    inLanguage: "en",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Items", item: "https://pocketdm.com.br/items" },
      { "@type": "ListItem", position: 3, name: item.name, item: `https://pocketdm.com.br/items/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  const serialized = {
    id: item.id,
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    isMagic: item.isMagic,
    entries: item.entries,
    value: item.value,
    weight: item.weight,
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
  };

  return (
    <>
      <ItemJsonLd item={item} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[
            { label: "Items", href: "/items" },
            { label: item.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicItemDetail item={serialized} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName={item.name} locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href={`/itens/${slug}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
