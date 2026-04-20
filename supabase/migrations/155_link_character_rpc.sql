-- 155_link_character_rpc.sql
-- Wave 2 code review — M16/M17 fix.
--
-- Context:
--   `lib/identity/link-character-to-campaign.ts` (Story 02-H, Cenário 5 of
--   Epic 02 Área 6) performed THREE sequential round-trips from the server
--   action: (1) UPDATE player_characters with concurrency guard, (2) INSERT
--   campaign_members with ON CONFLICT DO NOTHING, (3) UPDATE campaign_invites
--   to mark accepted. A process crash (or hot-reload in dev) between any of
--   these steps left the user in a split state — linked to the campaign in
--   the characters table but not a member, or member but invite still pending
--   — which surfaces as confusing "I should be in the campaign but the page
--   says I'm not" UX plus duplicate work on retry.
--
--   This migration introduces an RPC that wraps all 3 writes in a single
--   Postgres transaction. Either everything lands or nothing does.
--
-- M17 fix (bundled):
--   The previous INSERT used `ON CONFLICT DO NOTHING` which did NOT
--   re-activate an inactive/banned member (a player who was removed and is
--   returning via a new invite got stuck in the previous status). The RPC
--   uses `ON CONFLICT DO UPDATE SET status = 'active'` so reactivation is
--   automatic.
--
-- Security posture:
--   - `SECURITY DEFINER` so the function can write regardless of the
--     invoking client's RLS role. Auth is enforced by the explicit
--     `auth.uid()` check at the top (returns `unauthenticated` JSON if NULL).
--   - `SET search_path = pg_catalog, public, pg_temp` — hardened against
--     search_path hijacks (see mig 151).
--   - Execute privilege is REVOKEd from PUBLIC and GRANTed to `authenticated`
--     so anon-session users cannot call it.
--
-- Idempotency:
--   - Character UPDATE uses `WHERE campaign_id IS NULL` — a second call with
--     the same inputs either returns `character_not_available` (if another
--     invite won the race) or succeeds (first caller).
--   - Member INSERT uses ON CONFLICT DO UPDATE — safe to re-run.
--   - Invite UPDATE uses `COALESCE(accepted_at, NOW())` so re-runs don't
--     re-stamp the acceptance timestamp.
--
-- Return shape: JSON envelope `{ ok, code, character_id?, campaign_id? }`
--   consumed by `linkCharacterToCampaign` (lib/identity/*.ts). Codes:
--     - `unauthenticated`            — caller has no auth.uid()
--     - `character_not_available`    — 0 rows updated on player_characters
--     - `ok: true`                    — full path succeeded
--
-- Invite validation (lookup + expiry + status + campaign-id match + email
-- match) STAYS in the TypeScript server action because it needs to produce
-- fine-grained sub-codes (M18) for i18n, and the invite lookup is read-only
-- so it doesn't need to share a transaction with the writes.
--
-- Rollback:
--   DROP FUNCTION public.link_character_and_join_campaign(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.link_character_and_join_campaign(
  p_character_id UUID,
  p_campaign_id UUID,
  p_invite_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_updated_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Auth guard. Mirrors the TS guard so the RPC is safe to call even
  --    without prior auth.getUser() validation.
  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  -- 2. Atomic UPDATE with WHERE-filter concurrency guard. If another invite
  --    in-flight already consumed this character (`campaign_id IS NOT NULL`
  --    now), 0 rows match and we bail BEFORE touching members/invites.
  UPDATE player_characters
     SET campaign_id = p_campaign_id
   WHERE id = p_character_id
     AND user_id = v_user_id
     AND campaign_id IS NULL
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RETURN json_build_object('ok', false, 'code', 'character_not_available');
  END IF;

  -- 3. INSERT member. ON CONFLICT DO UPDATE reactivates an inactive/banned
  --    row (M17). The invited_by column is intentionally left to the table
  --    default on re-invite — if the user was originally invited by a
  --    different DM, we don't overwrite the audit trail.
  INSERT INTO campaign_members (campaign_id, user_id, role, status)
  VALUES (p_campaign_id, v_user_id, 'player', 'active')
  ON CONFLICT (campaign_id, user_id)
  DO UPDATE SET status = 'active';

  -- 4. Mark invite accepted. status column is narrow ('pending'|'accepted'|
  --    'expired' per mig 025), so we constrain the UPDATE to 'pending' rows
  --    — idempotent re-calls on an already-accepted invite are no-ops.
  --
  --    NOTE: accepted_at / accepted_by columns don't exist on
  --    campaign_invites today (mig 025 only has status). If they get added
  --    later, swap to:
  --      SET status = 'accepted',
  --          accepted_at = COALESCE(accepted_at, NOW()),
  --          accepted_by = v_user_id
  UPDATE campaign_invites
     SET status = 'accepted'
   WHERE id = p_invite_id
     AND status = 'pending';

  RETURN json_build_object(
    'ok', true,
    'character_id', v_updated_id,
    'campaign_id', p_campaign_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_character_and_join_campaign(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_character_and_join_campaign(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.link_character_and_join_campaign(UUID, UUID, UUID) IS
  'Wave 2 code review M16/M17: single-tx linking of standalone character to campaign via invite. Wraps UPDATE player_characters + INSERT campaign_members (with reactivation) + UPDATE campaign_invites. Returns JSON envelope. Consumed by lib/identity/link-character-to-campaign.ts.';
