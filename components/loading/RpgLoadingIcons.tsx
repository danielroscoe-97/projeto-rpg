/** Shared RPG-themed SVG icons for loading screens (Dashboard, Campaign, SRD, etc.) */

export function D20Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagonal d20 outline */}
      <polygon points="32,5 55,19 55,43 32,57 9,43 9,19" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      {/* Front face triangle */}
      <polygon points="32,20 18,42 46,42" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" opacity="0.55" />
      {/* Top vertex to front face bottom corners */}
      <line x1="32" y1="5" x2="18" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="32" y1="5" x2="46" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {/* Bottom vertex to front face bottom corners */}
      <line x1="32" y1="57" x2="18" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="32" y1="57" x2="46" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {/* Side vertices to front face top */}
      <line x1="9" y1="19" x2="32" y2="20" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="55" y1="19" x2="32" y2="20" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      {/* Side vertices to front face bottom corners */}
      <line x1="9" y1="19" x2="18" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="55" y1="19" x2="46" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      {/* Bottom side to front face bottom corners */}
      <line x1="9" y1="43" x2="18" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <line x1="55" y1="43" x2="46" y2="42" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
    </svg>
  );
}

export function WizardHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L18 48h28L32 4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <ellipse cx="32" cy="52" rx="24" ry="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <circle cx="28" cy="24" r="2" fill="currentColor" fillOpacity="0.4" />
      <circle cx="34" cy="32" r="1.5" fill="currentColor" fillOpacity="0.4" />
      <circle cx="30" cy="40" r="2.5" fill="currentColor" fillOpacity="0.4" />
      <path d="M36 8l4-4m-2 6l5 1m-8 2l3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function SwordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="32" y1="4" x2="32" y2="42" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <polygon points="28,4 32,0 36,4 36,12 28,12" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="42" width="20" height="5" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
      <rect x="29" y="47" width="6" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
      <circle cx="32" cy="61" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function SpellBookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="6" width="40" height="52" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M18 6v52" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="8" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
      <rect x="14" y="52" width="4" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
      <circle cx="36" cy="28" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M36 20v16M28 28h16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <path d="M30.34 22.34l11.32 11.32M42.34 22.34L30.34 33.66" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="24" y1="42" x2="48" y2="42" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="46" x2="42" y2="46" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function PotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
      <path d="M26 14l-8 24c-2 6 2 18 14 18s16-12 14-18L38 14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M20 38c4-3 10-3 14 0s10 3 12 0" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <circle cx="28" cy="44" r="2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="36" cy="48" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <circle cx="32" cy="42" r="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4L8 16v18c0 14 10 22 24 26 14-4 24-12 24-26V16L32 4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M32 12L14 20v14c0 10 8 17 18 20" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M32 28l-6-4v-4l6-4 6 4v4l-6 4z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

export function ScrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 12c0-4 4-8 8-8h24c4 0 4 8 0 8" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="16" y="12" width="32" height="36" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <path d="M16 48c0 4 4 8 8 8h24c4 0 4-8 0-8" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="24" y1="22" x2="40" y2="22" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="24" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function DragonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 40c-4 4-8 10-6 14 1 2 4 2 6 0l4-6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M24 28c-6 2-12 6-12 12s4 6 8 4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
      <ellipse cx="34" cy="34" rx="14" ry="10" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
      <path d="M46 28c4-6 8-14 10-18-4 2-10 6-12 10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M22 30l-8-12 6 4-2-8 6 6 2-6 2 8 4-4-2 8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
      <circle cx="28" cy="32" r="2" fill="currentColor" fillOpacity="0.5" />
      <path d="M48 34c2 0 6-1 8-2-2 3-6 5-8 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export const RPG_ICON_COMPONENTS = [
  D20Icon, WizardHatIcon, SwordIcon, SpellBookIcon,
  PotionIcon, ShieldIcon, ScrollIcon, DragonIcon,
];

/** Pick N random unique indices from an array of length `total`. */
export function pickRandom(total: number, count: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}
