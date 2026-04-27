# Supabase Migration Runner — Canonical Pattern

**Audience:** AI agents and humans applying migrations to the Pocket DM Supabase project (`mdcmjpcjkqgyxvhweoqs.supabase.co`).

**Last verified:** 2026-04-27 (Sprint 3 bundle, agent without docker/CLI).

---

## TL;DR — How migrations actually deploy in this project

We do NOT use `supabase db push`, GitHub Actions, or any auto-deploy. Migrations land in two places:

1. **`supabase/migrations/NNN_<slug>.sql`** — source of truth in the repo (committed in the PR that introduces the change).
2. **The live Supabase database** — applied **manually via the Dashboard SQL Editor** by Dani, using a staged "bundle" prepared by the agent in `.claude/prod-deploy/<bundle-name>/`.

The two are **decoupled by design**: merging a PR with a migration file does NOT apply it to the database. An agent must explicitly stage the bundle and the human must run the SQL in the Dashboard.

This is why a PR can land on master with code that reads new columns, and the production app then crashes with `42703 column does not exist` — because nobody applied the migration. Always check.

---

## When to use which path

| Situation | Path |
|---|---|
| Adding a migration file to the repo (DDL or DML) | Commit `supabase/migrations/NNN_*.sql` in your feature PR. Reviewer gates merge. |
| Applying a migration to the live DB | **Stage a bundle** in `.claude/prod-deploy/<bundle-name>/` per the template below; ask Dani to run via Dashboard. |
| Quick experiment / read-only inspection | Use a Node script with `supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Pattern below. |
| pgTap test of an RLS policy | `npm run test:pgtap` (requires Docker — separate path, not for prod). |

**Agents do NOT have permission to apply migrations directly.** Even with the service role key, PostgREST only exposes table CRUD — not raw SQL. The Supabase Management API (which DOES allow raw SQL) requires a personal access token (PAT), not a service role key, and that PAT lives only in Dani's keychain.

---

## Bundle template — `.claude/prod-deploy/<bundle-name>/`

Every bundle has the same 4 files. Copy from an existing bundle (e.g. `sprint-3-bundle/`) and adapt:

```
.claude/prod-deploy/sprint-3-bundle/
├── README.md          # WHY + step-by-step Dashboard instructions
├── 00_sanity.sql      # READ-ONLY pre-flight — confirm DB state
├── 01_apply.sql       # The actual DDL/DML, wrapped in BEGIN/COMMIT
└── 02_verify.sql      # READ-ONLY post-flight — confirm landed
```

**Rules for `01_apply.sql`:**

- Wrap the whole file in `BEGIN; ... COMMIT;` so a partial failure rolls back.
- Make every statement idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, sentinel-guarded `UPDATE`s, `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` for named constraints).
- Concatenate the verbatim source migration files inline (with comment headers separating them) so the bundle is self-contained — no relative-path imports for Dashboard.

**Rules for `00_sanity.sql` and `02_verify.sql`:**

- READ-ONLY (`SELECT` only). They must be safe to re-run any time.
- Each query has an inline `-- expect: ...` comment so Dani can eyeball without guessing.

**README.md must include:**

1. Why this bundle exists (link to the PR that depends on it).
2. Target Supabase project ref (so Dani confirms in URL bar before pasting).
3. Step-by-step (Sanity → Apply → Verify), with exact expected outputs.
4. Rollback instructions for the case where someone needs to undo later.

Existing examples: [.claude/prod-deploy/README.md](../.claude/prod-deploy/README.md) (Sprint 1 bundle, 14 migrations) · [.claude/prod-deploy/sprint-3-bundle/README.md](../.claude/prod-deploy/sprint-3-bundle/README.md) (this sprint).

---

## Quick read-only checks via Node (no Dashboard needed)

For inspection or for DML migrations that can be expressed as PostgREST UPDATEs, write a Node script under `scripts/`. The canonical pattern:

```ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
```

Run with `npx tsx scripts/<your-script>.ts` (the project does not have `jest`/`vitest`/`tsx` as a top-level npm script — invoke `npx tsx` directly via `rtk proxy npx tsx ...`).

**Service role bypasses RLS** but only operates on PostgREST endpoints — meaning table CRUD only. You cannot run arbitrary DDL or computed multi-row UPDATEs (e.g. `SET col = some_function(other_col)`) this way. For those, use the Dashboard bundle.

**Check before assuming a migration was applied:**

```ts
const { error } = await s
  .from("player_characters")
  .select("hit_dice")
  .limit(1);

if (error?.code === "42703") {
  console.log("hit_dice column does not exist — migration 184 has not been applied to this DB.");
}
```

This is the cheapest possible smoke test and should be the first thing a feature-PR agent runs before SELECTing a new column.

---

## Common failure modes

### "Column does not exist" after merging a feature PR

**Cause:** the PR added a migration file but nobody applied it via the Dashboard. The merged code reads a column the DB doesn't have.

**Fix:** stage a bundle (`.claude/prod-deploy/<sprint>-bundle/`), have Dani apply via Dashboard. If urgent, revert the feature PR until the bundle lands.

**Prevention:** every PR that adds a `supabase/migrations/NNN_*.sql` file must include a paired bundle in `.claude/prod-deploy/` AND a checkbox in the PR description acknowledging that the bundle must be applied before merge to a release branch.

### "Both 184 and 184_combat_events_journal exist" filename collision

**Cause:** two parallel branches both numbered their new migration with the same prefix.

**Fix:** the PR that lands second must rename. Verify by `ls supabase/migrations/ | sort | uniq -d -w 3` before pushing.

### Dashboard SQL Editor times out on a large bundle

**Cause:** the editor accepts up to 1MB but long-running statements (matview rebuild, full-table backfill on millions of rows) can exceed UI timeout.

**Fix:** split the bundle into smaller `01_apply_a.sql` / `01_apply_b.sql` chunks. Each chunk gets its own BEGIN/COMMIT.

---

## What about `supabase db push` from CI?

Not configured. The team explicitly chose Dashboard apply over CLI/CI to keep service-role-equivalent credentials out of CI environments. Discussions to revisit this should reference the audit-rls.ts migration scanner — it's our static-analysis substitute for the safety net CI deploys would provide.

---

## Anti-patterns — DO NOT

- Apply migrations via the production Supabase REST endpoint with service role key trying to fake DDL — it doesn't work, and partial state is worse than nothing.
- Edit `supabase/migrations/NNN_*.sql` after it's been committed — write a new migration that adjusts.
- Skip the `02_verify.sql` step "because the migration looks safe" — it's the only way to catch silent partial applies.
- Apply the bundle without first running `00_sanity.sql` to confirm the DB is in the expected pre-state.
- Use `--admin` to bypass branch protection on a PR that contains a migration file but no paired bundle. The PR should not merge if the bundle isn't ready.
