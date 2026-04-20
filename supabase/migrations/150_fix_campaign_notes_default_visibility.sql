-- ============================================================================
-- Migration 150: Fix default visibility + sync trigger on campaign_notes
--
-- Wave 4 review (2026-04-19) — critical RLS leak identified post-149:
--
--   Migration 149 set `campaign_notes.visibility DEFAULT 'campaign_public'`
--   to keep the one-shot backfill guard (`WHERE visibility='campaign_public'`)
--   idempotent. BUT existing write paths (e.g. `components/campaign/
--   CampaignNotes.tsx -> createNote`) insert only `is_shared: false` and
--   rely on the column default for visibility. Under 149 those DM "private"
--   notes are stored as `is_shared=false, visibility='campaign_public'`,
--   which the widened `campaign_notes_shared_read` policy
--       (is_shared=true OR visibility='campaign_public') AND is_campaign_member
--   treats as readable by every active campaign member. Players can see
--   DM-private rows they must not see. CRITICAL.
--
-- Fix (minimal, reversible):
--   1. Change column default to 'private' (matches the legacy is_shared=false
--      behavior and the displayed Lock badge on the DM UI).
--   2. One-shot re-sync of existing rows that were created between 149 and
--      this migration with `is_shared=false AND visibility='campaign_public'`
--      — the only way such a row can exist is via a code path that trusted
--      the old default; mark them `private`. Rows legitimately marked
--      `campaign_public` via explicit helper/UI keep `is_shared=true`, so
--      the guard is safe.
--   3. BEFORE INSERT/UPDATE trigger to keep `is_shared` and `visibility`
--      mirrored during the Wave 4 -> Wave 6 transition window. Prevents the
--      same class of bug resurfacing from other legacy writers.
--
-- Invariants enforced by the trigger:
--   - is_shared=true  <=> visibility='campaign_public'
--   - is_shared=false <=> visibility IN ('private','dm_private_to_player')
--   - dm_private_to_player still requires target_character_id (CHECK from 149)
--
-- Spec: docs/SPEC-player-notes-visibility.md §2.1
-- ============================================================================

-- 1. Default flip ------------------------------------------------------------
ALTER TABLE campaign_notes
  ALTER COLUMN visibility SET DEFAULT 'private';

-- 2. Re-sync rows written between 149 and 150 with the wrong default ---------
-- Only touch rows where is_shared still disagrees with visibility. We keep
-- dm_private_to_player rows untouched (they have their own invariant).
UPDATE campaign_notes
   SET visibility = 'private'
 WHERE is_shared = false
   AND visibility = 'campaign_public';

UPDATE campaign_notes
   SET visibility = 'campaign_public'
 WHERE is_shared = true
   AND visibility = 'private';

-- 3. Sync trigger ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_campaign_notes_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Dm-private-to-player is authoritative; don't auto-mirror is_shared.
  IF NEW.visibility = 'dm_private_to_player' THEN
    -- Force is_shared=false so shared_read never picks it up.
    NEW.is_shared := false;
    RETURN NEW;
  END IF;

  -- If caller only set is_shared (visibility unchanged from default/old),
  -- derive visibility from is_shared.
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_shared = true AND NEW.visibility = 'private' THEN
      NEW.visibility := 'campaign_public';
    ELSIF NEW.is_shared = false AND NEW.visibility = 'campaign_public' THEN
      NEW.visibility := 'private';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only re-derive if one side changed and the other didn't.
    IF NEW.is_shared IS DISTINCT FROM OLD.is_shared
       AND NEW.visibility IS NOT DISTINCT FROM OLD.visibility THEN
      NEW.visibility := CASE WHEN NEW.is_shared THEN 'campaign_public' ELSE 'private' END;
    ELSIF NEW.visibility IS DISTINCT FROM OLD.visibility
       AND NEW.is_shared IS NOT DISTINCT FROM OLD.is_shared THEN
      NEW.is_shared := (NEW.visibility = 'campaign_public');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_campaign_notes_visibility ON campaign_notes;
CREATE TRIGGER sync_campaign_notes_visibility
  BEFORE INSERT OR UPDATE ON campaign_notes
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_notes_visibility();
