// ---------------------------------------------------------------------------
// Pure dice-rolling engine
// ---------------------------------------------------------------------------

export interface DieResult {
  sides: number;
  value: number;
}

export interface RollResult {
  /** Original notation string, e.g. "2d6+5" */
  notation: string;
  /** Label for context, e.g. "Tentacle (damage)" */
  label: string;
  /** Individual die results */
  dice: DieResult[];
  /** Static modifier (can be negative) */
  modifier: number;
  /** Final total */
  total: number;
  /** Whether the d20 rolled a natural 1 */
  isNat1: boolean;
  /** Whether the d20 rolled a natural 20 */
  isNat20: boolean;
}

/**
 * Parse a dice notation string like "2d6+5", "1d20-2", "4d6", "3".
 * Returns { count, sides, modifier }.
 */
export function parseNotation(notation: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const cleaned = notation.replace(/\s/g, "");

  // Pure number — no dice
  if (/^[+-]?\d+$/.test(cleaned)) {
    return { count: 0, sides: 0, modifier: Number(cleaned) };
  }

  const match = cleaned.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
  if (!match) {
    return { count: 0, sides: 0, modifier: 0 };
  }

  return {
    count: match[1] ? Number(match[1]) : 1,
    sides: Number(match[2]),
    modifier: match[3] ? Number(match[3]) : 0,
  };
}

/** Roll a single die with the given number of sides (1-indexed). */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll dice from a notation string.
 *
 * @param notation - e.g. "2d6+5", "1d20+7", "4d6"
 * @param label - contextual label for the roll
 */
export function roll(notation: string, label = ""): RollResult {
  const { count, sides, modifier } = parseNotation(notation);

  const dice: DieResult[] = [];
  for (let i = 0; i < count; i++) {
    dice.push({ sides, value: rollDie(sides) });
  }

  const diceTotal = dice.reduce((sum, d) => sum + d.value, 0);
  const total = diceTotal + modifier;

  // Nat 1/20 only applies to single d20 rolls
  const isD20 = count === 1 && sides === 20;

  return {
    notation,
    label,
    dice,
    modifier,
    total,
    isNat1: isD20 && dice[0].value === 1,
    isNat20: isD20 && dice[0].value === 20,
  };
}
