"use client";

import type { SrdMonster } from "@/lib/srd/srd-loader";
import { VersionBadge } from "@/components/session/RulesetSelector";

interface MonsterStatBlockProps {
  monster: SrdMonster;
}

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function AbilityScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-muted-foreground text-xs uppercase font-medium">{label}</span>
      <span className="text-foreground font-mono text-sm">{score}</span>
      <span className="text-muted-foreground font-mono text-xs">({abilityMod(score)})</span>
    </div>
  );
}

function Divider() {
  return <hr className="border-t border-border my-2" />;
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="text-foreground font-medium">{label} </span>
      <span className="text-muted-foreground">{value}</span>
    </p>
  );
}

export function MonsterStatBlock({ monster }: MonsterStatBlockProps) {
  const speedStr = monster.speed
    ? Object.entries(monster.speed)
        .map(([k, v]) => (k === "walk" ? String(v) : `${k} ${v}`))
        .join(", ")
    : null;

  const savingThrowsStr = monster.saving_throws
    ? Object.entries(monster.saving_throws)
        .map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? "+" : ""}${v}`)
        .join(", ")
    : null;

  const skillsStr = monster.skills
    ? Object.entries(monster.skills)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v >= 0 ? "+" : ""}${v}`)
        .join(", ")
    : null;

  return (
    <section
      className="bg-card border border-border rounded-md p-4 text-sm"
      aria-label={`${monster.name} stat block`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-foreground font-semibold text-base">{monster.name}</h3>
          <p className="text-muted-foreground text-xs">
            {monster.size} {monster.type}
            {monster.alignment ? `, ${monster.alignment}` : ""}
          </p>
        </div>
        <VersionBadge version={monster.ruleset_version} />
      </div>

      <Divider />

      {/* Core stats */}
      <div className="space-y-1">
        <PropRow
          label="Armor Class"
          value={String(monster.armor_class)}
        />
        <PropRow
          label="Hit Points"
          value={
            monster.hp_formula
              ? `${monster.hit_points} (${monster.hp_formula})`
              : String(monster.hit_points)
          }
        />
        {speedStr && <PropRow label="Speed" value={speedStr} />}
      </div>

      {/* Ability scores — only when all six values are present */}
      {monster.str !== undefined &&
        monster.dex !== undefined &&
        monster.con !== undefined &&
        monster.int !== undefined &&
        monster.wis !== undefined &&
        monster.cha !== undefined && (
        <>
          <Divider />
          <div className="grid grid-cols-6 gap-1 py-1" role="table" aria-label="Ability scores">
            <AbilityScore label="STR" score={monster.str} />
            <AbilityScore label="DEX" score={monster.dex} />
            <AbilityScore label="CON" score={monster.con} />
            <AbilityScore label="INT" score={monster.int} />
            <AbilityScore label="WIS" score={monster.wis} />
            <AbilityScore label="CHA" score={monster.cha} />
          </div>
        </>
      )}

      {/* Properties */}
      {(savingThrowsStr || skillsStr || monster.damage_vulnerabilities ||
        monster.damage_resistances || monster.damage_immunities ||
        monster.condition_immunities || monster.senses || monster.languages) && (
        <Divider />
      )}
      <div className="space-y-1">
        {savingThrowsStr && (
          <PropRow label="Saving Throws" value={savingThrowsStr} />
        )}
        {skillsStr && <PropRow label="Skills" value={skillsStr} />}
        {monster.damage_vulnerabilities && (
          <PropRow label="Damage Vulnerabilities" value={monster.damage_vulnerabilities} />
        )}
        {monster.damage_resistances && (
          <PropRow label="Damage Resistances" value={monster.damage_resistances} />
        )}
        {monster.damage_immunities && (
          <PropRow label="Damage Immunities" value={monster.damage_immunities} />
        )}
        {monster.condition_immunities && (
          <PropRow label="Condition Immunities" value={monster.condition_immunities} />
        )}
        {monster.senses && <PropRow label="Senses" value={monster.senses} />}
        {monster.languages && (
          <PropRow label="Languages" value={monster.languages} />
        )}
        <PropRow
          label="Challenge"
          value={monster.xp ? `${monster.cr} (${monster.xp.toLocaleString()} XP)` : monster.cr}
        />
      </div>

      {/* Special Abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <Divider />
          <div className="space-y-2">
            {monster.special_abilities.map((ability, i) => (
              <p key={i} className="text-foreground/80 text-sm">
                <span className="font-semibold text-foreground">{ability.name}. </span>
                {ability.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <Divider />
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-2">
            Actions
          </h4>
          <div className="space-y-2">
            {monster.actions.map((action, i) => (
              <p key={i} className="text-foreground/80 text-sm">
                <span className="font-semibold text-foreground">{action.name}. </span>
                {action.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Reactions */}
      {monster.reactions && monster.reactions.length > 0 && (
        <>
          <Divider />
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-2">
            Reactions
          </h4>
          <div className="space-y-2">
            {monster.reactions.map((reaction, i) => (
              <p key={i} className="text-foreground/80 text-sm">
                <span className="font-semibold text-foreground">{reaction.name}. </span>
                {reaction.desc}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Legendary Actions */}
      {monster.legendary_actions && monster.legendary_actions.length > 0 && (
        <>
          <Divider />
          <h4 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-2">
            Legendary Actions
          </h4>
          <div className="space-y-2">
            {monster.legendary_actions.map((la, i) => (
              <p key={i} className="text-foreground/80 text-sm">
                <span className="font-semibold text-foreground">{la.name}. </span>
                {la.desc}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
