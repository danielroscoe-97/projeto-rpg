"use client";

import { MonsterToken } from "@/components/srd/MonsterToken";
import { DiceText } from "@/components/dice/DiceText";
import { ClickableRoll } from "@/components/dice/ClickableRoll";
import { useMonsterTranslation } from "@/lib/hooks/useMonsterTranslation";
import {
  translateSize,
  translateType,
  translateAlignment,
  translateDamageString,
  translateConditionString,
  translateSkills,
  translateSavingThrows,
  translateSenses,
  translateSpeed,
} from "@/lib/i18n/dnd-terms-ptbr";
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

const STAT_LABELS = {
  "en": {
    armorClass: "Armor Class",
    hitPoints: "Hit Points",
    speed: "Speed",
    initiative: "Initiative",
    savingThrows: "Saving Throws",
    skills: "Skills",
    damageVulnerabilities: "Damage Vulnerabilities",
    damageResistances: "Damage Resistances",
    damageImmunities: "Damage Immunities",
    conditionImmunities: "Condition Immunities",
    senses: "Senses",
    languages: "Languages",
    challenge: "Challenge",
    actions: "Actions",
    reactions: "Reactions",
    legendaryActions: "Legendary Actions",
  },
  "pt-BR": {
    armorClass: "Classe de Armadura",
    hitPoints: "Pontos de Vida",
    speed: "Velocidade",
    initiative: "Iniciativa",
    savingThrows: "Testes de Resistência",
    skills: "Perícias",
    damageVulnerabilities: "Vulnerabilidades a Dano",
    damageResistances: "Resistências a Dano",
    damageImmunities: "Imunidades a Dano",
    conditionImmunities: "Imunidades a Condição",
    senses: "Sentidos",
    languages: "Idiomas",
    challenge: "Nível de Desafio",
    actions: "Ações",
    reactions: "Reações",
    legendaryActions: "Ações Lendárias",
  },
} as const;

interface PublicMonsterStatBlockProps {
  monster: SrdMonster;
  locale?: "en" | "pt-BR";
  slug?: string;
}

