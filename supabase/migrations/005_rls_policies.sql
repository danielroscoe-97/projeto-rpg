-- 005_rls_policies.sql
-- Row Level Security policies for all tables
-- Three access patterns: DM (owner), Player (session token), Admin (is_admin)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE combatants ENABLE ROW LEVEL SECURITY;
ALTER TABLE monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
-- Users can read and update their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on registration)
CREATE POLICY users_insert_own ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can read all users
CREATE POLICY users_admin_select ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- CAMPAIGNS
-- ============================================================
-- DM can CRUD their own campaigns
CREATE POLICY campaigns_owner_select ON campaigns
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY campaigns_owner_insert ON campaigns
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY campaigns_owner_update ON campaigns
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY campaigns_owner_delete ON campaigns
  FOR DELETE USING (owner_id = auth.uid());

-- Admin can read all campaigns
CREATE POLICY campaigns_admin_select ON campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- PLAYER CHARACTERS
-- ============================================================
-- DM can CRUD player characters in their campaigns
CREATE POLICY player_characters_owner_select ON player_characters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY player_characters_owner_insert ON player_characters
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY player_characters_owner_update ON player_characters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

CREATE POLICY player_characters_owner_delete ON player_characters
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  );

-- ============================================================
-- SESSIONS
-- ============================================================
-- DM can CRUD their own sessions
CREATE POLICY sessions_owner_select ON sessions
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY sessions_owner_insert ON sessions
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY sessions_owner_update ON sessions
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY sessions_owner_delete ON sessions
  FOR DELETE USING (owner_id = auth.uid());

-- Players can read sessions they have a token for
CREATE POLICY sessions_player_select ON sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_tokens
      WHERE session_tokens.session_id = sessions.id
        AND session_tokens.anon_user_id = auth.uid()
        AND session_tokens.is_active = true
    )
  );

-- Admin can read all sessions
CREATE POLICY sessions_admin_select ON sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- ENCOUNTERS
-- ============================================================
-- DM can CRUD encounters in their sessions
CREATE POLICY encounters_owner_select ON encounters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY encounters_owner_insert ON encounters
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY encounters_owner_update ON encounters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY encounters_owner_delete ON encounters
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

-- Players can read encounters in sessions they have a token for
CREATE POLICY encounters_player_select ON encounters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = encounters.session_id
      WHERE st.session_id = s.id
        AND st.anon_user_id = auth.uid()
        AND st.is_active = true
    )
  );

-- ============================================================
-- COMBATANTS
-- ============================================================
-- DM can CRUD combatants in their encounters
CREATE POLICY combatants_owner_select ON combatants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY combatants_owner_insert ON combatants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY combatants_owner_update ON combatants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY combatants_owner_delete ON combatants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_id AND s.owner_id = auth.uid()
    )
  );

-- Players can read combatants in sessions they have a token for
CREATE POLICY combatants_player_select ON combatants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      JOIN session_tokens st ON st.session_id = s.id
      WHERE e.id = encounter_id
        AND st.anon_user_id = auth.uid()
        AND st.is_active = true
    )
  );

-- ============================================================
-- MONSTERS (SRD content - public read, admin write)
-- ============================================================
-- Everyone can read monsters (public SRD content)
CREATE POLICY monsters_public_select ON monsters
  FOR SELECT USING (true);

-- Only admin can insert/update/delete monsters
CREATE POLICY monsters_admin_insert ON monsters
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY monsters_admin_update ON monsters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY monsters_admin_delete ON monsters
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- SPELLS (SRD content - public read, admin write)
-- ============================================================
-- Everyone can read spells (public SRD content)
CREATE POLICY spells_public_select ON spells
  FOR SELECT USING (true);

-- Only admin can insert/update/delete spells
CREATE POLICY spells_admin_insert ON spells
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY spells_admin_update ON spells
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY spells_admin_delete ON spells
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- CONDITION TYPES (SRD content - public read, admin write)
-- ============================================================
-- Everyone can read condition types
CREATE POLICY condition_types_public_select ON condition_types
  FOR SELECT USING (true);

-- Only admin can manage condition types
CREATE POLICY condition_types_admin_insert ON condition_types
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY condition_types_admin_update ON condition_types
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY condition_types_admin_delete ON condition_types
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- SESSION TOKENS
-- ============================================================
-- DM can manage tokens for their sessions
CREATE POLICY session_tokens_owner_select ON session_tokens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY session_tokens_owner_insert ON session_tokens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY session_tokens_owner_update ON session_tokens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

CREATE POLICY session_tokens_owner_delete ON session_tokens
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND owner_id = auth.uid())
  );

-- Players can read their own token (to verify session access)
CREATE POLICY session_tokens_player_select ON session_tokens
  FOR SELECT USING (anon_user_id = auth.uid());

-- Players can update their own token (set player_name, last_seen_at)
CREATE POLICY session_tokens_player_update ON session_tokens
  FOR UPDATE USING (anon_user_id = auth.uid());
