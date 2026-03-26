"use client";

import { useState } from "react";

// ─── Creature type emoji fallbacks ──────────────────────────────────────────

export const CREATURE_ICONS: Record<string, string> = {
  aberration: "\u{1F441}",
  beast: "\u{1F43A}",
  celestial: "\u2726",
  construct: "\u2699",
  dragon: "\u{1F409}",
  elemental: "\u{1F30A}",
  fey: "\u{1F319}",
  fiend: "\u{1F47F}",
  giant: "\u{1F5FF}",
  humanoid: "\u{1F464}",
  monstrosity: "\u{1F991}",
  ooze: "\u{1F4A7}",
  plant: "\u{1F33F}",
  undead: "\u{1F480}",
};

export function getCreatureEmoji(type: string | undefined): string {
  if (!type) return "\u2694";
  const key = type.split(" ")[0].toLowerCase();
  return CREATURE_ICONS[key] ?? "\u2694";
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface MonsterTokenProps {
  tokenUrl?: string;
  creatureType?: string;
  name: string;
  /** px size — defaults to 64 */
  size?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MonsterToken({
  tokenUrl,
  creatureType,
  name,
  size = 64,
}: MonsterTokenProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClass =
    size >= 64
      ? "w-16 h-16 md:w-20 md:h-20 text-2xl"
      : size >= 36
        ? "w-9 h-9 text-base"
        : "w-8 h-8 text-sm";

  if (tokenUrl && !imgError) {
    return (
      <img
        src={tokenUrl}
        alt={`${name} token`}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover border-2 border-[#c9a959]/40 bg-[#1a1a1e] flex-shrink-0`}
      />
    );
  }

  // Fallback: emoji in styled circle
  return (
    <div
      className={`${sizeClass} rounded-full border-2 border-[#c9a959]/30 bg-[#22222a] flex items-center justify-center flex-shrink-0`}
      aria-hidden
    >
      {getCreatureEmoji(creatureType)}
    </div>
  );
}
