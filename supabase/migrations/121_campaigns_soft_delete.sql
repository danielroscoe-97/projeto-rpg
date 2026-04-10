-- Soft delete support for campaigns
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
