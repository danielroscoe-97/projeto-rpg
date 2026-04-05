/**
 * Crown d20 medal badges for the 4 methodology title tiers.
 * Each badge builds on the Pocket DM crown d20 logo motif,
 * with increasing visual complexity per tier.
 */

interface BadgeProps {
  className?: string;
}

/** Simplified crown path reused across all tiers (scaled to 48x48 viewBox) */
const CROWN_D =
  "M14.5,18.5 L13,8.5 L18.5,12.5 L24,4 L29.5,12.5 L35,8.5 L33.5,18.5 L24,13 Z";

/** Simplified d20 hex outline (scaled to 48x48 viewBox) */
const HEX_POINTS = "24,16 32,20.5 32,31 24,35.5 16,31 16,20.5";

// ── Bronze: Explorador ──────────────────────────────────────────────────────
export function BronzeBadge({ className }: BadgeProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bronze-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4956B" />
          <stop offset="50%" stopColor="#CD7F32" />
          <stop offset="100%" stopColor="#8B5E34" />
        </linearGradient>
        <linearGradient id="bronze-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CD7F32" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8B5E34" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Outer ring */}
      <circle cx="24" cy="26" r="19" stroke="url(#bronze-grad)" strokeWidth="2" fill="url(#bronze-fill)" />

      {/* Ribbon tails */}
      <path d="M12,40 L8,47 L14,44 L16,40" fill="#CD7F32" opacity="0.7" />
      <path d="M36,40 L40,47 L34,44 L32,40" fill="#CD7F32" opacity="0.7" />

      {/* D20 hex */}
      <polygon points={HEX_POINTS} stroke="#CD7F32" strokeWidth="1.2" fill="none" opacity="0.5" />

      {/* Crown */}
      <path d={CROWN_D} fill="#CD7F32" stroke="#D4956B" strokeWidth="0.5" strokeLinejoin="round" opacity="0.85" />

      {/* Inner triangle */}
      <polygon points="24,22 19,31 29,31" stroke="#CD7F32" strokeWidth="0.8" fill="none" opacity="0.3" />
    </svg>
  );
}

// ── Silver: Caçador de Dados ────────────────────────────────────────────────
export function SilverBadge({ className }: BadgeProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="silver-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8E8EC" />
          <stop offset="50%" stopColor="#A8A9AD" />
          <stop offset="100%" stopColor="#6B6E73" />
        </linearGradient>
        <linearGradient id="silver-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C0C0C0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6B6E73" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Outer ring — double border */}
      <circle cx="24" cy="26" r="19" stroke="url(#silver-grad)" strokeWidth="2" fill="url(#silver-fill)" />
      <circle cx="24" cy="26" r="16.5" stroke="#A8A9AD" strokeWidth="0.5" fill="none" opacity="0.3" />

      {/* Ribbon tails */}
      <path d="M12,40 L7,47 L14,43.5 L16,40" fill="#A8A9AD" opacity="0.7" />
      <path d="M36,40 L41,47 L34,43.5 L32,40" fill="#A8A9AD" opacity="0.7" />

      {/* D20 hex */}
      <polygon points={HEX_POINTS} stroke="#C0C0C0" strokeWidth="1.3" fill="none" opacity="0.55" />

      {/* Crown */}
      <path d={CROWN_D} fill="#B0B0B8" stroke="#E0E0E4" strokeWidth="0.5" strokeLinejoin="round" opacity="0.9" />

      {/* Inner triangle + facet lines */}
      <polygon points="24,22 19,31 29,31" stroke="#C0C0C0" strokeWidth="0.8" fill="none" opacity="0.35" />
      <line x1="24" y1="16" x2="19" y2="31" stroke="#A8A9AD" strokeWidth="0.5" opacity="0.25" />
      <line x1="24" y1="16" x2="29" y2="31" stroke="#A8A9AD" strokeWidth="0.5" opacity="0.25" />

      {/* Shimmer highlight */}
      <ellipse cx="19" cy="20" rx="3" ry="5" fill="white" opacity="0.06" transform="rotate(-20 19 20)" />
    </svg>
  );
}

