-- 141_encounter_started_at_trigger.sql
-- S5.6 — Encounter duration telemetry
--
-- Problem: `encounters.started_at` is sometimes NULL because:
--   1. Old rows predate the schema adding started_at.
--   2. Potential paths that set is_active=true without touching started_at.
-- Downstream aggregators report "duration 18s" falsely for NULL rows.
--
-- Fix:
--   (1) Backfill: use created_at as a proxy for encounters already closed
--       (is_active=false) with NULL started_at. This is the best retroactive
--       signal we have; forward-looking rows are handled by the trigger below.
--   (2) Trigger: on the transition is_active false -> true, auto-populate
--       started_at if it is NULL. Explicit `started_at: now()` in the app
--       code (lib/supabase/session.ts) remains the preferred path; the
--       trigger is a safety net for any future caller that forgets.

-- (1) Backfill.
update encounters
set started_at = created_at
where started_at is null
  and is_active = false;

-- (2) Trigger function.
create or replace function ensure_encounter_started_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = true
     and old.is_active = false
     and new.started_at is null then
    new.started_at := now();
  end if;
  return new;
end;
$$;

-- (3) Trigger binding. Fires only when is_active changes to avoid
--     unnecessary work on unrelated column updates.
drop trigger if exists encounter_started_at_trigger on encounters;
create trigger encounter_started_at_trigger
  before update on encounters
  for each row
  when (old.is_active is distinct from new.is_active)
  execute function ensure_encounter_started_at();

-- Rollback:
--   drop trigger if exists encounter_started_at_trigger on encounters;
--   drop function if exists ensure_encounter_started_at();
--   (Backfill is NOT reversible; accepted because the prior values were NULL.)

-- Smoke test (manual, run in staging):
--   select count(*) from encounters where started_at is null and is_active = false;
--   -- Expect 0 after this migration applies.
