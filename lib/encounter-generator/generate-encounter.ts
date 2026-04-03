/**
 * Encounter Generator — picks random SRD monsters that fit an XP budget.
 * Pure function, no side effects, no server calls.
 */

import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { DifficultyLevel, FormulaVersion } from "@/lib/utils/cr-calculator";
import { crToXP, crToNum, calculate2014, calculate2024 } from "@/lib/utils/cr-calculator";
import type { RulesetVersion } from "@/lib/types/database";
import { ENVIRONMENT_MONSTER_TYPES, type EncounterEnvironment } from "./environment-map";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EncounterGeneratorInput {
  environment: EncounterEnvironment;
  partyLevel: number;
  partySize: number;
  difficulty: DifficultyLevel;
  formula: FormulaVersion;
  rulesetVersion: RulesetVersion;
}

export interface GeneratedEncounter {
  monsters: Array<{ monster: SrdMonster; count: number }>;
  difficulty: DifficultyLevel;
  totalXP: number;
  encounterName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract base type from compound types like "swarm of tiny beasts" → "beasts" → "beast" */
function normalizeMonsterType(type: string): string {
  const lower = type.toLowerCase().trim();
  // Handle "swarm of tiny beasts" → extract last word → strip trailing 's'
  const words = lower.split(/\s+/);
  const last = words[words.length - 1];
  return last.endsWith("s") ? last.slice(0, -1) : last;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── XP budget thresholds (2014 DMG) ──────────────────────────────────────────

const DIFFICULTY_INDEX: Record<DifficultyLevel, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  deadly: 3,
};

/** Group multiplier table (DMG 2014) */
function getGroupMultiplier(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

// ── Main algorithm ───────────────────────────────────────────────────────────

export function generateEncounter(
  input: EncounterGeneratorInput,
  allMonsters: SrdMonster[]
): GeneratedEncounter | null {
  const { environment, partyLevel, partySize, difficulty, formula, rulesetVersion } = input;

  // 1. Filter by ruleset version
  let pool = allMonsters.filter((m) => m.ruleset_version === rulesetVersion);

  // 2. Filter by environment
  const allowedTypes = ENVIRONMENT_MONSTER_TYPES[environment];
  if (allowedTypes.length > 0) {
    pool = pool.filter((m) => {
      const normalized = normalizeMonsterType(m.type);
      return allowedTypes.includes(normalized);
    });
  }

  // Filter out CR 0 monsters (they're not interesting encounters)
  pool = pool.filter((m) => crToNum(m.cr) > 0);

  if (pool.length === 0) return null;

  // 3. Calculate XP budget for desired difficulty
  const result = formula === "2024"
    ? calculate2024(partyLevel, partySize, [])
    : calculate2014(partyLevel, partySize, []);

  const diffIdx = DIFFICULTY_INDEX[difficulty];
  const targetBudget = result.thresholds[diffIdx];
  // Next difficulty tier ceiling (if deadly, use 1.5x deadly as soft cap)
  const nextIdx = Math.min(diffIdx + 1, 3);
  const ceiling = diffIdx === 3
    ? Math.round(targetBudget * 1.5)
    : result.thresholds[nextIdx];

  if (formula === "2024") {
    return generateEncounter2024(pool, targetBudget, ceiling, input);
  }

  return generateEncounterXP(pool, targetBudget, ceiling, input);
}

/** XP-based generation (2014 formula) */
function generateEncounterXP(
  pool: SrdMonster[],
  minBudget: number,
  maxBudget: number,
  input: EncounterGeneratorInput
): GeneratedEncounter | null {
  // Try up to 20 times to find a valid combination
  for (let attempt = 0; attempt < 20; attempt++) {
    const selected: SrdMonster[] = [];

    // Pick anchor monster: aim for 50-80% of budget (adjusted for solo multiplier of 1x)
    const anchorMin = minBudget * 0.4;
    const anchorMax = minBudget * 0.85;

    const anchorCandidates = pool.filter((m) => {
      const xp = crToXP(m.cr);
      return xp >= anchorMin && xp <= anchorMax;
    });

    // If no candidates in primary range, try wider range
    const candidates = anchorCandidates.length > 0
      ? anchorCandidates
      : pool.filter((m) => crToXP(m.cr) <= maxBudget && crToXP(m.cr) > 0);

    if (candidates.length === 0) return null;

    const anchor = pickRandom(candidates);
    selected.push(anchor);

    // Fill remaining budget
    const fillPool = shuffle(pool.filter((m) => crToXP(m.cr) <= crToXP(anchor.cr)));
    let safety = 0;

    while (safety++ < 50) {
      const totalCount = selected.length;
      const rawXP = selected.reduce((sum, m) => sum + crToXP(m.cr), 0);
      const multiplier = getGroupMultiplier(totalCount);
      const adjustedXP = rawXP * multiplier;

      if (adjustedXP >= minBudget) break;

      // How much raw XP can we still add?
      // newAdjusted = (rawXP + newXP) * getGroupMultiplier(totalCount + 1) <= maxBudget
      const nextMultiplier = getGroupMultiplier(totalCount + 1);
      const maxRawXPToAdd = (maxBudget / nextMultiplier) - rawXP;

      if (maxRawXPToAdd <= 0) break;

      const fillCandidates = fillPool.filter((m) => crToXP(m.cr) <= maxRawXPToAdd);
      if (fillCandidates.length === 0) break;

      selected.push(pickRandom(fillCandidates));
    }

    // Validate final result
    const rawXP = selected.reduce((sum, m) => sum + crToXP(m.cr), 0);
    const adjustedXP = Math.round(rawXP * getGroupMultiplier(selected.length));

    if (adjustedXP >= minBudget * 0.8 && adjustedXP <= maxBudget * 1.2) {
      return buildResult(selected, adjustedXP, input);
    }
  }

  // Fallback: single monster closest to budget
  const fallback = pool
    .map((m) => ({ monster: m, xp: crToXP(m.cr) }))
    .filter((m) => m.xp > 0)
    .sort((a, b) => Math.abs(a.xp - minBudget) - Math.abs(b.xp - minBudget));

  if (fallback.length === 0) return null;

  const pick = fallback[0];
  return buildResult([pick.monster], pick.xp, input);
}

/** CR-budget based generation (2024 formula) */
function generateEncounter2024(
  pool: SrdMonster[],
  minBudget: number,
  maxBudget: number,
  input: EncounterGeneratorInput
): GeneratedEncounter | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const selected: SrdMonster[] = [];

    // Anchor: 50-80% of CR budget
    const anchorCandidates = pool.filter((m) => {
      const cr = crToNum(m.cr);
      return cr >= minBudget * 0.4 && cr <= minBudget * 0.85;
    });

    const candidates = anchorCandidates.length > 0
      ? anchorCandidates
      : pool.filter((m) => crToNum(m.cr) <= maxBudget && crToNum(m.cr) > 0);

    if (candidates.length === 0) return null;

    const anchor = pickRandom(candidates);
    selected.push(anchor);

    const fillPool = shuffle(pool.filter((m) => crToNum(m.cr) <= crToNum(anchor.cr)));
    let safety = 0;

    while (safety++ < 50) {
      const totalCR = selected.reduce((sum, m) => sum + crToNum(m.cr), 0);
      if (totalCR >= minBudget) break;

      const remaining = maxBudget - totalCR;
      if (remaining <= 0) break;

      const fillCandidates = fillPool.filter((m) => crToNum(m.cr) <= remaining);
      if (fillCandidates.length === 0) break;

      selected.push(pickRandom(fillCandidates));
    }

    const totalCR = selected.reduce((sum, m) => sum + crToNum(m.cr), 0);
    if (totalCR >= minBudget * 0.8 && totalCR <= maxBudget * 1.2) {
      const totalXP = selected.reduce((sum, m) => sum + crToXP(m.cr), 0);
      return buildResult(selected, totalXP, input);
    }
  }

