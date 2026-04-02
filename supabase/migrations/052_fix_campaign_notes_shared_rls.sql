-- 052_fix_campaign_notes_shared_rls.sql
-- Migrations 032, 033, 042, 043, 045 were recorded as applied in schema_migrations
-- but their DDL never ran in production. This migration idempotently applies
-- all missing tables, functions, columns, indexes, and policies.
-- Safe to re-run: IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS throughout.

-- ============================================================
-- 1. campaign_members table (from 033) — MUST come before helper functions
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_role ON campaign_members(campaign_id, role);

ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Non-recursive policies only here — campaign_members_select (needs is_campaign_member)
-- is added in section 2 after helper functions are created.

DROP POLICY IF EXISTS campaign_members_dm_all ON campaign_members;
CREATE POLICY campaign_members_dm_all ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_members.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS campaign_members_user_delete ON campaign_members;
CREATE POLICY campaign_members_user_delete ON campaign_members
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS campaign_members_own_select ON campaign_members;
CREATE POLICY campaign_members_own_select ON campaign_members
  FOR SELECT USING (user_id = auth.uid());

-- Seed: auto-add DM as member for all existing campaigns
INSERT INTO campaign_members (campaign_id, user_id, role, status)
SELECT id, owner_id, 'dm', 'active'
FROM campaigns
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- Trigger: auto-add DM as member for future campaigns
CREATE OR REPLACE FUNCTION handle_new_campaign()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_members (campaign_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'dm', 'active')
  ON CONFLICT (campaign_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_campaign_created ON campaigns;
CREATE TRIGGER on_campaign_created
  AFTER INSERT ON campaigns
  FOR EACH ROW EXECUTE FUNCTION handle_new_campaign();

-- ============================================================
-- 2. Helper functions (from 032) — MUST come after campaign_members table
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_session_campaign_member(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaign_members cm
    JOIN sessions s ON s.campaign_id = cm.campaign_id
    WHERE s.id = p_session_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_encounter_campaign_member(p_encounter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM campaign_members cm
    JOIN sessions s ON s.campaign_id = cm.campaign_id
    JOIN encounters e ON e.session_id = s.id
    WHERE e.id = p_encounter_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  );
$$;

-- Members can see all members of campaigns they belong to
-- (requires is_campaign_member SECURITY DEFINER — safe here, no recursion)
DROP POLICY IF EXISTS campaign_members_select ON campaign_members;
CREATE POLICY campaign_members_select ON campaign_members
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- ============================================================
-- 3. campaign_note_folders table (from 042)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES campaign_note_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE campaign_note_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_note_folders_owner" ON campaign_note_folders;
CREATE POLICY "campaign_note_folders_owner" ON campaign_note_folders
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_note_folders_member_read" ON campaign_note_folders;
CREATE POLICY "campaign_note_folders_member_read" ON campaign_note_folders
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE INDEX IF NOT EXISTS idx_note_folders_campaign ON campaign_note_folders(campaign_id);

-- ============================================================
-- 4. Missing columns on campaign_notes (from 042)
-- ============================================================
ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES campaign_note_folders(id) ON DELETE SET NULL;

ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notes_folder ON campaign_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_shared ON campaign_notes(campaign_id, is_shared);

-- ============================================================
-- 5. campaign_notes_shared_read policy (W2.2)
-- ============================================================
DROP POLICY IF EXISTS "campaign_notes_shared_read" ON campaign_notes;
CREATE POLICY "campaign_notes_shared_read" ON campaign_notes
  FOR SELECT USING (
    is_shared = true
    AND public.is_campaign_member(campaign_id)
  );

-- ============================================================
-- 6. campaign_npcs table (from 043)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stats JSONB DEFAULT '{}',
  avatar_url TEXT,
  is_visible_to_players BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE campaign_npcs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_campaign_npcs_campaign ON campaign_npcs(campaign_id);

DROP POLICY IF EXISTS "campaign_npcs_owner" ON campaign_npcs;
CREATE POLICY "campaign_npcs_owner" ON campaign_npcs
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "campaign_npcs_member_read" ON campaign_npcs;
CREATE POLICY "campaign_npcs_member_read" ON campaign_npcs
  FOR SELECT USING (
    is_visible_to_players = true AND public.is_campaign_member(campaign_id)
  );

-- ============================================================
-- 7. note_npc_links table (from 045)
-- ============================================================
CREATE TABLE IF NOT EXISTS note_npc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES campaign_notes(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES campaign_npcs(id) ON DELETE CASCADE,
  UNIQUE(note_id, npc_id)
);

ALTER TABLE note_npc_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_npc_links_owner" ON note_npc_links;
CREATE POLICY "note_npc_links_owner" ON note_npc_links
  FOR ALL USING (
    note_id IN (
      SELECT cn.id FROM campaign_notes cn
      JOIN campaigns c ON cn.campaign_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "note_npc_links_member_read" ON note_npc_links;
CREATE POLICY "note_npc_links_member_read" ON note_npc_links
  FOR SELECT USING (
    note_id IN (
      SELECT cn.id FROM campaign_notes cn
      WHERE cn.is_shared = true AND public.is_campaign_member(cn.campaign_id)
    )
  );
