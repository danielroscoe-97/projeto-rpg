-- ============================================================
-- 106: Campaign CRUD Redesign — Quest fields, Location/Faction images, Bag essentials
-- ============================================================

-- 1. Quest: new structured fields + expanded status
ALTER TABLE campaign_quests
  ADD COLUMN IF NOT EXISTS quest_type TEXT NOT NULL DEFAULT 'side'
    CHECK (quest_type IN ('main', 'side', 'bounty', 'escort', 'fetch')),
  ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS objective TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reward TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE campaign_quests
  DROP CONSTRAINT IF EXISTS campaign_quests_status_check;
ALTER TABLE campaign_quests
  ADD CONSTRAINT campaign_quests_status_check
    CHECK (status IN ('available', 'active', 'completed', 'failed', 'cancelled'));

-- 2. Location: image + visibility
ALTER TABLE campaign_locations
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_visible_to_players BOOLEAN NOT NULL DEFAULT true;

-- 3. Faction: image
ALTER TABLE campaign_factions
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Bag of Holding essentials (JSON on campaigns)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS bag_essentials JSONB NOT NULL DEFAULT '{
    "potions": {"small": 0, "greater": 0, "superior": 0, "supreme": 0},
    "goodberries": 0,
    "currency": {"gold": 0, "silver": 0, "platinum": 0},
    "components": {"diamonds": 0, "revivify_packs": 0}
  }'::jsonb;
