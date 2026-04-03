-- 067_inventory_removal_requests.sql
-- Player HQ Stream A: removal request tracking for Bag of Holding

CREATE TABLE inventory_removal_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES party_inventory_items(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  decided_by  UUID REFERENCES auth.users(id),
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_removal_requests_campaign ON inventory_removal_requests(campaign_id, status);
CREATE INDEX idx_removal_requests_item ON inventory_removal_requests(item_id);

ALTER TABLE inventory_removal_requests ENABLE ROW LEVEL SECURITY;

-- Members can read requests for their campaign
CREATE POLICY removal_requests_member_select ON inventory_removal_requests
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- Members can create removal requests
CREATE POLICY removal_requests_member_insert ON inventory_removal_requests
  FOR INSERT WITH CHECK (
    public.is_campaign_member(campaign_id)
    AND requested_by = auth.uid()
  );

-- DM can update requests (approve/deny) and delete
CREATE POLICY removal_requests_dm_manage ON inventory_removal_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = inventory_removal_requests.campaign_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = inventory_removal_requests.campaign_id
      AND c.owner_id = auth.uid()
    )
  );
