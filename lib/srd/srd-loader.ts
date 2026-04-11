import type { RulesetVersion } from "@/lib/types/database";
import type { SrdClass } from "@/lib/types/srd-class";
import { srdDataUrl, isFullDataMode } from "./srd-mode";

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
  srd?: boolean;
  basicRules?: boolean;
}

export interface SrdBackground {
  id: string;
  name: string;
  source: string;
  ruleset_version: RulesetVersion;
  description: string;
  skill_proficiencies: string[];
  tool_proficiencies: string[];
  languages: string[];
  equipment: string;
  feature_name: string | null;
  feature_description: string | null;
  srd?: boolean;
  basicRules?: boolean;
}

export interface SrdRaceTrait {
  name: string;
  description: string;
}

export interface SrdRace {
  id: string;
  name: string;
  source: string;
  ruleset_version: RulesetVersion;
  /** Size abbreviations: "T" | "S" | "M" | "L" | "H" | "G" */
  size: string[];
  speed: Record<string, number>;
  darkvision: number | null;
  ability_bonuses: string;
  languages: string;
  traits: SrdRaceTrait[];
}

const monsterCrossrefCache = new Map<string, Promise<Record<string, string>>>();

/** Fetches the monster version crossref map (id→id bidirectional).
 *  Used to map 2014 monster IDs to 2024 equivalents and vice versa. */
export function loadMonsterCrossref(): Promise<Record<string, string>> {
  const key = loaderCacheKey("crossref");
  const cached = monsterCrossrefCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("monster-version-crossref.json"))
    .then((res) => {
      if (!res.ok) {
        monsterCrossrefCache.delete(key);
        return {} as Record<string, string>;
      }
      return res.json() as Promise<Record<string, string>>;
    })
    .catch(() => {
      monsterCrossrefCache.delete(key);
      return {} as Record<string, string>;
    });
  monsterCrossrefCache.set(key, promise);
  return promise;
}

const monsterCache = new Map<string, Promise<SrdMonster[]>>();

/** Cache key that includes version + data mode so public/full never collide. */
function loaderCacheKey(version: string): string {
  return `${version}-${isFullDataMode() ? "full" : "public"}`;
}

/** @internal — exposed only for test isolation */
export function _clearMonsterCache() {
  monsterCache.clear();
  madMonsterCache.clear();
}

/** Clear ALL module-level loader caches. Call when data mode changes. */
export function clearAllLoaderCaches() {
  monsterCache.clear();
  monsterCrossrefCache.clear();
  madMonsterCache.clear();
  spellCache.clear();
  conditionCache.clear();
  featCache.clear();
  backgroundCache.clear();
  itemCache.clear();
  classCache.clear();
  raceCache.clear();
}

/** Fetches the SRD monster bundle for a given ruleset version.
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadMonsters(
  version: RulesetVersion
): Promise<SrdMonster[]> {
  const key = loaderCacheKey(version);
  const cached = monsterCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl(`monsters-${version}.json`)).then((res) => {
    if (!res.ok) {
      monsterCache.delete(key);
      throw new Error(`Failed to load SRD monsters (${version}): ${res.status}`);
    }
    return res.json() as Promise<SrdMonster[]>;
  });
  monsterCache.set(key, promise);
  return promise;
}

const madMonsterCache = new Map<string, Promise<SrdMonster[]>>();

/** Fetches the Monster-a-Day community monsters bundle.
 *  Returns empty array if file is missing (non-critical). */
export function loadMadMonsters(): Promise<SrdMonster[]> {
  const key = loaderCacheKey("mad");
  const cached = madMonsterCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("monsters-mad.json"))
    .then((res) => {
      if (!res.ok) {
        madMonsterCache.delete(key);
        return [] as SrdMonster[];
      }
      return res.json() as Promise<SrdMonster[]>;
    })
    .catch(() => {
      madMonsterCache.delete(key);
      return [] as SrdMonster[];
    });
  madMonsterCache.set(key, promise);
  return promise;
}

const spellCache = new Map<string, Promise<SrdSpell[]>>();

