-- 156_session_note_support.sql
-- Fase C — Daily Notes auto-create.
--
-- Context:
--   PRD §7.10 calls for an automatic "session note" created the first time a
--   DM presses "Iniciar sessão de hoje" (or equivalent entry points) on a
--   given calendar day. The note acts as a scratch-pad that can be later
--   enriched with @mentions to NPCs / locations / factions via the Entity
--   Graph (mig 148).
--
-- Decisions (documented so future maintainers don't re-litigate):
--
--   1. One note per (campaign, calendar day). A UNIQUE index on
--      (campaign_id, session_date) WHERE note_type='session_note' enforces
--      this at the DB level — the RPC does not rely purely on a SELECT-then-
--      INSERT race. If two browser tabs fire the RPC simultaneously, one
--      INSERT wins, the other falls through to the SELECT fallback.
--
--   2. `session_date` is DATE not TIMESTAMPTZ. The "today" question is
--      locale-ambiguous for users crossing timezones mid-session, but a DATE
--      is the most tractable grain. The client resolves "today" from the
--      browser (see lib/time/session-date.ts); the server stores verbatim.
--
--   3. No auto-edge to the `sessions` work-unit table on note creation. A
--      session_note is a DAILY journal, not tied to the `sessions` row (which
--      is a combat work-unit, not a calendar day — see mig 002). If the DM
--      chooses to link the note to a specific session later (via @mentions),
--      the existing Entity Graph machinery handles it.
--
--   4. We ADD 'session' to the entity_belongs_to_campaign CASE list so that
--      OTHER edge types (e.g. note -> session, location -> session) pass the
--      scope guard introduced in mig 154 (which fails closed on unknown
--      types). This was deferred from mig 154 "ahead of Fase 3g".
--
--   5. campaign_mind_map_edges.source_type / target_type CHECK already
--      allows 'session' (mig 080 line 15-17). No CHECK extension needed.
--
-- Security posture:
--   - RPC is SECURITY DEFINER with explicit `SET search_path = pg_catalog,
--     public, pg_temp` (hardening same as mig 151 / 155).
--   - Auth guard: campaign owner only. Players cannot create session notes
--     even if they are members (daily notes are a DM artifact).
--   - EXECUTE revoked from PUBLIC and granted to `authenticated` only.
--
-- Return shape: `{ ok, code?, note_id?, created?, session_date? }`
--   - `ok: true, note_id, created: true, session_date`  — new note created
--   - `ok: true, note_id, created: false, session_date` — existing note returned
--   - `ok: false, code: 'unauthenticated'`              — no auth.uid()
--   - `ok: false, code: 'forbidden'`                    — not the campaign owner
--
-- Rollback:
--   DROP FUNCTION public.create_or_get_session_note(UUID, DATE);
--   DROP INDEX IF EXISTS idx_campaign_notes_session_date_unique;
--   ALTER TABLE campaign_notes DROP COLUMN session_date;
--   (restore old note_type CHECK and old entity_belongs_to_campaign body
--   from source control — revert to mig 154 definition).

BEGIN;

-- 1. session_date column on campaign_notes --------------------------------
ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS session_date DATE NULL;

COMMENT ON COLUMN campaign_notes.session_date IS
  'Calendar day this note covers. Non-null only for note_type=session_note. Enforced unique per (campaign_id, session_date) via idx_campaign_notes_session_date_unique.';

-- 2. Extend note_type CHECK to include 'session_note' ---------------------
ALTER TABLE campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_note_type_check;

ALTER TABLE campaign_notes
  ADD CONSTRAINT campaign_notes_note_type_check
  CHECK (note_type IN (
    'general',
    'lore',
    'location',
    'npc',
    'session_recap',
    'secret',
    'plot_hook',
    'session_note'
  ));

-- 3. Unique index — one session_note per (campaign, date) -----------------
-- Partial unique index: only rows with note_type='session_note' AND
-- session_date IS NOT NULL participate. Other note types are free to share
-- a campaign without collision.
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_notes_session_date_unique
  ON campaign_notes (campaign_id, session_date)
  WHERE note_type = 'session_note' AND session_date IS NOT NULL;

-- 4. entity_belongs_to_campaign — add 'session' arm ------------------------
-- Preserve every existing CASE arm from mig 154 exactly. Only addition is
-- the 'session' branch checking against the `sessions` table (mig 002).
-- The rest of the function body is identical to mig 154.
CREATE OR REPLACE FUNCTION entity_belongs_to_campaign(
  p_type text,
  p_id uuid,
  p_campaign uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_type IS NULL OR p_id IS NULL OR p_campaign IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE p_type
    WHEN 'npc' THEN
      RETURN EXISTS (
        SELECT 1 FROM campaign_npcs
        WHERE id = p_id
          AND (
            campaign_id = p_campaign
            OR (campaign_id IS NULL AND user_id = auth.uid())
          )
      );
    WHEN 'location' THEN
      RETURN EXISTS (
        SELECT 1 FROM campaign_locations
        WHERE id = p_id AND campaign_id = p_campaign
      );
    WHEN 'faction' THEN
      RETURN EXISTS (
        SELECT 1 FROM campaign_factions
        WHERE id = p_id AND campaign_id = p_campaign
      );
    WHEN 'note' THEN
      RETURN EXISTS (
        SELECT 1 FROM campaign_notes
        WHERE id = p_id AND campaign_id = p_campaign
      );
    WHEN 'quest' THEN
      RETURN EXISTS (
        SELECT 1 FROM campaign_quests
        WHERE id = p_id AND campaign_id = p_campaign
      );
    WHEN 'session' THEN
      -- Sessions are work-units scoped to a campaign (mig 002). A session
      -- belongs to the campaign if there is a row in `sessions` with a
      -- matching id+campaign_id pair.
      RETURN EXISTS (
        SELECT 1 FROM sessions
        WHERE id = p_id AND campaign_id = p_campaign
      );
    ELSE
      -- Fail-closed on still-unwired types (encounter, player, bag_item).
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION entity_belongs_to_campaign(text, uuid, uuid) IS
  'Entity Graph scope guard (mig 154 + mig 156). Fails closed on unknown entity types. Known types: npc, location, faction, note, quest, session.';

-- 5. campaign_mind_map_edges source_type / target_type CHECK ---------------
-- Already includes 'session' in the original mig 080 (lines 15-17). No
-- extension required — leaving this comment as a breadcrumb for future
-- maintainers who might be tempted to re-add it.

-- 6. RPC: create_or_get_session_note --------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_get_session_note(
  p_campaign_id UUID,
  p_session_date DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN;
  v_note_id UUID;
  v_default_title TEXT;
BEGIN
  -- 1. Auth guard.
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  -- 2. Scope guard: only the campaign owner can create session notes.
  SELECT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN json_build_object('ok', false, 'code', 'forbidden');
  END IF;

  -- 3. Build default title in numeric DD/MM/YYYY. Locale-agnostic to avoid
  --    pg month-name translation surprises.
  v_default_title := 'Notas da sessão — ' || to_char(p_session_date, 'DD/MM/YYYY');

  -- 4. Idempotent insert. ON CONFLICT DO NOTHING against the partial unique
  --    index (idx_campaign_notes_session_date_unique). Mirrors mig 155 pattern.
  INSERT INTO campaign_notes (
    campaign_id,
    user_id,
    title,
    content,
    note_type,
    session_date,
    is_shared,
    visibility
  )
  VALUES (
    p_campaign_id,
    v_user_id,
    v_default_title,
    '',
    'session_note',
    p_session_date,
    false,
    'private'
  )
  -- Postgres ON CONFLICT on a PARTIAL unique index must restate the
  -- predicate via ON CONFLICT (...) WHERE ... — it cannot reference the
  -- index by name (`ON CONFLICT ON CONSTRAINT` only matches true constraints,
  -- which partial unique indexes are not).
  ON CONFLICT (campaign_id, session_date)
    WHERE note_type = 'session_note' AND session_date IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_note_id;

  -- 5. If INSERT was a no-op, fetch the pre-existing note.
  IF v_note_id IS NULL THEN
    SELECT id INTO v_note_id
      FROM campaign_notes
     WHERE campaign_id = p_campaign_id
       AND note_type = 'session_note'
       AND session_date = p_session_date
     LIMIT 1;

    RETURN json_build_object(
      'ok', true,
      'note_id', v_note_id,
      'created', false,
      'session_date', p_session_date
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'note_id', v_note_id,
    'created', true,
    'session_date', p_session_date
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_or_get_session_note(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_or_get_session_note(UUID, DATE) TO authenticated;

COMMENT ON FUNCTION public.create_or_get_session_note(UUID, DATE) IS
  'Fase C (mig 156): idempotent create-or-get of the daily session_note for a campaign. Enforces one note per (campaign, date) via the partial unique index. Returns JSON envelope. Consumed by lib/hooks/use-session-bootstrap.ts.';

COMMIT;
