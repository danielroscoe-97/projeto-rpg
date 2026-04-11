/**
 * SrdIcons — inline SVG icon components for public SRD pages.
 *
 * Every icon accepts an optional `className` prop (default: "w-5 h-5")
 * and uses `currentColor` so it inherits text color from its parent.
 */

interface IconProps {
  className?: string;
}

const defaults = "w-5 h-5 shrink-0";
function cn(override?: string) {
  return override ?? defaults;
}

// ─── Generic Icons ──────────────────────────────────────────────────

export function SrdIconSword({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

export function SrdIconCrossedSwords({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Left sword blade */}
      <path d="M5 2l6.5 6.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M5 2l1.5-.5L13 8l-1.5 1.5L5 3.5 4.5 2z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Right sword blade */}
      <path d="M19 2l-1.5-.5L11 8l1.5 1.5L19 3.5l.5-1.5z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      {/* Left crossguard */}
      <path d="M8.5 8L6 10.5" strokeWidth="2.5" />
      {/* Right crossguard */}
      <path d="M15.5 8L18 10.5" strokeWidth="2.5" />
      {/* Left grip + pommel */}
      <path d="M6 10.5l-2.5 2.5" strokeWidth="2" />
      <circle cx="3" cy="13.5" r="0.75" fill="currentColor" />
      {/* Right grip + pommel */}
      <path d="M18 10.5l2.5 2.5" strokeWidth="2" />
      <circle cx="21" cy="13.5" r="0.75" fill="currentColor" />
      {/* Center clash spark */}
      <path d="M12 9l-1.5 3.5h3L12 16" fill="currentColor" fillOpacity="0.15" strokeWidth="1.5" />
    </svg>
  );
}

export function SrdIconShield({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="currentColor" fillOpacity="0.15" />
      {/* Inner shield border / heraldic band */}
      <path d="M12 6.5v12" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M7 9.5h10" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}

export function SrdIconSkull({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 20v2h8v-2" />
      <path d="M12.5 17l-.5-1-.5 1" />
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </svg>
  );
}

export function SrdIconEye({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SrdIconChain({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function SrdIconBoot({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21h10" />
      <path d="M6 21V9a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v8h3a3 3 0 0 0 3-3v-2a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

export function SrdIconHeart({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function SrdIconSparkle({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

export function SrdIconBook({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Book cover with fill */}
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18H6.5a2.5 2.5 0 0 1 0-5H20" fill="currentColor" fillOpacity="0.15" />
      {/* Spine detail */}
      <path d="M6.5 2v17" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Clasp / bookmark */}
      <path d="M10 2v5l2-1.5L14 7V2" fill="currentColor" fillOpacity="0.2" strokeWidth="1.5" />
      {/* Page lines for arcane tome feel */}
      <path d="M9 11h7" strokeWidth="1" strokeOpacity="0.3" />
      <path d="M9 13.5h5" strokeWidth="1" strokeOpacity="0.3" />
      {/* Corner embellishment */}
      <circle cx="16.5" cy="5" r="0.75" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
    </svg>
  );
}

export function SrdIconStar({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function SrdIconTarget({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// ─── Damage Type Icons ──────────────────────────────────────────────

export function SrdIconFlame({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Outer flame */}
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="currentColor" fillOpacity="0.15" />
      {/* Inner flame core */}
      <path d="M12 19a3.5 3.5 0 0 0 3.5-3.5c0-1-.5-2-1.5-3 .5-1.5.5-2.5 0-4-1 2-2 3-2 4.5a1.5 1.5 0 0 1-1.5 1.5A1.5 1.5 0 0 0 9 16a3 3 0 0 0 3 3z" fill="currentColor" fillOpacity="0.12" strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Ember sparks */}
      <circle cx="9" cy="5" r="0.5" fill="currentColor" fillOpacity="0.4" strokeWidth="0" />
      <circle cx="15" cy="4" r="0.5" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
    </svg>
  );
}

export function SrdIconSnowflake({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="m20 16-4-4 4-4" />
      <path d="m4 8 4 4-4 4" />
      <path d="m16 4-4 4-4-4" />
      <path d="m8 20 4-4 4 4" />
    </svg>
  );
}

export function SrdIconLightning({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

export function SrdIconDroplet({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

export function SrdIconSun({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function SrdIconBrain({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
}

export function SrdIconMoon({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function SrdIconExplosion({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12 2 5l5 5-3-8 6 5 2-7 2 7 6-5-3 8 5-5-10 7" />
      <path d="m2 19 2.5-4" />
      <path d="M22 19l-2.5-4" />
      <path d="m9 22 3-6 3 6" />
    </svg>
  );
}

export function SrdIconSlash({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 4 6 20" />
      <path d="M16 2 4 18" />
      <path d="M20 6 8 22" />
    </svg>
  );
}

export function SrdIconArrowPoint({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="m8 6 4-4 4 4" />
    </svg>
  );
}

export function SrdIconHammer({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
    </svg>
  );
}

export function SrdIconVial({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16.5h10" />
    </svg>
  );
}

export function SrdIconWand({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" />
      <path d="M15 9h0" />
      <path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 11 5" />
    </svg>
  );
}

export function SrdIconMusic({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Lute body */}
      <ellipse cx="9" cy="15" rx="5" ry="6" fill="currentColor" fillOpacity="0.15" strokeWidth="2" />
      {/* Sound hole */}
      <circle cx="9" cy="15" r="1.5" strokeWidth="1.5" />
      {/* Neck */}
      <path d="M14 11l4-7" strokeWidth="2.5" />
      {/* Tuning pegs */}
      <path d="M17 4.5l1.5-.5" strokeWidth="2" />
      <path d="M17.5 3l1.5-.5" strokeWidth="2" />
      {/* Strings */}
      <path d="M8 10v10" strokeWidth="1" strokeOpacity="0.5" />
      <path d="M10 10v10" strokeWidth="1" strokeOpacity="0.5" />
      {/* Musical notes */}
      <circle cx="20" cy="7" r="1" fill="currentColor" fillOpacity="0.4" strokeWidth="1" />
      <path d="M20 7v-4" strokeWidth="1.5" />
      <path d="M20 3h2" strokeWidth="1.5" />
    </svg>
  );
}

export function SrdIconCross({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Holy cross with ornate ends */}
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" fill="currentColor" fillOpacity="0.15" />
      {/* Flared/ornate ends */}
      <path d="M9 2L8 1h8l-1 1" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M9 22l-1 1h8l-1-1" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M2 9L1 8v8l1-1" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M22 9l1-1v8l-1-1" strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Inner glow / radiance lines */}
      <circle cx="12" cy="12" r="2" strokeWidth="1.5" strokeOpacity="0.4" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

export function SrdIconLeaf({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" fillOpacity="0.15" />
      {/* Leaf veins */}
      <path d="M14 8c-1.5 2-2.5 4-3 7" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M16 7c-1 1.5-1 3-1 5" strokeWidth="1" strokeOpacity="0.3" />
      <path d="M11.5 11c1-1 2.5-1.5 4-1.5" strokeWidth="1" strokeOpacity="0.3" />
      {/* Stem curving to ground */}
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" strokeWidth="2.5" />
    </svg>
  );
}

export function SrdIconFist({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Fist body fill */}
      <path d="M7 11V4a2 2 0 0 1 4 0v3h0V3a2 2 0 0 1 4 0v4h0V5a2 2 0 0 1 4 0v9a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-3a2 2 0 0 1 4 0v0" fill="currentColor" fillOpacity="0.15" />
      {/* Fingers */}
      <path d="M7 11V4a2 2 0 0 1 4 0v3" />
      <path d="M11 7V3a2 2 0 0 1 4 0v4" />
      <path d="M15 7V5a2 2 0 0 1 4 0v9a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-3a2 2 0 0 1 4 0" />
      {/* Knuckle lines */}
      <path d="M7 11h12" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Impact lines */}
      <path d="M1 7l1.5.5" strokeWidth="1.5" strokeOpacity="0.5" />
      <path d="M1.5 4l1.5 1" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  );
}

export function SrdIconDagger({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Blade with fuller groove */}
      <path d="M12 2l2.5 10-2.5 2-2.5-2L12 2z" fill="currentColor" fillOpacity="0.15" />
      <path d="M12 3v8" strokeWidth="1" strokeOpacity="0.35" />
      {/* Crossguard with curved ends */}
      <path d="M7 13.5c0 0 1.5 1 5 1s5-1 5-1" strokeWidth="2.5" />
      <circle cx="7" cy="13.5" r="0.75" fill="currentColor" />
      <circle cx="17" cy="13.5" r="0.75" fill="currentColor" />
      {/* Grip with wrap texture */}
      <path d="M11 15h2v4h-2z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 16h2" strokeWidth="1" strokeOpacity="0.3" />
      <path d="M11 18h2" strokeWidth="1" strokeOpacity="0.3" />
      {/* Pommel */}
      <circle cx="12" cy="20.5" r="1.25" fill="currentColor" fillOpacity="0.2" strokeWidth="1.5" />
    </svg>
  );
}

export function SrdIconFleurDeLis({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Center petal */}
      <path d="M12 2c-1.5 3-3 5.5-3 9a3 3 0 0 0 3 3 3 3 0 0 0 3-3c0-3.5-1.5-6-3-9z" fill="currentColor" fillOpacity="0.15" />
      {/* Left petal curling outward */}
      <path d="M9 11c-3-1-5 0-5.5 2.5S5 17 7 17c1 0 2-.5 2.5-1.5" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
      {/* Right petal curling outward */}
      <path d="M15 11c3-1 5 0 5.5 2.5S19 17 17 17c-1 0-2-.5-2.5-1.5" fill="currentColor" fillOpacity="0.1" strokeWidth="2" />
      {/* Stem */}
      <path d="M12 14v5" strokeWidth="2.5" />
      {/* Base crossbar with ornate ends */}
      <path d="M7.5 19.5h9" strokeWidth="2" />
      <path d="M8 21h8" strokeWidth="2.5" />
      {/* Base finials */}
      <circle cx="8" cy="21" r="0.5" fill="currentColor" />
      <circle cx="16" cy="21" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function SrdIconBow({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Bow limb (curved) with fill */}
      <path d="M18 2c-2 0-6 4-6 10s4 10 6 10" fill="currentColor" fillOpacity="0.08" />
      {/* Bowstring */}
      <path d="M18 2v20" strokeWidth="1.5" />
      {/* Arrow shaft */}
      <path d="M2 12h16" strokeWidth="2" />
      {/* Arrowhead */}
      <path d="M2 12l-0.5-1.5L0 12l1.5 1.5z" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
      <path d="M1 10.5L4 12l-3 1.5" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
      {/* Fletching */}
      <path d="M15 10.5l2 1.5-2 1.5" strokeWidth="1.5" strokeOpacity="0.5" />
      {/* Bow tip nocks */}
      <circle cx="18" cy="2" r="0.75" fill="currentColor" />
      <circle cx="18" cy="22" r="0.75" fill="currentColor" />
      {/* Arrow rest / grip area */}
      <path d="M17 10v4" strokeWidth="2.5" strokeOpacity="0.4" />
    </svg>
  );
}

export function SrdIconCrystal({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Main crystal body */}
      <path d="M12 2L7 8l5 14 5-14-5-6z" fill="currentColor" fillOpacity="0.15" />
      {/* Left facet */}
      <path d="M12 2L5 9l7 13" strokeWidth="2" />
      {/* Right facet */}
      <path d="M12 2l7 7-7 13" strokeWidth="2" />
      {/* Inner facet lines for crystalline look */}
      <path d="M5 9h14" strokeWidth="1.5" />
      <path d="M8 9l4 6" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M16 9l-4 6" strokeWidth="1" strokeOpacity="0.4" />
      {/* Sparkle at tip */}
      <path d="M10 3.5l2-2 2 2" strokeWidth="1" strokeOpacity="0.5" />
      {/* Energy glow lines */}
      <path d="M3 8l-1.5-.5" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M21 8l1.5-.5" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}

export function SrdIconScroll({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    </svg>
  );
}

// ─── Action Icons ───────────────────────────────────────────────────

export function SrdIconRun({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2" />
      <path d="m5 22 3-9" />
      <path d="m8 13 4-2 2 4 4-2" />
      <path d="M11 6l-3 7" />
    </svg>
  );
}

export function SrdIconFlip({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2.1l4 4-4 4" />
      <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8" />
      <path d="M7 21.9l-4-4 4-4" />
      <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
    </svg>
  );
}

export function SrdIconHandshake({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14h2" />
      <path d="m7 4 3.42 3.22" />
    </svg>
  );
}

export function SrdIconEyeOff({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function SrdIconClock({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function SrdIconSearch({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function SrdIconBackpack({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" />
      <path d="M8 10h8" />
    </svg>
  );
}

export function SrdIconFootprints({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5 10 8.64 8 10.68 8 12v4" />
      <path d="M16 8v2.38c0 2.12 1.03 3.12 1 5.62-.03 2.72-1.49 6-4.5 6-1.87 0-2.5-1.8-2.5-3.5 0-3.14 2-5.18 2-6.62V8" />
    </svg>
  );
}

export function SrdIconDoor({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <path d="M14 12v.01" />
    </svg>
  );
}

export function SrdIconSpeech({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function SrdIconStopwatch({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3 2 6" />
      <path d="m22 6-3-3" />
      <path d="M12 5V1" />
      <path d="M10 1h4" />
    </svg>
  );
}

export function SrdIconSleep({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h4l3 9" />
      <path d="M17 4h4" />
      <path d="M21 4l-2 4h-4l-2-4" />
      <path d="M8 17c0 2.21 1.79 4 4 4s4-1.79 4-4" />
      <path d="M12 13v4" />
    </svg>
  );
}

export function SrdIconRuler({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2" />
      <path d="m11.5 9.5 2-2" />
      <path d="m8.5 6.5 2-2" />
      <path d="m17.5 15.5 2-2" />
    </svg>
  );
}

// ─── Condition Icons (for category mapping) ─────────────────────────

export function SrdIconEar({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
      <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
    </svg>
  );
}

export function SrdIconGhost({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2 2 3-3 3 3 2-2 3 3V10a8 8 0 0 0-8-8z" />
    </svg>
  );
}

export function SrdIconStone({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17L12 2l10 15H2z" />
      <path d="M6 17l6-9 6 9" />
    </svg>
  );
}

export function SrdIconDizzy({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

export function SrdIconStop({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function SrdIconProneBody({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16h16" />
      <circle cx="7" cy="12" r="2" />
      <path d="M9 12h10" />
    </svg>
  );
}

export function SrdIconSleepZz({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6h4l-4 6h4" />
      <path d="M16 2h6l-6 8h6" />
      <path d="M2 18l4-4-4 4z" />
    </svg>
  );
}

// ─── Misc / disease ────────────────────────────────────────────────

export function SrdIconBiohazard({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="11.9" r="2" />
      <path d="M6.7 3.4c-.9 2.5 0 5.2 2.2 6.7C6.5 11 4.7 13 4.6 15.5" />
      <path d="M17.3 3.4c.9 2.5 0 5.2-2.2 6.7 2.4.9 4.2 2.9 4.3 5.4" />
      <path d="M12 18.9c-2.5 0-4.6-1.5-5.5-3.7h11c-.9 2.2-3 3.7-5.5 3.7z" />
    </svg>
  );
}

// ─── Strength / Ability score icons ─────────────────────────────────

export function SrdIconMuscle({ className }: IconProps) {
  return (
    <svg className={cn(className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 14s.5-2 3-2 3 2 5 2 3-2 5-2 3 2 5 2" />
      <path d="M3 10s.5-2 3-2 3 2 5 2 3-2 5-2 3 2 5 2" />
    </svg>
  );
}

// ─── Race detail stat icons ─────────────────────────────────────────

/** A simple initial-letter-in-circle for race/class cards */
export function SrdInitialCircle({
  letter,
  className,
  color,
}: {
  letter: string;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-bold font-[family-name:var(--font-cinzel)] ${className ?? "w-10 h-10 text-lg"}`}
      style={{
        borderColor: color ?? "var(--accent-gold)",
        color: color ?? "var(--accent-gold)",
        backgroundColor: color ? `${color}15` : "rgba(212,168,83,0.08)",
      }}
    >
      {letter}
    </span>
  );
}

// ─── Class icon name → component mapping ────────────────────────────

const CLASS_ICON_MAP: Record<string, React.FC<IconProps>> = {
  sword: SrdIconSword,
  "crossed-swords": SrdIconCrossedSwords,
  shield: SrdIconShield,
  music: SrdIconMusic,
  cross: SrdIconCross,
  leaf: SrdIconLeaf,
  fist: SrdIconFist,
  dagger: SrdIconDagger,
  "fleur-de-lis": SrdIconFleurDeLis,
  bow: SrdIconBow,
  crystal: SrdIconCrystal,
  wand: SrdIconWand,
  book: SrdIconBook,
  flame: SrdIconFlame,
  sparkle: SrdIconSparkle,
  skull: SrdIconSkull,
};

export function SrdClassIcon({
  iconName,
  className,
}: {
  iconName: string;
  className?: string;
}) {
  const Icon = CLASS_ICON_MAP[iconName] ?? SrdIconSword;
  return <Icon className={className} />;
}
