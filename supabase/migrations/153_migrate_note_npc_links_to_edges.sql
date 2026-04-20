-- 153_migrate_note_npc_links_to_edges.sql
-- Entity Graph Phase 3e — see docs/SPEC-entity-graph-implementation.md §1
-- and docs/PRD-entity-graph.md §6.3.
--
-- Problem: note ↔ npc links currently live in their own table (note_npc_links,
-- mig 045). The Entity Graph standardizes on campaign_mind_map_edges so that
-- notes can also link to locations, factions, and quests via a single model.
-- This migration copies existing pairs forward — it does NOT drop the legacy
-- table, which stays active for one sprint so the refactored code can roll
-- back without losing data.
--
-- Design:
--   - Idempotent via ON CONFLICT DO NOTHING on the edge UNIQUE constraint
--     (campaign_id, source_type, source_id, target_type, target_id).
--   - source_type='note', target_type='npc', relationship='mentions'.
--   - campaign_id pulled from campaign_notes because note_npc_links does not
--     carry it directly.
--   - created_by and created_at prefer the link row values; fall back to the
--     note's author / now() when the legacy row lacks them.
--
-- Rollback: delete the inserted edges with the same selector.
--   DELETE FROM campaign_mind_map_edges
--   WHERE source_type = 'note' AND target_type = 'npc'
--     AND relationship = 'mentions';
-- (Note: this also removes any native edges created via UI flows; consider
-- scoping by created_at if that matters.)

INSERT INTO campaign_mind_map_edges (
  campaign_id,
  source_type,
  source_id,
  target_type,
  target_id,
  relationship,
  created_by,
  created_at
)
SELECT
  n.campaign_id,
  'note'      AS source_type,
  nnl.note_id AS source_id,
  'npc'       AS target_type,
  nnl.npc_id  AS target_id,
  'mentions'  AS relationship,
  COALESCE(nnl.created_by, n.author_id) AS created_by,
  COALESCE(nnl.created_at, now())       AS created_at
FROM note_npc_links nnl
JOIN campaign_notes n ON n.id = nnl.note_id
ON CONFLICT (campaign_id, source_type, source_id, target_type, target_id)
  DO NOTHING;

COMMENT ON TABLE note_npc_links IS
  'LEGACY (post-mig 153): superseded by campaign_mind_map_edges where source_type=''note'', target_type=''npc'', relationship=''mentions''. Kept for one sprint of co-existence; to be dropped in a later migration after production verifies dual-read paths.';
