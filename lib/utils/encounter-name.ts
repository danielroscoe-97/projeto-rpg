import type { Combatant } from "@/lib/types/combat";

function stripNumberSuffix(name: string): string {
  return name.replace(/\s+\d+$/, "");
}

function pluralize(name: string, count: number): string {
  return count > 1 ? `${name}s` : name;
}

export function generateEncounterName(combatants: Combatant[]): string {
  const monsters = combatants.filter((c) => !c.is_player);
  const baseNameCounts = new Map<string, number>();
  for (const m of monsters) {
    const base = stripNumberSuffix(m.name);
    baseNameCounts.set(base, (baseNameCounts.get(base) ?? 0) + 1);
  }

  const uniqueNames = Array.from(baseNameCounts.entries()).map(([name, count]) =>
    pluralize(name, count)
  );

  if (uniqueNames.length === 0) return "Encounter";
  if (uniqueNames.length <= 3) return uniqueNames.join(" & ");
  const first2 = uniqueNames.slice(0, 2).join(", ");
  return `${first2} & +${uniqueNames.length - 2}`;
}
