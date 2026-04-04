-- Generic edge/relationship table for campaign mind map
CREATE TABLE campaign_mind_map_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  relationship text NOT NULL DEFAULT 'linked_to',
  custom_label text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mind_map_edges_source_type_check
    CHECK (source_type IN ('npc', 'note', 'quest', 'session', 'location', 'faction', 'encounter', 'player', 'bag_item')),
  CONSTRAINT mind_map_edges_target_type_check
    CHECK (target_type IN ('npc', 'note', 'quest', 'session', 'location', 'faction', 'encounter', 'player', 'bag_item')),
  CONSTRAINT mind_map_edges_relationship_check
    CHECK (relationship IN (
      'linked_to', 'lives_in', 'participated_in', 'requires', 'leads_to',
      'allied_with', 'enemy_of', 'gave_quest', 'dropped_item', 'member_of',
      'happened_at', 'guards', 'owns', 'custom'
    )),
  CONSTRAINT mind_map_edges_unique
    UNIQUE (campaign_id, source_type, source_id, target_type, target_id)
);

CREATE INDEX idx_mind_map_edges_campaign ON campaign_mind_map_edges (campaign_id);
CREATE INDEX idx_mind_map_edges_source ON campaign_mind_map_edges (source_type, source_id);
CREATE INDEX idx_mind_map_edges_target ON campaign_mind_map_edges (target_type, target_id);

-- RLS
ALTER TABLE campaign_mind_map_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner can manage edges"
  ON campaign_mind_map_edges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_mind_map_edges.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can view edges"
  ON campaign_mind_map_edges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_mind_map_edges.campaign_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );
