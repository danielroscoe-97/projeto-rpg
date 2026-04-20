-- 148_entity_graph_relationships.sql
-- Entity Graph Phase 3a (Foundation) — see docs/PRD-entity-graph.md §6.2 + §6.4
--
-- Problem: campaign_mind_map_edges.relationship CHECK (mig 080) covers 14
-- relationship types. The Entity Graph PRD (RF-07, RF-08, RF-10, RF-11)
-- requires 4 additional semantic relationships to describe the full map:
--
--   - headquarters_of : faction → location (faction has its HQ at location)
--   - rival_of        : npc → npc / faction → faction (non-hostile rival)
--   - family_of       : npc → npc (blood/family tie, replaces loose 'custom')
--   - mentions        : note → any, or textual @/[[]] reference from any
--                        container to any entity. Required by §7.8 inline
--                        linking and §7.10 daily notes.
--
-- Design:
--   - DROP existing CHECK constraint by exact name, ADD new CHECK with the
--     full set. Order preserves original 14 + new 4 at the end.
--   - Named constraint so future migrations can update by known identifier.
--   - No data migration needed: existing rows are a subset of the new set.
--
-- Rollback:
--   ALTER TABLE campaign_mind_map_edges
--     DROP CONSTRAINT mind_map_edges_relationship_check;
--   ALTER TABLE campaign_mind_map_edges
--     ADD CONSTRAINT mind_map_edges_relationship_check
--     CHECK (relationship IN (
--       'linked_to', 'lives_in', 'participated_in', 'requires', 'leads_to',
--       'allied_with', 'enemy_of', 'gave_quest', 'dropped_item', 'member_of',
--       'happened_at', 'guards', 'owns', 'custom'
--     ));
--
-- Idempotent: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT. Safe to rerun.

ALTER TABLE campaign_mind_map_edges
  DROP CONSTRAINT IF EXISTS mind_map_edges_relationship_check;

ALTER TABLE campaign_mind_map_edges
  ADD CONSTRAINT mind_map_edges_relationship_check
  CHECK (relationship IN (
    -- Original set (mig 080)
    'linked_to',
    'lives_in',
    'participated_in',
    'requires',
    'leads_to',
    'allied_with',
    'enemy_of',
    'gave_quest',
    'dropped_item',
    'member_of',
    'happened_at',
    'guards',
    'owns',
    'custom',
    -- Entity Graph additions (mig 148)
    'headquarters_of',
    'rival_of',
    'family_of',
    'mentions'
  ));
