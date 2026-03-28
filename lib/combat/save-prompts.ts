import { toast } from "sonner";

/** Show death save prompt when a PC reaches 0 HP */
export function showDeathSavePrompt(combatantName: string): void {
  toast(`\uD83D\uDC80 ${combatantName} is at 0 HP! Death Saves required.`, {
    duration: 10000,
  });
}

/** Conditions that allow re-save at turn start/end */
const RESAVABLE_CONDITIONS = [
  "Frightened", "Charmed", "Stunned", "Paralyzed", "Restrained",
];

/** Get conditions that can be re-saved at turn start */
export function getResavableConditions(conditions: string[]): string[] {
  return conditions.filter((c) => RESAVABLE_CONDITIONS.includes(c));
}

/** Show start-of-turn condition reminder */
export function showTurnConditionReminder(
  combatantName: string,
  conditions: string[],
): void {
  const resavable = getResavableConditions(conditions);
  for (const condition of resavable) {
    toast(`\uD83D\uDCCB ${combatantName} has ${condition} \u2014 can attempt save`, {
      duration: 6000,
    });
  }
}
