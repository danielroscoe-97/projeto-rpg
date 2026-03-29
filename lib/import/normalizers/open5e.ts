import type { SrdMonster, MonsterAction } from "@/lib/srd/srd-loader";

interface Open5eMonster {
  slug?: string;
  name?: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: number;
  hit_points?: number;
  hit_dice?: string;
  speed?: Record<string, unknown>;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  challenge_rating?: string;
  senses?: string;
  languages?: string;
  actions?: Array<{ name?: string; desc?: string; attack_bonus?: number }>;
  legendary_actions?: Array<{ name?: string; desc?: string }>;
  reactions?: Array<{ name?: string; desc?: string }>;
  special_abilities?: Array<{ name?: string; desc?: string }>;
  strength_save?: number | null;
  dexterity_save?: number | null;
  constitution_save?: number | null;
  intelligence_save?: number | null;
  wisdom_save?: number | null;
  charisma_save?: number | null;
  damage_vulnerabilities?: string;
  damage_resistances?: string;
  damage_immunities?: string;
  condition_immunities?: string;
}

function toActions(
  arr: Array<{ name?: string; desc?: string; attack_bonus?: number }> | undefined
): MonsterAction[] | null {
  if (!arr || arr.length === 0) return null;
  return arr.map((a) => ({
    name: a.name ?? "",
    desc: a.desc ?? "",
    attack_bonus: a.attack_bonus,
  }));
}

function extractSaves(m: Open5eMonster): Record<string, number> | null {
  const saves: Record<string, number> = {};
  if (m.strength_save != null) saves.str = m.strength_save;
  if (m.dexterity_save != null) saves.dex = m.dexterity_save;
  if (m.constitution_save != null) saves.con = m.constitution_save;
  if (m.intelligence_save != null) saves.int = m.intelligence_save;
  if (m.wisdom_save != null) saves.wis = m.wisdom_save;
  if (m.charisma_save != null) saves.cha = m.charisma_save;
  return Object.keys(saves).length > 0 ? saves : null;
}

function normalizeSpeed(speed: Record<string, unknown> | undefined): Record<string, string | number> | undefined {
  if (!speed) return undefined;
  const result: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(speed)) {
    if (typeof v === "number" || typeof v === "string") {
      result[k] = v;
    }
  }
  return result;
}

export function normalizeOpen5e(raw: Open5eMonster): SrdMonster | null {
  if (!raw.name) return null;

  return {
    id: raw.slug ?? raw.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    name: raw.name,
    cr: raw.challenge_rating ?? "0",
    type: raw.type ?? "unknown",
    hit_points: raw.hit_points ?? 1,
    armor_class: raw.armor_class ?? 10,
    ruleset_version: "2014",
    source: "imported",
    is_srd: false,
    size: raw.size,
    alignment: raw.alignment ?? null,
    hp_formula: raw.hit_dice ?? null,
    speed: normalizeSpeed(raw.speed),
    str: raw.strength,
    dex: raw.dexterity,
    con: raw.constitution,
    int: raw.intelligence,
    wis: raw.wisdom,
    cha: raw.charisma,
    saving_throws: extractSaves(raw),
    damage_vulnerabilities: raw.damage_vulnerabilities || null,
    damage_resistances: raw.damage_resistances || null,
    damage_immunities: raw.damage_immunities || null,
    condition_immunities: raw.condition_immunities || null,
    senses: raw.senses || null,
    languages: raw.languages || null,
    special_abilities: toActions(raw.special_abilities),
    actions: toActions(raw.actions),
    legendary_actions: toActions(raw.legendary_actions),
    reactions: toActions(raw.reactions),
  };
}
