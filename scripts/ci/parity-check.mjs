#!/usr/bin/env node
/**
 * Combat Parity Gate — enforces the Combat Parity Rule from CLAUDE.md.
 *
 * Rule (paraphrased):
 *   Any PR that changes combat/player/guest runtime components MUST ship
 *   test coverage for the 3 access modes (Guest / Anon / Auth) OR declare
 *   that parity does not apply (label `parity-exempt` + rationale in PR body).
 *
 * How this script decides:
 *   1. Read CHANGED_FILES (multi-line string, one file per line) from env.
 *   2. If NONE of the changed files match a "triggering path" → PASS (rule
 *      not invoked at all).
 *   3. If triggering paths exist, check for "covering" evidence:
 *        a) The PR adds/edits at least one spec under e2e/ that clearly
 *           exercises each of the 3 modes (Guest OR /try, Anon OR /join,
 *           Auth OR /invite + loginAs), AND
 *        b) UI-only changes still require at least one spec touching Auth
 *           path (Guest + Anon optional if doc-labelled as auth-only).
 *      The heuristic is intentionally conservative — false positives are
 *      cheap to clear (add `parity-exempt` label + explain), false
 *      negatives let parity drift.
 *   4. If PR has label `parity-exempt` → PASS with warning only.
 *
 * The heuristic is imperfect by design. See `docs/parity-check.md` §"When
 * the gate is wrong" for how to override.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const CHANGED = (process.env.CHANGED_FILES ?? "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const PR_BODY = process.env.PR_BODY ?? "";
const PR_LABELS_RAW = process.env.PR_LABELS ?? "[]";
let labels = [];
try {
  labels = JSON.parse(PR_LABELS_RAW);
} catch {
  labels = [];
}

/** Triggering paths — changes here invoke the parity rule. */
const TRIGGER_GLOBS = [
  (f) => f.startsWith("components/combat/"),
  (f) => f.startsWith("components/player/"),
  (f) => f.startsWith("components/guest/"),
  // App routes that host those components
  (f) => f.startsWith("app/try/"),
  (f) => f.startsWith("app/join/"),
  (f) => f.startsWith("app/invite/"),
  (f) => f.startsWith("app/app/campaigns/") && /combat|sheet|journey|run/.test(f),
  (f) => f.startsWith("app/combat/"),
];

/** Test-only paths — don't count as "touching combat" even if they match triggers. */
const IS_TEST_FILE = (f) =>
  f.startsWith("e2e/") ||
  f.startsWith("tests/") ||
  f.endsWith(".test.ts") ||
  f.endsWith(".test.tsx") ||
  f.endsWith(".spec.ts") ||
  f.endsWith(".spec.tsx");

/** Files that definitely don't count as "runtime" — docs, generated, etc. */
const NON_RUNTIME = (f) =>
  f.endsWith(".md") ||
  f.startsWith("docs/") ||
  f.startsWith("_bmad-output/") ||
  f.startsWith("_bmad/") ||
  f.startsWith(".claude/");

/** Classify each changed file. */
const triggering = CHANGED.filter((f) => {
  if (IS_TEST_FILE(f)) return false;
  if (NON_RUNTIME(f)) return false;
  return TRIGGER_GLOBS.some((fn) => fn(f));
});

const specChanges = CHANGED.filter((f) => f.startsWith("e2e/") && (f.endsWith(".spec.ts") || f.endsWith(".spec.tsx")));

/** Label exemption — bypass entirely. */
if (labels.includes("parity-exempt")) {
  console.log("✅ Parity gate bypassed via `parity-exempt` label.");
  console.log("   Triggering files:");
  for (const f of triggering) console.log("     -", f);
  console.log("\n   Ensure the PR description explains WHY parity does not apply.");
  process.exit(0);
}

/** Short-circuit: no triggering files. */
if (triggering.length === 0) {
  console.log("✅ No combat/player/guest runtime files changed — parity gate not invoked.");
  process.exit(0);
}

console.log("Combat Parity Gate invoked — PR touches runtime combat/player/guest files:");
for (const f of triggering) console.log("  -", f);
console.log("");

/**
 * Evidence heuristic: scan every added/changed spec file for signals of
 * each mode. A spec that only references one mode counts only for that
 * mode; a spec touching multiple modes counts for each.
 */
