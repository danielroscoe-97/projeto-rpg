-- 154_entity_graph_scope_guard_tighten.sql
-- Entity Graph — security hardening on scope guard (pre-session-edges).
-- Review findings: docs/SPEC-entity-graph-implementation.md + adversarial review
-- from 2026-04-20 flagged two latent defects in `entity_belongs_to_campaign`
-- (mig 147):
--
--   (a) Unknown entity types returned TRUE by default — a DM could land an
--       edge whose source_type was an as-yet-unrecognized string (e.g.
--       'session' before Fase 3g wires it in) and bypass scope validation.
--       Fail-closed is the correct posture: unknown types must RETURN FALSE.
--       Known types today are: npc, location, faction, note, quest.
--
--   (b) Global NPCs (campaign_npcs.user_id set, campaign_id IS NULL — mig 074)
--       passed the check for ANY campaign. That means DM-A could embed an
--       NPC whose user_id = DM-B into their own graph. The data wasn't
--       readable (campaign_npcs RLS restricts SELECT to user_id = auth.uid),
--       but the edge existed — a subtle cross-user disclosure vector.
--       Tighten by requiring ownership: a global NPC is in scope only when
--       its user_id matches the authenticated user.
--
-- Design:
--   - Replace `entity_belongs_to_campaign` with a version that takes the
--     same signature (so the trigger doesn't have to be re-attached) and
--     fails closed on unknown types.
--   - Use `auth.uid()` for the global-NPC ownership check.
--   - STABLE (no writes). `SECURITY INVOKER` by default is correct here —
--     RLS on campaign_npcs would already hide cross-user globals, but
--     relying on RLS alone is defense-light. Explicit check adds clarity.
--
-- Rollback: restore the mig 147 body from source control.
-- Idempotent: CREATE OR REPLACE.

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
  -- Defensive: NULL inputs never belong.
  IF p_type IS NULL OR p_id IS NULL OR p_campaign IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE p_type
    WHEN 'npc' THEN
      -- Campaign-bound NPC: must match campaign_id.
      -- Global NPC (campaign_id IS NULL): must be owned by the invoking user.
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
    ELSE
      -- Fail-closed: unknown / not-yet-wired types (session, encounter,
      -- player, bag_item) are rejected. The CHECK constraint in mig 080
      -- still accepts those strings on the column, but no edge can be
      -- created pointing at them until the type is explicitly added here.
      -- Tightens the attack surface ahead of Fase 3g (session edges).
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION entity_belongs_to_campaign(text, uuid, uuid) IS
  'Entity Graph (mig 154): scope guard for campaign_mind_map_edges. Fails closed on unknown entity types. Global NPCs (campaign_id IS NULL) must belong to the invoking user. See docs/SPEC-entity-graph-implementation.md and adversarial review 2026-04-20.';
