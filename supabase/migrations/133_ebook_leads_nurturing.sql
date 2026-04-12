-- Track which nurturing emails have been sent to each lead
alter table public.ebook_leads
  add column if not exists nurturing_2_sent_at timestamptz,
  add column if not exists nurturing_3_sent_at timestamptz,
  add column if not exists nurturing_4_sent_at timestamptz;

-- Only admins can update ebook leads (service role bypasses RLS anyway)
create policy "Admins can update ebook leads"
  on public.ebook_leads for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.is_admin = true
    )
  );
