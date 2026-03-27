import type { RulesetVersion } from "@/lib/types/database";

export interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
}

export interface SrdMonster {
  // --- Search fields ---
  id: string;
  name: string;
  /** Maps from DB challenge_rating */
  cr: string;
  type: string;
  /** Maps from DB hp */
  hit_points: number;
  /** Maps from DB ac */
  armor_class: number;
  ruleset_version: RulesetVersion;
  /** Source book abbreviation (e.g. "MM", "VGM", "MTF") */
  source?: string;
  /** URL to the monster's token image (webp) */
  token_url?: string;
  /** Fallback token URL (cross-version or similar creature) */
  fallback_token_url?: string;

  // --- Full stat block fields (present in bundles; optional for lean test fixtures) ---
  size?: string;
  alignment?: string | null;
  hp_formula?: string | null;
  speed?: Record<string, string | number>;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  saving_throws?: Record<string, number> | null;
  skills?: Record<string, number> | null;
  damage_vulnerabilities?: string | null;
  damage_resistances?: string | null;
  damage_immunities?: string | null;
  condition_immunities?: string | null;
  senses?: string | null;
  languages?: string | null;
  xp?: number | null;
  special_abilities?: MonsterAction[] | null;
  actions?: MonsterAction[] | null;
  legendary_actions?: MonsterAction[] | null;
  reactions?: MonsterAction[] | null;
}

export interface SrdSpell {
  id: string;
  name: string;
  ruleset_version: RulesetVersion;
  /** Source book abbreviation (e.g. "PHB", "XGE", "TCE") */
  source?: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higher_levels: string | null;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
}

export type ItemRarity =
  | "none"
  | "common"
  | "uncommon"
  | "rare"
  | "very rare"
  | "legendary"
  | "artifact"
  | "varies"
  | "unknown";

export type ItemType =
  | "melee-weapon"
  | "ranged-weapon"
  | "light-armor"
  | "medium-armor"
  | "heavy-armor"
  | "shield"
  | "potion"
  | "scroll"
  | "ring"
  | "wand"
  | "rod"
  | "staff"
  | "adventuring-gear"
  | "tool"
  | "instrument"
  | "gaming-set"
  | "artisan-tools"
  | "spellcasting-focus"
  | "ammunition"
  | "wondrous"
  | "trade-good"
  | "art-object"
  | "gemstone"
  | "vehicle"
  | "mount"
  | "food-drink"
  | "explosive"
  | "other";

export interface SrdItem {
  id: string;
  name: string;
  source: string;
  type: ItemType;
  rarity: ItemRarity;
  isMagic: boolean;
  value?: number;
  weight?: number;
  ac?: number;
  dmg1?: string;
  dmg2?: string;
  dmgType?: string;
  weaponCategory?: "simple" | "martial";
  property?: string[];
  range?: string;
  stealth?: boolean;
  strength?: string;
  reqAttune?: boolean | string;
  charges?: number;
  recharge?: string;
  bonusWeapon?: string;
  bonusAc?: string;
  wondrous?: boolean;
  curse?: boolean;
  sentient?: boolean;
  entries: string[];
  baseItem?: string;
  edition?: "classic" | "one";
  srd?: boolean;
  basicRules?: boolean;
}

export interface SrdCondition {
  id: string;
  name: string;
  description: string;
  /** Source book abbreviation */
  source?: string;
  ruleset_version?: RulesetVersion;
  /** Categorizes the entry: core condition, disease, or status */
  category?: "condition" | "disease" | "status";
}

const monsterCache = new Map<RulesetVersion, Promise<SrdMonster[]>>();

/** Fetches the SRD monster bundle for a given ruleset version.
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadMonsters(
  version: RulesetVersion
): Promise<SrdMonster[]> {
  const cached = monsterCache.get(version);
  if (cached) return cached;
  const promise = fetch(`/srd/monsters-${version}.json`).then((res) => {
    if (!res.ok) {
      monsterCache.delete(version);
      throw new Error(`Failed to load SRD monsters (${version}): ${res.status}`);
    }
    return res.json() as Promise<SrdMonster[]>;
  });
  monsterCache.set(version, promise);
  return promise;
}

/** Fetches the SRD spell bundle for a given ruleset version.
 *  Results are cached by the browser via the standard fetch cache. */
export async function loadSpells(
  version: RulesetVersion
): Promise<SrdSpell[]> {
  const res = await fetch(`/srd/spells-${version}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load SRD spells (${version}): ${res.status}`);
  }
  return res.json() as Promise<SrdSpell[]>;
}

/** Fetches the SRD conditions bundle (version-agnostic).
 *  Results are cached by the browser via the standard fetch cache. */
export async function loadConditions(): Promise<SrdCondition[]> {
  const res = await fetch(`/srd/conditions.json`);
  if (!res.ok) {
    throw new Error(`Failed to load SRD conditions: ${res.status}`);
  }
  return res.json() as Promise<SrdCondition[]>;
}

const itemCache = new Map<string, Promise<SrdItem[]>>();

/** Fetches the SRD items bundle (consolidated mundane + magic).
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadItems(): Promise<SrdItem[]> {
  const key = "all";
  const cached = itemCache.get(key);
  if (cached) return cached;
  const promise = fetch(`/srd/items.json`).then((res) => {
    if (!res.ok) {
      itemCache.delete(key);
      throw new Error(`Failed to load SRD items: ${res.status}`);
    }
    return res.json() as Promise<SrdItem[]>;
  });
  itemCache.set(key, promise);
  return promise;
}
