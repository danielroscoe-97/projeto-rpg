-- 002_session_tables.sql
-- Tables: sessions, encounters, combatants
-- Enum: ruleset_version

CREATE TYPE ruleset_version AS ENUM ('2014', '2024');

-- Sessions belong to a campaign, owned by a DM
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ruleset_version ruleset_version NOT NULL DEFAULT '2014',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_campaign_id ON sessions(campaign_id);
CREATE INDEX idx_sessions_owner_id ON sessions(owner_id);

-- Encounters within a session
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  current_turn_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encounters_session_id ON encounters(session_id);

-- Combatants in an encounter (monsters + player characters)
CREATE TABLE combatants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  temp_hp INTEGER NOT NULL DEFAULT 0,
  ac INTEGER NOT NULL,
  spell_save_dc INTEGER,
  initiative INTEGER,
  initiative_order INTEGER,
  conditions TEXT[] NOT NULL DEFAULT '{}',
  ruleset_version ruleset_version,
  is_defeated BOOLEAN NOT NULL DEFAULT false,
  is_player BOOLEAN NOT NULL DEFAULT false,
  monster_id UUID,
  player_character_id UUID REFERENCES player_characters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_combatants_encounter_id ON combatants(encounter_id);
CREATE INDEX idx_combatants_initiative ON combatants(encounter_id, initiative_order);

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_combatants_updated_at
  BEFORE UPDATE ON combatants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
