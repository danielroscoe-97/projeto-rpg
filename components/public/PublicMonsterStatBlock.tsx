"use client";

import Link from "next/link";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { DiceText } from "@/components/dice/DiceText";
import { ClickableRoll } from "@/components/dice/ClickableRoll";
import { useMonsterTranslation } from "@/lib/hooks/useMonsterTranslation";
import { formatSpeed } from "@/lib/utils/monster";
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
import { getSourceName, getSourceCategory } from "@/lib/utils/monster-source";
import "@/styles/stat-card-5e.css";

// ── Known terms for internal linking ──────────────────────────────────
const DAMAGE_TYPES = new Set([
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder",
]);
const DAMAGE_TYPES_PT = new Set([
  "ácido", "contundente", "frio", "fogo", "força", "elétrico",
  "necrótico", "perfurante", "veneno", "psíquico", "radiante", "cortante", "trovão",
]);
const CONDITIONS = new Set([
  "blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled",
  "incapacitated", "invisible", "paralyzed", "petrified", "poisoned",
  "prone", "restrained", "stunned", "unconscious",
]);
const CONDITIONS_PT = new Set([
  "cego", "enfeitiçado", "surdo", "exaustão", "amedrontado", "agarrado",
  "incapacitado", "invisível", "paralisado", "petrificado", "envenenado",
  "caído", "impedido", "atordoado", "inconsciente",
]);

function LinkedTerms({ text, knownTerms, href, isPt }: {
  text: string;
  knownTerms: Set<string>;
  href: string;
  isPt: boolean;
}) {
  // Split by comma, link known terms, leave qualifiers as plain text
  const parts = text.split(/,\s*/);
  return (
    <>
      {parts.map((part, i) => {
        const trimmed = part.trim();
        const lower = trimmed.toLowerCase();
        const isKnown = knownTerms.has(lower);
        return (
          <span key={i}>
            {i > 0 && ", "}
            {isKnown ? (
              <Link href={href} className="underline decoration-dotted underline-offset-2 hover:text-gold transition-colors">
                {trimmed}
              </Link>
            ) : (
              trimmed
            )}
          </span>
        );
      })}
    </>
  );
}

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function abilityModNum(score: number): number {
  return Math.floor((score - 10) / 2);
}

import { STAT_LABELS } from "@/lib/i18n/stat-labels";

interface PublicMonsterStatBlockProps {
  monster: SrdMonster;
  locale?: "en" | "pt-BR";
  slug?: string;
}

