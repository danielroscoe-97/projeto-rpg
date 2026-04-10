import Link from "next/link";
import type { Metadata } from "next";
import { getSrdItems } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicItemGrid } from "@/components/public/PublicItemGrid";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Itens D&D 5e — Compêndio de Equipamentos SRD",
  description:
    "Compêndio completo de itens D&D 5e SRD — armas, armaduras, itens mágicos, poções e equipamentos de aventura. Busque e filtre por tipo e raridade. Gratuito.",
  keywords: [
    "itens D&D 5e",
    "itens mágicos D&D",
    "equipamentos SRD",
    "armas D&D 5e",
    "armaduras D&D 5e",
    "poções D&D",
    "equipamento de aventura D&D",
  ],
  alternates: {
    canonical: "https://pocketdm.com.br/itens",
    languages: {
      en: "https://pocketdm.com.br/items",
      "pt-BR": "https://pocketdm.com.br/itens",
    },
  },
  openGraph: {
    title: "Itens D&D 5e — Compêndio de Equipamentos SRD",
    description:
      "Compêndio completo de itens D&D 5e SRD — armas, armaduras, itens mágicos, poções e equipamentos de aventura. Busque e filtre por tipo e raridade.",
    type: "website",
    url: "https://pocketdm.com.br/itens",
  },
};

export const revalidate = 86400;

export default function ItensIndexPage() {
  const items = getSrdItems()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Compêndio de Itens D&D 5e",
    description:
      "Compêndio completo de itens D&D 5e SRD com armas, armaduras, itens mágicos e equipamentos de aventura.",
    url: "https://pocketdm.com.br/itens",
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 10).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-screen bg-background">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Itens" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {/* Hero */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              Compêndio de Itens D&amp;D 5e
            </h1>
            <p className="text-gray-400 text-lg">
              {items.length} itens — armas, armaduras, itens mágicos e
              equipamentos de aventura. Todo conteúdo SRD gratuito sob{" "}
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
          <PublicItemGrid items={items} locale="pt-BR" />

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-gold/[0.06] to-gray-800/50 border border-gold/10 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              Gerencie itens em combate
            </h2>
            <p className="text-gray-400 mb-5 max-w-lg mx-auto">
              O Pocket DM é o rastreador de combate gratuito para D&D 5e.
              Controle inventário, poções e itens mágicos durante suas sessões.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/try"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-white font-semibold hover:bg-gold/90 transition-colors"
              >
                Testar Gratuitamente
              </Link>
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 px-6 py-3 text-gold font-semibold hover:bg-gold/10 transition-colors"
              >
                Criar Conta Gratuita
              </Link>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Page also available in{" "}
            <Link href="/items" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
