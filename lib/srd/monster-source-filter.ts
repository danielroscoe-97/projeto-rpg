import type { SrdMonster } from "./srd-loader";

/**
 * Canonical source buckets used by the Player Compendium filter chips.
 *
 * - `all` → no filter applied.
 * - `srd_2014` → SRD 5.1 content with `ruleset_version === "2014"`.
 * - `srd_2024` → SRD 5.1 content with `ruleset_version === "2024"`.
 * - `mad` → Monster-a-Day community bundle (`source === "MAD"`).
 * - `nonsrd` → Everything else (WotC non-SRD books such as VGM/MPMM/XMM).
 *            Only shown to beta-testers / full-data-mode users — see
 *            `useContentAccess().canAccess`.
 */
export type MonsterSourceFilter =
  | "all"
  | "srd_2014"
  | "srd_2024"
  | "mad"
  | "nonsrd";

/**
 * Storage key for the last chosen monster source filter. Versioned so a
 * future schema change can force a re-default without migrations.
 */
export const MONSTER_SOURCE_FILTER_STORAGE_KEY =
  "compendium.monsters.filter.v1";

/**
 * Decide whether a monster matches the current source bucket filter.
 *
 * MAD takes precedence over SRD flags because MAD monsters are a distinct
 * curatorial category — even if a MAD entry happened to carry `is_srd`,
 * users clicking the MAD chip expect only MAD results.
 */
export function matchesSource(
  monster: Pick<SrdMonster, "ruleset_version" | "is_srd" | "source">,
  filter: MonsterSourceFilter,
): boolean {
  if (filter === "all") return true;

  const isMad = monster.source === "MAD";

  if (filter === "mad") return isMad;

  // For every non-MAD bucket, exclude MAD entries so MAD doesn't leak
  // into SRD counts.
  if (isMad) return false;

  if (filter === "srd_2014") {
    return monster.is_srd === true && monster.ruleset_version === "2014";
  }

  if (filter === "srd_2024") {
    return monster.is_srd === true && monster.ruleset_version === "2024";
  }

  if (filter === "nonsrd") {
    // "nonsrd" = official content outside SRD. Explicitly `is_srd !== true`
    // to exclude both `false` (known non-SRD) and `undefined` sentinel.
    return monster.is_srd !== true;
  }

  return true;
}
