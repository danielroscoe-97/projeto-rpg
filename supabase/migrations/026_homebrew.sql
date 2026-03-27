-- ============================================================================
-- Migration 026: Homebrew Content (Monsters, Spells, Items)
-- Story v2-4-6 — Pro-gated custom content creation
-- ============================================================================

-- Homebrew Monsters
CREATE TABLE IF NOT EXISTS homebrew_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  ruleset_version TEXT CHECK (ruleset_version IN ('2014', '2024')) DEFAULT '2014',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homebrew Spells
CREATE TABLE IF NOT EXISTS homebrew_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  ruleset_version TEXT CHECK (ruleset_version IN ('2014', '2024')) DEFAULT '2014',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homebrew Items
CREATE TABLE IF NOT EXISTS homebrew_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: each user sees only their own homebrew
ALTER TABLE homebrew_monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own homebrew monsters"
  ON homebrew_monsters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own homebrew spells"
  ON homebrew_spells FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own homebrew items"
  ON homebrew_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes for fast lookup
CREATE INDEX idx_homebrew_monsters_user ON homebrew_monsters(user_id);
CREATE INDEX idx_homebrew_spells_user ON homebrew_spells(user_id);
CREATE INDEX idx_homebrew_items_user ON homebrew_items(user_id);

-- Updated_at trigger (reuse pattern from session_notes)
CREATE OR REPLACE FUNCTION update_homebrew_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homebrew_monsters_updated_at
  BEFORE UPDATE ON homebrew_monsters
  FOR EACH ROW EXECUTE FUNCTION update_homebrew_updated_at();

CREATE TRIGGER homebrew_spells_updated_at
  BEFORE UPDATE ON homebrew_spells
  FOR EACH ROW EXECUTE FUNCTION update_homebrew_updated_at();

CREATE TRIGGER homebrew_items_updated_at
  BEFORE UPDATE ON homebrew_items
  FOR EACH ROW EXECUTE FUNCTION update_homebrew_updated_at();
