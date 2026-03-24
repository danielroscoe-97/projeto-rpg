-- 003_srd_content.sql
-- Tables: monsters, spells, condition_types

-- Monsters from SRD (both 2014 and 2024 versions coexist)
CREATE TABLE monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ruleset_version ruleset_version NOT NULL,
  size TEXT NOT NULL,
  type TEXT NOT NULL,
  alignment TEXT,
  ac INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  hp_formula TEXT,
  speed JSONB NOT NULL DEFAULT '{}',
  str INTEGER NOT NULL DEFAULT 10,
  dex INTEGER NOT NULL DEFAULT 10,
  con INTEGER NOT NULL DEFAULT 10,
  int INTEGER NOT NULL DEFAULT 10,
  wis INTEGER NOT NULL DEFAULT 10,
  cha INTEGER NOT NULL DEFAULT 10,
  saving_throws JSONB,
  skills JSONB,
  damage_vulnerabilities TEXT,
  damage_resistances TEXT,
  damage_immunities TEXT,
  condition_immunities TEXT,
  senses TEXT,
  languages TEXT,
  challenge_rating TEXT NOT NULL,
  xp INTEGER,
  special_abilities JSONB,
  actions JSONB,
  legendary_actions JSONB,
  reactions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_monsters_name ON monsters(name);
CREATE INDEX idx_monsters_ruleset ON monsters(ruleset_version);
CREATE INDEX idx_monsters_cr ON monsters(challenge_rating);
CREATE INDEX idx_monsters_type ON monsters(type);
-- Unique constraint: same monster name can exist for different versions
CREATE UNIQUE INDEX idx_monsters_name_version ON monsters(name, ruleset_version);

-- Spells from SRD (both 2014 and 2024 versions coexist)
CREATE TABLE spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ruleset_version ruleset_version NOT NULL,
  level INTEGER NOT NULL,
  school TEXT NOT NULL,
  casting_time TEXT NOT NULL,
  range TEXT NOT NULL,
  components TEXT NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  higher_levels TEXT,
  classes TEXT[] NOT NULL DEFAULT '{}',
  ritual BOOLEAN NOT NULL DEFAULT false,
  concentration BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spells_name ON spells(name);
CREATE INDEX idx_spells_ruleset ON spells(ruleset_version);
CREATE INDEX idx_spells_level ON spells(level);
CREATE INDEX idx_spells_school ON spells(school);
CREATE INDEX idx_spells_classes ON spells USING GIN(classes);
CREATE UNIQUE INDEX idx_spells_name_version ON spells(name, ruleset_version);

-- Condition types (standard D&D 5e conditions)
CREATE TABLE condition_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