const SIGNALS = {
  guest: [/\/try\b/, /GuestCombatClient/, /guest-try-mode/, /\bguest\b/i],
  anon: [
    /\/join\//,
    /signInAnonymously/,
    // `session_token` (singular or plural) — RLS column name referenced
    // by anon-aware specs. Broader than token literals but tight enough
    // that it doesn't match unrelated tokens like `session_id`.
    /\bsession_tokens?\b/,
    // Literal "Anon" / "Anonymous" only in spec-title-ish contexts:
    // a capitalized word at start of a line or inside common assertion
    // messages. Avoids the `supabase-anon-key` false positive.
    /\bAnonymous\b/,
    /\b[Aa]non\s+(?:user|player|mode|session|join|browser|context|tab)\b/,
    // Helpers that drive the anon-via-/join flow — player joins without
    // a prior auth step. `joinSession` and `playerJoinCombat` both route
    // through PlayerJoinClient + session_tokens.
    /\bjoinSession\b/,
    /\bplayerJoinCombat\b/,
    /\bjoinAsPlayer\b/,
  ],
  auth: [/loginAs(?:DM)?\b/, /\/invite\//, /E2E_DM_EMAIL/, /campaign_members/, /\bauthenticated\b/i],
};

const modesCovered = { guest: [], anon: [], auth: [] };

for (const spec of specChanges) {
  let content = "";
  try {
    content = readFileSync(path.resolve(spec), "utf8");
  } catch {
    // File was deleted; skip.
    continue;
  }
  for (const [mode, patterns] of Object.entries(SIGNALS)) {
    if (patterns.some((re) => re.test(content))) {
      modesCovered[mode].push(spec);
    }
  }
}

console.log("Spec evidence (changed/added under e2e/):");
for (const [mode, files] of Object.entries(modesCovered)) {
  const label = mode.toUpperCase().padEnd(5);
  if (files.length === 0) {
    console.log(`  ${label} — ❌ no covering spec change`);
  } else {
    console.log(`  ${label} — ✅ ${files.length} spec(s):`);
    for (const f of files) console.log("          ", f);
  }
}
console.log("");

const missing = Object.entries(modesCovered)
  .filter(([, files]) => files.length === 0)
  .map(([mode]) => mode);

if (missing.length === 0) {
  console.log("✅ All 3 modes have spec evidence in this PR.");
  process.exit(0);
}

/**
 * Missing modes — but allow PR author to declare mode-specific intent in
 * the body. Look for block:
 *
 *   <!-- parity-intent
 *   guest: n/a (data persistence feature, Auth-only)
 *   anon: n/a (data persistence feature, Auth-only)
 *   -->
 */
const intentMatch = /<!--\s*parity-intent([\s\S]*?)-->/i.exec(PR_BODY);
const declaredNA = new Set();
if (intentMatch) {
  const block = intentMatch[1];
  for (const line of block.split(/\r?\n/)) {
    const m = /^\s*(guest|anon|auth)\s*:\s*(n\/a|na|skip|exempt)\b/i.exec(line);
    if (m) declaredNA.add(m[1].toLowerCase());
  }
}

if (declaredNA.size > 0) {
  console.log("PR declares parity-intent in body:");
  for (const mode of declaredNA) console.log(`  ${mode.toUpperCase()} → N/A`);
  console.log("");
}

const stillMissing = missing.filter((m) => !declaredNA.has(m));
if (stillMissing.length === 0) {
  console.log("✅ Remaining modes covered by parity-intent declarations.");
  process.exit(0);
}

console.log("❌ Combat Parity Gate FAILED.");
console.log("");
console.log("This PR changes combat/player/guest runtime but does not ship spec");
console.log(`evidence for: ${stillMissing.map((m) => m.toUpperCase()).join(", ")}`);
console.log("");
console.log("To resolve, do ONE of the following:");
console.log("  1. Add/edit e2e/**.spec.ts files that exercise the missing mode(s).");
console.log("     See the mode → client table in CLAUDE.md (Combat Parity Rule).");
console.log("  2. Add a parity-intent block to the PR body for modes where the");
console.log("     feature genuinely does not apply, e.g.:");
console.log("");
console.log("       <!-- parity-intent");
console.log("       guest: n/a (data persistence, Auth-only)");
console.log("       -->");
console.log("");
console.log("  3. If this PR is a pure refactor with no behavior change, add the");
console.log("     label `parity-exempt` and explain in the PR body.");
console.log("");
console.log("See docs/parity-check.md for full guidance.");
process.exit(1);