  // Fallback
  const fallback = pool
    .map((m) => ({ monster: m, cr: crToNum(m.cr) }))
    .filter((m) => m.cr > 0)
    .sort((a, b) => Math.abs(a.cr - minBudget) - Math.abs(b.cr - minBudget));

  if (fallback.length === 0) return null;
  const pick = fallback[0];
  return buildResult([pick.monster], crToXP(pick.monster.cr), input);
}

// ── Build result ─────────────────────────────────────────────────────────────

function buildResult(
  selected: SrdMonster[],
  totalXP: number,
  input: EncounterGeneratorInput
): GeneratedEncounter {
  // Group by monster id
  const groups = new Map<string, { monster: SrdMonster; count: number }>();
  for (const m of selected) {
    const existing = groups.get(m.id);
    if (existing) {
      existing.count++;
    } else {
      groups.set(m.id, { monster: m, count: 1 });
    }
  }
  const monsters = Array.from(groups.values());

  // Validate difficulty using the calculator
  const monsterInputs = selected.map((m) => ({ cr: m.cr }));
  const calcResult = input.formula === "2024"
    ? calculate2024(input.partyLevel, input.partySize, monsterInputs)
    : calculate2014(input.partyLevel, input.partySize, monsterInputs);

  // Generate encounter name
  const nameParts = monsters.map((g) =>
    g.count > 1 ? `${g.count}x ${g.monster.name}` : g.monster.name
  );
  const encounterName = nameParts.length <= 3
    ? nameParts.join(" & ")
    : `${nameParts.slice(0, 2).join(", ")} & +${nameParts.length - 2}`;

  return {
    monsters,
    difficulty: calcResult.difficulty,
    totalXP,
    encounterName,
  };
}
