import type { SrdMonster, MonsterAction } from "@/lib/srd/srd-loader";

interface FiveEToolsMonster {
  name?: string;
  source?: string;
  size?: string[] | string;
  type?: string | { type?: string };
  alignment?: string[];
  ac?: Array<{ ac?: number } | number>;
  hp?: { average?: number; formula?: string };
  speed?: Record<string, unknown>;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  cr?: string | { cr?: string };
  senses?: string[];
  languages?: string[];
  action?: Array<{ name?: string; entries?: unknown[] }>;
  legendary?: Array<{ name?: string; entries?: unknown[] }>;
  reaction?: Array<{ name?: string; entries?: unknown[] }>;
  trait?: Array<{ name?: string; entries?: unknown[] }>;
  save?: Record<string, string>;
  skill?: Record<string, string>;
  vulnerable?: string[];
  resist?: string[];
  immune?: string[];
  conditionImmune?: string[];
}

function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function extractAc(ac: FiveEToolsMonster["ac"]): number {
  if (!ac || ac.length === 0) return 10;
  const first = ac[0];
  if (typeof first === "number") return first;
  return first?.ac ?? 10;
}

function extractCr(cr: FiveEToolsMonster["cr"]): string {
  if (!cr) return "0";
  if (typeof cr === "string") return cr;
  return cr.cr ?? "0";
}

function extractType(type: FiveEToolsMonster["type"]): string {
  if (!type) return "unknown";
  if (typeof type === "string") return type;
  return type.type ?? "unknown";
}

function extractSize(size: FiveEToolsMonster["size"]): string {
  if (!size) return "Medium";
  if (Array.isArray(size)) return size[0] ?? "Medium";
  return size;
}

function entriesToDesc(entries: unknown[]): string {
  return entries
    .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
    .join(" ");
}

function extractActions(
  actions: Array<{ name?: string; entries?: unknown[] }> | undefined
): MonsterAction[] | null {
  if (!actions || actions.length === 0) return null;
  return actions.map((a) => ({
    name: a.name ?? "",
    desc: a.entries ? entriesToDesc(a.entries) : "",
  }));
}

function extractSpeed(speed: Record<string, unknown> | undefined): Record<string, string | number> | undefined {
  if (!speed) return undefined;
  const result: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(speed)) {
    if (typeof v === "number" || typeof v === "string") {
      result[k] = v;
    } else if (typeof v === "object" && v !== null && "number" in v) {
      result[k] = (v as { number: number }).number;
    }
  }
  return result;
}

function parseSaves(save: Record<string, string> | undefined): Record<string, number> | null {
  if (!save) return null;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(save)) {
    result[k] = parseInt(v, 10) || 0;
  }
  return result;
}

function parseSkills(skill: Record<string, string> | undefined): Record<string, number> | null {
  if (!skill) return null;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(skill)) {
    result[k] = parseInt(v, 10) || 0;
  }
  return result;
}

export function normalize5etools(raw: FiveEToolsMonster): SrdMonster | null {
  if (!raw.name) return null;

  return {
    id: toId(raw.name),
    name: raw.name,
    cr: extractCr(raw.cr),
    type: extractType(raw.type),
    hit_points: raw.hp?.average ?? 1,
    armor_class: extractAc(raw.ac),
    ruleset_version: "2014",
    source: "imported",
    is_srd: false,
    size: extractSize(raw.size),
    alignment: raw.alignment?.join(" ") ?? null,
    hp_formula: raw.hp?.formula ?? null,
    speed: extractSpeed(raw.speed),
    str: raw.str,
    dex: raw.dex,
    con: raw.con,
    int: raw.int,
    wis: raw.wis,
    cha: raw.cha,
    saving_throws: parseSaves(raw.save),
    skills: parseSkills(raw.skill),
    damage_vulnerabilities: raw.vulnerable?.join(", ") ?? null,
    damage_resistances: raw.resist?.join(", ") ?? null,
    damage_immunities: raw.immune?.join(", ") ?? null,
    condition_immunities: raw.conditionImmune?.join(", ") ?? null,
    senses: raw.senses?.join(", ") ?? null,
    languages: raw.languages?.join(", ") ?? null,
    special_abilities: extractActions(raw.trait),
    actions: extractActions(raw.action),
    legendary_actions: extractActions(raw.legendary),
    reactions: extractActions(raw.reaction),
  };
}
