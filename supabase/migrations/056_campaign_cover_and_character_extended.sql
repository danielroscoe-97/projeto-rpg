-- 056_campaign_cover_and_character_extended.sql
-- Player HQ Sprint 1: campaign cover image + extended player_characters fields

-- Imagem de capa da campanha (usada no card do jogador)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Extensao de player_characters (apenas campos NOVOS)
-- NOTA: race, class, level, ac, max_hp JA EXISTEM — NAO recriar
-- C-07 fix: hp_temp, inspiration, conditions, currency use NOT NULL + DEFAULT
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hp_temp          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed            INTEGER,
  ADD COLUMN IF NOT EXISTS initiative_bonus INTEGER,
  ADD COLUMN IF NOT EXISTS inspiration      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conditions       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS str              INTEGER,
  ADD COLUMN IF NOT EXISTS dex              INTEGER,
  ADD COLUMN IF NOT EXISTS con              INTEGER,
  ADD COLUMN IF NOT EXISTS int_score        INTEGER,
  ADD COLUMN IF NOT EXISTS wis              INTEGER,
  ADD COLUMN IF NOT EXISTS cha_score        INTEGER,
  ADD COLUMN IF NOT EXISTS subrace          TEXT,
  ADD COLUMN IF NOT EXISTS subclass         TEXT,
  ADD COLUMN IF NOT EXISTS background       TEXT,
  ADD COLUMN IF NOT EXISTS alignment        TEXT,
  ADD COLUMN IF NOT EXISTS traits           JSONB,
  ADD COLUMN IF NOT EXISTS currency         JSONB NOT NULL DEFAULT '{"cp":0,"sp":0,"ep":0,"gp":0,"pp":0}';

COMMENT ON COLUMN player_characters.conditions IS
  'Array de condicoes ativas: ["poisoned", "incapacitated", ...]';
COMMENT ON COLUMN player_characters.traits IS
  '{ personality: string, ideal: string, bond: string, flaw: string }';

-- C-M1 fix: Player can UPDATE their own character (user_id match)
CREATE POLICY player_characters_self_update ON player_characters
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Player can also SELECT their own character directly
CREATE POLICY player_characters_self_select ON player_characters
  FOR SELECT USING (auth.uid() = user_id);
