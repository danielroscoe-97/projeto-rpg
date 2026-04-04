"use client";

const ABILITY_SCORES = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int_score", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha_score", label: "CHA" },
] as const;

type AbilityKey = (typeof ABILITY_SCORES)[number]["key"];

function getModifier(score: number | null): string {
  if (score == null) return "—";
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getModifierColor(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  const mod = Math.floor((score - 10) / 2);
  if (mod > 0) return "text-emerald-400";
  if (mod < 0) return "text-red-400";
  return "text-foreground";
}

interface CharacterAttributeGridProps {
  str: number | null;
  dex: number | null;
  con: number | null;
  intScore: number | null;
  wis: number | null;
  chaScore: number | null;
}

export function CharacterAttributeGrid({
  str,
  dex,
  con,
  intScore,
  wis,
  chaScore,
}: CharacterAttributeGridProps) {
  const values: Record<AbilityKey, number | null> = {
    str,
    dex,
    con,
    int_score: intScore,
    wis,
    cha_score: chaScore,
  };

  const hasAny = Object.values(values).some((v) => v != null);
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {ABILITY_SCORES.map(({ key, label }) => {
        const score = values[key];
        return (
          <div
            key={key}
            className="bg-background/50 border border-border rounded-lg p-2 text-center"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className={`text-xl font-bold tabular-nums ${getModifierColor(score)}`}>
              {getModifier(score)}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {score ?? "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