export function PublicMonsterStatBlock({ monster, locale = "en", slug = "" }: PublicMonsterStatBlockProps) {
  const { translated, globalPtBR, toggle, setGlobalPtBR, getName, getDesc } = useMonsterTranslation(slug);
  // Everything is English RAW by default; PT-BR only when user clicks "Traduzir ficha"
  const L = STAT_LABELS[translated ? "pt-BR" : "en"];
  const t = translated;

  const abilities = [
    { label: "STR", value: monster.str ?? 10 },
    { label: "DEX", value: monster.dex ?? 10 },
    { label: "CON", value: monster.con ?? 10 },
    { label: "INT", value: monster.int ?? 10 },
    { label: "WIS", value: monster.wis ?? 10 },
    { label: "CHA", value: monster.cha ?? 10 },
  ];

  const savingThrows = t
    ? translateSavingThrows(monster.saving_throws)
    : monster.saving_throws
      ? Object.entries(monster.saving_throws)
          .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
          .join(", ")
      : null;

  const skills = t
    ? translateSkills(monster.skills)
    : monster.skills
      ? Object.entries(monster.skills)
          .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`)
          .join(", ")
      : null;

  const speedStr = t ? translateSpeed(monster.speed) : formatSpeed(monster.speed);
  const damageVuln = t ? translateDamageString(monster.damage_vulnerabilities) : monster.damage_vulnerabilities;
  const damageRes = t ? translateDamageString(monster.damage_resistances) : monster.damage_resistances;
  const damageImm = t ? translateDamageString(monster.damage_immunities) : monster.damage_immunities;
  const conditionImm = t ? translateConditionString(monster.condition_immunities) : monster.condition_immunities;
  const sensesStr = t ? translateSenses(monster.senses) : monster.senses;
  const sizeStr = t ? translateSize(monster.size) : monster.size;
  const typeStr = t ? translateType(monster.type) : monster.type;
  const alignmentStr = t ? translateAlignment(monster.alignment) : monster.alignment;

  const dexMod = abilityModNum(monster.dex ?? 10);
  const initNotation = `1d20${dexMod >= 0 ? `+${dexMod}` : `${dexMod}`}`;

  return (
    <article className="stat-card-5e stat-card-5e-inline !max-w-none">
      {/* Language notice — only on PT-BR pages with a slug */}
      {locale === "pt-BR" && slug && (
        <p className="text-xs text-[var(--5e-text-muted)] mb-3 leading-relaxed">
          {translated ? (
            <>
              Ficha em{" "}
              <span className="text-[var(--5e-accent-gold)]">PT-BR</span>.{" "}
              <button
                onClick={toggle}
                className="underline hover:text-[var(--5e-text)] transition-colors"
              >
                Ver em inglês (RAW)
              </button>
            </>
          ) : (
            <>
              Ficha em inglês (RAW oficial) — melhor para interpretação.{" "}
              <button
                onClick={toggle}
                className="underline hover:text-[var(--5e-text)] transition-colors"
              >
                Traduzir ficha
              </button>
              {!globalPtBR && (
                <>
                  {" · "}
                  <button
                    onClick={setGlobalPtBR}
                    className="underline hover:text-[var(--5e-text)] transition-colors"
                  >
                    Sempre PT-BR
                  </button>
                </>
              )}
            </>
          )}
        </p>
      )}

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
            {getName(monster.name)}
          </h1>
          <p className="text-[var(--5e-text-muted)] text-sm italic">
            {sizeStr} {typeStr}
            {alignmentStr ? `, ${alignmentStr}` : ""}
          </p>
        </div>
      </div>

      <hr className="card-divider" />

      {/* Core stats */}
      <div className="space-y-1 text-sm">
        <p>
          <strong className="text-[var(--5e-accent-red)]">{L.armorClass}</strong>{" "}
          {monster.armor_class}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">{L.hitPoints}</strong>{" "}
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
          <strong className="text-[var(--5e-accent-red)]">{L.speed}</strong>{" "}
          {speedStr}
        </p>
        <p>
          <strong className="text-[var(--5e-accent-red)]">{L.initiative}</strong>{" "}
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
            <strong className="text-[var(--5e-accent-red)]">{L.savingThrows}</strong>{" "}
            {savingThrows}
          </p>
        )}
        {skills && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.skills}</strong>{" "}
            {skills}
          </p>
        )}
        {damageVuln && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageVulnerabilities}</strong>{" "}
            {damageVuln}
          </p>
        )}
        {damageRes && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageResistances}</strong>{" "}
            {damageRes}
          </p>
        )}
        {damageImm && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageImmunities}</strong>{" "}
            {damageImm}
          </p>
        )}
        {conditionImm && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.conditionImmunities}</strong>{" "}
            {conditionImm}
          </p>
        )}
        {sensesStr && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.senses}</strong>{" "}
            {sensesStr}
          </p>
        )}
        {monster.languages && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.languages}</strong>{" "}
            {monster.languages}
          </p>
        )}
        <p>
          <strong className="text-[var(--5e-accent-red)]">{L.challenge}</strong>{" "}
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
                  text={getDesc("special_abilities", ability.name, ability.desc)}
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
            {L.actions}
          </h2>
          <div className="space-y-2 text-sm">
            {monster.actions.map((action, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{action.name}.</strong>{" "}
                <DiceText
                  text={getDesc("actions", action.name, action.desc)}
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
            {L.reactions}
          </h2>
          <div className="space-y-2 text-sm">
            {monster.reactions.map((reaction, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{reaction.name}.</strong>{" "}
                <DiceText
                  text={getDesc("reactions", reaction.name, reaction.desc)}
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
            {L.legendaryActions}
          </h2>
          <div className="space-y-2 text-sm">
            {monster.legendary_actions.map((la, i) => (
              <p key={i}>
                <strong className="italic text-[var(--5e-accent-gold)]">{la.name}.</strong>{" "}
                <DiceText
                  text={getDesc("legendary_actions", la.name, la.desc)}
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