// ── Gold: Pesquisador Pocket DM ─────────────────────────────────────────────
export function GoldBadge({ className }: BadgeProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gold-badge-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C87A" />
          <stop offset="50%" stopColor="#D4A853" />
          <stop offset="100%" stopColor="#B8903D" />
        </linearGradient>
        <linearGradient id="gold-badge-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A853" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#B8903D" stopOpacity="0.25" />
        </linearGradient>
        <filter id="gold-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Soft outer glow */}
      <circle cx="24" cy="26" r="20" fill="#D4A853" opacity="0.06" />

      {/* Outer ring — double border with glow */}
      <g filter="url(#gold-glow)">
        <circle cx="24" cy="26" r="19" stroke="url(#gold-badge-grad)" strokeWidth="2.2" fill="url(#gold-badge-fill)" />
      </g>
      <circle cx="24" cy="26" r="16.5" stroke="#D4A853" strokeWidth="0.6" fill="none" opacity="0.25" />

      {/* Decorative dots on ring */}
      <circle cx="24" cy="7.5" r="1" fill="#D4A853" opacity="0.5" />
      <circle cx="24" cy="44.5" r="1" fill="#B8903D" opacity="0.4" />
      <circle cx="5.5" cy="26" r="1" fill="#D4A853" opacity="0.35" />
      <circle cx="42.5" cy="26" r="1" fill="#D4A853" opacity="0.35" />

      {/* Ribbon tails */}
      <path d="M12,40 L6,48 L14,43 L16,40" fill="#D4A853" opacity="0.8" />
      <path d="M36,40 L42,48 L34,43 L32,40" fill="#D4A853" opacity="0.8" />

      {/* D20 hex */}
      <polygon points={HEX_POINTS} stroke="#D4A853" strokeWidth="1.4" fill="none" opacity="0.6" />

      {/* Crown — main element */}
      <path d={CROWN_D} fill="url(#gold-badge-grad)" stroke="#E8C87A" strokeWidth="0.6" strokeLinejoin="round" />

      {/* Inner triangle + all facet lines */}
      <polygon points="24,22 19,31 29,31" stroke="#D4A853" strokeWidth="0.8" fill="none" opacity="0.4" />
      <line x1="24" y1="16" x2="19" y2="31" stroke="#D4A853" strokeWidth="0.6" opacity="0.3" />
      <line x1="24" y1="16" x2="29" y2="31" stroke="#D4A853" strokeWidth="0.6" opacity="0.3" />
      <line x1="24" y1="35.5" x2="19" y2="31" stroke="#D4A853" strokeWidth="0.5" opacity="0.25" />
      <line x1="24" y1="35.5" x2="29" y2="31" stroke="#D4A853" strokeWidth="0.5" opacity="0.25" />
      <line x1="16" y1="20.5" x2="24" y2="22" stroke="#D4A853" strokeWidth="0.4" opacity="0.2" />
      <line x1="32" y1="20.5" x2="24" y2="22" stroke="#D4A853" strokeWidth="0.4" opacity="0.2" />

      {/* Shimmer highlight */}
      <ellipse cx="19" cy="19" rx="3.5" ry="6" fill="white" opacity="0.07" transform="rotate(-15 19 19)" />
    </svg>
  );
}

// ── Special: Arquiteto do Meta ──────────────────────────────────────────────
export function SpecialBadge({ className }: BadgeProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="special-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="special-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="special-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8C87A" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <filter id="special-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Animated pulse ring */}
      <circle cx="24" cy="26" r="22" stroke="#A855F7" strokeWidth="0.5" fill="none" opacity="0.2">
        <animate attributeName="r" values="21;23;21" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.08;0.2" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Outer glow */}
      <circle cx="24" cy="26" r="20" fill="#A855F7" opacity="0.06" />

      {/* Main ring with glow */}
      <g filter="url(#special-glow)">
        <circle cx="24" cy="26" r="19" stroke="url(#special-grad)" strokeWidth="2.5" fill="url(#special-fill)" />
      </g>
      <circle cx="24" cy="26" r="16.5" stroke="#A855F7" strokeWidth="0.5" fill="none" opacity="0.2" />

      {/* Corner sparkles */}
      <g opacity="0.5">
        <line x1="6" y1="10" x2="8" y2="12" stroke="#C084FC" strokeWidth="1" strokeLinecap="round" />
        <line x1="5" y1="11" x2="9" y2="11" stroke="#C084FC" strokeWidth="1" strokeLinecap="round" />
      </g>
      <g opacity="0.4">
        <line x1="40" y1="10" x2="42" y2="12" stroke="#C084FC" strokeWidth="1" strokeLinecap="round" />
        <line x1="39" y1="11" x2="43" y2="11" stroke="#C084FC" strokeWidth="1" strokeLinecap="round" />
      </g>
      <g opacity="0.35">
        <line x1="6" y1="40" x2="8" y2="42" stroke="#C084FC" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="5" y1="41" x2="9" y2="41" stroke="#C084FC" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* Ribbon tails — purple */}
      <path d="M12,40 L5,48 L14,43 L16,40" fill="#A855F7" opacity="0.75" />
      <path d="M36,40 L43,48 L34,43 L32,40" fill="#A855F7" opacity="0.75" />

      {/* D20 hex — full detail */}
      <polygon points={HEX_POINTS} stroke="#C084FC" strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Crown — gold-to-purple gradient */}
      <path d={CROWN_D} fill="url(#special-crown)" stroke="#E8C87A" strokeWidth="0.5" strokeLinejoin="round" opacity="0.95" />

      {/* All facet lines */}
      <polygon points="24,22 19,31 29,31" stroke="#C084FC" strokeWidth="0.9" fill="none" opacity="0.4" />
      <line x1="24" y1="16" x2="19" y2="31" stroke="#C084FC" strokeWidth="0.6" opacity="0.3" />
      <line x1="24" y1="16" x2="29" y2="31" stroke="#C084FC" strokeWidth="0.6" opacity="0.3" />
      <line x1="24" y1="35.5" x2="19" y2="31" stroke="#C084FC" strokeWidth="0.5" opacity="0.25" />
      <line x1="24" y1="35.5" x2="29" y2="31" stroke="#C084FC" strokeWidth="0.5" opacity="0.25" />
      <line x1="16" y1="20.5" x2="24" y2="22" stroke="#C084FC" strokeWidth="0.4" opacity="0.2" />
      <line x1="32" y1="20.5" x2="24" y2="22" stroke="#C084FC" strokeWidth="0.4" opacity="0.2" />
      <line x1="16" y1="31" x2="19" y2="31" stroke="#C084FC" strokeWidth="0.4" opacity="0.2" />
      <line x1="32" y1="31" x2="29" y2="31" stroke="#C084FC" strokeWidth="0.4" opacity="0.2" />

      {/* Shimmer */}
      <ellipse cx="19" cy="19" rx="3" ry="5.5" fill="white" opacity="0.06" transform="rotate(-15 19 19)" />
    </svg>
  );
}
