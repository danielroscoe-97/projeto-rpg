import type { SrdMonster, MonsterAction } from "@/lib/srd/srd-loader";

interface FiveEDbMonster {
  index?: string;
  name?: string;
  size?: string;
  type?: string;
  alignment?: string;
  armor_class?: Array<{ type?: string; value?: number }>;
  hit_points?: number;
  hit_dice?: string;
  hit_points_roll?: string;
  speed?: Record<string, string>;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  challenge_rating?: number;
  proficiencies?: Array<{
    value?: number;
    proficiency?: { index?: string; name?: string };
  }>;
  damage_vulnerabilities?: string[];
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: Array<{ index?: string; name?: string }>;
  senses?: Record<string, string | number>;
  languages?: string;
  actions?: Array<{ name?: string; desc?: string; attack_bonus?: number }>;
  legendary_actions?: Array<{ name?: string; desc?: string }>;
  reactions?: Array<{ name?: string; desc?: string }>;
  special_abilities?: Array<{ name?: string; desc?: string }>;
}

function extractAc(ac: FiveEDbMonster["armor_class"]): number {
  if (!ac || ac.length === 0) return 10;
  return ac[0]?.value ?? 10;
}

function extractSaves(
  profs: FiveEDbMonster["proficiencies"]
): Record<string, number> | null {
  if (!profs) return null;
  const saves: Record<string, number> = {};
  for (const p of profs) {
    const idx = p.proficiency?.index ?? "";
    if (idx.startsWith("saving-throw-")) {
      const ability = idx.replace("saving-throw-", "");
      saves[ability] = p.value ?? 0;
    }
  }
  return Object.keys(saves).length > 0 ? saves : null;
}

function extractSkills(
  profs: FiveEDbMonster["proficiencies"]
): Record<string, number> | null {
  if (!profs) return null;
  const skills: Record<string, number> = {};
  for (const p of profs) {
    const idx = p.proficiency?.index ?? "";
    if (idx.startsWith("skill-")) {
      const skill = idx.replace("skill-", "");
      skills[skill] = p.value ?? 0;
    }
  }
  return Object.keys(skills).length > 0 ? skills : null;
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

function extractSenses(senses: Record<string, string | number> | undefined): string | null {
  if (!senses) return null;
  return Object.entries(senses)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ") || null;
}

function normalizeSpeed(speed: Record<string, string> | undefined): Record<string, string | number> | undefined {
  if (!speed) return undefined;
  const result: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(speed)) {
    result[k] = v;
  }
  return result;
}

export function normalize5eDatabase(raw: FiveEDbMonster): SrdMonster | null {
  if (!raw.name) return null;

  return {
    id: raw.index ?? raw.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    name: raw.name,
    cr: raw.challenge_rating != null ? String(raw.challenge_rating) : "0",
    type: raw.type ?? "unknown",
    hit_points: raw.hit_points ?? 1,
    armor_class: extractAc(raw.armor_class),
    ruleset_version: "2014",
    source: "imported",
    is_srd: false,
    size: raw.size,
    alignment: raw.alignment ?? null,
    hp_formula: raw.hit_points_roll ?? raw.hit_dice ?? null,
    speed: normalizeSpeed(raw.speed),
    str: raw.strength,
    dex: raw.dexterity,
    con: raw.constitution,
    int: raw.intelligence,
    wis: raw.wisdom,
    cha: raw.charisma,
    saving_throws: extractSaves(raw.proficiencies),
    skills: extractSkills(raw.proficiencies),
    damage_vulnerabilities: raw.damage_vulnerabilities?.join(", ") || null,
    damage_resistances: raw.damage_resistances?.join(", ") || null,
    damage_immunities: raw.damage_immunities?.join(", ") || null,
    condition_immunities: raw.condition_immunities?.map((c) => c.name ?? c.index ?? "").join(", ") || null,
    senses: extractSenses(raw.senses),
    languages: raw.languages || null,
    special_abilities: toActions(raw.special_abilities),
    actions: toActions(raw.actions),
    legendary_actions: toActions(raw.legendary_actions),
    reactions: toActions(raw.reactions),
  };
}
