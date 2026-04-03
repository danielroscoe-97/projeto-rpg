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

const GITHUB_TOKEN_PREFIX =
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/tokens/";

/** Rewrite GitHub raw URLs to our CDN-cached proxy to avoid 503 rate-limits. */
function proxyUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.startsWith(GITHUB_TOKEN_PREFIX)) {
    return `/api/token/${url.slice(GITHUB_TOKEN_PREFIX.length)}`;
  }
  return url;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface MonsterTokenProps {
  tokenUrl?: string;
  /** Fallback token URL (cross-version or similar creature) */
  fallbackTokenUrl?: string;
  creatureType?: string;
  name: string;
  /** px size — defaults to 64 */
  size?: number;
  /** When true: skip image loading, show emoji with MAD orange border + r/ badge */
  isMonsterADay?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MonsterToken({
  tokenUrl: rawTokenUrl,
  fallbackTokenUrl: rawFallbackTokenUrl,
  creatureType,
  name,
  size = 64,
  isMonsterADay = false,
}: MonsterTokenProps) {
  const tokenUrl = isMonsterADay ? undefined : proxyUrl(rawTokenUrl);
  const fallbackTokenUrl = isMonsterADay ? undefined : proxyUrl(rawFallbackTokenUrl);
  const [currentSrc, setCurrentSrc] = useState<string | null>(tokenUrl ?? null);
  const [showEmoji, setShowEmoji] = useState(isMonsterADay);
  const retriesRef = useRef(0);
  const triedFallbackRef = useRef(false);
  const triedGithubDirectRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when tokenUrl prop changes (e.g. SRD loads asynchronously after initial render)
  useEffect(() => {
    if (!tokenUrl) return;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retriesRef.current = 0;
    triedFallbackRef.current = false;
    triedGithubDirectRef.current = false;
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

    // Try fallback URL (proxied)
    if (!triedFallbackRef.current && fallbackTokenUrl) {
      triedFallbackRef.current = true;
      retriesRef.current = 0;
      setCurrentSrc(fallbackTokenUrl);
      return;
    }

    // Try GitHub direct as last image attempt (bypasses proxy if it's down)
    if (!triedGithubDirectRef.current && rawTokenUrl?.startsWith(GITHUB_TOKEN_PREFIX)) {
      triedGithubDirectRef.current = true;
      setCurrentSrc(rawTokenUrl);
      return;
    }

    // All attempts exhausted — show emoji
    setShowEmoji(true);
  }, [tokenUrl, fallbackTokenUrl, rawTokenUrl]);

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
        className={`${sizeClass} rounded-full object-cover border-2 border-oracle/40 bg-surface-secondary flex-shrink-0`}
      />
    );
  }

  // Fallback: emoji in styled circle (orange for MAD, gold for standard)
  const borderClass = isMonsterADay
    ? "border-orange-500/50 bg-orange-950/30"
    : "border-oracle/30 bg-surface-tertiary";
  return (
    <div
      className={`${sizeClass} rounded-full border-2 ${borderClass} flex items-center justify-center flex-shrink-0 relative`}
      aria-hidden
    >
      {isMonsterADay ? (
        <span className="text-orange-400 font-bold">{name.charAt(0).toUpperCase()}</span>
      ) : (
        getCreatureEmoji(creatureType)
      )}
      {isMonsterADay && size >= 36 && (
        <span
          className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none bg-orange-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold"
          title="Monster a Day"
        >
          r/
        </span>
      )}
    </div>
  );
}
