"use server";

import { createServiceClient } from "./server";
import type { PlayerCharacter } from "@/lib/types/database";

export interface PlayerIdentity {
  sessionTokenId?: string;
  userId?: string;
}

export interface ClaimResult {
  claimedBy: "anon" | "auth";
}

export interface ListClaimableResult {
  characters: PlayerCharacter[];
  total: number;
  hasMore: boolean;
}

export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Validates `playerIdentity` has exactly one of `sessionTokenId` or `userId`.
 * Returning the discriminated variant lets callers avoid re-checking with
 * non-null assertions.
 */
function resolveIdentity(
  identity: PlayerIdentity,
): { kind: "anon"; sessionTokenId: string } | { kind: "auth"; userId: string } {
  const hasAnon = typeof identity.sessionTokenId === "string" && identity.sessionTokenId.length > 0;
  const hasAuth = typeof identity.userId === "string" && identity.userId.length > 0;

  if (hasAnon && hasAuth) {
    throw new Error("Identidade inválida: forneça apenas sessionTokenId OU userId, não ambos");
  }
  if (!hasAnon && !hasAuth) {
    throw new Error("Identidade inválida: forneça sessionTokenId ou userId");
  }

  if (hasAnon) return { kind: "anon", sessionTokenId: identity.sessionTokenId as string };
  return { kind: "auth", userId: identity.userId as string };
}

/**
 * Claim a DM-created character for a player.
 *
 * Uses an atomic UPDATE with WHERE clause to prevent races: two players can
 * call this concurrently; only the first hits rows. The second receives 0
 * rows affected and we throw the "already claimed" error.
 *
 * Soft claim (anon, via `sessionTokenId`) writes `claimed_by_session_token`.
 * Hard claim (auth, via `userId`) writes `user_id`. A soft claim is later
 * promoted to hard claim by `upgradePlayerIdentity` (Story 01-E).
 */
export async function claimCampaignCharacter(
  characterId: string,
  playerIdentity: PlayerIdentity,
): Promise<ClaimResult> {
  const identity = resolveIdentity(playerIdentity);
  const supabase = createServiceClient();

  const updatePayload =
    identity.kind === "anon"
      ? { claimed_by_session_token: identity.sessionTokenId }
      : { user_id: identity.userId };

  const { data, error } = await supabase
    .from("player_characters")
    .update(updatePayload)
    .eq("id", characterId)
    // Race guard: only proceed if nobody else has claimed the character yet.
    .is("user_id", null)
    .is("claimed_by_session_token", null)
    .select("id");

  if (error) {
    throw new Error(`Falha ao reivindicar personagem: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Personagem já reivindicado");
  }

  return { claimedBy: identity.kind };
}

/**
 * List characters in a campaign that are still claimable (neither hard nor
 * soft-claimed). Paginated with separate COUNT for `total` so the caller can
 * render "X de Y" UI without refetching.
 *
 * `playerIdentity` is validated but not otherwise used — the filter is
 * campaign-scoped, not identity-scoped (any valid player sees the same set).
 * Keeping identity in the signature enforces caller discipline and opens the
 * door for future per-identity filtering without a breaking change.
 */
export async function listClaimableCharacters(
  campaignId: string,
  playerIdentity: PlayerIdentity,
  pagination: Pagination,
): Promise<ListClaimableResult> {
  resolveIdentity(playerIdentity);
  const supabase = createServiceClient();

  const { limit, offset } = pagination;

  const { count, error: countError } = await supabase
    .from("player_characters")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .is("user_id", null)
    .is("claimed_by_session_token", null);

  if (countError) {
    throw new Error(`Falha ao listar personagens: ${countError.message}`);
  }

  const total = count ?? 0;

  if (total === 0) {
    return { characters: [], total: 0, hasMore: false };
  }

  const { data, error } = await supabase
    .from("player_characters")
    .select("*")
    .eq("campaign_id", campaignId)
    .is("user_id", null)
    .is("claimed_by_session_token", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Falha ao listar personagens: ${error.message}`);
  }

  const characters = (data ?? []) as PlayerCharacter[];
  const hasMore = offset + characters.length < total;

  return { characters, total, hasMore };
}
