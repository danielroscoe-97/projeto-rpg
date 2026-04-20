-- 147_entity_graph_scope_guard.sql
-- Entity Graph Phase 3a (Foundation) — see docs/PRD-entity-graph.md §6.2
--
-- Problem: campaign_mind_map_edges (mig 080) is a polymorphic junction table
-- (source_type/source_id, target_type/target_id). It has a UNIQUE constraint
-- but NO integrity check that both endpoints actually belong to the campaign
-- indicated by campaign_id. A malicious or buggy client could create an edge
-- linking NPC X (campaign A) to Location Y (campaign B) with campaign_id set
-- to A — leaking data cross-campaign through the graph.
--
-- Design:
--   (1) entity_belongs_to_campaign(type, id, campaign) — STABLE helper that
--       checks the correct table based on entity type. Uses EXISTS so it
--       returns quickly; returns TRUE for unknown types to avoid breaking
--       future entity types before their case is added.
--       Global NPCs (campaign_id IS NULL) are allowed to link to any campaign
--       owned by the user — matches existing UX where a DM can attach a
--       global NPC to a campaign via edge. See mig 074.
--   (2) validate_edge_scope() trigger — BEFORE INSERT/UPDATE on
--       campaign_mind_map_edges. Checks both endpoints; rejects with a
--       descriptive error if either endpoint is not in scope.
--   (3) COMMENT ON TABLE campaign_mind_map_edges — documents the reuse of
--       this table as the Entity Graph edges table (same concept as
--       "campaign_entity_links" proposed by beta-test §Bloco 3).
--
-- Note: this trigger does NOT fire when the row is deleted via ON DELETE
-- CASCADE of a parent entity (campaigns). That behavior is intentional —
-- cascades are already safe.
--
-- Rollback (manual):
--   DROP TRIGGER IF EXISTS campaign_mind_map_edges_scope ON campaign_mind_map_edges;
--   DROP FUNCTION IF EXISTS validate_edge_scope();
--   DROP FUNCTION IF EXISTS entity_belongs_to_campaign(text, uuid, uuid);
--
-- Idempotent: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS + CREATE.

CREATE OR REPLACE FUNCTION entity_belongs_to_campaign(
  p_type text,
  p_id uuid,
  p_campaign uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Defensive: NULL inputs never belong.
  IF p_type IS NULL OR p_id IS NULL OR p_campaign IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE p_type
    WHEN 'npc' THEN
      -- NPCs may be global (campaign_id IS NULL) — allowed to link to any
      -- campaign. Otherwise, must match campaign_id.
      RETURN EXISTS (
        SELECT 1 FROM campaign_npcs
        WHERE id = p_id
          AND (campaign_id = p_campaign OR campaign_id IS NULL)
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
    ELSE
      -- Unknown / future entity types (session, encounter, player, bag_item):
      -- default TRUE so that mig doesn't retroactively break existing edges.
      -- Tighten in a future migration when each type is formally scoped.
      RETURN TRUE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION entity_belongs_to_campaign(text, uuid, uuid) IS
  'Entity Graph (PRD §6.2): returns TRUE if entity (type, id) belongs to campaign. Global NPCs pass. Unknown types default TRUE until wired up. See mig 147.';

CREATE OR REPLACE FUNCTION validate_edge_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_src_ok boolean;
  v_tgt_ok boolean;
BEGIN
  v_src_ok := entity_belongs_to_campaign(NEW.source_type, NEW.source_id, NEW.campaign_id);
  v_tgt_ok := entity_belongs_to_campaign(NEW.target_type, NEW.target_id, NEW.campaign_id);

  IF NOT v_src_ok THEN
    RAISE EXCEPTION 'Edge source (type=%, id=%) does not belong to campaign %',
      NEW.source_type, NEW.source_id, NEW.campaign_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT v_tgt_ok THEN
    RAISE EXCEPTION 'Edge target (type=%, id=%) does not belong to campaign %',
      NEW.target_type, NEW.target_id, NEW.campaign_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_edge_scope() IS
  'Entity Graph (PRD §6.2): rejects edges whose endpoints are not in scope of campaign_id. See mig 147.';

DROP TRIGGER IF EXISTS campaign_mind_map_edges_scope ON campaign_mind_map_edges;
CREATE TRIGGER campaign_mind_map_edges_scope
  BEFORE INSERT OR UPDATE ON campaign_mind_map_edges
  FOR EACH ROW EXECUTE FUNCTION validate_edge_scope();

COMMENT ON TABLE campaign_mind_map_edges IS
  'Entity Graph: polymorphic relationships between campaign entities (NPCs, Locations, Factions, Notes, Quests, etc). Used by both the visual Mind Map and per-entity connection panels. See PRD docs/PRD-entity-graph.md §6.2.';
