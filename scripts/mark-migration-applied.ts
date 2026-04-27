/**
 * Mark a migration as applied in supabase_migrations.schema_migrations.
 *
 * Use case: when DDL was applied via some path other than `supabase db
 * push` (e.g., the DDL succeeded but the schema_migrations INSERT failed
 * due to a version collision), this script registers it so the CLI
 * stops re-attempting.
 *
 * Usage:
 *   npx tsx scripts/mark-migration-applied.ts <version> <name>
 * Example:
 *   npx tsx scripts/mark-migration-applied.ts 184_player_chars player_characters_hit_dice_class_resources
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const [version, name] = process.argv.slice(2);
if (!version || !name) {
  console.error("Usage: npx tsx scripts/mark-migration-applied.ts <version> <name>");
  process.exit(1);
}

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  const { data, error } = await s
    .schema("supabase_migrations" as never)
    .from("schema_migrations")
    .insert({ version, name, statements: [] })
    .select();

  if (error) {
    if (error.code === "23505") {
      console.log(`Already registered (version ${version}). No-op.`);
      return;
    }
    console.error("Failed:", error);
    process.exit(1);
  }
  console.log("Registered:", data);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
