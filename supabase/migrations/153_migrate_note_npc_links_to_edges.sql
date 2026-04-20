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
-- Schema reality (verified from mig 045 + 030):
--   note_npc_links (id, note_id, npc_id) — NO created_by / created_at columns
--   campaign_notes (id, campaign_id, user_id, title, content, created_at, updated_at)
-- So we derive created_by from `campaign_notes.user_id` (NOT NULL) and
-- created_at from now(). If user_id is somehow null (shouldn't be — NOT NULL
-- is enforced — but defensive code-as-docs), the WHERE clause skips the row.
--
-- Design:
--   - Idempotent via ON CONFLICT DO NOTHING on the edge UNIQUE constraint
--     (campaign_id, source_type, source_id, target_type, target_id).
--   - source_type='note', target_type='npc', relationship='mentions'.
--   - campaign_id pulled from campaign_notes.
--   - Scope trigger (mig 147) validates both endpoints at INSERT time — if a
--     legacy row points to a cross-campaign NPC (edge case) it is rejected
--     and surfaces as a hard error. That is the desired behavior: we refuse
--     to propagate bad references.
--
-- Rollback: delete the inserted edges with the same selector.
--   DELETE FROM campaign_mind_map_edges
--   WHERE source_type = 'note' AND target_type = 'npc'
--     AND relationship = 'mentions';
-- (This also removes any native edges created via UI flows; consider scoping
-- by created_at if that matters.)

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
  n.user_id   AS created_by,
  now()       AS created_at
FROM note_npc_links nnl
JOIN campaign_notes n ON n.id = nnl.note_id
WHERE n.user_id IS NOT NULL
ON CONFLICT (campaign_id, source_type, source_id, target_type, target_id)
  DO NOTHING;

COMMENT ON TABLE note_npc_links IS
  'LEGACY (post-mig 153): superseded by campaign_mind_map_edges where source_type=''note'', target_type=''npc'', relationship=''mentions''. Kept for one sprint of co-existence; to be dropped in a later migration after production verifies dual-read paths.';
