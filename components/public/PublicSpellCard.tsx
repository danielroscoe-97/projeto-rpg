"use client";

import { DiceText } from "@/components/dice/DiceText";
import type { SrdSpell } from "@/lib/srd/srd-loader";
import { TIER_COLORS, TIER_LABELS, type SpellTier } from "@/lib/srd/spell-tiers";
import "@/styles/stat-card-5e.css";

const SCHOOL_ICONS: Record<string, string> = {
  Abjuration: "🛡️",
  Conjuration: "✨",
  Divination: "🔮",
  Enchantment: "💜",
  Evocation: "⚡",
  Illusion: "🌀",
  Necromancy: "💀",
  Transmutation: "⚗️",
};

const CLASS_COLORS: Record<string, string> = {
  Bard: "bg-pink-900/40 text-pink-300 border-pink-500/30",
  Cleric: "bg-yellow-900/40 text-yellow-300 border-yellow-500/30",
  Druid: "bg-green-900/40 text-green-300 border-green-500/30",
  Paladin: "bg-amber-900/40 text-amber-300 border-amber-500/30",
  Ranger: "bg-emerald-900/40 text-emerald-300 border-emerald-500/30",
  Sorcerer: "bg-red-900/40 text-red-300 border-red-500/30",
  Warlock: "bg-purple-900/40 text-purple-300 border-purple-500/30",
  Wizard: "bg-blue-900/40 text-blue-300 border-blue-500/30",
};

interface PublicSpellCardProps {
  spell: SrdSpell;
  tier?: { tier: SpellTier; reason: string };
}

export function PublicSpellCard({ spell, tier }: PublicSpellCardProps) {
  const levelStr =
    spell.level === 0
      ? "Cantrip"
      : `${spell.level}${["st", "nd", "rd"][spell.level - 1] || "th"}-level`;

  const schoolIcon = SCHOOL_ICONS[spell.school] ?? "✦";

  return (
    <article className="stat-card-5e stat-card-5e-inline !max-w-none">
      {/* Header */}
      <div className="mb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--5e-text)] font-[family-name:var(--font-cinzel)] leading-tight">
              {spell.name}
            </h1>
            <p className="text-[var(--5e-text-muted)] text-sm italic mt-0.5">
              {levelStr} {spell.school.toLowerCase()}
              {spell.ritual ? " (ritual)" : ""}
              {spell.concentration ? " · concentration" : ""}
            </p>
          </div>
          {/* School icon + tier badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl" title={spell.school}>{schoolIcon}</span>
            {tier && (
              <span
                className={`text-lg font-black w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${TIER_COLORS[tier.tier]}`}
                title={TIER_LABELS[tier.tier]}
              >
                {tier.tier}
              </span>
            )}
          </div>
        </div>
      </div>

      <hr className="card-divider" />

      {/* Properties */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-1">
        <p>
          <strong className="text-[var(--5e-accent-red)]">Casting Time</strong>{" "}
          {spell.casting_time}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Range</strong>{" "}
          {spell.range}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Components</strong>{" "}
          {spell.components}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Duration</strong>{" "}
          {spell.duration}
          {spell.concentration ? (
            <span className="ml-1 text-xs text-amber-400/80">©</span>
          ) : null}
        </p>
      </div>

      {/* Classes */}
      {spell.classes?.length > 0 && (
        <>
          <hr className="card-divider" />
          <div className="flex flex-wrap gap-1.5">
            {spell.classes.map((cls) => (
              <span
                key={cls}
                className={`text-xs px-2 py-0.5 rounded-md border ${CLASS_COLORS[cls] ?? "bg-gray-700/40 text-gray-300 border-gray-500/30"}`}
              >
                {cls}
              </span>
            ))}
          </div>
        </>
      )}

      <hr className="card-divider" />

      {/* Tier explanation */}
      {tier && (
        <div className={`rounded-lg border px-3 py-2 mb-3 text-sm ${TIER_COLORS[tier.tier]}`}>
          <span className="font-bold">Tier {tier.tier}:</span>{" "}
          <span className="opacity-90">{tier.reason}</span>
        </div>
      )}

      {/* Description */}
      <div className="text-sm leading-relaxed text-[var(--5e-text)] space-y-2">
        {spell.description.split("\n").filter(Boolean).map((para, i) => (
          <p key={i}>
            <DiceText
              text={para}
              rulesetVersion={spell.ruleset_version}
              source={spell.name}
            />
          </p>
        ))}
      </div>

      {/* At Higher Levels */}
      {spell.higher_levels && (
        <>
          <hr className="card-divider" />
          <p className="text-sm text-[var(--5e-text)]">
            <strong className="italic text-[var(--5e-accent-gold)]">At Higher Levels.</strong>{" "}
            <DiceText
              text={spell.higher_levels}
              rulesetVersion={spell.ruleset_version}
              source={spell.name}
            />
          </p>
        </>
      )}
    </article>
  );
}
