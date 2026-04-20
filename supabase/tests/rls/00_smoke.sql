-- 00_smoke.sql
-- Sanity check that pgTap itself is loaded and the harness wiring works.
-- If this file fails, there is no point running the other tests.
--
-- Run order: first. If pgtap extension is missing, this emits a clear error
-- instead of a cryptic plan mismatch from the real test files.

begin;

-- Assert pgtap is installed before we try to use it.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pgtap') then
    raise exception 'pgtap extension not installed. scripts/test-pgtap.sh should have created it.';
  end if;
end$$;

select plan(3);

-- 1. pgTap basic assertions work.
select ok(1 = 1, 'pgtap ok() works');

-- 2. pgTap equality assertions work.
select is(1 + 1, 2, 'pgtap is() works');

-- 3. The migrations ran — core tables exist.
--    We pick one table from each migration "era" to catch total migration failure:
--    - users (migration 001)
--    - campaign_members (migration 033)
--    - session_tokens (migration 004)
select ok(
  (select count(*) from pg_tables where schemaname = 'public'
     and tablename in ('users', 'campaign_members', 'session_tokens')) = 3,
  'core tables (users, campaign_members, session_tokens) exist after migrations'
);

select * from finish();
rollback;
