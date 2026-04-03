-- Allow global NPCs (not tied to a specific campaign)
-- Global NPCs belong to a user and can be reused across campaigns/sessions

BEGIN;

-- 1. Add user_id column (nullable initially for backfill)
ALTER TABLE campaign_npcs ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Backfill user_id from campaign owner
UPDATE campaign_npcs cn
SET user_id = c.owner_id
FROM campaigns c
WHERE cn.campaign_id = c.id;

-- 3. Clean up any orphaned rows (campaign was deleted but FK cascade missed)
DELETE FROM campaign_npcs WHERE user_id IS NULL;

-- 4. Make user_id NOT NULL after backfill
ALTER TABLE campaign_npcs ALTER COLUMN user_id SET NOT NULL;

-- 5. Make campaign_id nullable (allow global NPCs)
ALTER TABLE campaign_npcs ALTER COLUMN campaign_id DROP NOT NULL;

-- 6. Index for user's NPCs
CREATE INDEX idx_campaign_npcs_user ON campaign_npcs(user_id);

-- 7. Replace owner policy: user owns their own NPCs (both global and campaign-bound)
DROP POLICY IF EXISTS "campaign_npcs_owner" ON campaign_npcs;
CREATE POLICY "campaign_npcs_owner" ON campaign_npcs
  FOR ALL USING (user_id = auth.uid());

-- Member read policy unchanged: only applies when campaign_id IS NOT NULL
-- (NULL campaign_id won't match any campaign_members row, so global NPCs stay private)

COMMIT;
