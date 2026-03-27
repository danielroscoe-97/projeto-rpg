"use client";

import type { SrdMonster } from "@/lib/srd/srd-loader";
import type { RulesetVersion } from "@/lib/types/database";
import { LinkedText } from "./LinkedText";
import { ClickableRoll } from "@/components/dice/ClickableRoll";
import { DiceText } from "@/components/dice/DiceText";
import { MonsterToken } from "@/components/srd/MonsterToken";
import "@/styles/stat-card-5e.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse CR string handling fractions: "1/8"→0.125, "1/4"→0.25, "1/2"→0.5 */
export function parseCR(cr: string): number {
  if (!cr) return 0;
  if (cr.includes("/")) {
    const [num, den] = cr.split("/");
    const result = Number(num) / Number(den);
    return Number.isFinite(result) ? result : 0;
  }
  return Number(cr) || 0;
}

/** Standard D&D 5e proficiency bonus from CR. */
export function calculateProficiencyBonus(cr: string): number {
  return Math.max(2, Math.floor((parseCR(cr) - 1) / 4) + 2);
}

/** Ability modifier from score. */
function abilityModNum(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signedStr(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Calculate save modifier; returns signed string. */
export function calculateSave(
  abilityScore: number,
  hasProficiency: boolean,
  pb: number,
): string {
  const mod = abilityModNum(abilityScore);
  return signedStr(hasProficiency ? mod + pb : mod);
}

// XP table by CR string
const XP_BY_CR: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardDivider() {
  return <hr className="card-divider" />;
}

function PropLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="prop-line">
      <span className="prop-label">{label} </span>
      <span className="prop-value">{value}</span>
    </p>
  );
}

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function AbilityTable({
  monster,
  pb,
}: {
  monster: SrdMonster;
  pb: number;
}) {
  const scores = ABILITY_KEYS.map((k) => monster[k] as number | null | undefined);
  if (scores.some((s) => s == null)) return null;

  // Build saving throw proficiency set (lowercase keys from monster.saving_throws)
  const saveProfSet = new Set<string>();
  if (monster.saving_throws) {
    for (const key of Object.keys(monster.saving_throws)) {
      saveProfSet.add(key.toLowerCase());
    }
  }

  return (
    <div className="ability-table" role="table" aria-label="Ability scores">
      {/* Header row */}
      {ABILITY_LABELS.map((label) => (
        <div key={label} className="ability-header">{label}</div>
      ))}
      {/* Score row */}
      {ABILITY_KEYS.map((key, i) => (
        <div key={`score-${key}`} className="ability-score ability-row-even">
          {scores[i]}
        </div>
      ))}
      {/* Mod row — clickable ability checks */}
      {ABILITY_KEYS.map((key, i) => {
        const mod = abilityModNum(scores[i]!);
        const label = `${ABILITY_LABELS[i]} check`;
        return (
          <div key={`mod-${key}`} className="ability-mod">
            <ClickableRoll notation={`1d20${mod >= 0 ? "+" : ""}${mod}`} label={label}>
              {signedStr(mod)}
            </ClickableRoll>
          </div>
        );
      })}
      {/* Save row — clickable saving throws */}
      {ABILITY_KEYS.map((key, i) => {
        const hasProf = saveProfSet.has(key);
        const saveStr = calculateSave(scores[i]!, hasProf, pb);
        const saveNum = hasProf ? abilityModNum(scores[i]!) + pb : abilityModNum(scores[i]!);
        const label = `${ABILITY_LABELS[i]} save`;
        return (
          <div
            key={`save-${key}`}
            className={hasProf ? "ability-save-prof ability-row-even" : "ability-save ability-row-even"}
          >
            <ClickableRoll notation={`1d20${saveNum >= 0 ? "+" : ""}${saveNum}`} label={label}>
              {saveStr}
            </ClickableRoll>
          </div>
        );
      })}
    </div>
  );
}

