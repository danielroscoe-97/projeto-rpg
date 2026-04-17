-- 141_encounter_started_at_trigger.sql
-- S5.6 — Encounter duration telemetry
--
-- Problem: `encounters.started_at` is sometimes NULL because:
--   1. Old rows predate the schema adding started_at.
--   2. Potential paths that set is_active=true without touching started_at.
--   3. Direct INSERT of is_active=true rows (no UPDATE transition fires).
-- Downstream aggregators report "duration 18s" falsely for NULL rows.
--
-- Fix:
--   (1) Backfill ended encounters: use created_at as a proxy for encounters
--       already closed (is_active=false) with NULL started_at. This is the
--       best retroactive signal we have.
--   (2) Backfill active-but-NULL encounters: same proxy for any encounter
--       currently active with NULL started_at. Prevents silent metric gaps
--       for rows created before this migration.
--   (3) Trigger: on INSERT OR UPDATE, auto-populate started_at whenever an
--       encounter is (or becomes) active with a NULL started_at. Explicit
--       `started_at: now()` in the app code (lib/supabase/session.ts) remains
--       the preferred path; the trigger is a safety net.

-- (1) Backfill ended encounters.
update encounters
set started_at = created_at
where started_at is null
  and is_active = false;

-- (2) Backfill encounters currently active with NULL started_at
--     (closes NTH1 gap from S5.6 code review — prevents silent metric gaps).
update encounters
set started_at = created_at
where started_at is null
  and is_active = true;

-- (3) Trigger function. Handles both INSERT and UPDATE:
--     - INSERT: if is_active=true and started_at IS NULL, populate.
--     - UPDATE: only on the transition is_active false -> true.
create or replace function ensure_encounter_started_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_active = true and new.started_at is null then
      new.started_at := now();
    end if;
  elsif tg_op = 'UPDATE' then
    if new.is_active = true
       and old.is_active is distinct from new.is_active
       and new.started_at is null then
      new.started_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- (4) Trigger binding. Fires on INSERT OR UPDATE; the function body gates
--     which transitions actually mutate the row. WHEN clause dropped because
--     INSERT has no OLD row (would make the condition always true anyway),
--     and keeping the logic in one place simplifies reasoning.
drop trigger if exists encounter_started_at_trigger on encounters;
create trigger encounter_started_at_trigger
  before insert or update on encounters
  for each row
  execute function ensure_encounter_started_at();

-- Rollback:
--   drop trigger if exists encounter_started_at_trigger on encounters;
--   drop function if exists ensure_encounter_started_at();
--   (Both backfills — ended and active — are NOT reversible; accepted because
--    the prior values were NULL and the proxy (created_at) is a strict
--    improvement over nulls for duration reporting.)

-- Smoke test (manual, run in staging AND prod after apply):
--
--   -- 1. Backfill coverage — both queries must return 0.
--   select count(*) from encounters where started_at is null and is_active = false;
--   select count(*) from encounters where started_at is null and is_active = true;
--
--   -- 2. Trigger binding exists.
--   select trigger_name, event_manipulation, action_timing
--     from information_schema.triggers
--    where trigger_name = 'encounter_started_at_trigger';
--   -- Expect 2 rows: one BEFORE INSERT, one BEFORE UPDATE.
--
--   -- 3. Trigger works end-to-end on UPDATE path:
--   --    Pick any closed encounter (is_active=false), force started_at=null,
--   --    then transition is_active=true, read back started_at — must be populated.
--   --    (Do this on a test row only; wrap in a transaction + rollback on prod.)
--   begin;
--     update encounters set started_at = null, is_active = false where id = '<test-id>';
--     update encounters set is_active = true where id = '<test-id>';
--     select started_at from encounters where id = '<test-id>'; -- must be NOT NULL
--   rollback;
--
--   -- 4. Trigger works on INSERT path:
--   begin;
--     insert into encounters (campaign_id, is_active, started_at, ...) values (...);
--     select started_at from encounters order by created_at desc limit 1;
--   rollback;
