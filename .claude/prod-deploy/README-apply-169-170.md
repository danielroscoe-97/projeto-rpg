# Apply Migrations 169 + 170 to Prod

**Context:** QA smoke 2026-04-22 (Epic 12 fix pass) found migrations 169 and 170 missing from prod. These ship:

- **169** — `get_past_companions(p_user_id uuid, p_limit int, p_offset int)` RPC for the "past companions" viral loop UI (Epic 04 Story 04-A Area 5)
- **170** — `clone_campaign_from_template(p_template_id uuid, p_new_dm_user_id uuid)` RPC for the template clone flow (Epic 04 Story 04-C)

Both missing functions return `404 PGRST202` on RPC calls, so features 04-B and 04-C can't execute in prod right now.

**Idempotence:** both files are `CREATE OR REPLACE FUNCTION`. Safe to re-run on a partially-applied state. The `IF NOT EXISTS` / `ON CONFLICT` pattern is already in place where needed.

## Steps

### 1. Sanity pre-check (optional)

Paste into **Supabase Dashboard > SQL Editor** and run:

```sql
-- Both should return false (functions ABSENT). If either is true, skip that one.
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_past_companions') AS func_169_present,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clone_campaign_from_template') AS func_170_present;
```

### 2. Apply

Paste the contents of `apply-169-170.sql` into the SQL Editor and run.

Expected: ~1-2s, creates 2 SECURITY DEFINER functions, grants EXECUTE to `authenticated`. No row count output from CREATE FUNCTION.

### 3. Post-check

```sql
-- Both should now be true.
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_past_companions') AS func_169_present,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clone_campaign_from_template') AS func_170_present;

-- Grants sanity
SELECT proname, pg_get_function_arguments(oid) AS args, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname IN ('get_past_companions', 'clone_campaign_from_template');
```

### 4. Update schema_migrations registry

If the existing `register-migrations.sql` pattern is being used, the registry already has rows for 169 and 170 with empty `statements` arrays (pattern set by previous deploys). No additional action needed — the code will re-validate functions exist at call time.

If you want to rebuild the registry to reflect the actual SQL:

```sql
UPDATE supabase_migrations.schema_migrations
SET statements = ARRAY[
  -- paste actual SQL chunks here, one per line
]::text[]
WHERE version IN ('169', '170');
```

(This is cosmetic — doesn't affect runtime.)

## Verification script

After applying, run:

```bash
npx tsx scripts/qa-epic12-verify-migrations.ts
```

Expected output for 169/170 should change from `status: 404` to `status: 200` (or `4xx` with a sensible error body — e.g. "p_user_id cannot be null" — proving the function exists and accepts params).

---

**Do NOT push any new commits until this is applied** — the features that depend on these functions (past companions UI, template clone) are already deployed but will silently fail. Applying the migrations fixes them without code changes.