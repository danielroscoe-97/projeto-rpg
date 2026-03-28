// ── RPG Visual Language Design Tokens ────────────────────────────────────────

/** Fire gradient color stops (red-dark → orange → gold) */
export const FIRE_GRADIENT = {
  dark: "#7f1d1d",    // red-900
  mid: "#c2410c",     // orange-700
  warm: "#E8593C",    // brand warm
  ember: "#f59e0b",   // amber-500
  gold: "#D4A853",    // brand gold
} as const;

/** Pre-built CSS gradient strings */
export const FIRE_GRADIENTS = {
  horizontal: `linear-gradient(90deg, ${FIRE_GRADIENT.dark}, ${FIRE_GRADIENT.mid}, ${FIRE_GRADIENT.warm}, ${FIRE_GRADIENT.ember}, ${FIRE_GRADIENT.gold})`,
  vertical: `linear-gradient(180deg, ${FIRE_GRADIENT.dark}, ${FIRE_GRADIENT.mid}, ${FIRE_GRADIENT.warm}, ${FIRE_GRADIENT.ember}, ${FIRE_GRADIENT.gold})`,
  radial: `radial-gradient(circle, ${FIRE_GRADIENT.gold}, ${FIRE_GRADIENT.ember}, ${FIRE_GRADIENT.warm}, ${FIRE_GRADIENT.mid}, ${FIRE_GRADIENT.dark})`,
} as const;

/** Torch glow box-shadow values */
export const TORCH_GLOW = {
  low: "0 0 12px rgba(212,168,83,0.15), 0 0 4px rgba(232,89,60,0.1)",
  medium: "0 0 20px rgba(212,168,83,0.25), 0 0 8px rgba(232,89,60,0.15)",
  high: "0 0 30px rgba(212,168,83,0.4), 0 0 15px rgba(232,89,60,0.2)",
} as const;

/**
 * Returns an interpolated fire color from dark red to bright gold
 * based on position within a sequence.
 * step is 1-based, total is the count of steps.
 */
export function getFireStepColor(step: number, total: number): string {
  const stops = [
    FIRE_GRADIENT.dark,
    FIRE_GRADIENT.mid,
    FIRE_GRADIENT.warm,
    FIRE_GRADIENT.ember,
    FIRE_GRADIENT.gold,
  ];
  const t = Math.max(0, Math.min(1, total <= 1 ? 1 : (step - 1) / (total - 1)));
  const idx = t * (stops.length - 1);
  const lower = Math.max(0, Math.min(Math.floor(idx), stops.length - 1));
  const upper = Math.min(lower + 1, stops.length - 1);
  const frac = idx - lower;

  return lerpHex(stops[lower], stops[upper], frac);
}

/** Linear interpolation between two hex colors */
function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
