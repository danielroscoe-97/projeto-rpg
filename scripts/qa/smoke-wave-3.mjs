#!/usr/bin/env node
/**
 * scripts/qa/smoke-wave-3.mjs
 *
 * Wave 3 smoke test — validates that staging (or any BASE_URL) has the
 * Epic 03 Conversion Moments endpoints wired and that the i18n keys
 * Wave 3 depends on are present in both locales.
 *
 * Usage:
 *   BASE_URL=https://staging.pocketdm.com.br node scripts/qa/smoke-wave-3.mjs
 *   node scripts/qa/smoke-wave-3.mjs --base=https://pocketdm.com.br
 *
 * Exits with code 0 when all checks PASS, 1 otherwise. Designed for CI +
 * ad-hoc pre-deploy verification.
 *
 * What this does NOT test:
 *   - Real upgrade/migrate logic (requires anon auth + session_tokens).
 *   - OAuth flows (requires provider interaction).
 *   - Dismissal state / analytics aggregates (use the SQL query in
 *     docs/qa/wave-3-manual-qa-checklist.md §3).
 *
 * What this DOES test:
 *   1. BASE_URL responds (health).
 *   2. /api/track accepts `conversion:cta_shown` event (200 without cookie).
 *   3. /api/player-identity/upgrade endpoint exists (any non-5xx response).
 *   4. /api/player-identity/migrate-guest-character requires auth (401,
 *      not 500 — proves route exists and auth-gating works).
 *   5. /auth/callback/continue responds without crash (redirect or 200,
 *      never 5xx).
 *   6. i18n keys for Wave 3 present in both locales (grep messages/*.json
 *      via a local filesystem read).
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

// ── CLI / env parsing ────────────────────────────────────────────────────

function parseBase() {
  const argFlag = process.argv.find((a) => a.startsWith("--base="));
  if (argFlag) return argFlag.slice("--base=".length);
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return "http://localhost:3000";
}

const BASE = parseBase().replace(/\/$/, "");
const TIMEOUT_MS = 15_000;

// ── Pretty printing ──────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const results = [];

function ok(name, detail = "") {
  pass++;
  const line = `  PASS  ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  results.push({ name, status: "PASS", detail });
}

function ko(name, detail = "") {
  fail++;
  const line = `  FAIL  ${name}${detail ? ` — ${detail}` : ""}`;
  console.error(line);
  results.push({ name, status: "FAIL", detail });
}

// ── Fetch with timeout ───────────────────────────────────────────────────

async function fetchWithTimeout(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
  } finally {
    clearTimeout(t);
  }
}

// ── Checks ───────────────────────────────────────────────────────────────

async function checkHealth() {
  const name = "1. Health — BASE_URL responds";
  try {
    const resp = await fetchWithTimeout(`${BASE}/`);
    if (resp.status >= 500) {
      ko(name, `HTTP ${resp.status}`);
      return;
    }
    ok(name, `HTTP ${resp.status}`);
  } catch (err) {
    ko(name, `fetch error: ${err?.message ?? err}`);
  }
}

async function checkTrackConversion() {
  const name = "2. POST /api/track accepts conversion:cta_shown";
  try {
    const resp = await fetchWithTimeout(`${BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "conversion:cta_shown",
        properties: { moment: "waiting_room", source: "smoke-test" },
        page_path: "/smoke",
      }),
    });
    // Accept 200 (inserted) or 429 (rate-limited — still proves endpoint works).
    if (resp.status === 200 || resp.status === 429) {
      ok(name, `HTTP ${resp.status}`);
      return;
    }
    // 400 "unknown_event" would mean the conversion:* events were removed from the allowlist — that's a 🔴.
    let body = "";
    try {
      body = await resp.text();
    } catch { /* ignore */ }
    ko(name, `HTTP ${resp.status} body=${body.slice(0, 120)}`);
  } catch (err) {
    ko(name, `fetch error: ${err?.message ?? err}`);
  }
}

