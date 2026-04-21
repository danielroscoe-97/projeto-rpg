-- 166_user_onboarding_dm.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A, Áreas 3 & 5.
--
-- Adds the onboarding state we need to gate/resume the DM tour, stamp the
-- "user has become a DM" transition, and let users opt out of being listed
-- as a past companion to other players.
--
-- Columns
--   user_onboarding.dm_tour_completed        — mirror of dashboard_tour_completed
--                                              but for the DM-side walkthrough
--   user_onboarding.dm_tour_step             — resumable step id (NULL when done
--                                              or never started)
--   user_onboarding.first_campaign_created_at — stamped once, on the first
--                                              campaign the user owns
--   users.share_past_companions              — opt-out of D8 past-companion graph
--
-- F18 — idempotent trigger
--   We previously saw "silent no-op" traps where a trigger did `UPDATE
--   user_onboarding SET ...` and the row didn't exist (anon accounts or a
--   racy signup path). INSERT ... ON CONFLICT DO UPDATE with COALESCE
--   preserves the first-ever stamp while creating the row if missing.
--
-- F15 — share_past_companions self-update
--   `users_update_own` (005_rls_policies.sql:24) already allows auth.uid() =
--   id UPDATE on users. No new policy required; documented here for the next
--   reader.
--
-- D9 refresher — role flip broadcast
--   This migration does NOT touch the role-flip logic. The `role_updated`
--   broadcast on `user:{userId}` is emitted from role-store.ts (Story 04-F).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_onboarding DM columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_onboarding
  ADD COLUMN IF NOT EXISTS dm_tour_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dm_tour_step      TEXT    NULL,
  ADD COLUMN IF NOT EXISTS first_campaign_created_at TIMESTAMPTZ NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger: stamp first_campaign_created_at on first owned campaign (F18)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_first_campaign_created_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- H5: defensive guard. `campaigns.owner_id` is NOT NULL in the schema
  -- (see 002_session_tables.sql:11), but an admin bulk-import path or a
  -- future soft-delete-reassign flow could violate that. Rather than
  -- blow up the whole transaction with a NOT NULL FK violation on the
  -- user_onboarding side, skip and move on.
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- INSERT ... ON CONFLICT covers the case where user_onboarding has no row
  -- yet (shouldn't happen with 046's on_auth_user_created trigger, but anon
  -- upgrades in Epic 01 Story 01-E go through a path that predates that
  -- trigger on old accounts). COALESCE preserves the original stamp on
  -- subsequent campaigns (only the FIRST matters).
  INSERT INTO user_onboarding (user_id, first_campaign_created_at)
  VALUES (NEW.owner_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET first_campaign_created_at = COALESCE(
      user_onboarding.first_campaign_created_at,
      EXCLUDED.first_campaign_created_at
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_first_campaign_created_at ON campaigns;
CREATE TRIGGER trg_set_first_campaign_created_at
  AFTER INSERT ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION set_first_campaign_created_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. users.share_past_companions (D8 opt-out)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS share_past_companions BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN users.share_past_companions IS
  'Epic 04 D8: when false, user is excluded from get_past_companions() results for everyone else. '
  'Self-update is already covered by users_update_own RLS (005_rls_policies.sql:24).';

COMMENT ON COLUMN user_onboarding.dm_tour_completed IS
  'Epic 04 Story 04-F: mirror of dashboard_tour_completed for the DM-side walkthrough.';

COMMENT ON COLUMN user_onboarding.dm_tour_step IS
  'Epic 04 Story 04-F: resumable step id. NULL when tour has never been started or has been completed.';

COMMENT ON COLUMN user_onboarding.first_campaign_created_at IS
  'Epic 04 Area 1 / Test 4(e): stamped once on the first owned campaign insert. Used to hide the "Virar DM" CTA for users who already crossed into DM mode.';

-- Backfill: populate first_campaign_created_at for users who already own a
-- campaign at migration time so the CTA does not reappear for established DMs.
UPDATE user_onboarding uo
SET first_campaign_created_at = sub.first_created
FROM (
  SELECT owner_id, MIN(created_at) AS first_created
  FROM campaigns
  GROUP BY owner_id
) sub
WHERE uo.user_id = sub.owner_id
  AND uo.first_campaign_created_at IS NULL;

-- Same backfill, but for auth users whose user_onboarding row doesn't exist
-- yet (defensive — 046 backfilled this but migration order matters).
INSERT INTO user_onboarding (user_id, first_campaign_created_at)
SELECT sub.owner_id, sub.first_created
FROM (
  SELECT owner_id, MIN(created_at) AS first_created
  FROM campaigns
  GROUP BY owner_id
) sub
ON CONFLICT (user_id) DO UPDATE
  SET first_campaign_created_at = COALESCE(
    user_onboarding.first_campaign_created_at,
    EXCLUDED.first_campaign_created_at
  );

-- Backout:
--   DROP TRIGGER IF EXISTS trg_set_first_campaign_created_at ON campaigns;
--   DROP FUNCTION IF EXISTS set_first_campaign_created_at();
--   ALTER TABLE users DROP COLUMN IF EXISTS share_past_companions;
--   ALTER TABLE user_onboarding
--     DROP COLUMN IF EXISTS first_campaign_created_at,
--     DROP COLUMN IF EXISTS dm_tour_step,
--     DROP COLUMN IF EXISTS dm_tour_completed;