function SectionBlock({
  title,
  items,
  renderDesc,
}: {
  title: string;
  items: { name: string; desc: string }[];
  renderDesc: (desc: string, actionName: string) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <>
      <CardDivider />
      <h4 className="section-header">{title}</h4>
      <div>
        {items.map((item) => (
          <p key={item.name} className="trait-block">
            <span className="trait-name">{item.name}. </span>
            <span className="trait-desc">{renderDesc(item.desc, item.name)}</span>
          </p>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export interface MonsterStatBlockProps {
  monster: SrdMonster;
  variant?: "inline" | "card";
  onPin?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  /** Override description renderer — used by LinkedText/DiceText integration */
  renderDesc?: (text: string, rulesetVersion: RulesetVersion, actionName?: string) => React.ReactNode;
}

export function MonsterStatBlock({
  monster,
  variant = "inline",
  onPin,
  onMinimize,
  onClose,
  renderDesc: renderDescProp,
}: MonsterStatBlockProps) {
  const pb = calculateProficiencyBonus(monster.cr);
  const dexMod = monster.dex !== undefined ? abilityModNum(monster.dex) : null;

  const speedStr = monster.speed
    ? Object.entries(monster.speed)
        .map(([k, v]) => (k === "walk" ? String(v) : `${k} ${v}`))
        .join(", ")
    : null;

  const skillEntries = monster.skills
    ? Object.entries(monster.skills).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        modifier: v,
      }))
    : null;

  // CR line: "CR {cr} (XP {xp}; PB +{pb})"
  const resolvedXp = monster.xp ?? XP_BY_CR[monster.cr] ?? null;
  let crDisplay: string;
  if (resolvedXp !== null) {
    crDisplay = `${monster.cr} (XP ${resolvedXp.toLocaleString()}; PB +${pb})`;
  } else {
    crDisplay = `${monster.cr} (PB +${pb})`;
  }

  // Description renderer — default uses DiceText (clickable dice + spell/condition links)
  const renderDesc = renderDescProp
    ? (text: string, actionName: string) => renderDescProp(text, monster.ruleset_version, actionName)
    : (text: string, actionName: string) => (
        <DiceText text={text} rulesetVersion={monster.ruleset_version} actionName={actionName} />
      );

  const isCard = variant === "card";
  const outerClassName = isCard
    ? "stat-card-5e"
    : "stat-card-5e stat-card-5e-inline";

  return (
    <section
      className={outerClassName}
      aria-label={`${monster.name} stat block`}
    >
      {/* Card toolbar (only for card variant) */}
      {isCard && (
        <div className="card-toolbar">
          {onPin && (
            <button type="button" onClick={onPin} aria-label="Pin card" title="Pin">
              📌
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} aria-label="Minimize card" title="Minimize">
              −
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close card" title="Close">
              ×
            </button>
          )}
        </div>
      )}

      {/* Header with token */}
      <div className="flex items-start gap-3">
        <MonsterToken
          tokenUrl={monster.token_url}
          creatureType={monster.type}
          name={monster.name}
          size={64}
        />
        <div className="flex-1 min-w-0">
          <div className="card-name">{monster.name}</div>
          <div className="card-subtitle">
            {monster.size} {monster.type}
            {monster.alignment ? `, ${monster.alignment}` : ""}
          </div>
        </div>
      </div>

      <CardDivider />

      {/* Core stats */}
      <PropLine label="AC" value={String(monster.armor_class)} />
      <p className="prop-line">
        <span className="prop-label">HP </span>
        <span className="prop-value">
          {monster.hp_formula ? (
            <>
              {monster.hit_points} (
              <ClickableRoll notation={monster.hp_formula} label={`${monster.name} HP`}>
                {monster.hp_formula}
              </ClickableRoll>
              )
            </>
          ) : (
            String(monster.hit_points)
          )}
        </span>
      </p>
      {dexMod !== null && (
        <p className="prop-line">
          <span className="prop-label">Initiative </span>
          <span className="prop-value">
            <ClickableRoll
              notation={`1d20${dexMod >= 0 ? "+" : ""}${dexMod}`}
              label={`${monster.name} Initiative`}
            >
              {signedStr(dexMod)} (<span title="Passive Initiative">{ 10 + dexMod}</span>)
            </ClickableRoll>
          </span>
        </p>
      )}
      {speedStr && <PropLine label="Speed" value={speedStr} />}

      {/* Ability scores table — divider only when table will render */}
      {ABILITY_KEYS.every((k) => monster[k] != null) && (
        <>
          <CardDivider />
          <AbilityTable monster={monster} pb={pb} />
        </>
      )}

      {/* Properties */}
      <CardDivider />
      {skillEntries && skillEntries.length > 0 && (
        <p className="prop-line">
          <span className="prop-label">Skills </span>
          <span className="prop-value">
            {skillEntries.map((skill, i) => (
              <span key={skill.name}>
                {i > 0 && ", "}
                {skill.name}{" "}
                <ClickableRoll
                  notation={`1d20${skill.modifier >= 0 ? "+" : ""}${skill.modifier}`}
                  label={`${skill.name} check`}
                >
                  {skill.modifier >= 0 ? "+" : ""}{skill.modifier}
                </ClickableRoll>
              </span>
            ))}
          </span>
        </p>
      )}
      {monster.damage_vulnerabilities && (
        <PropLine label="Damage Vulnerabilities" value={monster.damage_vulnerabilities} />
      )}
      {monster.damage_resistances && (
        <PropLine label="Damage Resistances" value={monster.damage_resistances} />
      )}
      {monster.damage_immunities && (
        <PropLine label="Damage Immunities" value={monster.damage_immunities} />
      )}
      {monster.condition_immunities && (
        <PropLine label="Condition Immunities" value={monster.condition_immunities} />
      )}
      {monster.senses && <PropLine label="Senses" value={monster.senses} />}
      {monster.languages && <PropLine label="Languages" value={monster.languages} />}
      <PropLine label="CR" value={crDisplay} />

      {/* Sections */}
      <SectionBlock
        title="Traits"
        items={monster.special_abilities ?? []}
        renderDesc={renderDesc}
      />
      <SectionBlock
        title="Actions"
        items={monster.actions ?? []}
        renderDesc={renderDesc}
      />
      <SectionBlock
        title="Reactions"
        items={monster.reactions ?? []}
        renderDesc={renderDesc}
      />
      {monster.legendary_actions && monster.legendary_actions.length > 0 && (
        <>
          <CardDivider />
          <h4 className="section-header">Legendary Actions</h4>
          <p className="trait-desc" style={{ marginBottom: "0.5em" }}>
            {`The ${monster.name} can take legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The ${monster.name} regains spent legendary actions at the start of its turn.`}
          </p>
          <div>
            {monster.legendary_actions.map((item) => (
              <p key={item.name} className="trait-block">
                <span className="trait-name">{item.name}. </span>
                <span className="trait-desc">{renderDesc(item.desc, item.name)}</span>
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
