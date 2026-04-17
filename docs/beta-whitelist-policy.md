# Beta Whitelist Policy

**Status**: IMMUTABLE until the closed-beta ends.
**Owners**: Admin (danielroscoe97@gmail.com).
**Created from**: spike-beta-test-3-2026-04-17.md (Finding 6, CRITICAL-2).

## What this policy covers

Access to the full (non-SRD) compendium during the closed beta is gated by the
`content_whitelist` table in Supabase. The endpoint
`/api/srd/full/[...path]/route.ts` checks `content_whitelist` OR
`users.is_admin` before serving non-public content.

This document defines **how** users are added to that whitelist. It is the
SRD Content Compliance guardrail that complements the rule in `CLAUDE.md`
("NUNCA expor conteúdo não-SRD em páginas públicas").

## IMMUTABLE rules

1. **No `ON INSERT auth.users` trigger.** A trigger would auto-whitelist every
   new signup — including scraping bots, mass-registration waves, or guest
   flows we don't yet control. That would silently violate SRD licensing. If
   someone proposes a trigger, **reject it** and link to this doc.
2. **Whitelist entries are curated.** Each row in `content_whitelist` must
   have a real admin `granted_by` value and a `notes` field that says *why*
   the user was added (migration number, manual invite, employee, etc.).
3. **Anonymous users are never whitelisted.** `email IS NULL` rows are
   excluded by every migration. Anon guests must use `/app/try` or `/join`
   flows that serve the SRD subset only.
4. **Whitelist updates are idempotent.** Migrations use
   `ON CONFLICT (user_id) DO UPDATE` (or `DO NOTHING` when the goal is pure
   insert) so they can be re-run safely.

## Process for new beta testers

When someone new should get the full compendium during the closed beta:

### Option A — Add them to the next scheduled whitelist migration

Preferred when the signup is known ahead of time (scheduled invite, team
member, named beta participant).

1. Create a new migration in `supabase/migrations/` with the next available
   number (see `README` convention).
2. Use the `114` / `136` template — insert based on an explicit predicate
   (`email = ...`, `id IN (...)`, or the same "all emails except admin"
   criterion from the broader backfill).
3. The `notes` column must identify both the migration number and the
   reason (`'Beta tester — invited via email campaign 2026-04-22'`).
4. Run in staging, verify row count delta matches expectation, then ship to
   production.

### Option B — Hotfix migration for a single user (preferred for late asks)

When a tester asks for access mid-beta and can't wait for the next cycle:

1. Create a migration with the next available number and the pattern:

   ```sql
   INSERT INTO content_whitelist (user_id, granted_by, notes)
   SELECT
     id,
     (SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com'),
     'Beta tester — ad-hoc whitelist for <name>, request <date/channel>'
   FROM auth.users
   WHERE email = '<their-email>'
   ON CONFLICT (user_id) DO UPDATE
     SET revoked_at = NULL,
         notes = EXCLUDED.notes;
   ```

2. Commit it under the hotfix/ad-hoc branch and ship it with the next deploy.
3. **Do not `UPDATE` or `INSERT` directly in the Supabase dashboard.** We
   always want the change tracked in git.

### Option C — Broad backfill (like migration 136)

When a batch of users accumulated between migrations and the admin decides
to re-broaden the net, author a migration with the same predicate as 114/136
(email exists, not the internal admin alias) and ship it. Keep a paragraph
in the migration header describing *why* the backfill is happening.

## Revoking access

`revoked_at` is a nullable timestamp on `content_whitelist`. To revoke:

1. `UPDATE content_whitelist SET revoked_at = now() WHERE user_id = ...;` via
   migration (never dashboard).
2. The endpoint considers `revoked_at IS NOT NULL` as "no access" and falls
   back to the SRD subset.
3. Revocations must include a note explaining why (migration comment, not the
   `notes` column — that column keeps the original grant rationale).

## Exit criteria (end of closed beta)

When the product moves to general availability, this policy is reviewed by
the admin. Options at that point:

- **Open the compendium via global flag**: drop the whitelist check on the
  endpoint behind a feature flag (plan gating still applies).
- **Keep whitelist but convert to plan gating**: `pro`/`mesa` plans imply
  access; `free` still sees SRD only. No trigger — plan membership is the
  gating signal.
- **Keep whitelist as-is**: extreme conservative option for regulatory or
  licensing reasons.

The decision is captured as a PM bucket item; until then, this policy stands.

## Cross-references

- `CLAUDE.md` — SRD Content Compliance section (the immutable rule this
  policy enforces).
- `supabase/migrations/114_whitelist_all_existing_users.sql` — the initial
  backfill.
- `supabase/migrations/136_backfill_whitelist_post_114.sql` — the spike
  2026-04-17 re-whitelist.
- `docs/spike-beta-test-3-2026-04-17.md` — Finding 6 (root cause analysis).