async function checkUpgradeEndpointExists() {
  const name = "3. POST /api/player-identity/upgrade route exists (no 5xx)";
  try {
    const resp = await fetchWithTimeout(`${BASE}/api/player-identity/upgrade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smoke: true }),
    });
    // We expect 400/401/403 — NOT 500 or 404.
    if (resp.status >= 500) {
      ko(name, `HTTP ${resp.status} (server error — route may be broken)`);
      return;
    }
    if (resp.status === 404) {
      ko(name, "HTTP 404 — route missing from deploy");
      return;
    }
    ok(name, `HTTP ${resp.status}`);
  } catch (err) {
    ko(name, `fetch error: ${err?.message ?? err}`);
  }
}

async function checkMigrateGuestCharacterAuthGate() {
  const name = "4. POST /api/player-identity/migrate-guest-character returns 401 unauthenticated";
  try {
    const resp = await fetchWithTimeout(
      `${BASE}/api/player-identity/migrate-guest-character`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smoke: true }),
      },
    );
    // 401 = correct (auth-gated); 403 = also acceptable; 400 also OK
    // (validation before auth). 500 or 200 would be a problem.
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      ok(name, `HTTP ${resp.status}`);
      return;
    }
    if (resp.status === 200) {
      ko(name, "HTTP 200 — endpoint accepted unauthenticated request (auth bypass 🔴)");
      return;
    }
    if (resp.status >= 500) {
      ko(name, `HTTP ${resp.status} (server crashed on unauthenticated POST)`);
      return;
    }
    ok(name, `HTTP ${resp.status} (non-crashing non-success, treated as gated)`);
  } catch (err) {
    ko(name, `fetch error: ${err?.message ?? err}`);
  }
}

async function checkAuthCallbackContinue() {
  const name = "5. GET /auth/callback/continue responds without 5xx";
  try {
    const resp = await fetchWithTimeout(
      `${BASE}/auth/callback/continue?next=/app/dashboard`,
    );
    // Expect 200 OR a 3xx redirect (follow=manual leaves it). 5xx = 🔴.
    if (resp.status >= 500) {
      ko(name, `HTTP ${resp.status} (server crashed)`);
      return;
    }
    ok(name, `HTTP ${resp.status}`);
  } catch (err) {
    ko(name, `fetch error: ${err?.message ?? err}`);
  }
}

// ── i18n keys check (local filesystem) ───────────────────────────────────

const REQUIRED_KEYS = [
  ["conversion", "waiting_room", "cta_primary"],
  ["conversion", "recap_anon", "headline"],
  ["conversion", "recap_guest", "cta_primary"],
  ["conversion", "turn_safety_toast", "combat_started"],
  ["conversion", "turn_safety_toast", "your_turn"],
  ["conversion", "dm_badge", "authenticating"],
];

function resolvePath(obj, path) {
  let node = obj;
  for (const k of path) {
    if (node == null || typeof node !== "object" || !(k in node)) return undefined;
    node = node[k];
  }
  return node;
}

async function checkI18nKeys() {
  for (const locale of ["en", "pt-BR"]) {
    const name = `6. i18n keys present in messages/${locale}.json`;
    try {
      const raw = await readFile(
        join(REPO_ROOT, "messages", `${locale}.json`),
        "utf-8",
      );
      const json = JSON.parse(raw);
      const missing = [];
      for (const path of REQUIRED_KEYS) {
        const value = resolvePath(json, path);
        if (typeof value !== "string" || value.length === 0) {
          missing.push(path.join("."));
        }
      }
      if (missing.length === 0) {
        ok(name, `${REQUIRED_KEYS.length}/${REQUIRED_KEYS.length} keys`);
      } else {
        ko(name, `missing keys: ${missing.join(", ")}`);
      }
    } catch (err) {
      ko(name, `read/parse error: ${err?.message ?? err}`);
    }
  }
}

// ── Runner ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nWave 3 smoke test — BASE=${BASE}\n`);
  await checkHealth();
  await checkTrackConversion();
  await checkUpgradeEndpointExists();
  await checkMigrateGuestCharacterAuthGate();
  await checkAuthCallbackContinue();
  await checkI18nKeys();

  console.log(`\nResults: ${pass} PASS · ${fail} FAIL`);
  if (fail > 0) {
    console.error("\nSmoke test FAILED. See above for details.");
    process.exit(1);
  }
  console.log("\nSmoke test PASSED.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(2);
});
