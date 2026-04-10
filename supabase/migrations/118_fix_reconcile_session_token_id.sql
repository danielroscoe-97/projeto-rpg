-- Fix CRIT-1: reconcile_combat_state must persist session_token_id
-- Fix CRIT-4: Add UNIQUE partial index on session_token_id

-- CRIT-4: Prevent multiple combatants in the SAME encounter linking to the same token.
-- Scoped per encounter_id — different encounters can reuse the same token.
CREATE UNIQUE INDEX IF NOT EXISTS idx_combatants_session_token_per_encounter
  ON combatants(encounter_id, session_token_id)
  WHERE session_token_id IS NOT NULL;

-- CRIT-1: Recreate reconcile_combat_state with session_token_id support
CREATE OR REPLACE FUNCTION reconcile_combat_state(
  p_encounter_id UUID,
  p_combatants JSONB,          -- array of combatant rows
  p_round_number INT,
  p_current_turn_index INT,
  p_is_active BOOLEAN,
  p_merge_mode TEXT DEFAULT 'overwrite'  -- 'overwrite' | 'merge_newer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec JSONB;
  local_ids UUID[];
  db_combatant RECORD;
  merge_result JSONB := '{"merged": 0, "inserted": 0, "deleted": 0}'::JSONB;
  v_count INT := 0;
  v_session_owner UUID;
BEGIN
  -- SECURITY: Verify caller owns this encounter's session
  SELECT s.owner_id INTO v_session_owner
  FROM encounters e
  JOIN sessions s ON s.id = e.session_id
  WHERE e.id = p_encounter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encounter % not found', p_encounter_id;
  END IF;

  IF v_session_owner != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied: caller is not the session owner';
  END IF;

  -- Collect local IDs for deletion step (guard: NULL if empty array)
  SELECT array_agg((elem->>'id')::UUID)
  INTO local_ids
  FROM jsonb_array_elements(p_combatants) AS elem;

  -- Guard: array_agg returns NULL for empty input
  IF local_ids IS NULL THEN
    local_ids := ARRAY[]::UUID[];
  END IF;

  -- Step 1: Upsert all combatants from DM state
  FOR rec IN SELECT * FROM jsonb_array_elements(p_combatants)
  LOOP
    IF p_merge_mode = 'merge_newer' THEN
      -- Smart merge: only overwrite fields the DM changed locally.
      -- For player HP fields (current_hp, temp_hp), prefer the DB value if the
      -- combatant is a player (players may have sent hp_actions during DM offline).
      SELECT INTO db_combatant * FROM combatants WHERE id = (rec->>'id')::UUID;

      IF FOUND AND db_combatant.is_player THEN
        -- Player combatant: keep DB HP values (player might have self-healed while DM was offline)
        INSERT INTO combatants (
          id, encounter_id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc,
          initiative, initiative_order, conditions, is_defeated, is_player, is_hidden,
          monster_id, display_name, monster_group_id, group_order, dm_notes,
          player_notes, player_character_id, ruleset_version,
          condition_durations, death_saves, legendary_actions_total, legendary_actions_used,
          session_token_id
        ) VALUES (
          (rec->>'id')::UUID,
          p_encounter_id,
          rec->>'name',
          db_combatant.current_hp,    -- keep DB HP for players
          db_combatant.max_hp,
          db_combatant.temp_hp,
          COALESCE((rec->>'ac')::INT, db_combatant.ac),
          (rec->>'spell_save_dc')::INT,
          (rec->>'initiative')::FLOAT,
          (rec->>'initiative_order')::INT,
          COALESCE(
            (SELECT array_agg(elem::TEXT) FROM jsonb_array_elements_text(rec->'conditions') AS elem),
            db_combatant.conditions
          ),
          COALESCE((rec->>'is_defeated')::BOOLEAN, db_combatant.is_defeated),
          db_combatant.is_player,
          COALESCE((rec->>'is_hidden')::BOOLEAN, db_combatant.is_hidden),
          rec->>'monster_id',
          rec->>'display_name',
          (rec->>'monster_group_id')::UUID,
          (rec->>'group_order')::INT,
          COALESCE(rec->>'dm_notes', ''),
          COALESCE(rec->>'player_notes', db_combatant.player_notes, ''),
          (rec->>'player_character_id')::UUID,
          rec->>'ruleset_version',
          COALESCE(rec->'condition_durations', db_combatant.condition_durations, '{}'),
          CASE WHEN rec->'death_saves' IS NOT NULL THEN rec->'death_saves' ELSE db_combatant.death_saves END,
          COALESCE((rec->>'legendary_actions_total')::INT, db_combatant.legendary_actions_total),
          COALESCE((rec->>'legendary_actions_used')::INT, db_combatant.legendary_actions_used, 0),
          COALESCE((rec->>'session_token_id')::UUID, db_combatant.session_token_id)
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          -- Keep DB HP for players (player may have healed while DM was offline)
          current_hp = combatants.current_hp,
          max_hp = combatants.max_hp,
          temp_hp = combatants.temp_hp,
          ac = EXCLUDED.ac,
          spell_save_dc = EXCLUDED.spell_save_dc,
          initiative = EXCLUDED.initiative,
          initiative_order = EXCLUDED.initiative_order,
          conditions = EXCLUDED.conditions,
          is_defeated = EXCLUDED.is_defeated,
          is_hidden = EXCLUDED.is_hidden,
          monster_id = EXCLUDED.monster_id,
          display_name = EXCLUDED.display_name,
          monster_group_id = EXCLUDED.monster_group_id,
          group_order = EXCLUDED.group_order,
          dm_notes = EXCLUDED.dm_notes,
          player_notes = combatants.player_notes,
          player_character_id = EXCLUDED.player_character_id,
          ruleset_version = EXCLUDED.ruleset_version,
          condition_durations = EXCLUDED.condition_durations,
          death_saves = EXCLUDED.death_saves,
          legendary_actions_total = EXCLUDED.legendary_actions_total,
          legendary_actions_used = EXCLUDED.legendary_actions_used,
          session_token_id = COALESCE(EXCLUDED.session_token_id, combatants.session_token_id);
      ELSE
        -- Monster/NPC or new combatant: full overwrite from DM state
        INSERT INTO combatants (
          id, encounter_id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc,
          initiative, initiative_order, conditions, is_defeated, is_player, is_hidden,
          monster_id, display_name, monster_group_id, group_order, dm_notes,
          player_notes, player_character_id, ruleset_version,
          condition_durations, death_saves, legendary_actions_total, legendary_actions_used,
          session_token_id
        ) VALUES (
          (rec->>'id')::UUID,
          p_encounter_id,
          rec->>'name',
          (rec->>'current_hp')::INT,
          (rec->>'max_hp')::INT,
          COALESCE((rec->>'temp_hp')::INT, 0),
          (rec->>'ac')::INT,
          (rec->>'spell_save_dc')::INT,
          (rec->>'initiative')::FLOAT,
          (rec->>'initiative_order')::INT,
          COALESCE(
            (SELECT array_agg(elem::TEXT) FROM jsonb_array_elements_text(rec->'conditions') AS elem),
            ARRAY[]::TEXT[]
          ),
          COALESCE((rec->>'is_defeated')::BOOLEAN, FALSE),
          COALESCE((rec->>'is_player')::BOOLEAN, FALSE),
          COALESCE((rec->>'is_hidden')::BOOLEAN, FALSE),
          rec->>'monster_id',
          rec->>'display_name',
          (rec->>'monster_group_id')::UUID,
          (rec->>'group_order')::INT,
          COALESCE(rec->>'dm_notes', ''),
          COALESCE(rec->>'player_notes', ''),
          (rec->>'player_character_id')::UUID,
          rec->>'ruleset_version',
          COALESCE(rec->'condition_durations', '{}'),
          rec->'death_saves',
          (rec->>'legendary_actions_total')::INT,
          COALESCE((rec->>'legendary_actions_used')::INT, 0),
          (rec->>'session_token_id')::UUID
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          current_hp = EXCLUDED.current_hp,
          max_hp = EXCLUDED.max_hp,
          temp_hp = EXCLUDED.temp_hp,
          ac = EXCLUDED.ac,
          spell_save_dc = EXCLUDED.spell_save_dc,
          initiative = EXCLUDED.initiative,
          initiative_order = EXCLUDED.initiative_order,
          conditions = EXCLUDED.conditions,
          is_defeated = EXCLUDED.is_defeated,
          is_hidden = EXCLUDED.is_hidden,
          monster_id = EXCLUDED.monster_id,
          display_name = EXCLUDED.display_name,
          monster_group_id = EXCLUDED.monster_group_id,
          group_order = EXCLUDED.group_order,
          dm_notes = EXCLUDED.dm_notes,
          player_notes = EXCLUDED.player_notes,
          player_character_id = EXCLUDED.player_character_id,
          ruleset_version = EXCLUDED.ruleset_version,
          condition_durations = EXCLUDED.condition_durations,
          death_saves = EXCLUDED.death_saves,
          legendary_actions_total = EXCLUDED.legendary_actions_total,
          legendary_actions_used = EXCLUDED.legendary_actions_used,
          session_token_id = COALESCE(EXCLUDED.session_token_id, combatants.session_token_id);
      END IF;
      v_count := v_count + 1;
    ELSE
      -- Simple overwrite mode (default)
      INSERT INTO combatants (
        id, encounter_id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc,
        initiative, initiative_order, conditions, is_defeated, is_player, is_hidden,
        monster_id, display_name, monster_group_id, group_order, dm_notes,
        player_notes, player_character_id, ruleset_version,
        condition_durations, death_saves, legendary_actions_total, legendary_actions_used,
        session_token_id
      ) VALUES (
        (rec->>'id')::UUID,
        p_encounter_id,
        rec->>'name',
        (rec->>'current_hp')::INT,
        (rec->>'max_hp')::INT,
        COALESCE((rec->>'temp_hp')::INT, 0),
        (rec->>'ac')::INT,
        (rec->>'spell_save_dc')::INT,
        (rec->>'initiative')::FLOAT,
        (rec->>'initiative_order')::INT,
        COALESCE(
          (SELECT array_agg(elem::TEXT) FROM jsonb_array_elements_text(rec->'conditions') AS elem),
          ARRAY[]::TEXT[]
        ),
        COALESCE((rec->>'is_defeated')::BOOLEAN, FALSE),
        COALESCE((rec->>'is_player')::BOOLEAN, FALSE),
        COALESCE((rec->>'is_hidden')::BOOLEAN, FALSE),
        rec->>'monster_id',
        rec->>'display_name',
        (rec->>'monster_group_id')::UUID,
        (rec->>'group_order')::INT,
        COALESCE(rec->>'dm_notes', ''),
        COALESCE(rec->>'player_notes', ''),
        (rec->>'player_character_id')::UUID,
        rec->>'ruleset_version',
        COALESCE(rec->'condition_durations', '{}'),
        rec->'death_saves',
        (rec->>'legendary_actions_total')::INT,
        COALESCE((rec->>'legendary_actions_used')::INT, 0),
        (rec->>'session_token_id')::UUID
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        current_hp = EXCLUDED.current_hp,
        max_hp = EXCLUDED.max_hp,
        temp_hp = EXCLUDED.temp_hp,
        ac = EXCLUDED.ac,
        spell_save_dc = EXCLUDED.spell_save_dc,
        initiative = EXCLUDED.initiative,
        initiative_order = EXCLUDED.initiative_order,
        conditions = EXCLUDED.conditions,
        is_defeated = EXCLUDED.is_defeated,
        is_hidden = EXCLUDED.is_hidden,
        monster_id = EXCLUDED.monster_id,
        display_name = EXCLUDED.display_name,
        monster_group_id = EXCLUDED.monster_group_id,
        group_order = EXCLUDED.group_order,
        dm_notes = EXCLUDED.dm_notes,
        player_notes = EXCLUDED.player_notes,
        player_character_id = EXCLUDED.player_character_id,
        ruleset_version = EXCLUDED.ruleset_version,
        condition_durations = EXCLUDED.condition_durations,
        death_saves = EXCLUDED.death_saves,
        legendary_actions_total = EXCLUDED.legendary_actions_total,
        legendary_actions_used = EXCLUDED.legendary_actions_used,
        session_token_id = COALESCE(EXCLUDED.session_token_id, combatants.session_token_id);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  merge_result := jsonb_set(merge_result, '{merged}', to_jsonb(v_count));

  -- Step 2: Delete combatants removed during offline (in DB but not in local state)
  -- In merge_newer mode, PRESERVE player combatants that may have late-joined while DM was offline
  IF array_length(local_ids, 1) > 0 THEN
    IF p_merge_mode = 'merge_newer' THEN
      DELETE FROM combatants
      WHERE encounter_id = p_encounter_id
        AND id != ALL(local_ids)
        AND is_player = FALSE;  -- preserve late-joined players
    ELSE
      DELETE FROM combatants
      WHERE encounter_id = p_encounter_id
        AND id != ALL(local_ids);
    END IF;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    merge_result := jsonb_set(merge_result, '{deleted}', to_jsonb(v_count));
  END IF;

  -- Step 3: Update encounter state (turn, round, active)
  UPDATE encounters
  SET current_turn_index = p_current_turn_index,
      round_number = p_round_number,
      is_active = p_is_active
  WHERE id = p_encounter_id;

  RETURN merge_result;
END;
$$;

-- Grant execute to authenticated users (DM is always authenticated)
GRANT EXECUTE ON FUNCTION reconcile_combat_state(UUID, JSONB, INT, INT, BOOLEAN, TEXT) TO authenticated;
