-- 152_entity_graph_edge_cascade.sql
-- Entity Graph Phase 3b+ — see docs/SPEC-entity-graph-implementation.md §D3, §D5, §D6
--
-- Problem 1: campaign_mind_map_edges stores polymorphic edges
-- (source_type + source_id, target_type + target_id) but has no foreign-key
-- constraint linking to the concrete entity tables (impossible for a
-- polymorphic column). When a user deletes an NPC / location / faction /
-- note / quest, any edges referencing that entity become orphans — they
-- still show up in queries, reference a non-existent UUID, and leak state
-- through list_entity_links / CampaignMindMap.
--
-- Problem 2: campaign_locations has no uniqueness on name per parent, so a
-- user can create two sibling "Taverna do Pêndulo" under the same city,
-- breaking breadcrumb navigation and tree rendering.
--
-- Design:
--   (a) One AFTER DELETE trigger per entity table that calls a shared
--       function taking the entity type string as a trigger argument.
--       Function performs a single DELETE against campaign_mind_map_edges
--       matching both source and target sides.
--   (b) A case-insensitive partial unique index on
--       (campaign_id, COALESCE(parent_location_id, zero-uuid), lower(name)).
--       Using COALESCE ensures NULL parents ("root siblings") also conflict
--       on duplicate names — NULL is not equal to NULL in a plain UNIQUE.
--
-- Rollback (manual):
--   DROP TRIGGER IF EXISTS campaign_npcs_cleanup_edges ON campaign_npcs;
--   DROP TRIGGER IF EXISTS campaign_locations_cleanup_edges ON campaign_locations;
--   DROP TRIGGER IF EXISTS campaign_factions_cleanup_edges ON campaign_factions;
--   DROP TRIGGER IF EXISTS campaign_notes_cleanup_edges ON campaign_notes;
--   DROP TRIGGER IF EXISTS campaign_quests_cleanup_edges ON campaign_quests;
--   DROP FUNCTION IF EXISTS delete_edges_referencing_entity();
--   DROP INDEX IF EXISTS idx_campaign_locations_unique_name_per_parent;
--
-- Idempotent: CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS + CREATE,
-- CREATE UNIQUE INDEX IF NOT EXISTS.

-- (a) Edge cascade ---------------------------------------------------------

CREATE OR REPLACE FUNCTION delete_edges_referencing_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_type text := TG_ARGV[0];
BEGIN
  IF v_type IS NULL OR v_type = '' THEN
    RAISE EXCEPTION 'delete_edges_referencing_entity: TG_ARGV[0] (entity type) is required';
  END IF;

  DELETE FROM campaign_mind_map_edges
  WHERE (source_type = v_type AND source_id = OLD.id)
     OR (target_type = v_type AND target_id = OLD.id);

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION delete_edges_referencing_entity() IS
  'Entity Graph (mig 152): AFTER DELETE trigger helper that removes polymorphic edges pointing at the deleted entity. First TG_ARGV is the entity type string (npc, location, faction, note, quest).';

DROP TRIGGER IF EXISTS campaign_npcs_cleanup_edges ON campaign_npcs;
CREATE TRIGGER campaign_npcs_cleanup_edges
  AFTER DELETE ON campaign_npcs
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('npc');

DROP TRIGGER IF EXISTS campaign_locations_cleanup_edges ON campaign_locations;
CREATE TRIGGER campaign_locations_cleanup_edges
  AFTER DELETE ON campaign_locations
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('location');

DROP TRIGGER IF EXISTS campaign_factions_cleanup_edges ON campaign_factions;
CREATE TRIGGER campaign_factions_cleanup_edges
  AFTER DELETE ON campaign_factions
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('faction');

DROP TRIGGER IF EXISTS campaign_notes_cleanup_edges ON campaign_notes;
CREATE TRIGGER campaign_notes_cleanup_edges
  AFTER DELETE ON campaign_notes
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('note');

DROP TRIGGER IF EXISTS campaign_quests_cleanup_edges ON campaign_quests;
CREATE TRIGGER campaign_quests_cleanup_edges
  AFTER DELETE ON campaign_quests
  FOR EACH ROW EXECUTE FUNCTION delete_edges_referencing_entity('quest');

-- (b) Unique location name per parent --------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_locations_unique_name_per_parent
  ON campaign_locations (
    campaign_id,
    COALESCE(parent_location_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

COMMENT ON INDEX idx_campaign_locations_unique_name_per_parent IS
  'Entity Graph (SPEC §D5): unique location name per (campaign, parent). Case-insensitive. NULL parent mapped to zero-uuid sentinel so root siblings also conflict on duplicate names.';
