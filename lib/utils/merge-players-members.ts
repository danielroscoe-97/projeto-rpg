import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

export interface UnifiedPlayerEntry {
  /** Stable React key: character.id if exists, else member.id */
  key: string;
  /** Caso A: personagem manual (user_id = null). Caso B: personagem vinculado a membro. */
  character: PlayerCharacter | null;
  /** Caso B: membro autenticado vinculado ao personagem. Null para caso A. */
  member: CampaignMemberWithUser | null;
  /** Derived type for rendering logic */
  entryType: "character_only" | "linked";
}

/**
 * Merges player_characters and campaign_members into a unified list.
 *
 * Case A — character with user_id = null → "character_only"
 * Case B — character with user_id + matching member → "linked"
 * Case D — member with role = "dm" → omitted
 *
 * Order: linked first (by member.joined_at), then character_only (by created_at),
 * alphabetical within each group.
 */
export function mergePlayersAndMembers(
  characters: PlayerCharacter[],
  members: CampaignMemberWithUser[]
): UnifiedPlayerEntry[] {
  const memberByUserId = new Map<string, CampaignMemberWithUser>();
  for (const m of members) {
    if (m.role === "player") {
      memberByUserId.set(m.user_id, m);
    }
    // role = "dm" → skip (case D)
  }

  const linked: UnifiedPlayerEntry[] = [];
  const characterOnly: UnifiedPlayerEntry[] = [];

  for (const character of characters) {
    if (character.user_id) {
      const member = memberByUserId.get(character.user_id) ?? null;
      linked.push({
        key: character.id,
        character,
        member,
        entryType: "linked",
      });
    } else {
      characterOnly.push({
        key: character.id,
        character,
        member: null,
        entryType: "character_only",
      });
    }
  }

  // Sort each group alphabetically by character name
  const byName = (a: UnifiedPlayerEntry, b: UnifiedPlayerEntry) =>
    (a.character?.name ?? "").localeCompare(b.character?.name ?? "");

  linked.sort((a, b) => {
    // Primary: joined_at of the member (earliest first)
    const ta = a.member?.joined_at ?? "";
    const tb = b.member?.joined_at ?? "";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return byName(a, b);
  });

  characterOnly.sort(byName);

  return [...linked, ...characterOnly];
}
