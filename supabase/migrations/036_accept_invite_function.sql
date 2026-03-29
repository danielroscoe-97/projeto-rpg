-- 036_accept_invite_function.sql
-- Story A.4: RPC to accept a campaign invite.
-- Uses the CORRECTED version from the addendum:
--   - FOR UPDATE SKIP LOCKED to prevent race conditions (double-accept)
--   - Returns JSON with campaign_id and campaign_name for client redirect
--   - Does NOT auto-link player_characters (DM does this manually)
--   - Validates caller email matches invite email (P1 CR fix)

CREATE OR REPLACE FUNCTION accept_campaign_invite(invite_token UUID)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_campaign_name TEXT;
BEGIN
  -- Reject unauthenticated calls
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'Autenticação necessária');
  END IF;

  -- Lock the invite row to prevent double-accept race condition
  SELECT * INTO v_invite FROM campaign_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Convite inválido, expirado ou já processado');
  END IF;

  -- Validate caller is the intended recipient
  IF v_invite.email IS DISTINCT FROM auth.email() THEN
    RETURN json_build_object('error', 'Este convite não pertence a esta conta');
  END IF;

  -- Create membership (ON CONFLICT handles idempotent re-accepts)
  INSERT INTO campaign_members (campaign_id, user_id, role, invited_by)
  VALUES (v_invite.campaign_id, auth.uid(), 'player', v_invite.invited_by)
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE campaign_invites SET status = 'accepted' WHERE id = v_invite.id;

  -- Return campaign data for client redirect
  SELECT name INTO v_campaign_name FROM campaigns WHERE id = v_invite.campaign_id;
  RETURN json_build_object(
    'campaign_id', v_invite.campaign_id,
    'campaign_name', v_campaign_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
