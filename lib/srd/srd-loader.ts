import type { RulesetVersion } from "@/lib/types/database";

export interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
}

export interface SrdMonster extends SrdMonsterADayFields {
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
  /** Whether this monster is part of the SRD 5.1 (free to distribute) */
  is_srd?: boolean;
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
  lair_actions?: MonsterAction[] | null;
  lair_actions_intro?: string | null;
  regional_effects?: MonsterAction[] | null;
  regional_effects_intro?: string | null;
}

export interface SrdSpell {
  id: string;
  name: string;
  ruleset_version: RulesetVersion;
  /** Source book abbreviation (e.g. "PHB", "XGE", "TCE") */
  source?: string;
  /** Whether this spell is part of the SRD 5.1 (free to distribute) */
  is_srd?: boolean;
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

export interface SrdMonsterADayFields {
  monster_a_day_url?: string | null;
  monster_a_day_author?: string | null;
  monster_a_day_day_id?: string | null;
  monster_a_day_notes?: string | null;
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

export interface SrdFeat {
  id: string;
  name: string;
  description: string;
  prerequisite: string | null;
  source: string;
  ruleset_version: string;
}

const monsterCache = new Map<RulesetVersion, Promise<SrdMonster[]>>();

/** @internal — exposed only for test isolation */
export function _clearMonsterCache() {
  monsterCache.clear();
  madMonsterCache = null;
}

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

let madMonsterCache: Promise<SrdMonster[]> | null = null;

/** Fetches the Monster-a-Day community monsters bundle.
 *  Returns empty array if file is missing (non-critical). */
export function loadMadMonsters(): Promise<SrdMonster[]> {
  if (madMonsterCache) return madMonsterCache;
  madMonsterCache = fetch("/srd/monsters-mad.json")
    .then((res) => {
      if (!res.ok) {
        madMonsterCache = null;
        return [] as SrdMonster[];
      }
      return res.json() as Promise<SrdMonster[]>;
    })
    .catch(() => {
      madMonsterCache = null;
      return [] as SrdMonster[];
    });
  return madMonsterCache;
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

const featCache = new Map<string, Promise<SrdFeat[]>>();

export function loadFeats(): Promise<SrdFeat[]> {
  const key = "all";
  const cached = featCache.get(key);
  if (cached) return cached;
  const promise = fetch("/srd/feats.json").then((res) => {
    if (!res.ok) {
      featCache.delete(key);
      throw new Error(`Failed to load SRD feats: ${res.status}`);
    }
    return res.json() as Promise<SrdFeat[]>;
  });
  featCache.set(key, promise);
  return promise;
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
