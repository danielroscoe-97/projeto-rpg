-- E-book lead capture table
-- Stores email submissions from blog ebook CTAs for nurturing
create table if not exists public.ebook_leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  ebook_slug text not null default 'guia-mestre-eficaz',
  created_at timestamptz default now() not null,
  unique (email, ebook_slug)
);

-- Allow anonymous inserts (public form, no auth required)
alter table public.ebook_leads enable row level security;

create policy "Anyone can insert ebook leads"
  on public.ebook_leads for insert
  with check (true);

-- Only admins can read leads
create policy "Admins can read ebook leads"
  on public.ebook_leads for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.is_admin = true
    )
  );
