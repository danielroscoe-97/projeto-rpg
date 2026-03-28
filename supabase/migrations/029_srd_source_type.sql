-- Migration 029: Add source_type classification for SRD vs non-SRD content
-- This enables the "kill switch" to remove non-SRD content with a single deploy

-- Add source_type to monsters table
ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS source_type TEXT
    NOT NULL DEFAULT 'srd'
    CHECK (source_type IN ('srd', 'non_srd'));

-- Add source_type to spells table
ALTER TABLE spells
  ADD COLUMN IF NOT EXISTS source_type TEXT
    NOT NULL DEFAULT 'srd'
    CHECK (source_type IN ('srd', 'non_srd'));

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_monsters_source_type ON monsters (source_type);
CREATE INDEX IF NOT EXISTS idx_spells_source_type ON spells (source_type);

-- Add the feature flag for SRD content visibility
INSERT INTO feature_flags (key, enabled, plan_required, description)
VALUES (
  'show_non_srd_content',
  true,
  'free',
  'When enabled, shows non-SRD content in the compendium. Disable to show only SRD content (legal compliance kill switch).'
)
ON CONFLICT (key) DO NOTHING;
