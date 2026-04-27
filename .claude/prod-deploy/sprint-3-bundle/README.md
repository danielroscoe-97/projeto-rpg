# Sprint 3 Bundle — migrations 184 + 185 (P0)

**Status:** PENDING APPLY — production has master commits that read columns this bundle creates. Apply BEFORE the next Vercel deploy from master, or roll back PR #68.

## What's in here

| File | Purpose |
|---|---|
| `00_sanity.sql` | Read-only pre-flight. Confirm hit_dice / class_resources don't exist yet. |
| `01_apply.sql` | Apply migrations 184 + 185 in one transaction. Idempotent. |
| `02_verify.sql` | Read-only post-flight. Confirm columns + constraints + backfilled rows. |
| `184_player_characters_hit_dice_class_resources.sql` | Source migration 184 (verbatim from PR #58). |
| `185_backfill_hit_dice.sql` | Source migration 185 (verbatim from PR #69). |

## Why this bundle exists

Sprint 3 merged 11 PRs to master, including PR #68 ("A4 em-dash → real values"). That PR's [useCharacterStatus.ts](../../../lib/hooks/useCharacterStatus.ts) `.select(...)` call now lists `hit_dice, class_resources` — which fails with PostgREST `42703 column does not exist` on any environment that hasn't applied migration 184 yet.

Confirmed via dev DB (`mdcmjpcjkqgyxvhweoqs.supabase.co`): hit_dice column missing. Production almost certainly the same state since 184 was committed in #58 (Sprint 2) but never applied via Dashboard.

## How to apply (Supabase Dashboard SQL Editor)

**Target:** `mdcmjpcjkqgyxvhweoqs` ("danielroscoe-97's Project") — confirm in URL bar.

### Step 1 — Sanity (read-only)

1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste `00_sanity.sql` → Run.
3. Verify: `hit_dice_exists = false`, `class_resources_exists = false`. The 3-row result for `id/level/name` confirms the table shape.
4. Note the `backfill_target_count` — that's how many rows will be touched in step 2.

### Step 2 — Apply

1. New query → paste `01_apply.sql` → Run.
2. Expected runtime: < 1s on current dataset (small player_characters table).
3. If a row count of "X rows affected" appears, that matches the `backfill_target_count` from step 1.

### Step 3 — Verify

1. New query → paste `02_verify.sql` → Run.
2. Verify all 5 result sets:
   - 2 column rows (hit_dice + class_resources, jsonb, NOT NULL)
   - 2 CHECK constraint rows
   - `backfilled_rows = backfill_target_count` from step 1; `min_hd_max > 0`; `max_hd_max ≤ 20`
   - Spot-check 5 rows show `hit_dice = {"max": <level>, "used": 0}`
   - 0 bad_hit_dice, 0 bad_class_resources

### Step 4 — Close PR #69

After step 3 is green, the open PR #69 (migration 185 file in repo) is informational. Either merge it to master so master's `supabase/migrations/` reflects what's in the DB, or close it as "applied directly via Dashboard". Recommend MERGE so `supabase db push` from a future agent's machine doesn't try to re-apply.

## Rollback (if step 2 fails mid-apply)

The transaction wraps everything in BEGIN/COMMIT, so a failure inside step 2 rolls back automatically. If you need to undo AFTER a successful apply:

```sql
BEGIN;
ALTER TABLE player_characters DROP CONSTRAINT IF EXISTS player_characters_hit_dice_is_object;
ALTER TABLE player_characters DROP CONSTRAINT IF EXISTS player_characters_class_resources_is_object;
ALTER TABLE player_characters DROP COLUMN IF EXISTS hit_dice;
ALTER TABLE player_characters DROP COLUMN IF EXISTS class_resources;
COMMIT;
```

Note: dropping the columns will break the master deploy (useCharacterStatus selects them). Only roll back if you also revert PR #68 + #74 + #78 from master. Prefer fix-forward unless you understand the dependency chain.

## Followup: migration 186 (sync trigger)

Per Winston's review of PR #69, migration 185 ships only the backfill. The original spec also asked for a Postgres trigger that mirrors `character_resource_trackers` ↔ `player_characters.class_resources.primary`. Deferred to migration 186 (Sprint 7), with Winston's recommendation = option **(a)**: add `is_primary BOOLEAN DEFAULT false` + partial unique index per character + sync trigger.

Not blocking for A4 (#68). Do NOT include in this bundle.
