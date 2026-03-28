/**
 * D&D 5e Stat Block Parser
 *
 * Pure function that takes pasted stat block text (from PDFs, D&D Beyond, etc.)
 * and returns a structured ParsedStatBlock object.
 *
 * Target: ~80% accuracy on well-formatted blocks; user fixes the rest.
 */

import type { MonsterAction } from "@/lib/srd/srd-loader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedStatBlock {
  name: string;
  size: string;
  type: string;
  alignment: string | null;
  armor_class: number;
  ac_type: string | null;
  hit_points: number;
  hp_formula: string | null;
  speed: Record<string, string>;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  saving_throws: Record<string, number> | null;
  skills: Record<string, number> | null;
  damage_vulnerabilities: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string | null;
  languages: string | null;
  challenge_rating: string;
  xp: number | null;
  special_abilities: MonsterAction[] | null;
  actions: MonsterAction[] | null;
  legendary_actions: MonsterAction[] | null;
  reactions: MonsterAction[] | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
] as const;

const SIZE_PATTERN = new RegExp(`(${SIZES.join("|")})`, "i");

/** Section headers that split the stat block into named sections. */
const SECTION_HEADERS = [
  "Actions",
  "Bonus Actions",
  "Reactions",
  "Legendary Actions",
  "Mythic Actions",
  "Lair Actions",
  "Regional Effects",
] as const;

const SECTION_HEADER_RE = new RegExp(
  `^(${SECTION_HEADERS.join("|")})\\s*$`,
  "i",
);

// Known creature types in 5e
const CREATURE_TYPES = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
];

const CREATURE_TYPE_RE = new RegExp(`\\b(${CREATURE_TYPES.join("|")})\\b`, "i");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize whitespace: collapse runs, trim, fix common PDF artifacts. */
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u2013|\u2014/g, "-") // em/en dash -> hyphen
    .replace(/\u2018|\u2019/g, "'") // smart quotes
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[ \t]+/g, " ") // collapse spaces (keep newlines)
    .trim();
}

/** Parse a "+N" or "-N" modifier string into a number. */
function parseMod(s: string): number {
  return parseInt(s.replace(/\s/g, ""), 10);
}

/** Extract ability-name -> bonus map from a comma-separated list like "Str +5, Dex +3". */
function parseBonusMap(text: string): Record<string, number> | null {
  const map: Record<string, number> = {};
  const re = /(\w{3,})\s*([+-]\s*\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase().slice(0, 3);
    map[key] = parseMod(m[2]);
  }
  return Object.keys(map).length > 0 ? map : null;
}

/** Parse speed string like "30 ft., fly 60 ft., swim 30 ft." into a map. */
function parseSpeed(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Split on commas or semicolons
  const parts = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    // "fly 60 ft." — mode word followed by number
    const namedMode = part.match(/^([a-z]+)\s+(\d+)\s*ft\.?/i);
    if (namedMode) {
      result[namedMode[1].toLowerCase()] = `${namedMode[2]} ft.`;
      continue;
    }
    // "30 ft." — bare number means walk speed
    const bareSpeed = part.match(/^(\d+)\s*ft\.?/i);
    if (bareSpeed) {
      result["walk"] = `${bareSpeed[1]} ft.`;
    }
  }
  return result;
}

/**
 * Split a section body into named entries.
 * Entries look like "Name. Description text..." or "Name (Recharge 5-6). Desc..."
 */
