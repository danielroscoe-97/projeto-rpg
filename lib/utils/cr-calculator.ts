/**
 * CR (Challenge Rating) Calculator — DMG 2014 & 2024 formulas.
 * Pure functions, zero server calls, <=50ms execution.
 */

// ── XP Thresholds per Level (DMG 2014, p.82) ─────────────────────────────────

const XP_THRESHOLDS_2014: Record<number, [easy: number, medium: number, hard: number, deadly: number]> = {
  1:  [25, 50, 75, 100],
  2:  [50, 100, 150, 200],
  3:  [75, 150, 225, 400],
  4:  [125, 250, 375, 500],
  5:  [250, 500, 750, 1100],
  6:  [300, 600, 900, 1400],
  7:  [350, 750, 1100, 1700],
  8:  [450, 900, 1400, 2100],
  9:  [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

// ── CR to XP mapping (DMG 2014) ──────────────────────────────────────────────

const CR_XP_MAP: Record<string, number> = {
  "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
  "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
  "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
  "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
  "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000,
  "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
};

// ── CR Budget tables (DMG 2024) ───────────────────────────────────────────────

const CR_BUDGET_2024: Record<number, [low: number, moderate: number, high: number, deadly: number]> = {
  1:  [2, 2, 3, 5],
  2:  [2, 4, 6, 8],
  3:  [3, 4, 8, 12],
  4:  [5, 8, 12, 16],
  5:  [7, 10, 15, 20],
  6:  [9, 12, 17, 22],
  7:  [10, 14, 19, 25],
  8:  [12, 16, 21, 28],
  9:  [14, 18, 24, 31],
  10: [15, 20, 26, 34],
  11: [17, 22, 29, 37],
  12: [19, 25, 32, 41],
  13: [21, 27, 35, 44],
  14: [23, 30, 38, 48],
  15: [25, 33, 41, 52],
  16: [27, 35, 45, 56],
  17: [30, 39, 50, 63],
  18: [32, 42, 54, 67],
  19: [35, 46, 58, 72],
  20: [38, 50, 63, 77],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type DifficultyLevel = "easy" | "medium" | "hard" | "deadly";
export type FormulaVersion = "2014" | "2024";

export interface CRCalculationResult {
  difficulty: DifficultyLevel;
  /** Total adjusted XP (2014) or total CR budget used (2024) */
  totalValue: number;
  /** Party threshold values: [easy, medium, hard, deadly] */
  thresholds: [number, number, number, number];
}

export interface MonsterInput {
  cr: string;
}

// ── Group multiplier (DMG 2014) ───────────────────────────────────────────────

function getGroupMultiplier(monsterCount: number): number {
  if (monsterCount <= 0) return 0;
  if (monsterCount === 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
}

// ── CR string → number ───────────────────────────────────────────────────────

export function crToNum(cr: string): number {
  if (cr === "1/8") return 0.125;
  if (cr === "1/4") return 0.25;
  if (cr === "1/2") return 0.5;
  return parseFloat(cr) || 0;
}

function crToXP(cr: string): number {
  return CR_XP_MAP[cr] ?? CR_XP_MAP[String(Math.round(crToNum(cr)))] ?? 0;
}

// ── Calculate 2014 ────────────────────────────────────────────────────────────

export function calculate2014(
  partyLevel: number,
  partySize: number,
  monsters: MonsterInput[]
): CRCalculationResult {
  const level = Math.max(1, Math.min(20, partyLevel));
  const size = Math.max(1, partySize);
  const thresholdRow = XP_THRESHOLDS_2014[level] ?? XP_THRESHOLDS_2014[1];
  const thresholds: [number, number, number, number] = [
    thresholdRow[0] * size,
    thresholdRow[1] * size,
    thresholdRow[2] * size,
    thresholdRow[3] * size,
  ];

  const rawXP = monsters.reduce((sum, m) => sum + crToXP(m.cr), 0);
  const multiplier = getGroupMultiplier(monsters.length);
  const adjustedXP = Math.round(rawXP * multiplier);

  let difficulty: DifficultyLevel = "easy";
  if (adjustedXP >= thresholds[3]) difficulty = "deadly";
  else if (adjustedXP >= thresholds[2]) difficulty = "hard";
  else if (adjustedXP >= thresholds[1]) difficulty = "medium";

  return { difficulty, totalValue: adjustedXP, thresholds };
}

// ── Calculate 2024 ────────────────────────────────────────────────────────────

export function calculate2024(
  partyLevel: number,
  partySize: number,
  monsters: MonsterInput[]
): CRCalculationResult {
  const level = Math.max(1, Math.min(20, partyLevel));
  const size = Math.max(1, partySize);
  const budgetRow = CR_BUDGET_2024[level] ?? CR_BUDGET_2024[1];
  const thresholds: [number, number, number, number] = [
    budgetRow[0] * size,
    budgetRow[1] * size,
    budgetRow[2] * size,
    budgetRow[3] * size,
  ];

  const totalCR = monsters.reduce((sum, m) => sum + crToNum(m.cr), 0);

  let difficulty: DifficultyLevel = "easy";
  if (totalCR >= thresholds[3]) difficulty = "deadly";
  else if (totalCR >= thresholds[2]) difficulty = "hard";
  else if (totalCR >= thresholds[1]) difficulty = "medium";

  return { difficulty, totalValue: totalCR, thresholds };
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function calculateDifficulty(
  formula: FormulaVersion,
  partyLevel: number,
  partySize: number,
  monsters: MonsterInput[]
): CRCalculationResult {
  if (monsters.length === 0) {
    return {
      difficulty: "easy",
      totalValue: 0,
      thresholds: [0, 0, 0, 0],
    };
  }
  return formula === "2024"
    ? calculate2024(partyLevel, partySize, monsters)
    : calculate2014(partyLevel, partySize, monsters);
}
