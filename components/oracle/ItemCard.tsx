"use client";

import type { SrdItem } from "@/lib/srd/srd-loader";
import { useTranslations } from "next-intl";

interface ItemCardProps {
  item: SrdItem;
  variant?: "card" | "inline";
}

const RARITY_COLORS: Record<string, string> = {
  none: "text-muted-foreground",
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  "very rare": "text-purple-400",
  legendary: "text-gold",
  artifact: "text-red-400",
  varies: "text-amber-400",
  unknown: "text-muted-foreground",
};

const RARITY_BORDER: Record<string, string> = {
  none: "border-t-gray-600",
  common: "border-t-gray-400",
  uncommon: "border-t-green-500",
  rare: "border-t-blue-500",
  "very rare": "border-t-purple-500",
  legendary: "border-t-[#d4a853]",
  artifact: "border-t-red-500",
  varies: "border-t-amber-500",
  unknown: "border-t-gray-600",
};

function formatValue(cp: number): string {
  if (cp >= 100) {
    const gp = cp / 100;
    return `${Number.isInteger(gp) ? gp : gp.toFixed(1)} gp`;
  }
  if (cp >= 10) {
    const sp = cp / 10;
    return `${Number.isInteger(sp) ? sp : sp.toFixed(1)} sp`;
  }
  return `${cp} cp`;
}

function formatWeight(lb: number): string {
  return `${Number.isInteger(lb) ? lb : lb.toFixed(1)} lb.`;
}

export function ItemCard({ item, variant = "card" }: ItemCardProps) {
  const t = useTranslations("compendium");
  const isInline = variant === "inline";
  const rarityColor = RARITY_COLORS[item.rarity] || "text-muted-foreground";
  const borderColor = RARITY_BORDER[item.rarity] || "border-t-gray-600";

  // Type display
  const typeLabel = t(`item_type_${item.type.replace(/-/g, "_")}`);

  // Subtitle line
  const subtitleParts: string[] = [];
  if (item.weaponCategory) {
    subtitleParts.push(t(`item_weapon_${item.weaponCategory}`));
  }
  subtitleParts.push(typeLabel);
  if (item.isMagic && item.rarity !== "none") {
    subtitleParts.push(t(`item_rarity_${item.rarity.replace(/\s+/g, "_")}`));
  }
  const subtitle = subtitleParts.join(", ");

  return (
    <div className={`stat-card-5e ${isInline ? "stat-card-5e--inline" : ""} border-t-2 ${item.isMagic ? borderColor : "border-t-gray-600"}`}>
      {/* Header */}
      <div className="card-header">
        <h3 className="card-name">{item.name}</h3>
        <p className={`text-xs italic ${rarityColor}`}>
          {subtitle}
        </p>
        {item.reqAttune && (
          <p className="text-[11px] text-muted-foreground italic mt-0.5">
            ({t("item_requires_attunement")}{typeof item.reqAttune === "string" ? ` ${item.reqAttune}` : ""})
          </p>
        )}
      </div>

      <div className="card-divider" />

      {/* Mechanical properties */}
      <div className="space-y-1">
        {item.ac != null && (
          <div className="prop-line">
            <span className="prop-label">AC</span> {item.ac}
            {item.stealth && <span className="text-muted-foreground text-[11px] ml-1">({t("item_stealth_disadvantage")})</span>}
            {item.strength && <span className="text-muted-foreground text-[11px] ml-1">({t("item_str_requirement", { value: item.strength })})</span>}
          </div>
        )}
        {item.dmg1 && (
          <div className="prop-line">
            <span className="prop-label">{t("item_damage")}</span> {item.dmg1} {item.dmgType || ""}
            {item.dmg2 && <span className="text-muted-foreground text-[11px] ml-1">({t("item_versatile", { dmg: item.dmg2 })})</span>}
          </div>
        )}
        {item.range && (
          <div className="prop-line">
            <span className="prop-label">{t("range")}</span> {item.range}
          </div>
        )}
        {item.property && item.property.length > 0 && (
          <div className="prop-line">
            <span className="prop-label">{t("item_properties")}</span> {item.property.join(", ")}
          </div>
        )}
        {item.value != null && (
          <div className="prop-line">
            <span className="prop-label">{t("item_cost")}</span> {formatValue(item.value)}
          </div>
        )}
        {item.weight != null && (
          <div className="prop-line">
            <span className="prop-label">{t("item_weight")}</span> {formatWeight(item.weight)}
          </div>
        )}
        {item.bonusWeapon && (
          <div className="prop-line">
            <span className="prop-label">{t("item_bonus_weapon")}</span> {item.bonusWeapon}
          </div>
        )}
        {item.bonusAc && (
          <div className="prop-line">
            <span className="prop-label">{t("item_bonus_ac")}</span> {item.bonusAc}
          </div>
        )}
        {item.charges != null && (
          <div className="prop-line">
            <span className="prop-label">{t("item_charges")}</span> {item.charges}
            {item.recharge && <span className="text-muted-foreground text-[11px] ml-1">({t("item_recharge")}: {item.recharge})</span>}
          </div>
        )}
      </div>

      {/* Description */}
      {item.entries.length > 0 && (
        <>
          <div className="card-divider" />
          <div className="trait-block space-y-2">
            {item.entries.map((entry, i) => (
              <p key={i} className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {entry}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Tags */}
      {(item.curse || item.sentient) && (
        <>
          <div className="card-divider" />
          <div className="flex items-center gap-2">
            {item.curse && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">
                {t("item_cursed")}
              </span>
            )}
            {item.sentient && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400">
                {t("item_sentient")}
              </span>
            )}
          </div>
        </>
      )}

      {/* Source */}
      <div className="mt-3 pt-2 border-t border-white/[0.06]">
        <span className="text-[10px] text-muted-foreground">
          {item.source}
          {item.edition === "one" && " (2024)"}
        </span>
      </div>
    </div>
  );
}
