-- 140_user_favorites.sql
-- S5.2 — User favorites (monster/item/condition) for Auth users.
-- Guest/Anon use localStorage; this table is Auth-only, sync'd cross-device.
--
-- SRD compliance note (CLAUDE.md): migration creates a plain table + RLS.
-- It does NOT add triggers on `auth.users` — only the standard foreign-key
-- ON DELETE CASCADE (allowed per SRD auth internals rule). Favorites are
-- plain string slugs; monster/item/condition content stays in `data/srd/`.
--
-- Ordering note: migration 141 is already applied in prod (Wave 1). 140 is a
-- schema-only additive change with no retro dependencies, so it applies
-- cleanly after 141. Use `supabase db push --linked` with `--yes` to
-- backfill retroactively.

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('monster', 'item', 'condition')),
  slug text not null,
  favorited_at timestamptz not null default now(),
  unique(user_id, kind, slug)
);

create index if not exists user_favorites_user_kind_idx on user_favorites(user_id, kind);

alter table user_favorites enable row level security;

drop policy if exists "users can read own favorites" on user_favorites;
create policy "users can read own favorites"
  on user_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own favorites" on user_favorites;
create policy "users can insert own favorites"
  on user_favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own favorites" on user_favorites;
create policy "users can delete own favorites"
  on user_favorites for delete
  using (auth.uid() = user_id);

-- Rollback:
--   drop policy if exists "users can read own favorites" on user_favorites;
--   drop policy if exists "users can insert own favorites" on user_favorites;
--   drop policy if exists "users can delete own favorites" on user_favorites;
--   drop table if exists user_favorites;

-- Smoke (manual, run in staging AND prod after apply):
--   select table_name from information_schema.tables where table_name = 'user_favorites';
--   select policyname from pg_policies where tablename = 'user_favorites';
--   -- Expect: 1 table, 3 policies.
