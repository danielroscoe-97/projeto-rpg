/**
 * Animated SVG icons for landing page feature cards.
 * Each icon uses stroke-dashoffset animation (line-draw effect) triggered by CSS.
 */
import React from "react";

const iconProps = {
  width: 32,
  height: 32,
  viewBox: "0 0 32 32",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  className: "feature-icon",
  "aria-hidden": true as const,
};

/** Crossed swords — Combat Tracker */
export function SwordsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 26L20 12M20 12V18M20 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
      <path d="M26 26L12 12M12 12V18M12 12H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="draw-line" style={{ animationDelay: "0.15s" }} />
      <circle cx="6" cy="26" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="26" cy="26" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

/** Phone with live signal — Player View */
export function LivePhoneIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="4" width="14" height="24" rx="2.5" stroke="currentColor" strokeWidth="1.8" className="draw-line" />
      <line x1="13" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" className="draw-line pulse-ring" style={{ animationDelay: "0.2s" }} />
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="0.8" opacity="0.3" className="pulse-ring" style={{ animationDelay: "0.4s" }} />
      <circle cx="16" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

/** Crystal ball — Oracle */
export function OracleIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="16" cy="15" r="9" stroke="currentColor" strokeWidth="1.8" className="draw-line" />
      <ellipse cx="16" cy="24" rx="7" ry="2" stroke="currentColor" strokeWidth="1.2" opacity="0.4" className="draw-line" style={{ animationDelay: "0.15s" }} />
      <path d="M12 13q2-3 4-1t4-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" className="draw-line" style={{ animationDelay: "0.3s" }} />
      <circle cx="13.5" cy="12" r="1" fill="currentColor" opacity="0.3" className="twinkle" />
      <circle cx="19" cy="10.5" r="0.7" fill="currentColor" opacity="0.3" className="twinkle" style={{ animationDelay: "0.5s" }} />
    </svg>
  );
}

/** Open book with bookmark — Rules */
export function BookIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 6v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <path d="M16 6C14 5 10 4 5 5v18c5-1 9 0 11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
      <path d="M16 6c2-1 6-2 11-1v18c-5-1-9 0-11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="draw-line" style={{ animationDelay: "0.15s" }} />
      {/* Bookmark */}
      <path d="M22 5v7l-2-1.5L18 12V5" stroke="currentColor" strokeWidth="1.2" fill="rgba(212,168,83,0.15)" className="draw-line" style={{ animationDelay: "0.3s" }} />
    </svg>
  );
}

/** Floppy disk with cloud — Save */
export function SaveIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="5" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="1.8" className="draw-line" />
      <path d="M9 5v7h14V5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className="draw-line" style={{ animationDelay: "0.1s" }} />
      <rect x="18" y="6" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="10" y="17" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.4" className="draw-line" style={{ animationDelay: "0.2s" }} />
    </svg>
  );
}

/** Moon with stars — Dark Mode */
export function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M22 18A10 10 0 0114 6a10 10 0 108 12z" stroke="currentColor" strokeWidth="1.8" className="draw-line" />
      <circle cx="22" cy="8" r="1" fill="currentColor" opacity="0.5" className="twinkle" />
      <circle cx="26" cy="12" r="0.7" fill="currentColor" opacity="0.4" className="twinkle" style={{ animationDelay: "0.3s" }} />
      <circle cx="24" cy="5" r="0.5" fill="currentColor" opacity="0.3" className="twinkle" style={{ animationDelay: "0.6s" }} />
    </svg>
  );
}
