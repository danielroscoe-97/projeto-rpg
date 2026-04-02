import type { SrdMonster } from "@/lib/srd/srd-loader";

/**
 * Detect the number of legendary actions per round from SRD monster data.
 * Returns null if the monster has no legendary actions.
 *
 * Fallback chain:
 * 1. Explicit `legendary_actions_count` field (some SRD datasets)
 * 2. Parse "can take N legendary actions" from first entry description
 * 3. Default 3 (standard D&D 5e)
 */
export function getLegendaryActionCount(monster: SrdMonster): number | null {
  if (!monster.legendary_actions?.length) return null;

  // Fallback 1: explicit field
  if (
    "legendary_actions_count" in monster &&
    typeof (monster as Record<string, unknown>).legendary_actions_count === "number"
  ) {
    return (monster as Record<string, unknown>).legendary_actions_count as number;
  }

  // Fallback 2: parse from description text
  const firstEntry = monster.legendary_actions[0];
  if (firstEntry?.desc) {
    const match = firstEntry.desc.match(/can take (\d+) legendary action/i);
    if (match) return parseInt(match[1], 10);
  }

  // Fallback 3: D&D 5e default
  return 3;
}
