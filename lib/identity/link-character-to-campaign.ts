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
 *      `auth-with-invite-pending` branch. The user picked an existing
 *      standalone character (`mode: "picked"`).
 *   2. This action fires. We:
 *        a) Validate the auth user (cookie-aware client).
 *        b) Pre-validate the invite token (service client) so we can return
 *           **fine-grained** sub-codes (M18: invite_not_found, invite_expired,
 *           invite_already_accepted, invite_mismatch). These codes drive UI
 *           copy (`invite.error.{code}`) — the UI couldn't distinguish them
 *           from the old coarse `invite_invalid` code.
 *        c) Invoke the RPC `link_character_and_join_campaign` which wraps the
 *           three writes (UPDATE character, UPSERT member w/ reactivation,
 *           UPDATE invite) in a single Postgres transaction (M16 fix —
 *           process crash between writes could previously leave the user
 *           half-linked).
 *   3. Return a discriminated union so the UI can branch per sub-code.
 *
 * Unlike `acceptInviteAction` (which also handles claim + create paths),
 * this action is a **targeted** primitive for the Returning Player scenario.
 *
 * Decision (2026-04-19, Epic 02 Área 6): we mutate `campaign_id` in-place
 * rather than cloning the character. On leaving the campaign, `campaign_id`
 * flips back to NULL and the character is standalone again.
 *
 * Wave 2 code review (2026-04-20):
 *   M16: wrap 3 writes in Postgres RPC (single transaction)
 *   M17: ON CONFLICT DO UPDATE SET status='active' (reactivate banned/inactive)
 *        — implemented inside the RPC
 *   M18: sub-code split for invite error taxonomy
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Sub-code taxonomy for failed links.
 *
 * M18 (Wave 2 code review): previously this was a single `invite_invalid`
 * bucket. Consumers (InviteLanding) couldn't distinguish "no such invite"
 * from "invite expired" from "invite already used" and showed a generic
 * error toast for all of them. The UX ask is to render locale-appropriate
 * copy per case (`invite.error.{code}` translation key).
 *
 * `retryable` hint drives whether the UI should expose a "try again" button
 * vs a "back to dashboard" CTA:
 *   - `character_not_available` — retryable (pick a different character)
 *   - `internal`                — retryable (transient DB error)
 *   - everything else           — not retryable (user must fix upstream)
 */
export type LinkErrorCode =
  | "unauthenticated"
  | "character_not_available"
  | "invite_not_found"
  | "invite_expired"
  | "invite_already_accepted"
  | "invite_mismatch"
  | "internal";

export type LinkResult =
  | { ok: true; characterId: string; campaignId: string }
  | {
      ok: false;
      code: LinkErrorCode;
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

  // 2. Invite validation. Service client so we can read regardless of the
  //    invite.email vs user.email mismatch (RLS would refuse to show an
  //    invite sent to a different address). The pre-validation exists to
  //    return FINE-GRAINED sub-codes (M18) — the RPC cannot differentiate
  //    "not found" from "expired" without re-implementing the same lookup.
  const service = createServiceClient();
  const { data: invite, error: inviteErr } = await service
    .from("campaign_invites")
    .select("id, campaign_id, status, expires_at, email")
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
      code: "invite_not_found",
      retryable: false,
      message: "Convite não encontrado",
    };
  }
  if (invite.status === "accepted") {
    return {
      ok: false,
      code: "invite_already_accepted",
      retryable: false,
      message: "Convite já utilizado",
    };
  }
  if (invite.status !== "pending") {
    // Status 'expired' or any unexpected value collapses to expired-class.
    return {
      ok: false,
      code: "invite_expired",
      retryable: false,
      message: "Convite expirado",
    };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return {
      ok: false,
      code: "invite_expired",
      retryable: false,
      message: "Convite expirado",
    };
  }
  // Guard against spoofed campaign_id from the client — must match the invite.
  if (invite.campaign_id !== campaignId) {
    return {
      ok: false,
      code: "invite_mismatch",
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
      code: "invite_mismatch",
      retryable: false,
      message: "Este convite foi enviado para outro endereço",
    };
  }

  // 3. Atomic RPC call (M16). Wraps UPDATE character + UPSERT member (w/
  //    reactivation — M17) + UPDATE invite in a single Postgres transaction.
  //    The RPC returns a JSON envelope mirroring this action's LinkResult
  //    shape for the two outcomes it can produce: `unauthenticated` (defense
  //    in depth — we already checked above) and `character_not_available`
  //    (race between two invites on the same standalone character).
  const { data: rpcData, error: rpcErr } = await service.rpc(
    "link_character_and_join_campaign",
    {
      p_character_id: characterId,
      p_campaign_id: invite.campaign_id,
      p_invite_id: inviteId,
    },
  );

  if (rpcErr) {
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Erro ao vincular personagem à campanha",
    };
  }

  // Narrow the RPC envelope. Supabase types RPC returns as `unknown` unless
  // a generated type exists; we shape-guard defensively.
  const envelope = rpcData as
    | {
        ok: true;
        character_id: string;
        campaign_id: string;
      }
    | {
        ok: false;
        code: "unauthenticated" | "character_not_available";
      }
    | null;

  if (!envelope || typeof envelope !== "object") {
    return {
      ok: false,
      code: "internal",
      retryable: true,
      message: "Resposta inesperada do servidor",
    };
  }

  if (envelope.ok === false) {
    if (envelope.code === "unauthenticated") {
      return {
        ok: false,
        code: "unauthenticated",
        retryable: false,
        message: "Usuário não autenticado",
      };
    }
    // character_not_available — retryable because the user can pick another
    // standalone character from the picker (window.location.reload() in the
    // consumer re-queries the list).
    return {
      ok: false,
      code: "character_not_available",
      retryable: true,
      message:
        "Personagem já vinculado a outra campanha. Escolha outro personagem.",
    };
  }

  return {
    ok: true,
    characterId: envelope.character_id,
    campaignId: envelope.campaign_id,
  };
}
