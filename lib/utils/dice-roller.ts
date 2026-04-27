/**
 * Dice roller — Wave 3b (Story C7) — high-level helpers used by the
 * `AbilityChip` roll surface in the V2 Player HQ.
 *
 * Built ON TOP of `lib/utils/dice.ts` (the lower-level notation parser).
 * This module exposes ergonomic, intent-named functions that the UI calls
 * directly — `rollAbilityCheck`, `rollAbilitySave`, `rollD20WithMod` —
 * rather than asking the UI layer to assemble a notation string.
 *
 * Why a second module instead of extending `dice.ts`?
 *  1. `dice.ts` is the legacy SRD-correct dice engine used by combat/stat
 *     generation; mixing UI-shaped roll metadata into it would couple
 *     unrelated surfaces.
 *  2. The roll-result shape returned here carries presentation hints
 *     (formula string, ability key, advantage mode, proficient flag) that
 *     the toast/popover renders verbatim. Keeping that shape close to the
 *     UI avoids leaking presentation concerns into the engine.
 *
 * NOTE on randomness: `dice.ts` uses `Math.random()`. That is acceptable
 * for D&D table rolls (no security boundary). Tests that need determinism
 * mock the `roll*` exports here, not `Math.random` directly.
 */

import { rollD20 as rollD20Engine, abilityModifier, type DiceRollResult } from "./dice";

/** The 6 D&D ability scores. Matches `lib/constants/dnd-skills.ts`. */
export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

/** Roll mode used by the ability chip menu (long-press). */
export type RollMode = "normal" | "advantage" | "disadvantage";

/** Type of roll triggered from the chip — drives label + formula prefix. */
export type RollType = "check" | "save";

/**
 * Result of an ability check or save roll. Wraps the engine result with
 * presentation-friendly fields so the toast/popover and broadcast can
 * render without re-deriving anything.
 */
export interface AbilityRollResult {
  /** Which attribute was rolled. */
  ability: Ability;
  /** Check vs Save — drives toast label ("STR check" / "CON save"). */
  rollType: RollType;
  /** Final total displayed to the user. */
  total: number;
  /** Final modifier applied (mod + profBonus when applicable). */
  modifier: number;
  /** Was the proficiency bonus included? Only meaningful for `rollType === "save"`. */
  proficient: boolean;
  /** Roll mode actually used (normal vs adv vs disadv). */
  mode: RollMode;
  /**
   * Human-readable formula string (e.g. `"1d20 + 5"`, `"2d20kh1 + 8 (prof)"`).
   * Used by the toast for the secondary "(12+5)" line.
   */
  formula: string;
  /** Raw die rolls (1-2 entries — 2 when adv/disadv). */
  rolls: number[];
  /** Index of the kept die (advantage = highest idx, disadv = lowest idx). */
  keptIndex: number;
  /** ISO timestamp at roll time — used by sessionStorage history. */
  timestamp: number;
}

/** Internal: turn the engine result into the UI-shaped `AbilityRollResult`. */
function fromEngineResult(
  engine: DiceRollResult,
  args: {
    ability: Ability;
    rollType: RollType;
    proficient: boolean;
    mode: RollMode;
    profBonus: number;
    abilityMod: number;
  },
): AbilityRollResult {
  // The engine's `kept` is an array of die indices (length 1 here because
  // we only roll 1d20 or 2d20kh1/kl1). Take the first kept index.
  const keptIndex = engine.kept[0] ?? 0;
  const finalMod = args.abilityMod + (args.proficient ? args.profBonus : 0);

  // Build the human-readable formula. We format the modifier sign explicitly
  // so the toast reads naturally regardless of negative ability scores.
  const modSignStr = finalMod >= 0 ? `+ ${finalMod}` : `- ${Math.abs(finalMod)}`;
  let dicePart: string;
  if (args.mode === "advantage") dicePart = "2d20kh1";
  else if (args.mode === "disadvantage") dicePart = "2d20kl1";
  else dicePart = "1d20";
  const profSuffix = args.rollType === "save" && args.proficient ? " (prof)" : "";
  const formula = finalMod === 0 ? `${dicePart}${profSuffix}` : `${dicePart} ${modSignStr}${profSuffix}`;

  return {
    ability: args.ability,
    rollType: args.rollType,
    total: engine.total,
    modifier: finalMod,
    proficient: args.proficient,
    mode: args.mode,
    formula,
    rolls: engine.rolls,
    keptIndex,
    timestamp: Date.now(),
  };
}

/**
 * Roll a 1d20 with a flat modifier and optional advantage/disadvantage.
 * Thin convenience wrapper around `dice.rollD20` for callers that don't
 * care about the ability/save metadata.
 *
 * Exported because the kickoff prompt names this signature explicitly
 * and downstream code (e.g. future initiative re-rolls) may want it.
 */
export function rollD20WithMod(modifier: number, mode: RollMode = "normal"): DiceRollResult {
  return rollD20Engine(modifier, mode);
}

/**
 * Roll an ability check: `1d20 + abilityMod`.
 * Proficiency bonus is NEVER added to a raw ability check (D&D 5e PHB p.174).
 *
 * @param ability    Which attribute (drives toast label and broadcast).
 * @param abilityMod The character's ability modifier (e.g. +2 for STR 14).
 * @param mode       Normal / advantage / disadvantage.
 */
export function rollAbilityCheck(
  ability: Ability,
  abilityMod: number,
  mode: RollMode = "normal",
): AbilityRollResult {
  const engine = rollD20Engine(abilityMod, mode);
  return fromEngineResult(engine, {
    ability,
    rollType: "check",
    proficient: false,
    mode,
    profBonus: 0,
    abilityMod,
  });
}

/**
 * Roll an ability save: `1d20 + abilityMod (+ profBonus if proficient)`.
 * Saving throw proficiency is a fixed property of the character (PHB p.179).
 *
 * @param ability     Which attribute (drives toast label and broadcast).
 * @param abilityMod  The character's ability modifier.
 * @param profBonus   The character's proficiency bonus for their level.
 * @param proficient  Whether this character is proficient in this save.
 * @param mode        Normal / advantage / disadvantage.
 */
export function rollAbilitySave(
  ability: Ability,
  abilityMod: number,
  profBonus: number,
  proficient: boolean,
  mode: RollMode = "normal",
): AbilityRollResult {
  const totalMod = abilityMod + (proficient ? profBonus : 0);
  const engine = rollD20Engine(totalMod, mode);
  return fromEngineResult(engine, {
    ability,
    rollType: "save",
    proficient,
    mode,
    profBonus,
    abilityMod,
  });
}

/**
 * Re-export of the underlying ability-modifier formula so call sites can
 * compute `abilityMod` from a raw score without importing two modules.
 */
export { abilityModifier };
