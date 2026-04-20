-- 144_users_profile_enrichment.sql
-- Epic 01 (Player Identity & Continuity) Story 01-B Area 5
--
-- Problem: public.users has only basic identity fields (email, display_name,
-- is_admin, preferred_language, role). To deliver the H3 "continuity"
-- promise (Epic 02 dashboard continuity sections, Epic 04 session count
-- trigger), we need profile metadata that today lives nowhere.
--
-- Design:
--   (1) default_character_id — last character used in combat (server action
--       updates when combatant is created referencing the user). Player can
--       also manually override via /app/dashboard/settings/default-character
--       (Epic 02 Area 5).
--   (2) last_session_at — timestamp of the user's most recent combat
--       participation. Updated via the same server action that sets
--       default_character_id. Drives "Continue de onde parou" dashboard card.
--   (3) avatar_url — URL to a public avatar image. External URLs only for
--       now (upload support is a future epic). XSS-guarded via CHECK.
--   (4) upgrade_failed_at — set when upgradePlayerIdentity Phase 3 fails
--       partially. Allows a recovery endpoint / cron to retry migration.
--
-- Decision: keep public.users as the single profile table. No separate
-- player_profile table — role column distinguishes player/dm/both views.

-- (1) Schema change.
alter table users
  add column default_character_id uuid null
    references player_characters(id) on delete set null,
  add column last_session_at timestamptz null,
  add column avatar_url text null,
  add column upgrade_failed_at timestamptz null;

-- (2) XSS guard for avatar_url — reject non-http(s) schemes.
--     Defends against javascript:, data:, file:, etc.
alter table users
  add constraint users_avatar_url_safe check (
    avatar_url is null or avatar_url ~ '^https?://'
  );

-- (3) Index for "continue from last session" dashboard query (Epic 02).
--     Partial: only rows where the user has actually played.
create index if not exists idx_users_last_session_at
  on users(last_session_at)
  where last_session_at is not null;

-- (4) Index for cron / recovery endpoint that retries failed upgrades.
create index if not exists idx_users_upgrade_failed_at
  on users(upgrade_failed_at)
  where upgrade_failed_at is not null;

-- Rollback:
--   drop index if exists idx_users_upgrade_failed_at;
--   drop index if exists idx_users_last_session_at;
--   alter table users drop constraint if exists users_avatar_url_safe;
--   alter table users
--     drop column if exists upgrade_failed_at,
--     drop column if exists avatar_url,
--     drop column if exists last_session_at,
--     drop column if exists default_character_id;

-- Smoke test (run post-apply in staging):
--
--   -- 1. All 4 columns exist.
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'users'
--      and column_name in (
--        'default_character_id', 'last_session_at', 'avatar_url', 'upgrade_failed_at'
--      )
--    order by column_name;
--   -- Expect 4 rows, all YES nullable.
--
--   -- 2. CHECK constraint exists and rejects bad URLs.
--   --    (Wrap in transaction — do not commit.)
--   begin;
--     -- Should FAIL with constraint violation:
--     update users
--       set avatar_url = 'javascript:alert(1)'
--     where id = (select id from users limit 1);
--   rollback;
--   begin;
--     -- Should SUCCEED:
--     update users
--       set avatar_url = 'https://example.com/avatar.png'
--     where id = (select id from users limit 1);
--   rollback;
--
--   -- 3. Indexes exist.
--   select indexname from pg_indexes
--    where tablename = 'users'
--      and indexname in ('idx_users_last_session_at', 'idx_users_upgrade_failed_at');
--   -- Expect 2 rows.
--
--   -- 4. No existing rows affected — all new columns NULL.
--   select count(*) filter (where default_character_id is null) as a,
--          count(*) filter (where last_session_at is null) as b,
--          count(*) filter (where avatar_url is null) as c,
--          count(*) filter (where upgrade_failed_at is null) as d
--     from users;
--   -- Expect a = b = c = d = total user count pre-migration.
