-- Migration 112: XP and Ranking System
-- Creates the full XP infrastructure: actions config, append-only ledger,
-- materialized user_xp, rank thresholds, trigger, and RLS policies.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Tables
-- ═══════════════════════════════════════════════════════════════════════

-- Config table: defines all XP-granting actions
CREATE TABLE IF NOT EXISTS public.xp_actions (
  action_key TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('dm', 'player', 'both')),
  xp_base INTEGER NOT NULL CHECK (xp_base > 0),
  cooldown_max INTEGER,
  cooldown_period TEXT CHECK (cooldown_period IN ('day', 'week', 'month', 'lifetime')),
  description_pt TEXT NOT NULL,
  description_en TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Append-only ledger: every XP grant is an immutable row
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL REFERENCES public.xp_actions(action_key),
  role TEXT NOT NULL CHECK (role IN ('dm', 'player')),
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_action
  ON public.xp_ledger (user_id, action_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_role
  ON public.xp_ledger (user_id, role);

-- Materialized user totals: updated by trigger
CREATE TABLE IF NOT EXISTS public.user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dm_xp INTEGER DEFAULT 0,
  dm_rank INTEGER DEFAULT 1,
  player_xp INTEGER DEFAULT 0,
  player_rank INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rank lookup table
CREATE TABLE IF NOT EXISTS public.rank_thresholds (
  role TEXT NOT NULL CHECK (role IN ('dm', 'player')),
  rank INTEGER NOT NULL CHECK (rank >= 1),
  xp_required INTEGER NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  PRIMARY KEY (role, rank)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Trigger: auto-update user_xp after ledger INSERT
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_new_rank INTEGER;
BEGIN
  -- Sum total XP for this role
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_total
  FROM public.xp_ledger
  WHERE user_id = NEW.user_id AND role = NEW.role;

  -- Derive rank from total
  SELECT COALESCE(MAX(rank), 1) INTO v_new_rank
  FROM public.rank_thresholds
  WHERE role = NEW.role AND xp_required <= v_total;

  -- Upsert user_xp
  INSERT INTO public.user_xp (user_id, dm_xp, dm_rank, player_xp, player_rank, updated_at)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.role = 'dm' THEN v_total ELSE 0 END,
    CASE WHEN NEW.role = 'dm' THEN v_new_rank ELSE 1 END,
    CASE WHEN NEW.role = 'player' THEN v_total ELSE 0 END,
    CASE WHEN NEW.role = 'player' THEN v_new_rank ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dm_xp = CASE WHEN NEW.role = 'dm' THEN v_total ELSE public.user_xp.dm_xp END,
    dm_rank = CASE WHEN NEW.role = 'dm' THEN v_new_rank ELSE public.user_xp.dm_rank END,
    player_xp = CASE WHEN NEW.role = 'player' THEN v_total ELSE public.user_xp.player_xp END,
    player_rank = CASE WHEN NEW.role = 'player' THEN v_new_rank ELSE public.user_xp.player_rank END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_user_xp ON public.xp_ledger;
CREATE TRIGGER trg_update_user_xp
  AFTER INSERT ON public.xp_ledger
  FOR EACH ROW EXECUTE FUNCTION update_user_xp();

-- ═══════════════════════════════════════════════════════════════════════
-- 3. RLS Policies
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_thresholds ENABLE ROW LEVEL SECURITY;

-- xp_ledger: SELECT own rows only (INSERT via service_role bypasses RLS)
CREATE POLICY "Users can read own xp_ledger"
  ON public.xp_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- user_xp: SELECT own rows
CREATE POLICY "Users can read own user_xp"
  ON public.user_xp FOR SELECT
  USING (auth.uid() = user_id);

-- xp_actions: public read (config is open)
CREATE POLICY "Anyone can read xp_actions"
  ON public.xp_actions FOR SELECT
  USING (true);

-- rank_thresholds: public read
CREATE POLICY "Anyone can read rank_thresholds"
  ON public.rank_thresholds FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Seed: 26 actions + 12 rank thresholds
-- ═══════════════════════════════════════════════════════════════════════

-- DM Actions (13)
INSERT INTO public.xp_actions (action_key, role, xp_base, cooldown_max, cooldown_period, description_pt, description_en) VALUES
  ('dm_campaign_created',  'dm', 20, 3,    'week',     'Criar campanha',                    'Create campaign'),
  ('dm_session_created',   'dm', 10, 5,    'day',      'Criar sessão',                      'Create session'),
  ('dm_combat_started',    'dm', 10, 20,   'day',      'Iniciar combate',                   'Start combat'),
  ('dm_combat_completed',  'dm', 25, 20,   'day',      'Finalizar combate',                 'Complete combat'),
  ('dm_combat_rated',      'dm', 30, 20,   'day',      'Avaliar dificuldade pós-combate',   'Rate combat difficulty'),
  ('dm_combat_gold',       'dm', 50, NULL, NULL,        'Combate Gold (rating + 3 votos)',   'Gold Combat (rating + 3 votes)'),
  ('dm_streak_weekly',     'dm', 15, 1,    'week',     'Streak semanal mantida',            'Weekly streak maintained'),
  ('dm_player_invited',    'dm', 20, 10,   'week',     'Jogador aceita convite',            'Player accepted invite'),
  ('dm_preset_created',    'dm', 10, 5,    'day',      'Criar preset de encontro',          'Create encounter preset'),
  ('dm_preset_used',       'dm', 5,  10,   'day',      'Usar preset em combate',            'Use preset in combat'),
  ('dm_spell_voted',       'dm', 5,  10,   'day',      'Votar tier de spell',               'Vote spell tier'),
  ('dm_npc_created',       'dm', 5,  10,   'day',      'Criar NPC',                         'Create NPC'),
  ('dm_note_created',      'dm', 5,  10,   'day',      'Criar nota de campanha',            'Create campaign note')
ON CONFLICT (action_key) DO NOTHING;

-- Player Actions (11)
INSERT INTO public.xp_actions (action_key, role, xp_base, cooldown_max, cooldown_period, description_pt, description_en) VALUES
  ('player_account_created',       'player', 25, 1,    'lifetime', 'Criar conta',                         'Create account'),
  ('player_campaign_joined',       'player', 15, 5,    'week',     'Entrar em campanha',                  'Join campaign'),
  ('player_combat_participated',   'player', 20, 20,   'day',      'Participar de combate',               'Participate in combat'),
  ('player_combat_voted',          'player', 15, 20,   'day',      'Votar dificuldade pós-combate',       'Vote combat difficulty'),
  ('player_character_created',     'player', 10, 5,    'day',      'Criar personagem',                    'Create character'),
  ('player_compendium_explored',   'player', 5,  1,    'day',      'Explorar compêndio (5+ itens)',       'Explore compendium (5+ items)'),
  ('player_journal_written',       'player', 10, 5,    'day',      'Escrever no journal',                 'Write journal entry'),
  ('player_npc_noted',             'player', 5,  10,   'day',      'Criar nota de NPC',                   'Create NPC note'),
  ('player_quest_noted',           'player', 5,  10,   'day',      'Criar nota de quest',                 'Create quest note'),
  ('player_spell_voted',           'player', 5,  10,   'day',      'Votar tier de spell',                 'Vote spell tier'),
  ('player_spell_searched',        'player', 3,  5,    'day',      'Buscar spell em combate',             'Search spell in combat')
ON CONFLICT (action_key) DO NOTHING;

-- Shared Actions (3)
INSERT INTO public.xp_actions (action_key, role, xp_base, cooldown_max, cooldown_period, description_pt, description_en) VALUES
  ('profile_completed',     'both', 15, 1, 'lifetime', 'Completar perfil',              'Complete profile'),
  ('onboarding_completed',  'both', 10, 1, 'lifetime', 'Completar wizard de onboarding', 'Complete onboarding wizard'),
  ('tour_completed',        'both', 10, 1, 'lifetime', 'Completar tour do dashboard',   'Complete dashboard tour')
ON CONFLICT (action_key) DO NOTHING;

-- DM Rank Thresholds (6)
INSERT INTO public.rank_thresholds (role, rank, xp_required, title_pt, title_en, icon) VALUES
  ('dm', 1, 0,    'Aprendiz de Taverna',    'Tavern Apprentice',     '🕯️'),
  ('dm', 2, 100,  'Narrador de Fogueira',   'Campfire Narrator',     '🔥'),
  ('dm', 3, 400,  'Mestre de Masmorras',    'Dungeon Keeper',        '⚔️'),
  ('dm', 4, 1200, 'Guardião do Compêndio',  'Compendium Guardian',   '📜'),
  ('dm', 5, 3000, 'Arquiteto do Destino',   'Fate Architect',        '🏰'),
  ('dm', 6, 6000, 'Lenda Viva',             'Living Legend',         '👑')
ON CONFLICT (role, rank) DO NOTHING;

-- Player Rank Thresholds (6)
INSERT INTO public.rank_thresholds (role, rank, xp_required, title_pt, title_en, icon) VALUES
  ('player', 1, 0,    'Aventureiro Novato',   'Novice Adventurer',   '🗡️'),
  ('player', 2, 75,   'Caçador de Masmorras', 'Dungeon Crawler',     '🛡️'),
  ('player', 3, 300,  'Veterano de Batalha',  'Battle Veteran',      '⚔️'),
  ('player', 4, 900,  'Campeão do Reino',     'Realm Champion',      '🏅'),
  ('player', 5, 2200, 'Herói Lendário',       'Legendary Hero',      '⭐'),
  ('player', 6, 5000, 'Mito Imortal',         'Immortal Myth',       '👑')
ON CONFLICT (role, rank) DO NOTHING;
