-- 060_party_inventory.sql
-- Player HQ Stream A: shared party inventory (Bag of Holding)

CREATE TABLE party_inventory_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  item_name            TEXT NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  notes                TEXT,
  added_by             UUID NOT NULL REFERENCES auth.users(id),
  added_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending_removal', 'removed')),
  removed_by           UUID REFERENCES auth.users(id),
  removed_at           TIMESTAMPTZ,
  removal_approved_by  UUID REFERENCES auth.users(id),
  CONSTRAINT quantity_positive CHECK (quantity >= 1)
);

CREATE INDEX idx_party_inventory_campaign ON party_inventory_items(campaign_id);
CREATE INDEX idx_party_inventory_status ON party_inventory_items(campaign_id, status);

ALTER TABLE party_inventory_items ENABLE ROW LEVEL SECURITY;

-- All campaign members can read inventory
CREATE POLICY party_inventory_member_select ON party_inventory_items
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- Any campaign member can add items
CREATE POLICY party_inventory_member_insert ON party_inventory_items
  FOR INSERT WITH CHECK (
    public.is_campaign_member(campaign_id)
    AND added_by = auth.uid()
  );

-- C1 fix: Members can only update their OWN active items (name/qty/notes/request removal)
-- Status transition to pending_removal is the only allowed status change for members
CREATE POLICY party_inventory_owner_update ON party_inventory_items
  FOR UPDATE USING (
    public.is_campaign_member(campaign_id)
    AND added_by = auth.uid()
    AND status IN ('active', 'pending_removal')
  );

-- DM can do everything (approve removals, direct remove, delete)
CREATE POLICY party_inventory_dm_all ON party_inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = party_inventory_items.campaign_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = party_inventory_items.campaign_id
      AND c.owner_id = auth.uid()
    )
  );
