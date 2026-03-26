// ---------------------------------------------------------------------------
// Pure dice-rolling engine
// ---------------------------------------------------------------------------

export type RollMode =
  | "normal"
  | "advantage"
  | "disadvantage"
  | "critical"
  | "resistance";

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
  /** Roll modifier mode */
  mode: RollMode;
  /** Discarded d20 for advantage/disadvantage */
  discardedDice: DieResult[];
  /** Pre-halved total for resistance mode */
  resistanceTotal?: number;
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
 * @param mode - optional modifier: advantage/disadvantage (d20) or critical/resistance (damage)
 */
const MAX_DICE = 100;

export function roll(
  notation: string,
  label = "",
  mode: RollMode = "normal",
): RollResult {
  const { count, sides, modifier } = parseNotation(notation);

  const isD20 = count === 1 && sides === 20;
  const discardedDice: DieResult[] = [];
  let effectiveMode = mode;

  // Validate mode compatibility — silently fall back to normal if incompatible
  if ((mode === "advantage" || mode === "disadvantage") && !isD20) {
    effectiveMode = "normal";
  }
  if ((mode === "critical" || mode === "resistance") && isD20) {
    effectiveMode = "normal";
  }

  // Determine actual dice count to roll
  let actualCount = Math.min(count, MAX_DICE);
  if (effectiveMode === "critical") {
    actualCount = Math.min(count * 2, MAX_DICE);
  }

  // For advantage/disadvantage, roll 2d20
  if (effectiveMode === "advantage" || effectiveMode === "disadvantage") {
    const die1: DieResult = { sides: 20, value: rollDie(20) };
    const die2: DieResult = { sides: 20, value: rollDie(20) };

    let kept: DieResult;
    let discarded: DieResult;
    if (effectiveMode === "advantage") {
      kept = die1.value >= die2.value ? die1 : die2;
      discarded = die1.value >= die2.value ? die2 : die1;
    } else {
      kept = die1.value <= die2.value ? die1 : die2;
      discarded = die1.value <= die2.value ? die2 : die1;
    }

    discardedDice.push(discarded);
    const total = kept.value + modifier;

    return {
      notation,
      label,
      dice: [kept],
      modifier,
      total,
      isNat1: kept.value === 1,
      isNat20: kept.value === 20,
      mode: effectiveMode,
      discardedDice,
    };
  }

  // Standard roll (normal, critical, resistance)
  const dice: DieResult[] = [];
  for (let i = 0; i < actualCount; i++) {
    dice.push({ sides, value: rollDie(sides) });
  }

  const diceTotal = dice.reduce((sum, d) => sum + d.value, 0);
  const total = diceTotal + modifier;

  const result: RollResult = {
    notation,
    label,
    dice,
    modifier,
    total,
    isNat1: isD20 && dice[0]?.value === 1,
    isNat20: isD20 && dice[0]?.value === 20,
    mode: effectiveMode,
    discardedDice,
  };

  if (effectiveMode === "resistance") {
    result.resistanceTotal = Math.max(0, Math.floor(total / 2));
  }

  return result;
}
