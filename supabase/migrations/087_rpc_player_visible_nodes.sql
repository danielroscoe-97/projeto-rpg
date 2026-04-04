-- RPC function: returns only nodes visible to the calling player
-- Security: SECURITY DEFINER ensures consistent access control
CREATE OR REPLACE FUNCTION get_player_visible_nodes(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  v_user_id UUID := auth.uid();
  v_is_member BOOLEAN;
  v_is_owner BOOLEAN;
BEGIN
  -- Check if user is campaign owner (DM sees everything)
  SELECT EXISTS(
    SELECT 1 FROM campaigns
    WHERE id = p_campaign_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  -- Check membership
  SELECT EXISTS(
    SELECT 1 FROM campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = v_user_id
    AND status = 'accepted'
  ) INTO v_is_member;

  IF NOT v_is_member AND NOT v_is_owner THEN
    RETURN jsonb_build_object('error', 'not_member');
  END IF;

  SELECT jsonb_build_object(
    'npcs', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'is_alive', is_alive
      )), '[]'::JSONB)
      FROM campaign_npcs
      WHERE campaign_id = p_campaign_id
        AND (v_is_owner OR is_visible_to_players = true)
    ),
    'locations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'name', CASE WHEN is_discovered OR v_is_owner THEN name ELSE '???' END,
        'location_type', location_type,
        'description', CASE WHEN is_discovered OR v_is_owner THEN description ELSE '' END,
        'is_discovered', is_discovered
      )), '[]'::JSONB)
      FROM campaign_locations
      WHERE campaign_id = p_campaign_id
    ),
    'factions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'alignment', alignment
      )), '[]'::JSONB)
      FROM campaign_factions
      WHERE campaign_id = p_campaign_id
        AND (v_is_owner OR is_visible_to_players = true)
    ),
    'quests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status
      )), '[]'::JSONB)
      FROM campaign_quests
      WHERE campaign_id = p_campaign_id
        AND (v_is_owner OR is_visible_to_players = true)
    ),
    'notes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'note_type', note_type
      )), '[]'::JSONB)
      FROM campaign_notes
      WHERE campaign_id = p_campaign_id
        AND (v_is_owner OR is_shared = true)
    ),
    'sessions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'is_active', s.is_active
      )), '[]'::JSONB)
      FROM sessions s
      WHERE s.campaign_id = p_campaign_id
    ),
    'bag_items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'item_name', item_name, 'quantity', quantity
      )), '[]'::JSONB)
      FROM party_inventory_items
      WHERE campaign_id = p_campaign_id AND status = 'active'
    ),
    'members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cm.id, 'user_id', cm.user_id,
        'character_name', pc.name, 'character_id', pc.id
      )), '[]'::JSONB)
      FROM campaign_members cm
      LEFT JOIN player_characters pc
        ON pc.campaign_id = p_campaign_id AND pc.user_id = cm.user_id
      WHERE cm.campaign_id = p_campaign_id AND cm.status = 'accepted'
    ),
    'edges', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'source_type', source_type, 'source_id', source_id,
        'target_type', target_type, 'target_id', target_id,
        'relationship', relationship, 'custom_label', custom_label
      )), '[]'::JSONB)
      FROM campaign_mind_map_edges
      WHERE campaign_id = p_campaign_id
    ),
    'layout', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'node_key', node_key, 'x', x, 'y', y, 'is_collapsed', is_collapsed
      )), '[]'::JSONB)
      FROM campaign_mind_map_layout
      WHERE campaign_id = p_campaign_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
