#!/usr/bin/env tsx
/**
 * Google Search Console export.
 *
 * Pulls 7d / 28d / 90d search analytics for every verified dimension
 * (query / page / country / device) from the Search Console API and
 * writes a versioned JSON snapshot to data/seo/gsc-{YYYY-MM-DD}.json.
 *
 * Usage:
 *   npm run seo:gsc-export
 *
 * Env vars (required):
 *   GSC_SERVICE_ACCOUNT_EMAIL  — full service account email
 *   GSC_SERVICE_ACCOUNT_KEY    — base64-encoded service account JSON key
 *   GSC_SITE                   — e.g. "sc-domain:pocketdm.com.br"
 *
 * Setup (one-time, ~30min human work — see docs/seo-workflow.md §7):
 *   1. GCP Console → Create project / pick existing
 *   2. Enable "Google Search Console API"
 *   3. IAM → Service Accounts → Create → download JSON key
 *   4. Search Console → Settings → Users → add service account email
 *      (Restricted permission)
 *   5. base64-encode the JSON key and save to env vars above
 *
 * Design notes:
 *   - Hand-rolled JWT + OAuth2 (no googleapis dependency, ~30 extra LOC)
 *   - Idempotent: if today's file already exists, skips the fetch
 *   - Single API call per dimension (not combined) because combining
 *     dimensions triggers GSC's 50k-row limit and we want full coverage.
 */

import { createHash, createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────

const OUT_DIR = join(process.cwd(), "data/seo");
const PERIODS = [7, 28, 90] as const;
const DIMENSIONS = ["query", "page", "country", "device"] as const;
const ROW_LIMIT = 25_000; // GSC max is 25k per call

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Period = (typeof PERIODS)[number];
type Dimension = (typeof DIMENSIONS)[number];

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscResponse {
  rows?: GscRow[];
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

// ─────────────────────────────────────────────────────────────────
// JWT + OAuth2 (hand-rolled, no dep)
// ─────────────────────────────────────────────────────────────────

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(key: ServiceAccountKey): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: key.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(
    JSON.stringify(claim),
  )}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = b64url(signer.sign(key.private_key));
  return `${unsigned}.${signature}`;
}

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const assertion = signJwt(key);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(
      `OAuth2 token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

// ─────────────────────────────────────────────────────────────────
// GSC API
// ─────────────────────────────────────────────────────────────────

function datesForPeriod(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  // GSC has 2-3 day data lag; shift end back 3 days so the window is complete
  end.setDate(end.getDate() - 3);
  start.setDate(start.getDate() - 3);
  return { startDate: fmt(start), endDate: fmt(end) };
}

async function querySearchAnalytics(
  token: string,
  site: string,
  dimension: Dimension,
  period: Period,
): Promise<GscRow[]> {
  const { startDate, endDate } = datesForPeriod(period);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    site,
  )}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: ROW_LIMIT,
      dataState: "final",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(
      `GSC query ${dimension}/${period}d failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as GscResponse;
  return json.rows ?? [];
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

function loadKey(): ServiceAccountKey {
  const b64 = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!b64) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_KEY env var missing. See docs/seo-workflow.md §7.",
    );
  }
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch (err) {
    throw new Error(
      `GSC_SERVICE_ACCOUNT_KEY malformed (must be base64-encoded JSON): ${(err as Error).message}`,
    );
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const site = process.env.GSC_SITE ?? "sc-domain:pocketdm.com.br";
  const outFile = join(OUT_DIR, `gsc-${todayStamp()}.json`);

  if (existsSync(outFile) && !process.argv.includes("--force")) {
    console.log(
      `⏭ ${outFile} already exists (pass --force to regenerate). Skipping.`,
    );
    return;
  }

  console.log(`→ gsc-export ${site} → ${outFile}`);
  const key = loadKey();
  const token = await getAccessToken(key);

  const snapshot: Record<string, Record<string, GscRow[]>> = {};

  for (const period of PERIODS) {
    const key = `period_${period}d`;
    snapshot[key] = {};
    for (const dim of DIMENSIONS) {
      process.stdout.write(`  ${key}/${dim}... `);
      try {
        const rows = await querySearchAnalytics(token, site, dim, period);
        snapshot[key][`top_${dim === "query" ? "queries" : dim === "page" ? "pages" : `${dim}s`}`] =
          rows;
        console.log(`${rows.length} rows`);
      } catch (err) {
        console.log(`FAILED: ${(err as Error).message}`);
        snapshot[key][`top_${dim}_error`] =
          [{ keys: [(err as Error).message], clicks: 0, impressions: 0, ctr: 0, position: 0 }];
      }
    }
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const envelope = {
    generatedAt: new Date().toISOString(),
    site,
    snapshot,
    integrityHash: createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex"),
  };
  writeFileSync(outFile, JSON.stringify(envelope, null, 2));

  const totals = Object.entries(snapshot).map(([period, dims]) => {
    const total = Object.values(dims).reduce((a, b) => a + b.length, 0);
    return `${period}:${total}`;
  });
  console.log(`✓ wrote ${outFile} (${totals.join(", ")})`);
}

main().catch((err) => {
  console.error(`✗ gsc-export failed: ${err.message}`);
  process.exit(1);
});

export {};
