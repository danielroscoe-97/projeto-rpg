/**
 * Client-side fetch wrapper for `/api/characters/claimable`.
 *
 * Story 02-B full — feeds the "Disponíveis" tab of `CharacterPickerModal`.
 * The modal is a client component, so we can't import the server-side
 * `listClaimableCharacters` directly — we proxy through the REST endpoint
 * which handles auth + identity resolution via the caller's cookie JWT.
 */

import type { PlayerCharacter } from "@/lib/types/database";

export interface ListClaimableClientResult {
  characters: PlayerCharacter[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface ListClaimableOptions {
  campaignId: string;
  offset?: number;
  limit?: number;
  /** AbortSignal for cancelling in-flight requests (e.g. modal unmount). */
  signal?: AbortSignal;
}

export async function listClaimableClient(
  options: ListClaimableOptions,
): Promise<ListClaimableClientResult> {
  const { campaignId, offset = 0, limit = 20, signal } = options;

  const params = new URLSearchParams({
    campaignId,
    offset: String(offset),
    limit: String(limit),
  });

  const res = await fetch(`/api/characters/claimable?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    // Don't cache — pagination state changes as claims come in.
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Failed to load claimable characters (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // fall through
    }
    throw new Error(message);
  }

  const json = (await res.json()) as { data: ListClaimableClientResult };
  return json.data;
}
