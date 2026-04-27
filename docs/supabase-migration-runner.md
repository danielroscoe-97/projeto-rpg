# Supabase Migration Runner — Canonical Pattern

**Audience:** AI agents and humans applying migrations to the Pocket DM Supabase project (`mdcmjpcjkqgyxvhweoqs.supabase.co`).

**Last updated:** 2026-04-27 (Supabase CLI installed; agents now apply directly via `supabase db push --linked`).

---

## TL;DR — How migrations deploy in this project

**Primary path (use this):** `supabase db push --linked` from the agent's shell. CLI is installed at `C:\Users\dani_\bin\supabase.exe`, logged in via PAT in user keychain, project linked. Any agent running as user `dani_` inherits auth + link state automatically.

**Fallback path (only if CLI broken):** stage a bundle in `.claude/prod-deploy/<bundle-name>/` (sanity + apply + verify SQLs) and ask Dani to paste into Dashboard SQL Editor. This was the only path before 2026-04-27 — kept documented for emergency.

Migrations land in two places that must stay in sync:

1. **`supabase/migrations/NNN_<slug>.sql`** — source of truth in the repo (committed in the PR that introduces the change).
2. **The live Supabase database** — applied via `supabase db push --linked` (or, fallback, Dashboard).

Merging a PR with a migration file does NOT auto-apply it. The agent finishing the sprint MUST run `supabase migration list --linked` and confirm parity. Sprint 3 ended with PR #68 merged + reading `hit_dice` column that didn't exist in DB → would have crashed Player HQ on next deploy. Don't let that happen again.

---

## When to use which path

| Situation | Path |
|---|---|
| Adding a migration file to the repo (DDL or DML) | Commit `supabase/migrations/NNN_*.sql` in your feature PR. Reviewer gates merge. |
| Applying a migration to the live DB | **`supabase db push --linked`** (preview with `--dry-run` first) |
| Read-only inspection or DML-only data fixes | Node script with `supabase-js` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Pattern below. |
| pgTap test of an RLS policy | `npm run test:pgtap` (requires Docker — separate path, not for prod). |
| Emergency / CLI broken | Stage a bundle in `.claude/prod-deploy/<bundle-name>/` per template below; ask Dani to run via Dashboard. |

**Agents inherit Dani's CLI auth automatically** because the CLI stores its access token + linked project state in user-scoped paths (`%USERPROFILE%\AppData\Roaming\supabase` for the token; `supabase/.temp/` for link config — both gitignored). Any agent running as user `dani_` (= every Claude Code session on this Windows box) can run the CLI without re-authenticating.

---

## Primary path — `supabase db push --linked`

The 3 commands you usually need (in order):

```bash
# 1. See what's pending. Reads `supabase/migrations/` locally vs `supabase_migrations.schema_migrations` remote.
supabase migration list --linked

# 2. Preview what would be applied without applying.
supabase db push --linked --dry-run

# 3. Actually apply. Asks `[Y/n]` before push.
supabase db push --linked
```

**Idempotent:** already-applied migrations skip. Safe to re-run.

**What it can do:** any DDL or DML in `supabase/migrations/`. ALTER TABLE, CREATE FUNCTION, INSERT, UPDATE — all work.

**What it cannot do:** apply a SQL file that's NOT in `supabase/migrations/`. If you need to run a one-off SQL that shouldn't be a migration (e.g., a backfill that derives from runtime data, an investigation query), use a Node script with supabase-js — pattern below.

**If install or auth is broken:**
- `supabase --version` should print 2.90.0 or later. If "command not found", reinstall: `Invoke-WebRequest -Uri "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz" -OutFile "$env:TEMP\sup.tar.gz"; tar -xzf "$env:TEMP\sup.tar.gz" -C "$env:USERPROFILE\bin" supabase.exe`
- `supabase projects list` should list the project. If "not authenticated", Dani regenerates PAT at https://supabase.com/dashboard/account/tokens → `supabase login --token sbp_...`
- `supabase migration list --linked` should print history. If "not linked", re-link: `supabase link --project-ref mdcmjpcjkqgyxvhweoqs --password '<db-password>'`

**Never use `supabase db reset --linked`** — destructive, drops all data on remote and re-applies from zero. Only safe on local dev DBs.

---

## Fallback — Bundle template `.claude/prod-deploy/<bundle-name>/`

Use only if CLI is broken or for high-risk migrations where you want Dani to eyeball each query before running. Pattern documented for emergency.

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