export function PublicMonsterStatBlock({ monster, locale = "en", slug = "" }: PublicMonsterStatBlockProps) {
  const { translated, globalPtBR, toggle, setGlobalPtBR, getName, getDesc } = useMonsterTranslation(slug, locale);
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
      {/* Language toggle — available on both EN and PT pages */}
      {slug && (
        <div className="flex items-center gap-2 text-xs text-[var(--5e-text-muted)] mb-3">
          <span className="shrink-0">
            {translated ? (
              locale === "pt-BR"
                ? <>Ficha em <span className="text-[var(--5e-accent-gold)]">PT-BR</span></>
                : <>Showing <span className="text-[var(--5e-accent-gold)]">PT-BR</span> translation</>
            ) : (
              locale === "pt-BR"
                ? <>Ficha em inglês (RAW)</>
                : <>Stat block in <span className="text-[var(--5e-accent-gold)]">English</span></>
            )}
          </span>
          <button
            onClick={toggle}
            className="shrink-0 px-2 py-0.5 rounded border border-[var(--5e-accent-gold)]/30 text-[var(--5e-accent-gold)] hover:bg-[var(--5e-accent-gold)]/10 transition-colors"
          >
            {translated
              ? (locale === "pt-BR" ? "Ver em inglês" : "View in English")
              : (locale === "pt-BR" ? "Traduzir" : "View in PT-BR")
            }
          </button>
          {!translated && !globalPtBR && locale === "pt-BR" && (
            <button
              onClick={setGlobalPtBR}
              className="shrink-0 text-[var(--5e-text-muted)] underline hover:text-[var(--5e-text)] transition-colors"
            >
              Sempre PT-BR
            </button>
          )}
        </div>
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--5e-text)] font-[family-name:var(--font-cinzel)] leading-tight">
              {getName(monster.name)}
            </h1>
            {monster.ruleset_version && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border border-[var(--5e-accent-gold)]/20 text-[var(--5e-accent-gold)]/70 bg-[var(--5e-accent-gold)]/5">
                {monster.ruleset_version}
              </span>
            )}
          </div>
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
        {/* Resistances / vulnerabilities / immunities — positioned after Speed/Initiative,
            before Abilities, to match 5e Tools / D&D Beyond reading order
            (Finding 7, spike 2026-04-17). Parity with MonsterStatBlock (auth/guest combat). */}
        {damageVuln && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageVulnerabilities}</strong>{" "}
            <LinkedTerms text={damageVuln} knownTerms={t ? DAMAGE_TYPES_PT : DAMAGE_TYPES} href={t ? "/tipos-de-dano" : "/damage-types"} isPt={!!t} />
          </p>
        )}
        {damageRes && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageResistances}</strong>{" "}
            <LinkedTerms text={damageRes} knownTerms={t ? DAMAGE_TYPES_PT : DAMAGE_TYPES} href={t ? "/tipos-de-dano" : "/damage-types"} isPt={!!t} />
          </p>
        )}
        {damageImm && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.damageImmunities}</strong>{" "}
            <LinkedTerms text={damageImm} knownTerms={t ? DAMAGE_TYPES_PT : DAMAGE_TYPES} href={t ? "/tipos-de-dano" : "/damage-types"} isPt={!!t} />
          </p>
        )}
        {conditionImm && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.conditionImmunities}</strong>{" "}
            <LinkedTerms text={conditionImm} knownTerms={t ? CONDITIONS_PT : CONDITIONS} href={t ? "/condicoes" : "/conditions"} isPt={!!t} />
          </p>
        )}
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
        {/* damageVuln / damageRes / damageImm / conditionImm moved above the
            ability scores block per Finding 7 (spike 2026-04-17). */}
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
        {monster.source && (
          <p>
            <strong className="text-[var(--5e-accent-red)]">{L.source}</strong>{" "}
            <span
              className={
                getSourceCategory(monster.source, monster.is_srd) === "srd"
                  ? "text-emerald-400"
                  : getSourceCategory(monster.source, monster.is_srd) === "community"
                    ? "text-orange-400"
                    : "text-[var(--5e-text-muted)]"
              }
            >
              {getSourceName(monster.source)}
            </span>
          </p>
        )}
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

      {/* Lair Actions */}
      {monster.lair_actions && monster.lair_actions.length > 0 && (
        <>
          <hr className="card-divider" />
          <h2 className="text-lg font-bold text-[var(--5e-accent-red)] border-b border-[var(--5e-accent-red)]/30 pb-1 mb-2 font-[family-name:var(--font-cinzel)]">
            {L.lairActions}
          </h2>
          {monster.lair_actions_intro && (
            <p className="text-sm text-[var(--5e-text-muted)] italic mb-2">
              <DiceText
                text={getDesc("lair_actions", "_intro", monster.lair_actions_intro)}
                rulesetVersion={monster.ruleset_version}
                source={monster.name}
              />
            </p>
          )}
          <div className="space-y-2 text-sm">
            {monster.lair_actions.map((la, i) => (
              <p key={i}>
                {la.name && (
                  <><strong className="italic text-[var(--5e-accent-gold)]">{la.name}.</strong>{" "}</>
                )}
                <DiceText
                  text={getDesc("lair_actions", la.name, la.desc)}
                  rulesetVersion={monster.ruleset_version}
                  actionName={la.name}
                  source={monster.name}
                />
              </p>
            ))}
          </div>
        </>
      )}

      {/* Regional Effects */}
      {monster.regional_effects && monster.regional_effects.length > 0 && (
        <>
          <hr className="card-divider" />
          <h2 className="text-lg font-bold text-[var(--5e-accent-red)] border-b border-[var(--5e-accent-red)]/30 pb-1 mb-2 font-[family-name:var(--font-cinzel)]">
            {L.regionalEffects}
          </h2>
          {monster.regional_effects_intro && (
            <p className="text-sm text-[var(--5e-text-muted)] italic mb-2">
              <DiceText
                text={getDesc("regional_effects", "_intro", monster.regional_effects_intro)}
                rulesetVersion={monster.ruleset_version}
                source={monster.name}
              />
            </p>
          )}
          <div className="space-y-2 text-sm">
            {monster.regional_effects.map((re, i) => (
              <p key={i}>
                {re.name && (
                  <><strong className="italic text-[var(--5e-accent-gold)]">{re.name}.</strong>{" "}</>
                )}
                <DiceText
                  text={getDesc("regional_effects", re.name, re.desc)}
                  rulesetVersion={monster.ruleset_version}
                  actionName={re.name}
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
