#!/usr/bin/env tsx
/**
 * Split components/blog/BlogPostContent.tsx into per-post files.
 *
 * Usage: `rtk npx tsx scripts/split-blog-monolith.ts`
 *
 * Emits:
 *   components/blog/posts/_shared.tsx  — exported helpers (H2, H3, Img, etc.)
 *   components/blog/posts/post-NN-{slug}.tsx  — one file per BlogPostN
 *
 * Safety:
 *   - Computes SHA-256 of each function body BEFORE writing
 *   - Re-reads each written file and re-computes hash
 *   - Exit 1 if any mismatch (byte-level parity violated)
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MONOLITH = join(ROOT, "components/blog/BlogPostContent.tsx");
const OUT_DIR = join(ROOT, "components/blog/posts");

// Slug map derived from app/blog/[slug]/page.tsx CONTENT_MAP (single source of truth)
const SLUGS: Record<number, string> = {
  1: "como-usar-combat-tracker-dnd-5e",
  2: "ferramentas-essenciais-mestre-dnd-5e",
  3: "combat-tracker-vs-vtt-diferenca",
  4: "guia-condicoes-dnd-5e",
  5: "como-agilizar-combate-dnd-5e",
  6: "como-usar-pocket-dm-tutorial",
  7: "como-montar-encontro-balanceado-dnd-5e",
  8: "guia-challenge-rating-dnd-5e",
  9: "melhores-monstros-dnd-5e",
  10: "como-mestrar-dnd-primeira-vez",
  11: "musica-ambiente-para-rpg",
  12: "teatro-da-mente-vs-grid-dnd-5e",
  13: "build-half-elf-order-cleric-divine-soul-sorcerer",
  14: "build-half-elf-order-cleric-divine-soul-sorcerer-en",
  15: "diario-de-aventura",
  16: "guia-mestre-eficaz-combate-dnd-5e",
  17: "como-gerenciar-hp-dnd-5e",
  18: "7-erros-mestre-combate-dnd",
  19: "iniciativa-dnd-5e-regras-variantes",
  20: "best-initiative-tracker-dnd-5e",
  21: "best-initiative-tracker-dnd-5e-en",
};

const EXPECTED_COUNT = Object.keys(SLUGS).length;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/**
 * Given a source string and a starting position of `function BlogPostN() {`,
 * returns the index of the matching closing `}` (brace-balanced).
 */
function findMatchingBrace(source: string, openBraceIdx: number): number {
  let depth = 0;
  let inString: string | null = null;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = openBraceIdx;
  for (; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "`") inTemplate = false;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "`") {
      inTemplate = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`No matching brace found starting at ${openBraceIdx}`);
}

/**
 * Extract the body text (content between the function's outer braces, exclusive)
 * from source starting at a given function signature match.
 */
function extractFunctionBody(source: string, sigStart: number): { body: string; endIdx: number } {
  // Find the opening `{` after BlogPostN()
  const openIdx = source.indexOf("{", sigStart);
  if (openIdx === -1) throw new Error(`No opening brace after ${sigStart}`);
  const closeIdx = findMatchingBrace(source, openIdx);
  const body = source.slice(openIdx + 1, closeIdx);
  return { body, endIdx: closeIdx + 1 };
}

