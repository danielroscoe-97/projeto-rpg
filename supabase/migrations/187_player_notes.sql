-- ============================================================
-- Migration 187 — player_notes (Diário mini-wiki, Wave 3c D1)
-- PRD §7.5 decision #24 + spec 05-wireframe-diario.md §2.2 + 4.1.
-- ============================================================
--
-- DISTINCT from `player_journal_entries` (mig 063), which holds short-form
-- "quick notes" written during combat. This table holds long-form notes with
-- tags + search + auto-save (the mini-wiki / "Minhas Notas" sub-tab).
--
-- Naming convention (locked 2026-04-27 in Wave 3c kickoff):
--   schema:    player_notes
--   hook:      useMinhasNotas
--   component: MinhasNotas.tsx
--
-- Auth model: dual-auth XOR (auth user OR session_token). Anon players via
-- /join receive a Supabase anon JWT (anon `auth.uid()`) AND have a
-- `session_tokens` row whose `anon_user_id` equals that uid. Therefore RLS
-- can rely on `auth.uid()` for both paths — no `request.jwt.claims` shim
-- needed (verified pattern: mig 069 player_quest_notes uses auth.uid() only;
-- mig 142 documents the anon→auth identity bridge).
--
-- The XOR check enforces "exactly one identifier set"; auth users always
-- write user_id, anon writes session_token_id. Insert policies require the
-- caller to own the chosen identifier.

CREATE TABLE IF NOT EXISTS public.player_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_id  UUID REFERENCES public.session_tokens(id) ON DELETE CASCADE,
  campaign_id       UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title             TEXT,
  content_md        TEXT NOT NULL DEFAULT '',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dual-auth XOR: exactly one of user_id or session_token_id must be set.
  CONSTRAINT player_notes_dual_auth_xor
    CHECK ((user_id IS NULL) <> (session_token_id IS NULL))
);

-- Tag search (GIN supports array containment + overlap operators).
CREATE INDEX IF NOT EXISTS idx_player_notes_tags_gin
  ON public.player_notes USING GIN (tags);

-- Primary listing query: notes by campaign for owner, newest first.
CREATE INDEX IF NOT EXISTS idx_player_notes_campaign_user
  ON public.player_notes (campaign_id, user_id, updated_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_notes_campaign_anon
  ON public.player_notes (campaign_id, session_token_id, updated_at DESC)
  WHERE session_token_id IS NOT NULL;

-- Auto-update updated_at (uses repo-wide function from mig 002).
CREATE TRIGGER set_player_notes_updated_at
  BEFORE UPDATE ON public.player_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.player_notes ENABLE ROW LEVEL SECURITY;

-- Auth user: owns rows where user_id = auth.uid().
DROP POLICY IF EXISTS player_notes_auth_select ON public.player_notes;
CREATE POLICY player_notes_auth_select ON public.player_notes
  FOR SELECT USING (
    user_id IS NOT NULL
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS player_notes_auth_insert ON public.player_notes;
CREATE POLICY player_notes_auth_insert ON public.player_notes
  FOR INSERT WITH CHECK (
    user_id IS NOT NULL
    AND user_id = auth.uid()
    AND session_token_id IS NULL
  );

DROP POLICY IF EXISTS player_notes_auth_update ON public.player_notes;
CREATE POLICY player_notes_auth_update ON public.player_notes
  FOR UPDATE USING (
    user_id IS NOT NULL
    AND user_id = auth.uid()
  ) WITH CHECK (
    user_id IS NOT NULL
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS player_notes_auth_delete ON public.player_notes;
CREATE POLICY player_notes_auth_delete ON public.player_notes
  FOR DELETE USING (
    user_id IS NOT NULL
    AND user_id = auth.uid()
  );

-- Anon player (signed in via session_token, has anon JWT): owns rows whose
-- session_token_id resolves back to a session_tokens row owned by auth.uid()
-- via either anon_user_id or user_id (mig 142 — anon->auth bridge).
DROP POLICY IF EXISTS player_notes_anon_select ON public.player_notes;
CREATE POLICY player_notes_anon_select ON public.player_notes
  FOR SELECT USING (
    session_token_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_tokens st
      WHERE st.id = player_notes.session_token_id
        AND (st.anon_user_id = auth.uid() OR st.user_id = auth.uid())
        AND st.is_active = true
    )
  );

DROP POLICY IF EXISTS player_notes_anon_insert ON public.player_notes;
CREATE POLICY player_notes_anon_insert ON public.player_notes
  FOR INSERT WITH CHECK (
    session_token_id IS NOT NULL
    AND user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.session_tokens st
      WHERE st.id = player_notes.session_token_id
        AND (st.anon_user_id = auth.uid() OR st.user_id = auth.uid())
        AND st.is_active = true
    )
  );

DROP POLICY IF EXISTS player_notes_anon_update ON public.player_notes;
CREATE POLICY player_notes_anon_update ON public.player_notes
  FOR UPDATE USING (
    session_token_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_tokens st
      WHERE st.id = player_notes.session_token_id
        AND (st.anon_user_id = auth.uid() OR st.user_id = auth.uid())
        AND st.is_active = true
    )
  ) WITH CHECK (
    session_token_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_tokens st
      WHERE st.id = player_notes.session_token_id
        AND (st.anon_user_id = auth.uid() OR st.user_id = auth.uid())
        AND st.is_active = true
    )
  );

DROP POLICY IF EXISTS player_notes_anon_delete ON public.player_notes;
CREATE POLICY player_notes_anon_delete ON public.player_notes
  FOR DELETE USING (
    session_token_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.session_tokens st
      WHERE st.id = player_notes.session_token_id
        AND (st.anon_user_id = auth.uid() OR st.user_id = auth.uid())
        AND st.is_active = true
    )
  );

COMMENT ON TABLE public.player_notes IS
  'Player mini-wiki long-form notes with tags + search (Diário > Minhas Notas). Distinct from player_journal_entries (quick notes, mig 063). Wave 3c D1 / PRD #24.';
COMMENT ON COLUMN public.player_notes.user_id IS
  'Owner if authenticated. Mutually exclusive with session_token_id (XOR check).';
COMMENT ON COLUMN public.player_notes.session_token_id IS
  'Owner if anonymous (via /join). Mutually exclusive with user_id (XOR check). RLS resolves ownership through session_tokens.anon_user_id OR user_id matching auth.uid().';
COMMENT ON COLUMN public.player_notes.content_md IS
  'Markdown body. Auto-saved every 30s by useMinhasNotas; flushed on beforeunload.';

-- Smoke test (run post-apply in staging):
--   -- 1. Table + columns exist with XOR constraint.
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'player_notes'::regclass
--      AND conname = 'player_notes_dual_auth_xor';
--
--   -- 2. RLS enabled + 8 policies present (4 auth + 4 anon).
--   SELECT polname FROM pg_policy
--    WHERE polrelid = 'player_notes'::regclass
--    ORDER BY polname;
--   -- Expect: player_notes_anon_*, player_notes_auth_* (delete/insert/select/update).
--
--   -- 3. GIN index exists for tags search.
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'player_notes' AND indexname = 'idx_player_notes_tags_gin';
