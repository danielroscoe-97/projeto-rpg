#!/usr/bin/env npx tsx
/**
 * RLS Audit Script — Story 4
 *
 * Connects to Supabase with service_role, queries pg_catalog for every
 * public table, checks if RLS is enabled, and lists active policies.
 *
 * Output format:
 *   ✅ table: RLS enabled, N policies (descriptions)
 *   ⚠️ table: RLS enabled, incomplete policies
 *   ❌ table: RLS NOT enabled — RISK
 *
 * Usage:
 *   npx tsx scripts/audit-rls.ts
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Service role key (bypasses RLS)
 */

// NOTE: This script parses migration SQL files statically.
// No live Supabase connection is required.

// ---------------------------------------------------------------------------
// Expected policies per table (minimum operations that should have policies)
// ---------------------------------------------------------------------------

/** Minimum required policy operations per table. */
const EXPECTED_POLICIES: Record<string, string[]> = {
  users: ["SELECT", "INSERT", "UPDATE"],
  campaigns: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  player_characters: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  sessions: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  encounters: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  combatants: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  monsters: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  spells: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  condition_types: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  session_tokens: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  monster_presets: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  analytics_events: ["SELECT", "INSERT"],
  subscriptions: ["SELECT", "INSERT", "UPDATE"],
  feature_flags: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  session_notes: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  session_files: ["SELECT", "INSERT", "DELETE"],
  // campaign_invites table dropped in migration 180 (2026-04-21).
  homebrew_monsters: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  homebrew_spells: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  homebrew_items: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  player_audio_files: ["SELECT", "INSERT", "DELETE"],
  campaign_notes: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  campaign_members: ["SELECT", "INSERT", "UPDATE", "DELETE"],
  rate_limits: [],  // Service-only table, RLS optional
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolicyInfo {
  tablename: string;
  policyname: string;
  cmd: string; // ALL, SELECT, INSERT, UPDATE, DELETE
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(70));
  console.log("  RLS AUDIT REPORT");
  console.log("  " + new Date().toISOString());
  console.log("=".repeat(70));
  console.log();

  // Parse migration files to determine RLS status and policies.
  // (supabase-js doesn't support raw SQL queries against pg_catalog,
  // so we statically analyze the migration files instead.)
  console.log("Analyzing migration files for RLS configuration...\n");

  const fs = await import("fs");
  const path = await import("path");

  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.error("ERROR: supabase/migrations/ directory not found.");
    console.error("Run this script from the project root.");
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();

  // Parse all CREATE TABLE statements
  const allTables: Set<string> = new Set();
  // Parse all ENABLE ROW LEVEL SECURITY statements
  const rlsEnabled: Set<string> = new Set();
  // Parse all CREATE POLICY statements
  const policies: Map<string, PolicyInfo[]> = new Map();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    // Find CREATE TABLE statements
    const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?(\w+)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      allTables.add(match[1]);
    }

    // Find ALTER TABLE ... ENABLE ROW LEVEL SECURITY
    const rlsRegex = /ALTER TABLE\s+(?:public\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/gi;
    while ((match = rlsRegex.exec(content)) !== null) {
      rlsEnabled.add(match[1]);
    }

    // Find CREATE POLICY statements — handles both quoted and unquoted policy names
    const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)\s+(?:FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE))?|CREATE POLICY\s+(\w+)\s+ON\s+(?:public\.)?(\w+)\s+(?:FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE))?/gi;
    while ((match = policyRegex.exec(content)) !== null) {
      const policyName = match[1] || match[4];
      const tableName = match[2] || match[5];
      const cmd = (match[3] || match[6] || "ALL").toUpperCase();

      if (!policies.has(tableName)) {
        policies.set(tableName, []);
      }
      policies.get(tableName)!.push({
        tablename: tableName,
        policyname: policyName,
        cmd,
      });
    }

    // Also handle DROP POLICY (to avoid counting dropped policies)
    const dropPolicyRegex = /DROP POLICY(?:\s+IF EXISTS)?\s+"([^"]+)"\s+ON\s+(?:public\.)?(\w+)|DROP POLICY(?:\s+IF EXISTS)?\s+(\w+)\s+ON\s+(?:public\.)?(\w+)/gi;
    while ((match = dropPolicyRegex.exec(content)) !== null) {
      const policyName = match[1] || match[3];
      const tableName = match[2] || match[4];
      const tablePolicies = policies.get(tableName);
      if (tablePolicies) {
        const idx = tablePolicies.findIndex((p) => p.policyname === policyName);
        if (idx >= 0) {
          tablePolicies.splice(idx, 1);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  let riskyCount = 0;
  let warningCount = 0;
  let okCount = 0;

  const sortedTables = Array.from(allTables).sort();

  for (const table of sortedTables) {
    const hasRls = rlsEnabled.has(table);
    const tablePolicies = policies.get(table) ?? [];

    if (!hasRls) {
      console.log(`  ❌ ${table}: RLS NOT enabled — RISK`);
      riskyCount++;
      continue;
    }

    // Expand ALL policies into individual operations for coverage check
    const coveredOps = new Set<string>();
    for (const p of tablePolicies) {
      if (p.cmd === "ALL") {
        ["SELECT", "INSERT", "UPDATE", "DELETE"].forEach((op) => coveredOps.add(op));
      } else {
        coveredOps.add(p.cmd);
      }
    }

    // Check against expected policies
    const expected = EXPECTED_POLICIES[table];
    const policyDescriptions = tablePolicies.map((p) => `${p.policyname} (${p.cmd})`);

    if (expected) {
      const missing = expected.filter((op) => !coveredOps.has(op));
      if (missing.length > 0) {
        console.log(
          `  ⚠️  ${table}: RLS enabled, ${tablePolicies.length} policies — MISSING: ${missing.join(", ")}`,
        );
        if (policyDescriptions.length > 0) {
          console.log(`      Policies: ${policyDescriptions.join(", ")}`);
        }
        warningCount++;
      } else {
        console.log(
          `  ✅ ${table}: RLS enabled, ${tablePolicies.length} policies`,
        );
        if (policyDescriptions.length <= 6) {
          console.log(`      ${policyDescriptions.join(", ")}`);
        } else {
          console.log(`      ${policyDescriptions.slice(0, 6).join(", ")} ...and ${policyDescriptions.length - 6} more`);
        }
        okCount++;
      }
    } else {
      // Table not in expected list — just report what we find
      if (tablePolicies.length === 0) {
        console.log(
          `  ⚠️  ${table}: RLS enabled but NO policies defined — may block all access`,
        );
        warningCount++;
      } else {
        console.log(
          `  ✅ ${table}: RLS enabled, ${tablePolicies.length} policies (not in expected list)`,
        );
        console.log(`      ${policyDescriptions.join(", ")}`);
        okCount++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log();
  console.log("=".repeat(70));
  console.log("  SUMMARY");
  console.log("=".repeat(70));
  console.log(`  Total tables:  ${sortedTables.length}`);
  console.log(`  ✅ Secure:     ${okCount}`);
  console.log(`  ⚠️  Warnings:   ${warningCount}`);
  console.log(`  ❌ At risk:    ${riskyCount}`);
  console.log();

  if (riskyCount > 0) {
    console.log("  ACTION REQUIRED: Tables without RLS are publicly accessible!");
    console.log("  Run migrations or add RLS policies for the flagged tables.");
    process.exit(1);
  } else if (warningCount > 0) {
    console.log("  REVIEW: Some tables have incomplete policy coverage.");
    console.log("  This may be intentional (e.g., service-only writes).");
    process.exit(0);
  } else {
    console.log("  All tables have RLS enabled with complete policy coverage.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
