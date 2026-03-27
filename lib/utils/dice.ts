/**
 * Dice engine — parses D&D-style dice notation and rolls dice.
 *
 * Supported notations:
 *   "1d20"        → roll 1 twenty-sided die
 *   "2d6+3"       → roll 2 six-sided dice, add 3
 *   "1d8-1"       → roll 1 eight-sided die, subtract 1
 *   "2d20kh1"     → roll 2d20, keep highest 1 (advantage)
 *   "2d20kl1"     → roll 2d20, keep lowest 1  (disadvantage)
 *   "4d6kh3"      → roll 4d6, keep highest 3   (stat generation)
 */

export interface DiceRollResult {
  /** Final computed total */
  total: number;
  /** Individual die results (all rolled, before keep/drop) */
  rolls: number[];
  /** Which rolls were kept (indices into `rolls`) */
  kept: number[];
  /** The flat modifier added/subtracted */
  modifier: number;
  /** Original notation string */
  notation: string;
}

/** Roll a single die with `faces` sides (1-based). */
function rollDie(faces: number): number {
  return Math.floor(Math.random() * faces) + 1;
}

/**
 * Parse and evaluate a dice notation string.
 *
 * Grammar (simplified):
 *   <expr>     ::= <dice> [<keep>] [<modifier>]
 *   <dice>     ::= <count> "d" <faces>
 *   <keep>     ::= ("kh" | "kl") <n>
 *   <modifier> ::= ("+" | "-") <number>
 *
 * Returns a structured result with individual rolls, kept indices, and total.
 */
export function rollDice(notation: string): DiceRollResult {
  const trimmed = notation.trim().toLowerCase();

  // Match:  (count)d(faces) [kh/kl(n)] [+/- modifier]
  const match = trimmed.match(
    // eslint-disable-next-line security/detect-unsafe-regex -- Anchored dice notation regex with optional keep-high/low; no ReDoS risk on bounded user input
    /^(\d+)d(\d+)(?:(kh|kl)(\d+))?(?:([+-])(\d+))?$/
  );

  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}"`);
  }

  const count = parseInt(match[1], 10);
  const faces = parseInt(match[2], 10);
  const keepMode = match[3] as "kh" | "kl" | undefined;
  const keepCount = match[4] ? parseInt(match[4], 10) : undefined;
  const modSign = match[5] as "+" | "-" | undefined;
  const modValue = match[6] ? parseInt(match[6], 10) : 0;

  if (count < 1 || count > 100) throw new Error("Dice count must be 1–100");
  if (faces < 1 || faces > 1000) throw new Error("Dice faces must be 1–1000");
  if (keepCount !== undefined && keepCount > count) {
    throw new Error(`Cannot keep ${keepCount} dice when only rolling ${count}`);
  }

  // Roll all dice
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(faces));
  }

  // Determine which dice to keep
  let kept: number[];
  if (keepMode && keepCount !== undefined) {
    // Create index-value pairs sorted by value
    const indexed = rolls.map((val, idx) => ({ val, idx }));
    if (keepMode === "kh") {
      indexed.sort((a, b) => b.val - a.val);
    } else {
      indexed.sort((a, b) => a.val - b.val);
    }
    kept = indexed.slice(0, keepCount).map((e) => e.idx).sort((a, b) => a - b);
  } else {
    kept = rolls.map((_, idx) => idx);
  }

  const modifier = modSign === "-" ? -modValue : modValue;
  const sum = kept.reduce((acc, idx) => acc + rolls[idx], 0);
  const total = sum + modifier;

  return { total, rolls, kept, modifier, notation: trimmed };
}

/**
 * Shorthand: roll 1d20 with an optional modifier.
 * Supports advantage/disadvantage via the `mode` parameter.
 */
export function rollD20(
  modifier = 0,
  mode: "normal" | "advantage" | "disadvantage" = "normal"
): DiceRollResult {
  const absmod = Math.abs(modifier);
  const sign = modifier >= 0 ? "+" : "-";
  const modStr = modifier !== 0 ? `${sign}${absmod}` : "";

  if (mode === "advantage") {
    return rollDice(`2d20kh1${modStr}`);
  }
  if (mode === "disadvantage") {
    return rollDice(`2d20kl1${modStr}`);
  }
  return rollDice(`1d20${modStr}`);
}

/**
 * Compute the D&D ability modifier from an ability score.
 * Formula: floor((score - 10) / 2)
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