/** Fetches the SRD spell bundle for a given ruleset version.
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadSpells(
  version: RulesetVersion
): Promise<SrdSpell[]> {
  const key = loaderCacheKey(version);
  const cached = spellCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl(`spells-${version}.json`)).then((res) => {
    if (!res.ok) {
      spellCache.delete(key);
      throw new Error(`Failed to load SRD spells (${version}): ${res.status}`);
    }
    return res.json() as Promise<SrdSpell[]>;
  });
  spellCache.set(key, promise);
  return promise;
}

const conditionCache = new Map<string, Promise<SrdCondition[]>>();

/** Fetches the SRD conditions bundle (version-agnostic).
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadConditions(): Promise<SrdCondition[]> {
  const key = loaderCacheKey("all");
  const cached = conditionCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("conditions.json")).then((res) => {
    if (!res.ok) {
      conditionCache.delete(key);
      throw new Error(`Failed to load SRD conditions: ${res.status}`);
    }
    return res.json() as Promise<SrdCondition[]>;
  });
  conditionCache.set(key, promise);
  return promise;
}

const featCache = new Map<string, Promise<SrdFeat[]>>();

export function loadFeats(): Promise<SrdFeat[]> {
  const key = loaderCacheKey("all");
  const cached = featCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("feats.json")).then((res) => {
    if (!res.ok) {
      featCache.delete(key);
      throw new Error(`Failed to load SRD feats: ${res.status}`);
    }
    return res.json() as Promise<SrdFeat[]>;
  });
  featCache.set(key, promise);
  return promise;
}

const backgroundCache = new Map<string, Promise<SrdBackground[]>>();

export function loadBackgrounds(): Promise<SrdBackground[]> {
  const key = loaderCacheKey("all");
  const cached = backgroundCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("backgrounds.json"))
    .then((res) => {
      if (!res.ok) {
        backgroundCache.delete(key);
        return [] as SrdBackground[];
      }
      return res.json() as Promise<SrdBackground[]>;
    })
    .catch(() => {
      backgroundCache.delete(key);
      return [] as SrdBackground[];
    });
  backgroundCache.set(key, promise);
  return promise;
}

const classCache = new Map<string, Promise<SrdClass[]>>();

const raceCache = new Map<string, Promise<SrdRace[]>>();

/** Fetches the full races bundle (auth-gated).
 *  Returns empty array for public/guest mode since races-full.json is not in public/srd/. */
export function loadRaces(): Promise<SrdRace[]> {
  const key = loaderCacheKey("all");
  const cached = raceCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("races-full.json"))
    .then((res) => {
      if (!res.ok) {
        raceCache.delete(key);
        return [] as SrdRace[];
      }
      return res.json() as Promise<SrdRace[]>;
    })
    .catch(() => {
      raceCache.delete(key);
      return [] as SrdRace[];
    });
  raceCache.set(key, promise);
  return promise;
}

const itemCache = new Map<string, Promise<SrdItem[]>>();

/** Fetches the SRD items bundle (consolidated mundane + magic).
 *  In public mode: filters to SRD/Basic Rules items only.
 *  In full mode (beta testers): returns ALL items without filtering. */
export function loadItems(): Promise<SrdItem[]> {
  const key = loaderCacheKey("all");
  const cached = itemCache.get(key);
  if (cached) return cached;
  const fullMode = isFullDataMode();
  const promise = fetch(srdDataUrl("items.json")).then((res) => {
    if (!res.ok) {
      itemCache.delete(key);
      throw new Error(`Failed to load SRD items: ${res.status}`);
    }
    return (res.json() as Promise<SrdItem[]>).then((items) =>
      fullMode
        ? items
        : items.filter((i) => i.srd === true || i.basicRules === true)
    );
  });
  itemCache.set(key, promise);
  return promise;
}

/** Fetches the SRD classes bundle (12 classes, version-agnostic).
 *  Promise is cached so multiple callers share one fetch+parse. */
export function loadClasses(): Promise<SrdClass[]> {
  const key = loaderCacheKey("all");
  const cached = classCache.get(key);
  if (cached) return cached;
  const promise = fetch(srdDataUrl("classes-srd.json")).then((res) => {
    if (!res.ok) {
      classCache.delete(key);
      throw new Error(`Failed to load SRD classes: ${res.status}`);
    }
    return res.json() as Promise<SrdClass[]>;
  });
  classCache.set(key, promise);
  return promise;
}
