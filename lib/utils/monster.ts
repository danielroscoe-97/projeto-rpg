// ── Monster utility functions ─────────────────────────────────────
// Shared across PublicMonsterGrid, PublicMonsterSearch, PublicMonsterStatBlock,
// MonsterBrowser, and oracle/MonsterStatBlock

export const CR_RANGES = [
  { label: "0–1", min: 0, max: 1 },
  { label: "2–4", min: 2, max: 4 },
  { label: "5–8", min: 5, max: 8 },
  { label: "9–12", min: 9, max: 12 },
  { label: "13–16", min: 13, max: 16 },
  { label: "17–20", min: 17, max: 20 },
  { label: "21+", min: 21, max: 99 },
];

export const CREATURE_TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon",
  "Elemental", "Fey", "Fiend", "Giant", "Humanoid",
  "Monstrosity", "Ooze", "Plant", "Undead",
];

/** All distinct CR values that exist in 5e, ordered low→high */
export const ALL_CR_VALUES = [
  "0", "1/8", "1/4", "1/2",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
] as const;

export function parseCR(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

/** Strip surrounding double-quotes (straight and curly) from monster names */
export function cleanDisplayName(name: string): string {
  return name.replace(/^["""\u201C\u201D]+|["""\u201C\u201D]+$/g, "");
}

/** Normalize first letter to its unaccented base (Á→A, Í→I, É→E, etc.) */
export function baseFirstLetter(name: string): string {
  const ch = name[0];
  if (!ch) return "#";
  return ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatSpeed(speed: Record<string, string | number> | undefined): string {
  if (!speed) return "30 ft.";
  return Object.entries(speed)
    .map(([k, v]) => (k === "walk" ? String(v) : `${k} ${v}`))
    .join(", ");
}
