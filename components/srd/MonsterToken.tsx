"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

// ─── Props ──────────────────────────────────────────────────────────────────

interface MonsterTokenProps {
  tokenUrl?: string;
  /** Fallback token URL (cross-version or similar creature) */
  fallbackTokenUrl?: string;
  creatureType?: string;
  name: string;
  /** px size — defaults to 64 */
  size?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MonsterToken({
  tokenUrl,
  fallbackTokenUrl,
  creatureType,
  name,
  size = 64,
}: MonsterTokenProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(tokenUrl ?? null);
  const [showEmoji, setShowEmoji] = useState(false);
  const retriesRef = useRef(0);
  const triedFallbackRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when tokenUrl prop changes (e.g. SRD loads asynchronously after initial render)
  useEffect(() => {
    if (!tokenUrl) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retriesRef.current = 0;
    triedFallbackRef.current = false;
    setCurrentSrc(tokenUrl);
    setShowEmoji(false);
  }, [tokenUrl]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleError = useCallback(() => {
    // Retry primary URL with cache-bust
    if (retriesRef.current < MAX_RETRIES && tokenUrl) {
      retriesRef.current += 1;
      const delay = RETRY_DELAY_MS * retriesRef.current;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setCurrentSrc(`${tokenUrl}${tokenUrl.includes("?") ? "&" : "?"}r=${retriesRef.current}`);
      }, delay);
      return;
    }

    // Try fallback URL
    if (!triedFallbackRef.current && fallbackTokenUrl) {
      triedFallbackRef.current = true;
      retriesRef.current = 0;
      setCurrentSrc(fallbackTokenUrl);
      return;
    }

    // All attempts exhausted — show emoji
    setShowEmoji(true);
  }, [tokenUrl, fallbackTokenUrl]);

  const sizeClass =
    size >= 64
      ? "w-16 h-16 md:w-20 md:h-20 text-2xl"
      : size >= 36
        ? "w-9 h-9 text-base"
        : "w-8 h-8 text-sm";

  if (currentSrc && !showEmoji) {
    return (
      <img
        src={currentSrc}
        alt={`${name} token`}
        loading="lazy"
        onError={handleError}
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
