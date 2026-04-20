-- 146_location_hierarchy_guard.sql
-- Entity Graph Phase 3a (Foundation) — see docs/PRD-entity-graph.md §6.1
--
-- Problem: campaign_locations.parent_location_id (mig 081) exists as a
-- self-referencing FK, but there is NO protection against cycles. A DM could
-- accidentally set location A as parent of B, and B as parent of A — breaking
-- every recursive query (ancestors/descendants) and potentially hanging the
-- UI.
--
-- Design:
--   (1) prevent_location_cycle() walks up the parent chain before INSERT or
--       UPDATE of parent_location_id. If it ever reaches NEW.id, cycle is
--       rejected. A depth guard of 20 protects against degenerate loops that
--       somehow slipped past application logic (e.g. concurrent updates) and
--       also caps reasonable fantasy hierarchies: Multiverse > Plane > World
--       > Continent > Region > City > District > Building = 8 levels; 20 is
--       generous.
--   (2) Self-parent (id = parent_location_id) rejected explicitly.
--   (3) Partial index on parent_location_id WHERE NOT NULL to speed up
--       descendant queries and the cycle walk itself.
--
-- Rollback (manual, if ever needed):
--   DROP TRIGGER IF EXISTS campaign_locations_prevent_cycle ON campaign_locations;
--   DROP FUNCTION IF EXISTS prevent_location_cycle();
--   DROP INDEX IF EXISTS idx_campaign_locations_parent_nonull;
--
-- Idempotent: uses CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS before
-- CREATE TRIGGER, and CREATE INDEX IF NOT EXISTS.

CREATE OR REPLACE FUNCTION prevent_location_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current uuid := NEW.parent_location_id;
  v_depth integer := 0;
BEGIN
  -- Root location (no parent) is always valid.
  IF NEW.parent_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Self-reference: reject immediately.
  IF NEW.parent_location_id = NEW.id THEN
    RAISE EXCEPTION 'Location cannot be its own parent (id=%)', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Walk up the parent chain looking for NEW.id; reject if found.
  WHILE v_current IS NOT NULL LOOP
    v_depth := v_depth + 1;
    IF v_depth > 20 THEN
      RAISE EXCEPTION 'Location hierarchy exceeds max depth (20) for id=%', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
    IF v_current = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in location hierarchy (id=% via parent chain)', NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT parent_location_id INTO v_current
      FROM campaign_locations
      WHERE id = v_current;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_locations_prevent_cycle ON campaign_locations;
CREATE TRIGGER campaign_locations_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_location_id ON campaign_locations
  FOR EACH ROW EXECUTE FUNCTION prevent_location_cycle();

-- Partial index: only indexes rows with parent set; speeds up descendant
-- lookups and the cycle walk above.
CREATE INDEX IF NOT EXISTS idx_campaign_locations_parent_nonull
  ON campaign_locations(parent_location_id)
  WHERE parent_location_id IS NOT NULL;

COMMENT ON FUNCTION prevent_location_cycle() IS
  'Entity Graph (PRD §6.1): prevents cycles in campaign_locations.parent_location_id hierarchy. Max depth 20. See mig 146.';
