-- Atomic campaign creation: single RPC replaces 3 separate inserts
CREATE OR REPLACE FUNCTION create_campaign_with_settings(
  p_owner_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_game_system TEXT DEFAULT '5e',
  p_party_level INTEGER DEFAULT 1,
  p_theme TEXT DEFAULT NULL,
  p_is_oneshot BOOLEAN DEFAULT false
) RETURNS JSON AS $$
DECLARE
  v_campaign_id UUID;
  v_join_code TEXT;
BEGIN
  -- Generate join code (same charset as app-level generator)
  v_join_code := upper(substr(md5(random()::text), 1, 8));

  -- Insert campaign
  INSERT INTO campaigns (owner_id, name, description, join_code, join_code_active)
  VALUES (p_owner_id, p_name, p_description, v_join_code, true)
  RETURNING id INTO v_campaign_id;

  -- Insert settings
  INSERT INTO campaign_settings (campaign_id, game_system, party_level, theme, is_oneshot, max_players, onboarding_completed)
  VALUES (v_campaign_id, p_game_system, p_party_level, p_theme, p_is_oneshot, 10, false);

  -- DM membership is auto-inserted by trigger handle_new_campaign()

  RETURN json_build_object(
    'campaign_id', v_campaign_id,
    'join_code', v_join_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
