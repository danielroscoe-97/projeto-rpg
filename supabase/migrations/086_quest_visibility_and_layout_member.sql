-- Quest visibility: DM controls which quests players can see
ALTER TABLE campaign_quests
  ADD COLUMN IF NOT EXISTS is_visible_to_players BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN campaign_quests.is_visible_to_players IS
  'DM controls whether quest appears in player mind map and quest board';

-- Update player SELECT policy to respect visibility flag
DROP POLICY IF EXISTS campaign_quests_player_select ON campaign_quests;
CREATE POLICY campaign_quests_player_select ON campaign_quests
  FOR SELECT USING (
    -- DM sees everything (covered by dm_all policy, but keep explicit for clarity)
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_quests.campaign_id
      AND c.owner_id = auth.uid()
    )
    OR
    -- Players see only visible quests
    (
      is_visible_to_players = true
      AND public.is_campaign_member(campaign_id)
    )
  );

-- Mind map layout: members can read DM-set positions (read-only)
CREATE POLICY "Campaign members can view layout"
  ON campaign_mind_map_layout FOR SELECT
  USING (public.is_campaign_member(campaign_id));
