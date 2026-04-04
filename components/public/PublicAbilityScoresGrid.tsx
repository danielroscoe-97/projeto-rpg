"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  SrdIconMuscle,
  SrdIconRun,
  SrdIconHeart,
  SrdIconBrain,
  SrdIconEye,
  SrdIconSparkle,
} from "./SrdIcons";

// ── Types ─────────────────────────────────────────────────────────
interface PublicAbilityScoresGridProps {
  locale?: "en" | "pt-BR";
}

interface AbilityScore {
  key: string;
  nameEN: string;
  namePT: string;
  abbrEN: string;
  abbrPT: string;
  icon: ReactNode;
  color: string;
  colorBg: string;
  colorBorder: string;
  descriptionEN: string;
  descriptionPT: string;
  skillsEN: string[];
  skillsPT: string[];
  savingThrowEN: string;
  savingThrowPT: string;
  commonUsesEN: string[];
  commonUsesPT: string[];
}

// ── Data ──────────────────────────────────────────────────────────
const ABILITIES: AbilityScore[] = [
  {
    key: "str",
    nameEN: "Strength",
    namePT: "Forca",
    abbrEN: "STR",
    abbrPT: "FOR",
    icon: <SrdIconMuscle className="w-8 h-8" />,
    color: "#E53E3E",
    colorBg: "rgba(229,62,62,0.08)",
    colorBorder: "rgba(229,62,62,0.25)",
    descriptionEN:
      "Strength measures bodily power, athletic training, and the extent to which you can exert raw physical force.",
    descriptionPT:
      "Forca mede o poder corporal, treinamento atletico e a extensao com que voce pode exercer forca fisica bruta.",
    skillsEN: ["Athletics"],
    skillsPT: ["Atletismo"],
    savingThrowEN: "Strength saving throws resist being pushed, restrained, or physically overpowered.",
    savingThrowPT: "Testes de resistencia de Forca resistem a empurroes, contencao e sobrecarga fisica.",
    commonUsesEN: [
      "Melee attack rolls (most weapons)",
      "Damage rolls with melee weapons",
      "Carrying capacity & encumbrance",
      "Breaking objects & forcing doors",
      "Grapple & shove contests",
    ],
    commonUsesPT: [
      "Rolagens de ataque corpo a corpo (maioria das armas)",
      "Rolagens de dano com armas corpo a corpo",
      "Capacidade de carga & sobrecarga",
      "Quebrar objetos & forcar portas",
      "Disputas de agarrar & empurrar",
    ],
  },
  {
    key: "dex",
    nameEN: "Dexterity",
    namePT: "Destreza",
    abbrEN: "DEX",
    abbrPT: "DES",
    icon: <SrdIconRun className="w-8 h-8" />,
    color: "#38A169",
    colorBg: "rgba(56,161,105,0.08)",
    colorBorder: "rgba(56,161,105,0.25)",
    descriptionEN:
      "Dexterity measures agility, reflexes, and balance. It is the key ability for ranged attacks and avoiding danger.",
    descriptionPT:
      "Destreza mede agilidade, reflexos e equilibrio. E o atributo principal para ataques a distancia e para evitar perigos.",
    skillsEN: ["Acrobatics", "Sleight of Hand", "Stealth"],
    skillsPT: ["Acrobacia", "Prestidigitacao", "Furtividade"],
    savingThrowEN: "Dexterity saving throws dodge area effects like fireballs, traps, and breath weapons.",
    savingThrowPT: "Testes de resistencia de Destreza esquivam de efeitos em area como bolas de fogo, armadilhas e sopros.",
    commonUsesEN: [
      "Ranged attack rolls",
      "Initiative rolls",
      "Armor Class (light armor, no armor)",
      "Finesse weapon attacks",
      "Dodging area-of-effect spells",
    ],
    commonUsesPT: [
      "Rolagens de ataque a distancia",
      "Rolagens de iniciativa",
      "Classe de Armadura (armadura leve, sem armadura)",
      "Ataques com armas de acuidade",
      "Esquivar de magias de area",
    ],
  },
  {
    key: "con",
    nameEN: "Constitution",
    namePT: "Constituicao",
    abbrEN: "CON",
    abbrPT: "CON",
    icon: <SrdIconHeart className="w-8 h-8" />,
    color: "#DD6B20",
    colorBg: "rgba(221,107,32,0.08)",
    colorBorder: "rgba(221,107,32,0.25)",
    descriptionEN:
      "Constitution measures health, stamina, and vital force. It determines how many hit points you have.",
    descriptionPT:
      "Constituicao mede saude, vigor e forca vital. Determina quantos pontos de vida voce possui.",
    skillsEN: [],
    skillsPT: [],
    savingThrowEN: "Constitution saving throws resist poison, disease, and effects that drain vitality.",
    savingThrowPT: "Testes de resistencia de Constituicao resistem a veneno, doencas e efeitos que drenam vitalidade.",
    commonUsesEN: [
      "Hit point maximum (per level)",
      "Concentration checks on spells",
      "Resisting poison & disease",
      "Enduring harsh environments",
      "Death saving throws are not CON-based but benefit from high HP",
    ],
    commonUsesPT: [
      "Maximo de pontos de vida (por nivel)",
      "Testes de concentracao em magias",
      "Resistir a veneno & doencas",
      "Suportar ambientes hostis",
      "Salvaguardas contra morte se beneficiam de HP alto",
    ],
  },
  {
    key: "int",
    nameEN: "Intelligence",
    namePT: "Inteligencia",
    abbrEN: "INT",
    abbrPT: "INT",
    icon: <SrdIconBrain className="w-8 h-8" />,
    color: "#3182CE",
    colorBg: "rgba(49,130,206,0.08)",
    colorBorder: "rgba(49,130,206,0.25)",
    descriptionEN:
      "Intelligence measures mental acuity, accuracy of recall, and the ability to reason. It is the spellcasting ability for wizards.",
    descriptionPT:
      "Inteligencia mede acuidade mental, precisao de memoria e capacidade de raciocinio. E o atributo de conjuracao para magos.",
    skillsEN: ["Arcana", "History", "Investigation", "Nature", "Religion"],
    skillsPT: ["Arcanismo", "Historia", "Investigacao", "Natureza", "Religiao"],
    savingThrowEN: "Intelligence saving throws resist illusions, psychic attacks, and mental manipulation.",
    savingThrowPT: "Testes de resistencia de Inteligencia resistem a ilusoes, ataques psiquicos e manipulacao mental.",
    commonUsesEN: [
      "Wizard spellcasting modifier",
      "Spell save DC (wizards)",
      "Recalling lore & knowledge",
      "Solving puzzles & riddles",
      "Detecting illusions",
    ],
    commonUsesPT: [
      "Modificador de conjuracao do mago",
      "CD de resistencia a magias (magos)",
      "Recordar conhecimento & lendas",
      "Resolver enigmas & charadas",
      "Detectar ilusoes",
    ],
  },
  {
    key: "wis",
    nameEN: "Wisdom",
    namePT: "Sabedoria",
    abbrEN: "WIS",
    abbrPT: "SAB",
    icon: <SrdIconEye className="w-8 h-8" />,
    color: "#805AD5",
    colorBg: "rgba(128,90,213,0.08)",
    colorBorder: "rgba(128,90,213,0.25)",
    descriptionEN:
      "Wisdom reflects how attuned you are to the world around you and represents perceptiveness and intuition. It is the spellcasting ability for clerics, druids, and rangers.",
    descriptionPT:
      "Sabedoria reflete o quao sintonizado voce esta com o mundo ao redor e representa percepcao e intuicao. E o atributo de conjuracao para clerigos, druidas e patrulheiros.",
    skillsEN: ["Animal Handling", "Insight", "Medicine", "Perception", "Survival"],
    skillsPT: ["Lidar com Animais", "Intuicao", "Medicina", "Percepcao", "Sobrevivencia"],
    savingThrowEN: "Wisdom saving throws resist charm, fear, and effects that assault willpower.",
    savingThrowPT: "Testes de resistencia de Sabedoria resistem a encantamentos, medo e efeitos contra a forca de vontade.",
    commonUsesEN: [
      "Cleric, druid, ranger spellcasting",
      "Passive Perception (10 + modifier)",
      "Detecting hidden creatures",
      "Resisting charm & fear effects",
      "Sensing motives & deception",
    ],
    commonUsesPT: [
      "Conjuracao de clerigo, druida, patrulheiro",
      "Percepcao Passiva (10 + modificador)",
      "Detectar criaturas ocultas",
      "Resistir efeitos de encantamento & medo",
      "Perceber motivacoes & enganos",
    ],
  },
  {
    key: "cha",
    nameEN: "Charisma",
    namePT: "Carisma",
    abbrEN: "CHA",
    abbrPT: "CAR",
    icon: <SrdIconSparkle className="w-8 h-8" />,
    color: "#D69E2E",
    colorBg: "rgba(214,158,46,0.08)",
    colorBorder: "rgba(214,158,46,0.25)",
    descriptionEN:
      "Charisma measures your ability to interact effectively with others. It includes confidence, eloquence, and leadership. It is the spellcasting ability for bards, sorcerers, warlocks, and paladins.",
    descriptionPT:
      "Carisma mede sua capacidade de interagir efetivamente com outros. Inclui confianca, eloquencia e lideranca. E o atributo de conjuracao para bardos, feiticeiros, bruxos e paladinos.",
    skillsEN: ["Deception", "Intimidation", "Performance", "Persuasion"],
    skillsPT: ["Enganacao", "Intimidacao", "Atuacao", "Persuasao"],
    savingThrowEN: "Charisma saving throws resist banishment, possession, and effects that override personality.",
    savingThrowPT: "Testes de resistencia de Carisma resistem a banimento, possessao e efeitos que anulam a personalidade.",
    commonUsesEN: [
      "Bard, sorcerer, warlock, paladin spellcasting",
      "Social interactions & negotiations",
      "Counterspell & dispel magic contests",
      "Resisting banishment & possession",
      "Inspiring allies & commanding presence",
    ],
    commonUsesPT: [
      "Conjuracao de bardo, feiticeiro, bruxo, paladino",
      "Interacoes sociais & negociacoes",
      "Disputas de Contramágica & Dissipar Magia",
      "Resistir a banimento & possessao",
      "Inspirar aliados & impor presenca",
    ],
  },
];

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Ability Scores",
    subtitle:
      "Complete reference for all six ability scores with modifier calculator, skills, and common uses.",
    calcTitle: "Ability Score Modifier Calculator",
    calcDesc: "Enter an ability score (1\u201330) to calculate the modifier.",
    scorePlaceholder: "Score (1-30)",
    modifier: "Modifier",
    formula: "Modifier = floor((Score \u2212 10) / 2)",
    tableTitle: "Full Modifier Table",
    score: "Score",
    mod: "Mod",
    skills: "Skills",
    noSkills: "No associated skills",
    savingThrow: "Saving Throw",
    commonUses: "Common Uses",
  },
  "pt-BR": {
    title: "Atributos D&D 5e",
    subtitle:
      "Referencia completa dos seis atributos com calculadora de modificador, pericias e usos comuns.",
    calcTitle: "Calculadora de Modificador de Atributo",
    calcDesc: "Insira um valor de atributo (1\u201330) para calcular o modificador.",
    scorePlaceholder: "Valor (1-30)",
    modifier: "Modificador",
    formula: "Modificador = arredondar para baixo((Valor \u2212 10) / 2)",
    tableTitle: "Tabela Completa de Modificadores",
    score: "Valor",
    mod: "Mod",
    skills: "Pericias",
    noSkills: "Sem pericias associadas",
    savingThrow: "Teste de Resistencia",
    commonUses: "Usos Comuns",
  },
} as const;

