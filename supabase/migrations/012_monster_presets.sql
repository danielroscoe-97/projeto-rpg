-- Monster presets: let DMs pre-prepare groups of monsters for encounters
create table if not exists monster_presets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  monsters    jsonb not null default '[]'::jsonb,
  ruleset_version text not null default '2014' check (ruleset_version in ('2014', '2024')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast lookup by owner
create index if not exists idx_monster_presets_user_id on monster_presets(user_id);

-- RLS: only the owner can see/modify their own presets
alter table monster_presets enable row level security;

create policy "Users can view own presets"
  on monster_presets for select
  using (user_id = auth.uid());

create policy "Users can insert own presets"
  on monster_presets for insert
  with check (user_id = auth.uid());

create policy "Users can update own presets"
  on monster_presets for update
  using (user_id = auth.uid());

create policy "Users can delete own presets"
  on monster_presets for delete
  using (user_id = auth.uid());

-- Auto-update updated_at on changes
create or replace function update_monster_presets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_monster_presets_updated_at
  before update on monster_presets
  for each row execute function update_monster_presets_updated_at();
