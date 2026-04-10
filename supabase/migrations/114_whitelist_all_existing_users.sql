-- Migration 114: Add all existing users (with email) to content_whitelist as beta testers
-- Excludes: daniel@awsales.io (per user request)
-- Excludes: anonymous users (email IS NULL)
-- granted_by: danielroscoe97@gmail.com (admin)

INSERT INTO content_whitelist (user_id, granted_by, notes)
SELECT
  au.id,
  (SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com'),
  'Beta tester — full SRD whitelist via migration 114'
FROM auth.users au
WHERE au.email IS NOT NULL
  AND au.email != 'daniel@awsales.io'
ON CONFLICT (user_id) DO UPDATE
  SET revoked_at = NULL,
      notes = EXCLUDED.notes;
