-- Migration 136: Backfill content_whitelist for beta testers created after migration 114.
--
-- Context (spike 2026-04-17, Finding 6): migration 114 whitelisted every
-- existing auth.users row at the time. Accounts created since then (e.g. Lucas
-- on 2026-04-16) aren't on the list, so /app/srd/full auth-gated endpoints
-- serve only the SRD subset to them.
--
-- This migration replicates the 114 criterion idempotently:
--   - every auth user with an email address,
--   - except the internal admin alias `daniel@awsales.io`,
--   - credited to the admin `danielroscoe97@gmail.com`.
--
-- IDEMPOTENCY: Re-runnable via ON CONFLICT (user_id) DO UPDATE. Running the
-- migration twice is a no-op for the target table besides refreshing `notes`.
--
-- ⚠ WARNING — ON CONFLICT DO UPDATE clears `revoked_at`:
--   This migration will RE-GRANT access to any user whose whitelist row was
--   previously revoked. This is INTENTIONAL per the beta 3 policy in
--   `docs/beta-whitelist-policy.md` — the broad backfill resets the baseline
--   so every auth user with an email is back on the list. Operators MUST
--   audit `SELECT user_id, revoked_at FROM content_whitelist WHERE
--   revoked_at IS NOT NULL;` BEFORE shipping this migration, and manually
--   re-revoke any user that should stay off the list.
--
-- CRITICAL (CLAUDE.md SRD Content Compliance): we do NOT install an
-- `AFTER INSERT ON auth.users` trigger here. Beta whitelist stays a curated
-- list maintained by admins. See `docs/beta-whitelist-policy.md` for the
-- process to whitelist new testers after this migration ships.

INSERT INTO content_whitelist (user_id, granted_by, notes)
SELECT
  au.id,
  (SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com'),
  'Beta tester — full SRD whitelist via migration 136 (backfill post-114)'
FROM auth.users au
WHERE au.email IS NOT NULL
  AND au.email != 'daniel@awsales.io'
ON CONFLICT (user_id) DO UPDATE
  SET revoked_at = NULL,
      notes = EXCLUDED.notes;
