"use server";

/**
 * linkCharacterToCampaign — Story 02-H (Epic 02, Área 6, Cenário 5).
 *
 * Server action that links an authenticated player's **standalone** character
 * (`player_characters.campaign_id IS NULL`) to a campaign reached via a valid
 * `campaign_invites` token.
 *
 * The canonical flow is:
 *
 *   1. The UI (InviteLanding) opened CharacterPickerModal in the
 *      `auth-with-invite-pending` branch. The user picked an existing standalone
 *      character (`mode: "picked"`).
 *   2. This action fires. We validate the auth user, validate the invite token
 *      pair, then run an **atomic UPDATE with WHERE-filter** concurrency guard:
 *
 *        UPDATE player_characters
 *          SET campaign_id = $campaignId
 *          WHERE id = $characterId
 *            AND user_id = auth.uid()
 *            AND campaign_id IS NULL
 *          RETURNING id;
 *
 *      If another invite in-flight already consumed the character (because the
 *      user opened two tabs and accepted both), the second UPDATE matches 0
 *      rows and we return `character_not_available` — the UI forces a picker
 *      re-query so the user can pick another standalone.
 *   3. INSERT into `campaign_members` with `ON CONFLICT DO NOTHING` semantics
 *      (`23505` unique-violation is swallowed; already a member → idempotent).
 *   4. Mark the invite accepted (`accepted_at = NOW()` via `status = accepted`,
 *      plus `accepted_by`).
 *
 * Unlike `acceptInviteAction` (which also handles claim + create paths), this
 * action is a **targeted** primitive for the Returning Player scenario and
 * surfaces a discriminated-union result instead of throwing, so the UI can
 * handle `character_not_available` with a graceful retry UX.
 *
 * Decision (2026-04-19, Epic 02 Área 6): we mutate `campaign_id` in-place
 * rather than cloning the character. On leaving the campaign, `campaign_id`
 * flips back to NULL and the character is standalone again.
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";

export type LinkResult =
  | { ok: true; characterId: string; campaignId: string }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "character_not_available"
        | "invite_invalid"
        | "internal";
      retryable: boolean;
      message: string;
    };

export interface LinkCharacterParams {
  characterId: string;
  campaignId: string;
  inviteId: string;
  token: string;
}

export async function linkCharacterToCampaign(
  params: LinkCharacterParams,
): Promise<LinkResult> {
  const { characterId, campaignId, inviteId, token } = params;

  // 1. Auth — cookie-aware client for auth.getUser(); RLS applies to its queries.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      retryable: false,
      message: "Usuário não autenticado",
    };
  }

  // 2. Invite validation — token pair + status + expiry + (optional) email match.
  //    Service client: guests don't need this path, but auth'd users can read
  //    the row via RLS too; we prefer the service client here to keep the
  //    validation symmetrical with acceptInviteAction and avoid RLS gotchas
  //    when invite.email != user.email.
  const service = createServiceClient();
  const { data: invite, error: inviteErr } = await service
    .from("campaign_invites")
    .select("id, campaign_id, status, expires_at, invited_by, email")
    .eq("id", inviteId)
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Erro ao validar o convite",
    };
  }
  if (!invite) {
    return {
      ok: false,
      code: "invite_invalid",
      retryable: false,
      message: "Convite não encontrado",
    };
  }
  if (invite.status !== "pending") {
    return {
      ok: false,
      code: "invite_invalid",
      retryable: false,
      message: "Convite já utilizado ou inválido",
    };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return {
      ok: false,
      code: "invite_invalid",
      retryable: false,
      message: "Convite expirado",
    };
  }
  // Guard against spoofed campaign_id from the client — must match the invite.
  if (invite.campaign_id !== campaignId) {
    return {
      ok: false,
      code: "invite_invalid",
      retryable: false,
      message: "Convite não corresponde à campanha",
    };
  }
  // Optional email match (parity with acceptInviteAction).
  if (
    invite.email &&
    user.email &&
    invite.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return {
      ok: false,
      code: "invite_invalid",
      retryable: false,
      message: "Este convite foi enviado para outro endereço",
    };
  }

  // 3. Atomic UPDATE with WHERE-filter concurrency guard. If another in-flight
  //    invite already linked this character, the WHERE `campaign_id IS NULL`
  //    clause filters it out and the UPDATE returns 0 rows.
  const { data: updated, error: updateErr } = await service
    .from("player_characters")
    .update({ campaign_id: invite.campaign_id })
    .eq("id", characterId)
    .eq("user_id", user.id)
    .is("campaign_id", null)
    .select("id");

  if (updateErr) {
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Erro ao vincular personagem à campanha",
    };
  }
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      code: "character_not_available",
      retryable: false,
      message:
        "Personagem já vinculado a outra campanha. Escolha outro personagem.",
    };
  }

  // 4. INSERT member — idempotent via 23505 (unique violation) swallow.
  const { error: memberErr } = await service.from("campaign_members").insert({
    campaign_id: invite.campaign_id,
    user_id: user.id,
    role: "player",
    invited_by: invite.invited_by,
  });
  if (memberErr && memberErr.code !== "23505") {
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Erro ao ingressar na campanha",
    };
  }

  // 5. Mark invite accepted. accepted_at is populated by the `status=accepted`
  //    trigger OR explicitly here — we set both to be resilient to schema drift.
  const { error: inviteUpdateErr } = await service
    .from("campaign_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", inviteId);
  if (inviteUpdateErr) {
    // The link already landed — degrade gracefully. Surface as internal so the
    // UI can retry the mark-accepted step, but the character IS linked.
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Personagem vinculado, mas falha ao finalizar o convite",
    };
  }

  return { ok: true, characterId, campaignId: invite.campaign_id };
}