function zeroPad(n: number): string {
  return n.toString().padStart(2, "0");
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────

const source = readFileSync(MONOLITH, "utf8");

// Locate header boundary: everything before first `export function BlogPost1(`
const firstFnMatch = source.match(/export function BlogPost1\(\)\s*\{/);
if (!firstFnMatch || firstFnMatch.index === undefined) {
  throw new Error("Could not find `export function BlogPost1()` in monolith");
}
const headerRaw = source.slice(0, firstFnMatch.index).trimEnd();

// Transform header into _shared.tsx:
//   1. Remove imports we don't want (EbookCTA, BuildVariant*) — posts import directly
//   2. Add `export` to every `function XYZ(` declaration that lacks it
function buildSharedModule(header: string): string {
  let out = header;

  // Drop EbookCTA and BuildVariant imports (posts will import directly)
  out = out.replace(/\nimport\s+\{\s*EbookCTA\s*\}\s+from\s+"\.\/EbookCTA";/g, "");
  out = out.replace(
    /\nimport\s+\{\s*BuildVariantProvider,\s*BuildVariantToggle,\s*Variant,\s*StrategyBox,?\s*\}\s+from\s+"\.\/BuildVariant";/g,
    "",
  );

  // Add `export` keyword to every top-level `function XYZ(` that doesn't have it
  out = out.replace(
    /^function\s+([A-Z]\w*)\s*\(/gm,
    "export function $1(",
  );

  return out.trim() + "\n";
}

const sharedContent = buildSharedModule(headerRaw);

// Now extract each BlogPostN body
const fnRegex = /export function BlogPost(\d+)\(\)\s*\{/g;
let match: RegExpExecArray | null;
const bodies: Array<{ n: number; body: string; hash: string }> = [];

while ((match = fnRegex.exec(source)) !== null) {
  const n = Number.parseInt(match[1], 10);
  if (!SLUGS[n]) {
    throw new Error(`BlogPost${n} found but no slug mapping. Update SLUGS.`);
  }
  const sigStart = match.index;
  const { body } = extractFunctionBody(source, sigStart);
  bodies.push({ n, body, hash: sha256(body) });
}

if (bodies.length !== EXPECTED_COUNT) {
  throw new Error(
    `Expected ${EXPECTED_COUNT} BlogPost functions, found ${bodies.length}`,
  );
}

// Write output
if (existsSync(OUT_DIR)) {
  // Clean output dir (only files we control)
  rmSync(OUT_DIR, { recursive: true, force: true });
}
mkdirSync(OUT_DIR, { recursive: true });

// Write _shared.tsx
writeFileSync(join(OUT_DIR, "_shared.tsx"), sharedContent);

// Per-post files
const POST_IMPORTS = `import Link from "next/link";
import Image from "next/image";
import {
  BuildVariantProvider,
  BuildVariantToggle,
  Variant,
  StrategyBox,
} from "../BuildVariant";
import { EbookCTA } from "../EbookCTA";
import {
  Img,
  ExtLink,
  IntLink,
  ProdLink,
  H2,
  H3,
  P,
  Li,
  Ul,
  Tip,
  CTA,
  FloatingArt,
  SectionDivider,
  ArtCallout,
} from "./_shared";
`;

// Track output hashes for parity verification
const outputHashes: Array<{ n: number; hash: string; slug: string }> = [];

for (const { n, body, hash } of bodies) {
  const slug = SLUGS[n];
  const filename = `post-${zeroPad(n)}-${slug}.tsx`;
  const content = `${POST_IMPORTS}
export default function BlogPost${n}() {${body}}
`;
  writeFileSync(join(OUT_DIR, filename), content);

  // Re-read and re-hash to verify byte-level parity
  const written = readFileSync(join(OUT_DIR, filename), "utf8");
  const writtenBodyMatch = written.match(
    /export default function BlogPost\d+\(\)\s*\{/,
  );
  if (!writtenBodyMatch || writtenBodyMatch.index === undefined) {
    throw new Error(`Could not re-parse ${filename} body`);
  }
  const { body: writtenBody } = extractFunctionBody(
    written,
    writtenBodyMatch.index,
  );
  const writtenHash = sha256(writtenBody);
  if (writtenHash !== hash) {
    throw new Error(
      `Parity violation in ${filename}: expected ${hash}, got ${writtenHash}`,
    );
  }
  outputHashes.push({ n, hash: writtenHash, slug });
}

// Save parity manifest for verify-blog-parity.ts to consume
const tmpDir = join(ROOT, ".tmp");
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
writeFileSync(
  join(tmpDir, "blog-parity.json"),
  JSON.stringify(
    {
      source: MONOLITH,
      generatedAt: new Date().toISOString(),
      posts: outputHashes.sort((a, b) => a.n - b.n),
    },
    null,
    2,
  ),
);

console.log(
  `✓ Split ${bodies.length} posts into ${OUT_DIR}\n` +
    `✓ _shared.tsx + ${bodies.length} post files written\n` +
    `✓ Parity manifest: .tmp/blog-parity.json\n` +
    `✓ All body hashes match source`,
);
