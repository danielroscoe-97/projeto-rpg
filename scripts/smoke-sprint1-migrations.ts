// scripts/smoke-sprint1-migrations.ts
//
// Parse-level smoke test for the Sprint 1 migrations (165-173). Runs
// without a live Postgres — we use libpg_query (via pg-query-emscripten)
// to validate that every statement in every migration file actually
// parses. This catches ~80% of "will this apply cleanly?" concerns:
//   * unterminated strings / heredocs
//   * mismatched parentheses
//   * invalid keywords
//   * malformed DDL
// It does NOT catch semantic errors (missing tables, missing columns,
// invalid search_path targets) — those need a real Postgres.
// For full integration smoke, run `npm run test:pgtap` (requires Docker).
//
// Run with: `npx tsx scripts/smoke-sprint1-migrations.ts`

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// pg-query-emscripten CJS exports { default: factory } where factory()
// returns a Promise<PgQueryInstance> with .parse(sql).
// No TS types shipped — loose `any` is fine for a smoke script.
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const pgQueryModule = require("pg-query-emscripten");
const pgQueryFactory: (() => Promise<any>) = pgQueryModule.default ?? pgQueryModule;

const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

// Re-review hardening: glob Sprint 1+ migrations (range 159-199 for now) so
// new migrations are included automatically. Hard-coding the list let older
// runs of this script silently skip new files.
function discoverMigrations(): string[] {
  const pattern = /^(\d{3})_.*\.sql$/;
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => {
      const m = f.match(pattern);
      if (!m) return false;
      const n = parseInt(m[1], 10);
      // 159+ covers the Sprint 1 window and anything downstream until we
      // expand the range intentionally.
      return n >= 159;
    })
    .sort();
}

const MIGRATIONS = discoverMigrations();

interface ParseResult {
  file: string;
  bytes: number;
  statements: number;
  error: string | null;
}

async function smoke(): Promise<ParseResult[]> {
  const pgQuery = await pgQueryFactory();
  const results: ParseResult[] = [];

  for (const fname of MIGRATIONS) {
    const full = join(ROOT, "supabase", "migrations", fname);
    let contents: string;
    try {
      contents = readFileSync(full, "utf8");
    } catch (err) {
      results.push({
        file: fname,
        bytes: 0,
        statements: 0,
        error: `read failed: ${(err as Error).message}`,
      });
      continue;
    }

    try {
      const parsed = pgQuery.parse(contents);
      // pg-query-emscripten returns { parse_tree, error, stderr_buffer }.
      // error is null on success. stderr_buffer can carry warnings that
      // don't prevent parsing.
      if (parsed.error) {
        const err = parsed.error;
        results.push({
          file: fname,
          bytes: contents.length,
          statements: 0,
          // err can be an object with message + cursorpos OR a string.
          error:
            typeof err === "string"
              ? err
              : `${err.message ?? "parse error"}${
                  err.cursorpos != null ? ` @ char ${err.cursorpos}` : ""
                }`,
        });
      } else {
        // parse_tree is `{ version, stmts: [...] }` per libpg_query.
        const tree = parsed.parse_tree;
        const stmts = tree && Array.isArray(tree.stmts) ? tree.stmts.length : 0;
        results.push({
          file: fname,
          bytes: contents.length,
          statements: stmts,
          error: null,
        });
      }
    } catch (err) {
      results.push({
        file: fname,
        bytes: contents.length,
        statements: 0,
        error: `thrown: ${(err as Error).message}`,
      });
    }
  }

  return results;
}

(async () => {
  const results = await smoke();
  const failed = results.filter((r) => r.error);
  const okCount = results.length - failed.length;
  const totalStmts = results.reduce((a, r) => a + r.statements, 0);

  for (const r of results) {
    if (r.error) {
      process.stderr.write(`FAIL ${r.file} — ${r.error}\n`);
    } else {
      process.stderr.write(
        `ok   ${r.file}  (${r.statements} stmts, ${r.bytes} bytes)\n`,
      );
    }
  }

  process.stderr.write(
    `\n${okCount}/${results.length} files parse clean · ${totalStmts} statements total\n`,
  );

  process.stdout.write(JSON.stringify({ results, ok: okCount, failed: failed.length }, null, 2) + "\n");
  process.exitCode = failed.length === 0 ? 0 : 1;
})().catch((err) => {
  // Re-review hardening: unhandled promise rejection (wasm init failure,
  // permission error escaping the inner try, etc.) must surface as an
  // exit-1 so CI fails loudly rather than reporting green.
  process.stderr.write(`FATAL ${String(err?.stack ?? err)}\n`);
  process.exit(1);
});
