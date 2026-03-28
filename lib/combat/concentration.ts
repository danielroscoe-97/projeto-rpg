import { toast } from "sonner";

/** Check if a combatant is concentrating */
export function isConcentrating(conditions: string[]): boolean {
  return conditions.some((c) => c === "concentrating" || c.startsWith("concentrating:"));
}

/** Get the spell name from a concentration condition */
export function getConcentrationSpell(conditions: string[]): string | null {
  const cond = conditions.find((c) => c.startsWith("concentrating:"));
  return cond ? cond.split(":")[1] : null;
}

/** Calculate concentration save DC: max(10, floor(damage / 2)) */
export function getConcentrationDC(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}

/** Show a concentration check toast prompt */
export function showConcentrationCheck(
  combatantName: string,
  damage: number,
  conSaveBonus: number = 0,
): void {
  const dc = getConcentrationDC(damage);
  const message = conSaveBonus > 0
    ? `\u26A0\uFE0F ${combatantName}: CON Save +${conSaveBonus} vs DC ${dc}`
    : `\u26A0\uFE0F ${combatantName}: CON Save DC ${dc}`;

  toast(message, {
    duration: 10000,
    action: {
      label: "Dismiss",
      onClick: () => {},
    },
  });
}
