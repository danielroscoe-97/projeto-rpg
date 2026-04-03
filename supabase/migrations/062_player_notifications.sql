-- 062_player_notifications.sql
-- Player HQ Stream A: in-app notification system + auto-trigger on removal decisions

CREATE TABLE player_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  meta        JSONB DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON player_notifications(user_id, read_at);
CREATE INDEX idx_notifications_user_unread ON player_notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_owner_select ON player_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own (mark as read)
CREATE POLICY notifications_owner_update ON player_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- I7 fix: Users can delete their own notifications
CREATE POLICY notifications_owner_delete ON player_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- C2 fix: Only DM of the target campaign can insert notifications (trigger uses SECURITY DEFINER)
CREATE POLICY notifications_dm_insert ON player_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = player_notifications.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

-- Auto-create notification when removal request is decided
CREATE OR REPLACE FUNCTION notify_removal_decision()
RETURNS TRIGGER AS $$
DECLARE
  v_item_name TEXT;
  v_campaign_name TEXT;
BEGIN
  -- Only fire when status changes to approved or denied
  IF NEW.status IN ('approved', 'denied') AND OLD.status = 'pending' THEN
    SELECT pi.item_name, c.name
    INTO v_item_name, v_campaign_name
    FROM party_inventory_items pi
    JOIN campaigns c ON c.id = pi.campaign_id
    WHERE pi.id = NEW.item_id;

    -- I3 fix: Store i18n-ready type key as title, item_name as message
    -- Client resolves human-readable text via t(type)
    INSERT INTO player_notifications (user_id, campaign_id, type, title, message, meta)
    VALUES (
      NEW.requested_by,
      NEW.campaign_id,
      CASE WHEN NEW.status = 'approved' THEN 'removal_approved' ELSE 'removal_denied' END,
      CASE WHEN NEW.status = 'approved' THEN 'removal_approved' ELSE 'removal_denied' END,
      v_item_name || ' — ' || v_campaign_name,
      jsonb_build_object('item_id', NEW.item_id, 'item_name', v_item_name, 'campaign_id', NEW.campaign_id)
    );

    -- If approved, update the inventory item status
    IF NEW.status = 'approved' THEN
      UPDATE party_inventory_items
      SET status = 'removed',
          -- C4 fix: removed_by = DM who approved, not the requesting player
          removed_by = NEW.decided_by,
          removed_at = now(),
          removal_approved_by = NEW.decided_by
      WHERE id = NEW.item_id;
    ELSE
      -- If denied, revert item to active
      UPDATE party_inventory_items
      SET status = 'active'
      WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_removal_decision
  AFTER UPDATE ON inventory_removal_requests
  FOR EACH ROW EXECUTE FUNCTION notify_removal_decision();