function parseNamedEntries(text: string): MonsterAction[] {
  const entries: MonsterAction[] = [];
  if (!text.trim()) return entries;

  // Pattern: line starts with a bolded/capitalized name followed by a period
  // We handle "Name." and "Name (Cost X Actions)." etc.
  const entryRe = /(?:^|\n)\s*([A-Z][^\n.]*?(?:\([^)]*\))?)\.\s*/g;
  const starts: { name: string; index: number; matchLen: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(text)) !== null) {
    starts.push({ name: m[1].trim(), index: m.index, matchLen: m[0].length });
  }

  for (let i = 0; i < starts.length; i++) {
    const descStart = starts[i].index + starts[i].matchLen;
    const descEnd = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const desc = text.slice(descStart, descEnd).replace(/\n/g, " ").trim();
    const entry: MonsterAction = { name: starts[i].name, desc };

    // Extract attack bonus if present
    const atkMatch = desc.match(/([+-]\d+)\s+to\s+hit/i);
    if (atkMatch) {
      entry.attack_bonus = parseInt(atkMatch[1], 10);
    }

    entries.push(entry);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseStatBlock(text: string): ParsedStatBlock {
  const raw = normalize(text);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // Result with defaults
  const result: ParsedStatBlock = {
    name: "Unknown",
    size: "Medium",
    type: "beast",
    alignment: null,
    armor_class: 10,
    ac_type: null,
    hit_points: 1,
    hp_formula: null,
    speed: { walk: "30 ft." },
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    saving_throws: null,
    skills: null,
    damage_vulnerabilities: null,
    damage_resistances: null,
    damage_immunities: null,
    condition_immunities: null,
    senses: null,
    languages: null,
    challenge_rating: "0",
    xp: null,
    special_abilities: null,
    actions: null,
    legendary_actions: null,
    reactions: null,
    notes: null,
  };

  const notes: string[] = [];
  let cursor = 0;

  // -----------------------------------------------------------------------
  // 1. Name — first line
  // -----------------------------------------------------------------------
  if (lines.length > 0) {
    result.name = lines[cursor];
    cursor++;
  }

  // -----------------------------------------------------------------------
  // 2. Size / Type / Alignment — second line (e.g. "Huge dragon, chaotic evil")
  // -----------------------------------------------------------------------
  if (cursor < lines.length) {
    const sizeTypeLine = lines[cursor];
    const sizeMatch = sizeTypeLine.match(SIZE_PATTERN);
    if (sizeMatch) {
      result.size = sizeMatch[1].charAt(0).toUpperCase() + sizeMatch[1].slice(1).toLowerCase();
      cursor++;

      // Extract type
      const typeMatch = sizeTypeLine.match(CREATURE_TYPE_RE);
      if (typeMatch) {
        result.type = typeMatch[1].toLowerCase();
      }

      // Alignment: everything after the last comma (if present)
      const commaIdx = sizeTypeLine.lastIndexOf(",");
      if (commaIdx !== -1) {
        result.alignment = sizeTypeLine.slice(commaIdx + 1).trim() || null;
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Scan remaining lines for known properties
  // -----------------------------------------------------------------------
  // Collect lines into sections split by section headers
  const propertyLines: string[] = [];
  const sections: { header: string; body: string[] }[] = [];
  let currentSection: { header: string; body: string[] } | null = null;

  for (let i = cursor; i < lines.length; i++) {
    const line = lines[i];
    if (SECTION_HEADER_RE.test(line)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { header: line.toLowerCase().trim(), body: [] };
    } else if (currentSection) {
      currentSection.body.push(line);
    } else {
      propertyLines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  // -----------------------------------------------------------------------
  // 4. Parse property lines
  // -----------------------------------------------------------------------
  const abilityScoreLineIdx = propertyLines.findIndex((l) =>
    /STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA/i.test(l),
  );

  // Traits: lines after ability scores + score values and before first section
  // that are not recognized properties
  const traitLines: string[] = [];
  let pastAbilityScores = false;
  let pastProperties = false;

  for (let i = 0; i < propertyLines.length; i++) {
    const line = propertyLines[i];

    // Ability score header row
    if (/STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA/i.test(line)) {
      pastAbilityScores = false; // next line is the scores
      continue;
    }

    // Ability score values row (6 numbers, possibly with modifiers in parens)
    if (
      abilityScoreLineIdx >= 0 &&
      i === abilityScoreLineIdx + 1
    ) {
      // Extract scores: numbers NOT inside parentheses.
      // Strip parenthetical modifiers first, then grab the remaining numbers.
      const stripped = line.replace(/\([^)]*\)/g, " ");
      const nums = stripped.match(/\d+/g);
      if (nums && nums.length >= 6) {
        result.str = parseInt(nums[0], 10);
        result.dex = parseInt(nums[1], 10);
        result.con = parseInt(nums[2], 10);
        result.int = parseInt(nums[3], 10);
        result.wis = parseInt(nums[4], 10);
        result.cha = parseInt(nums[5], 10);
      }
      pastAbilityScores = true;
      continue;
    }

    // Armor Class
    const acMatch = line.match(/^Armor\s+Class\s+(\d+)\s*(.*)/i);
    if (acMatch) {
      result.armor_class = parseInt(acMatch[1], 10);
      const acType = acMatch[2]
        .replace(/^\(/, "")
        .replace(/\)$/, "")
        .trim();
      result.ac_type = acType || null;
      continue;
    }

    // Hit Points
    const hpMatch = line.match(
      /^Hit\s+Points?\s+(\d+)\s*(?:\(([^)]+)\))?/i,
    );
    if (hpMatch) {
      result.hit_points = parseInt(hpMatch[1], 10);
      result.hp_formula = hpMatch[2]?.trim().replace(/\s+/g, "") || null;
      continue;
    }

    // Speed
    const speedMatch = line.match(/^Speed\s+(.*)/i);
    if (speedMatch) {
      const parsed = parseSpeed(speedMatch[1]);
      result.speed = Object.keys(parsed).length > 0 ? parsed : { walk: "30 ft." };
      continue;
    }

    // Saving Throws
    const stMatch = line.match(/^Saving\s+Throws?\s+(.*)/i);
    if (stMatch) {
      result.saving_throws = parseBonusMap(stMatch[1]);
      continue;
    }

    // Skills
    const skillMatch = line.match(/^Skills?\s+(.*)/i);
    if (skillMatch) {
      result.skills = parseBonusMap(skillMatch[1]);
      continue;
    }

    // Damage Vulnerabilities
    const dvMatch = line.match(/^Damage\s+Vulnerabilit(?:y|ies)\s+(.*)/i);
    if (dvMatch) {
      result.damage_vulnerabilities = dvMatch[1].trim();
      continue;
    }

    // Damage Resistances
    const drMatch = line.match(/^Damage\s+Resistances?\s+(.*)/i);
    if (drMatch) {
      result.damage_resistances = drMatch[1].trim();
      continue;
    }

    // Damage Immunities
    const diMatch = line.match(/^Damage\s+Immunities?\s+(.*)/i);
    if (diMatch) {
      result.damage_immunities = diMatch[1].trim();
      continue;
    }

    // Condition Immunities
    const ciMatch = line.match(/^Condition\s+Immunities?\s+(.*)/i);
    if (ciMatch) {
      result.condition_immunities = ciMatch[1].trim();
      continue;
    }

    // Senses
    const sensesMatch = line.match(/^Senses?\s+(.*)/i);
    if (sensesMatch) {
      result.senses = sensesMatch[1].trim();
      continue;
    }

    // Languages
    const langMatch = line.match(/^Languages?\s+(.*)/i);
    if (langMatch) {
      result.languages = langMatch[1].trim();
      continue;
    }

    // Challenge Rating
    const crMatch = line.match(
      /^Challenge\s+(\d+(?:\/\d+)?)\s*(?:\(([0-9,. ]+)\s*XP\))?/i,
    );
    if (crMatch) {
      result.challenge_rating = crMatch[1];
      if (crMatch[2]) {
        result.xp = parseInt(crMatch[2].replace(/[, ]/g, ""), 10);
      }
      pastProperties = true;
      continue;
    }

    // Proficiency Bonus line (5.5e / 2024) - skip
    if (/^Proficiency\s+Bonus/i.test(line)) {
      continue;
    }

    // If we've passed ability scores and standard properties, treat as traits
    if (pastAbilityScores || pastProperties) {
      traitLines.push(line);
    } else {
      // Unrecognized pre-ability-score line — probably a name continuation
      // or mangled formatting. Stash in notes.
      notes.push(line);
    }
  }

  // -----------------------------------------------------------------------
  // 5. Parse traits (special abilities) from trait lines
  // -----------------------------------------------------------------------
  if (traitLines.length > 0) {
    const parsed = parseNamedEntries(traitLines.join("\n"));
    if (parsed.length > 0) {
      result.special_abilities = parsed;
    } else {
      notes.push(...traitLines);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Parse named sections (Actions, Reactions, Legendary Actions)
  // -----------------------------------------------------------------------
  for (const section of sections) {
    const bodyText = section.body.join("\n");

    if (section.header === "actions") {
      const entries = parseNamedEntries(bodyText);
      if (entries.length > 0) result.actions = entries;
    } else if (section.header === "bonus actions") {
      // Fold bonus actions into actions
      const entries = parseNamedEntries(bodyText);
      if (entries.length > 0) {
        result.actions = [...(result.actions || []), ...entries];
      }
    } else if (section.header === "reactions") {
      const entries = parseNamedEntries(bodyText);
      if (entries.length > 0) result.reactions = entries;
    } else if (
      section.header === "legendary actions" ||
      section.header === "mythic actions"
    ) {
      const entries = parseNamedEntries(bodyText);
      if (entries.length > 0) result.legendary_actions = entries;
    } else {
      // Unknown section -> notes
      notes.push(`[${section.header}]`, ...section.body);
    }
  }

  // -----------------------------------------------------------------------
  // 7. Notes
  // -----------------------------------------------------------------------
  if (notes.length > 0) {
    result.notes = notes.join("\n").trim() || null;
  }

  return result;
}
