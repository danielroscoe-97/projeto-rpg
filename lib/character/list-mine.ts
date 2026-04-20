/**
 * Client-side fetch wrapper for `/api/characters/mine`.
 *
 * Story 02-B full — feeds the "Meus personagens" tab of `CharacterPickerModal`
 * (auth-only). Returns the caller's standalone characters (campaign_id IS NULL)
 * so they can bring a pre-existing character into a campaign.
 */

export interface MyCharacterSummary {
  id: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  max_hp: number;
  ac: number;
  token_url: string | null;
  created_at: string;
}

export interface ListMineResult {
  characters: MyCharacterSummary[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface ListMineOptions {
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}

export async function listMineCharacters(
  options: ListMineOptions = {},
): Promise<ListMineResult> {
  const { offset = 0, limit = 20, signal } = options;

  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  const res = await fetch(`/api/characters/mine?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Failed to load your characters (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // fall through
    }
    throw new Error(message);
  }

  const json = (await res.json()) as { data: ListMineResult };
  return json.data;
}
