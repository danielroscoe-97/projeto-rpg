// Re-export the same OG image for Twitter cards
// runtime must be declared inline (Next.js 16 Turbopack requirement)
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pocket DM — Rastreador de Combate D&D 5e";

export { default } from "./opengraph-image";