// ── Modifier calculation ──────────────────────────────────────────
function calcModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function modifierColor(mod: number): string {
  if (mod <= -3) return "text-red-400";
  if (mod <= -1) return "text-red-300";
  if (mod === 0) return "text-yellow-300";
  if (mod <= 2) return "text-green-300";
  return "text-green-400";
}

function modifierBg(mod: number): string {
  if (mod <= -3) return "bg-red-950/50";
  if (mod <= -1) return "bg-red-950/25";
  if (mod === 0) return "bg-yellow-950/30";
  if (mod <= 2) return "bg-green-950/25";
  return "bg-green-950/50";
}

// ── Component ─────────────────────────────────────────────────────
export function PublicAbilityScoresGrid({
  locale = "en",
}: PublicAbilityScoresGridProps) {
  const [scoreInput, setScoreInput] = useState<string>("10");
  const L = LABELS[locale];

  const parsedScore = parseInt(scoreInput, 10);
  const isValid = !isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 30;
  const currentMod = isValid ? calcModifier(parsedScore) : null;

  // Full table from 1 to 30
  const tableRows = Array.from({ length: 30 }, (_, i) => {
    const s = i + 1;
    return { score: s, mod: calcModifier(s) };
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Modifier Calculator */}
      <section className="rounded-xl border border-[#D4A853]/20 bg-gray-900/60 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-1">
            {L.calcTitle}
          </h2>
          <p className="text-gray-400 text-sm">{L.calcDesc}</p>
        </div>

        {/* Input + Result */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="number"
            min={1}
            max={30}
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            placeholder={L.scorePlaceholder}
            className="w-full sm:w-40 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-center text-2xl font-bold text-[#F5F0E8] placeholder-gray-600 focus:border-[#D4A853] focus:outline-none focus:ring-1 focus:ring-[#D4A853]/50 transition-colors"
          />
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xl">=</span>
            <div
              className={`rounded-lg px-6 py-3 text-center min-w-[100px] ${
                isValid
                  ? `${modifierBg(currentMod!)} border border-gray-700`
                  : "bg-gray-800/50 border border-gray-800"
              }`}
            >
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                {L.modifier}
              </div>
              <div
                className={`text-2xl font-bold ${
                  isValid ? modifierColor(currentMod!) : "text-gray-600"
                }`}
              >
                {isValid ? formatModifier(currentMod!) : "---"}
              </div>
            </div>
          </div>
        </div>

        {/* Formula */}
        <p className="text-xs text-gray-500 font-mono bg-gray-800/50 rounded-lg px-3 py-2 inline-block">
          {L.formula}
        </p>

        {/* Full Modifier Table */}
        <div>
          <h3 className="text-sm font-semibold text-[#D4A853] mb-3 uppercase tracking-wide">
            {L.tableTitle}
          </h3>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-1 min-w-0">
              {tableRows.map(({ score, mod }) => (
                <div
                  key={score}
                  className={`rounded-md px-1 py-1.5 text-center transition-colors ${modifierBg(
                    mod
                  )} ${
                    isValid && parsedScore === score
                      ? "ring-2 ring-[#D4A853] ring-offset-1 ring-offset-gray-900"
                      : ""
                  }`}
                >
                  <div className="text-[10px] text-gray-500 leading-tight">
                    {score}
                  </div>
                  <div
                    className={`text-sm font-bold leading-tight ${modifierColor(
                      mod
                    )}`}
                  >
                    {formatModifier(mod)}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-950/50 border border-red-900/50" />
                {locale === "en" ? "Below average" : "Abaixo da media"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-950/30 border border-yellow-900/50" />
                {locale === "en" ? "Average" : "Na media"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-950/50 border border-green-900/50" />
                {locale === "en" ? "Above average" : "Acima da media"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ability Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ABILITIES.map((ability) => {
          const name =
            locale === "pt-BR" ? ability.namePT : ability.nameEN;
          const abbr =
            locale === "pt-BR" ? ability.abbrPT : ability.abbrEN;
          const description =
            locale === "pt-BR"
              ? ability.descriptionPT
              : ability.descriptionEN;
          const skills =
            locale === "pt-BR" ? ability.skillsPT : ability.skillsEN;
          const savingThrow =
            locale === "pt-BR"
              ? ability.savingThrowPT
              : ability.savingThrowEN;
          const commonUses =
            locale === "pt-BR"
              ? ability.commonUsesPT
              : ability.commonUsesEN;

          return (
            <div
              key={ability.key}
              className="rounded-xl border bg-gray-900/50 hover:bg-gray-900/70 transition-colors p-5 space-y-4"
              style={{
                borderColor: ability.colorBorder,
                background: `linear-gradient(135deg, ${ability.colorBg}, transparent 60%)`,
              }}
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <span className="shrink-0" style={{ color: ability.color }} aria-hidden>
                  {ability.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3
                      className="font-bold text-lg font-[family-name:var(--font-cinzel)]"
                      style={{ color: ability.color }}
                    >
                      {name}
                    </h3>
                    <span
                      className="text-xs font-mono font-bold opacity-70"
                      style={{ color: ability.color }}
                    >
                      ({abbr})
                    </span>
                  </div>
                  {locale === "pt-BR" && (
                    <p className="text-xs text-gray-500 italic">
                      {ability.nameEN}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {L.skills}
                </h4>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: ability.colorBg,
                          color: ability.color,
                          border: `1px solid ${ability.colorBorder}`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">{L.noSkills}</p>
                )}
              </div>

              {/* Saving Throw */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {L.savingThrow}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {savingThrow}
                </p>
              </div>

              {/* Common Uses */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {L.commonUses}
                </h4>
                <ul className="space-y-1">
                  {commonUses.map((use, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-400 flex gap-1.5"
                    >
                      <span
                        className="mt-0.5 shrink-0 opacity-60"
                        style={{ color: ability.color }}
                      >
                        &#x2022;
                      </span>
                      <span>{use}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
