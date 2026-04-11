"use client";

import Link from "next/link";

type Locale = "en" | "pt-BR";

const LABELS = {
  en: {
    backToItems: "← All Items",
    backHref: "/items",
    reqAttune: "Requires Attunement",
    cost: "Cost",
    weight: "Weight",
    damage: "Damage",
    properties: "Properties",
    ac: "AC",
    charges: "Charges",
    recharge: "Recharge",
    bonusWeapon: "Weapon Bonus",
    bonusAc: "AC Bonus",
    cursed: "Cursed",
    sentient: "Sentient",
    range: "Range",
    category: "Category",
  },
  "pt-BR": {
    backToItems: "← Todos os Itens",
    backHref: "/itens",
    reqAttune: "Requer Sintonização",
    cost: "Custo",
    weight: "Peso",
    damage: "Dano",
    properties: "Propriedades",
    ac: "CA",
    charges: "Cargas",
    recharge: "Recarga",
    bonusWeapon: "Bônus de Arma",
    bonusAc: "Bônus de CA",
    cursed: "Amaldiçoado",
    sentient: "Senciente",
    range: "Alcance",
    category: "Categoria",
  },
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-gray-800/60 text-gray-400",
  uncommon: "bg-green-900/40 text-green-400",
  rare: "bg-blue-900/40 text-blue-400",
  "very rare": "bg-purple-900/40 text-purple-400",
  legendary: "bg-amber-900/40 text-gold",
  artifact: "bg-red-900/40 text-red-400",
};

const RARITY_PT: Record<string, string> = {
  none: "Comum", common: "Comum", uncommon: "Incomum", rare: "Raro",
  "very rare": "Muito Raro", legendary: "Lendário", artifact: "Artefato",
};

function translateRarity(rarity: string, locale: Locale): string {
  if (locale === "pt-BR") return RARITY_PT[rarity] ?? rarity;
  return rarity === "very rare" ? "Very Rare" : rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function formatTypeName(type: string): string {
  return type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatGp(cp?: number): string {
  if (!cp) return "—";
  if (cp >= 100) return `${(cp / 100).toLocaleString()} gp`;
  if (cp >= 10) return `${(cp / 10).toLocaleString()} sp`;
  return `${cp} cp`;
}

interface ItemDetailProps {
  item: {
    id: string;
    name: string;
    type: string;
    rarity: string;
    isMagic: boolean;
    entries: string[];
    value?: number;
    weight?: number;
    reqAttune?: boolean | string;
    edition?: string;
    ac?: number;
    dmg1?: string;
    dmgType?: string;
    property?: string[];
    range?: string;
    weaponCategory?: string;
    charges?: number;
    recharge?: string;
    bonusWeapon?: string;
    bonusAc?: string;
    curse?: boolean;
    sentient?: boolean;
  };
  locale?: Locale;
}

export function PublicItemDetail({ item, locale = "en" }: ItemDetailProps) {
  const l = LABELS[locale];

  return (
    <div>
      {/* Back link */}
      <Link
        href={l.backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gold transition-colors mb-6"
      >
        {l.backToItems}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-3">
          {item.isMagic && <span className="text-gold mr-2">&#10022;</span>}
          {item.name}
        </h1>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-medium bg-white/[0.06] text-gray-300 rounded px-2 py-0.5">
            {formatTypeName(item.type)}
            {item.weaponCategory && ` (${item.weaponCategory})`}
          </span>
          {item.rarity !== "none" && (
            <span className={`text-[10px] font-medium rounded px-2 py-0.5 ${RARITY_BADGE[item.rarity] ?? "bg-white/[0.06] text-gray-400"}`}>
              {translateRarity(item.rarity, locale)}
            </span>
          )}
          {item.edition === "one" && (
            <span className="text-[10px] font-medium bg-blue-900/40 text-blue-400 rounded px-2 py-0.5">2024</span>
          )}
          {item.reqAttune && (
            <span className="text-[10px] font-medium bg-purple-900/30 text-purple-300 rounded px-2 py-0.5">
              &#9672; {typeof item.reqAttune === "string" ? item.reqAttune : l.reqAttune}
            </span>
          )}
          {item.curse && (
            <span className="text-[10px] font-medium bg-red-900/40 text-red-400 rounded px-2 py-0.5">{l.cursed}</span>
          )}
          {item.sentient && (
            <span className="text-[10px] font-medium bg-amber-900/40 text-amber-400 rounded px-2 py-0.5">{l.sentient}</span>
          )}
        </div>
      </div>

      {/* Stats card */}
      <div className="rounded-xl bg-card/80 border border-white/[0.06] p-5 md:p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          {item.ac != null && <StatRow label={l.ac} value={`${item.ac}`} />}
          {item.dmg1 && <StatRow label={l.damage} value={`${item.dmg1}${item.dmgType ? ` ${item.dmgType}` : ""}`} />}
          {item.range && <StatRow label={l.range} value={item.range} />}
          {item.property && item.property.length > 0 && (
            <StatRow label={l.properties} value={item.property.join(", ")} />
          )}
          {item.value != null && item.value > 0 && <StatRow label={l.cost} value={formatGp(item.value)} />}
          {item.weight != null && item.weight > 0 && <StatRow label={l.weight} value={`${item.weight} lb.`} />}
          {item.bonusWeapon && <StatRow label={l.bonusWeapon} value={item.bonusWeapon} />}
          {item.bonusAc && <StatRow label={l.bonusAc} value={item.bonusAc} />}
          {item.charges != null && <StatRow label={l.charges} value={`${item.charges}`} />}
          {item.recharge && <StatRow label={l.recharge} value={item.recharge} />}
        </div>
      </div>

      {/* Description */}
      {item.entries.length > 0 && (
        <div className="rounded-xl bg-card/80 border border-white/[0.06] p-5 md:p-6">
          <div className="text-sm text-gray-300 leading-relaxed space-y-3">
            {item.entries.map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}:</span>
      <span className="text-sm text-foreground font-mono">{value}</span>
    </div>
  );
}
