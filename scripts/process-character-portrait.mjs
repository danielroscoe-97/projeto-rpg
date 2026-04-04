/**
 * process-character-portrait.mjs
 *
 * Two-phase pipeline (separate processes to avoid native module conflicts):
 *   Phase 1: @imgly/background-removal-node → transparent PNG
 *   Phase 2: sharp → resize + gold glow + final PNG
 *
 * Usage: node scripts/process-character-portrait.mjs
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const INPUT = resolve("public/fichas/capa barsavi/7a8ac97f-4a11-4e05-9240-36bd47ed794f.jpg");
const INTERMEDIATE = resolve("public/art/blog/.capa-barsavi-nobg.png");
const OUTPUT = resolve("public/art/blog/capa-barsavi-portrait.png");

// ── Phase 1: Background removal (separate process) ─────────────
console.log("⏳ Phase 1: Removing background...");
execFileSync("node", [resolve("scripts/_bg-remove.mjs"), INPUT, INTERMEDIATE], {
  stdio: "inherit",
  timeout: 240_000,
});

// ── Phase 2: Glow effect (separate process) ─────────────────────
console.log("⏳ Phase 2: Adding gold glow...");
execFileSync("node", [resolve("scripts/_glow-effect.cjs"), INTERMEDIATE, OUTPUT], {
  stdio: "inherit",
  timeout: 60_000,
});

console.log("🎨 Done! Portrait ready at", OUTPUT);
