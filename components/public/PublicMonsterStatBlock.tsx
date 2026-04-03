"use client";

import { MonsterToken } from "@/components/srd/MonsterToken";
import { DiceText } from "@/components/dice/DiceText";
import { ClickableRoll } from "@/components/dice/ClickableRoll";
import type { SrdMonster } from "@/lib/srd/srd-loader";
import "@/styles/stat-card-5e.css";

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function abilityModNum(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatSpeed(speed: Record<string, string | number> | undefined): string {
  if (!speed) return "30 ft.";
  return Object.entries(speed)
    .map(([k, v]) => (k === "walk" ? String(v) : `${k} ${v}`))
    .join(", ");
}

interface PublicMonsterStatBlockProps {
  monster: SrdMonster;
}

export function PublicMonsterStatBlock({ monster }: PublicMonsterStatBlockProps) {
  const abilities = [
    { label: "STR", value: monster.str ?? 10 },
    { label: "DEX", value: monster.dex ?? 10 },
    { label: "CON", value: monster.con ?? 10 },
    { label: "INT", value: monster.int ?? 10 },
    { label: "WIS", value: monster.wis ?? 10 },
    { label: "CHA", value: monster.cha ?? 10 },
  ];

  const savingThrows = monster.saving_throws
    ? Object.entries(monster.saving_throws)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
        .join(", ")
    : null;

  const skills = monster.skills
    ? Object.entries(monster.skills)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
        .join(", ")
    : null;

  const dexMod = abilityModNum(monster.dex ?? 10);
  const initNotation = `1d20${dexMod >= 0 ? `+${dexMod}` : `${dexMod}`}`;

  return (
    <article className="stat-card-5e stat-card-5e-inline !max-w-none">
      {/* Header with token */}
      <div className="flex items-start gap-4 mb-1">
        <MonsterToken
          tokenUrl={monster.token_url}
          fallbackTokenUrl={monster.fallback_token_url}
          creatureType={monster.type}
          name={monster.name}
          size={64}
          isMonsterADay={!!monster.monster_a_day_url}
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--5e-text)] font-[family-name:var(--font-cinzel)] leading-tight">
            {monster.name}
          </h1>
          <p className="text-[var(--5e-text-muted)] text-sm italic">
            {monster.size} {monster.type}
            {monster.alignment ? `, ${monster.alignment}` : ""}
          </p>
        </div>
      </div>

      <hr className="card-divider" />

      {/* Core stats */}
      <div className="space-y-1 text-sm">
        <p>
          <strong className="text-[var(--5e-accent-red)]">Armor Class</strong>{" "}
          {monster.armor_class}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Hit Points</strong>{" "}
          {monster.hit_points}
          {monster.hp_formula && (
            <>
              {" ("}
              <ClickableRoll
                notation={monster.hp_formula}
                label={`${monster.name} HP`}
                source={monster.name}
              >
                {monster.hp_formula}
              </ClickableRoll>
              {")"}
            </>
          )}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Speed</strong>{" "}
          {formatSpeed(monster.speed)}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">Initiative</strong>{" "}
          <ClickableRoll
            notation={initNotation}
            label={`${monster.name} Initiative`}
            source={monster.name}
          >
            {dexMod >= 0 ? `+${dexMod}` : `${dexMod}`}
          </ClickableRoll>
        </p>
      </div>

      <hr className="card-divider" />

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-2 text-center text-sm">
        {abilities.map((a) => (
          <div key={a.label}>
            <div className="font-bold text-[var(--5e-accent-red)] text-xs">{a.label}</div>
            <div className="text-[var(--5e-text)]">{a.value}</div>
            <ClickableRoll
              notation={`1d20${abilityModNum(a.value) >= 0 ? `+${abilityModNum(a.value)}` : `${abilityModNum(a.value)}`}`}
              label={`${a.label} check`}
              source={monster.name}
            >
              <span className="text-[var(--5e-text-muted)] text-xs">
                ({abilityMod(a.value)})
              </span>
            </ClickableRoll>
          </div>
        ))}
      </div>

      <hr className="card-divider" />

      {/* Properties */}
      <div className="space-y-1 text-sm">
        {savingThrows && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Saving Throws</strong>{" "}
            {savingThrows}
          </p>
        )}
        {skills && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Skills</strong>{" "}
            {skills}
          </p>
        )}
        {monster.damage_vulnerabilities && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Damage Vulnerabilities</strong>{" "}
            {monster.damage_vulnerabilities}
          </p>
        )}
        {monster.damage_resistances && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Damage Resistances</strong>{" "}
            {monster.damage_resistances}
          </p>
        )}
        {monster.damage_immunities && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Damage Immunities</strong>{" "}
            {monster.damage_immunities}
          </p>
        )}
        {monster.condition_immunities && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Condition Immunities</strong>{" "}
            {monster.condition_immunities}
          </p>
        )}
        {monster.senses && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Senses</strong>{" "}
            {monster.senses}
          </p>
        )}
        {monster.languages && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">Languages</strong>{" "}
            {monster.languages}
          </p>
        )}
        <p>
          <strong className="text-[var(--5e-accent-red)]">Challenge</strong>{" "}
          {monster.cr}
          {monster.xp ? ` (${monster.xp.toLocaleString()} XP)` : ""}
        </p>
      </div>

      {/* Special abilities */}
      {monster.special_abilities && monster.special_abilities.length > 0 && (
        <>
          <hr className="card-divider" />
          <div className="space-y-2 text-sm">
            {monster.special_abilities.map((ability, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{ability.name}.</strong>{" "}
                <DiceText
                  text={ability.desc}
                  rulesetVersion={monster.ruleset_version}
                  actionName={ability.name}
                  source={monster.name}
                />
              </p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {monster.actions && monster.actions.length > 0 && (
        <>
          <hr className="card-divider" />
          <h2 className="text-lg font-bold text-[var(--5e-accent-red)] border-b border-[var(--5e-accent-red)]/30 pb-1 mb-2 font-[family-name:var(--font-cinzel)]">
            Actions
          </h2>
          <div className="space-y-2 text-sm">
            {monster.actions.map((action, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{action.name}.</strong>{" "}
                <DiceText
                  text={action.desc}
                  rulesetVersion={monster.ruleset_version}
                  actionName={action.name}
                  source={monster.name}
                />
              </p>
            ))}
          </div>
        </>
      )}

      {/* Reactions */}
      {monster.reactions && monster.reactions.length > 0 && (
        <>
          <hr className="card-divider" />
          <h2 className="text-lg font-bold text-[var(--5e-accent-red)] border-b border-[var(--5e-accent-red)]/30 pb-1 mb-2 font-[family-name:var(--font-cinzel)]">
            Reactions
          </h2>
          <div className="space-y-2 text-sm">
            {monster.reactions.map((reaction, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{reaction.name}.</strong>{" "}
                <DiceText
                  text={reaction.desc}
                  rulesetVersion={monster.ruleset_version}
                  actionName={reaction.name}
                  source={monster.name}
                />
              </p>
            ))}
          </div>
        </>
      )}

      {/* Legendary Actions */}
      {monster.legendary_actions && monster.legendary_actions.length > 0 && (
        <>
          <hr className="card-divider" />
          <h2 className="text-lg font-bold text-[var(--5e-accent-red)] border-b border-[var(--5e-accent-red)]/30 pb-1 mb-2 font-[family-name:var(--font-cinzel)]">
            Legendary Actions
          </h2>
          <div className="space-y-2 text-sm">
            {monster.legendary_actions.map((la, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{la.name}.</strong>{" "}
                <DiceText
                  text={la.desc}
                  rulesetVersion={monster.ruleset_version}
                  actionName={la.name}
                  source={monster.name}
                />
              </p>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
