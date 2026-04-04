-- Track when player last viewed each node (for "NEW" badges)
CREATE TABLE player_node_views (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  node_key            TEXT NOT NULL,  -- format: 'npc:<uuid>', 'location:<uuid>'
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_character_id, node_key)
);

CREATE INDEX idx_node_views_character ON player_node_views(player_character_id);

ALTER TABLE player_node_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY node_views_owner ON player_node_views
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_node_views.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_node_views.player_character_id
      AND pc.user_id = auth.uid()
    )
  );
