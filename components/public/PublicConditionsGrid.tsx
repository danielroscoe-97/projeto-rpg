"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  SrdIconEye,
  SrdIconHeart,
  SrdIconEar,
  SrdIconSleepZz,
  SrdIconGhost,
  SrdIconFist,
  SrdIconStop,
  SrdIconEyeOff,
  SrdIconLightning,
  SrdIconStone,
  SrdIconSkull,
  SrdIconProneBody,
  SrdIconChain,
  SrdIconDizzy,
} from "./SrdIcons";

// ── Types ─────────────────────────────────────────────────────────
interface ConditionEntry {
  id: string;
  name: string;
  description: string;
  ruleset_version: "2014" | "2024";
  category: "condition" | "status" | "disease";
}

interface PublicConditionsGridProps {
  conditions: ConditionEntry[];
  locale?: "en" | "pt-BR";
}

// ── Categories ────────────────────────────────────────────────────
type CategoryFilter = "all" | "debuff" | "control" | "movement" | "sensory";

const CATEGORY_MAP: Record<string, CategoryFilter> = {
  blinded: "sensory",
  deafened: "sensory",
  invisible: "sensory",
  charmed: "control",
  frightened: "control",
  grappled: "movement",
  incapacitated: "control",
  paralyzed: "control",
  petrified: "control",
  restrained: "movement",
  prone: "movement",
  stunned: "control",
  unconscious: "control",
  poisoned: "debuff",
  exhaustion: "debuff",
};

const CONDITION_ICONS: Record<string, ReactNode> = {
  blinded: <SrdIconEye className="w-6 h-6" />,
  charmed: <SrdIconHeart className="w-6 h-6" />,
  deafened: <SrdIconEar className="w-6 h-6" />,
  exhaustion: <SrdIconSleepZz className="w-6 h-6" />,
  frightened: <SrdIconGhost className="w-6 h-6" />,
  grappled: <SrdIconFist className="w-6 h-6" />,
  incapacitated: <SrdIconStop className="w-6 h-6" />,
  invisible: <SrdIconEyeOff className="w-6 h-6" />,
  paralyzed: <SrdIconLightning className="w-6 h-6" />,
  petrified: <SrdIconStone className="w-6 h-6" />,
  poisoned: <SrdIconSkull className="w-6 h-6" />,
  prone: <SrdIconProneBody className="w-6 h-6" />,
  restrained: <SrdIconChain className="w-6 h-6" />,
  stunned: <SrdIconDizzy className="w-6 h-6" />,
  unconscious: <SrdIconSleepZz className="w-6 h-6" />,
};

const CONDITION_NAMES_PT: Record<string, string> = {
  blinded: "Cego",
  charmed: "Encantado",
  deafened: "Surdo",
  exhaustion: "Exaustão",
  frightened: "Amedrontado",
  grappled: "Agarrado",
  incapacitated: "Incapacitado",
  invisible: "Invisível",
  paralyzed: "Paralisado",
  petrified: "Petrificado",
  poisoned: "Envenenado",
  prone: "Caído",
  restrained: "Contido",
  stunned: "Atordoado",
  unconscious: "Inconsciente",
};

const CONDITION_DESCRIPTIONS_PT_2014: Record<string, string> = {
  blinded: "Uma criatura cega não pode ver e falha automaticamente em qualquer teste de habilidade que requeira visão. Jogadas de ataque contra a criatura têm vantagem, e as jogadas de ataque da criatura têm desvantagem.",
  charmed: "Uma criatura encantada não pode atacar o encantador ou alvo o encantador com habilidades ou efeitos mágicos prejudiciais. O encantador tem vantagem em qualquer teste de habilidade para interagir socialmente com a criatura.",
  deafened: "Uma criatura surda não pode ouvir e falha automaticamente em qualquer teste de habilidade que requeira audição.",
  exhaustion: "Exaustão é medida em seis níveis. Um efeito pode dar a uma criatura um ou mais níveis de exaustão. Se uma criatura já exausta sofrer outro efeito que causa exaustão, seu nível atual de exaustão aumenta pela quantidade especificada.",
  frightened: "Uma criatura amedrontada tem desvantagem em testes de habilidade e jogadas de ataque enquanto a fonte de seu medo estiver em sua linha de visão. A criatura não pode se mover voluntariamente para mais perto da fonte de seu medo.",
  grappled: "A velocidade de uma criatura agarrada se torna 0, e ela não pode se beneficiar de nenhum bônus em sua velocidade. A condição termina se o agarrador ficar incapacitado ou se um efeito remover a criatura agarrada do alcance do agarrador.",
  incapacitated: "Uma criatura incapacitada não pode realizar ações ou reações.",
  invisible: "Uma criatura invisível é impossível de ver sem a ajuda de magia ou um sentido especial. Para fins de se esconder, a criatura está totalmente obscurecida. A localização da criatura pode ser detectada por qualquer barulho que ela faça ou rastros que deixe. Jogadas de ataque contra a criatura têm desvantagem, e as jogadas de ataque da criatura têm vantagem.",
  paralyzed: "Uma criatura paralisada está incapacitada e não pode se mover ou falar. A criatura falha automaticamente em testes de resistência de Força e Destreza. Jogadas de ataque contra a criatura têm vantagem. Qualquer ataque que acerte a criatura é um acerto crítico se o atacante estiver a até 1,5 metro dela.",
  petrified: "Uma criatura petrificada é transformada, junto com qualquer objeto não mágico que esteja vestindo ou carregando, em uma substância sólida inanimada. Seu peso aumenta por um fator de dez e ela para de envelhecer. A criatura está incapacitada, não pode se mover ou falar e não tem consciência do que acontece ao seu redor. Jogadas de ataque contra a criatura têm vantagem. A criatura falha automaticamente em testes de resistência de Força e Destreza. A criatura tem resistência a todos os tipos de dano. A criatura é imune a veneno e doença, embora um veneno ou doença já em seu sistema seja suspenso, não neutralizado.",
  poisoned: "Uma criatura envenenada tem desvantagem em jogadas de ataque e testes de habilidade.",
  prone: "Uma criatura caída tem como única opção de movimento rastejar, a menos que se levante e encerre a condição. A criatura tem desvantagem em jogadas de ataque. Uma jogada de ataque contra a criatura tem vantagem se o atacante estiver a até 1,5 metro dela. Caso contrário, a jogada de ataque tem desvantagem.",
  restrained: "A velocidade de uma criatura contida se torna 0, e ela não pode se beneficiar de nenhum bônus em sua velocidade. Jogadas de ataque contra a criatura têm vantagem, e as jogadas de ataque da criatura têm desvantagem. A criatura tem desvantagem em testes de resistência de Destreza.",
  stunned: "Uma criatura atordoada está incapacitada, não pode se mover e pode falar apenas com dificuldade. A criatura falha automaticamente em testes de resistência de Força e Destreza. Jogadas de ataque contra a criatura têm vantagem.",
  unconscious: "Uma criatura inconsciente está incapacitada, não pode se mover ou falar e não tem consciência do que acontece ao seu redor. A criatura larga o que estiver segurando e cai em posição de caído. A criatura falha automaticamente em testes de resistência de Força e Destreza. Jogadas de ataque contra a criatura têm vantagem. Qualquer ataque que acerte a criatura é um acerto crítico se o atacante estiver a até 1,5 metro dela.",
};

const CONDITION_DESCRIPTIONS_PT_2024: Record<string, string> = {
  blinded: "Enquanto você tem a condição Cego, você sofre os seguintes efeitos.\nNão Pode Ver. Você não pode ver e falha automaticamente em qualquer teste de habilidade que requeira visão.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem, e suas jogadas de ataque têm Desvantagem.",
  charmed: "Enquanto você tem a condição Encantado, você sofre os seguintes efeitos.\nNão Pode Prejudicar o Encantador. Você não pode atacar o encantador ou alvejá-lo com habilidades prejudiciais ou Efeitos Mágicos.\nVantagem Social. O encantador tem Vantagem em qualquer teste de habilidade para interagir com você socialmente.",
  deafened: "Enquanto você tem a condição Surdo, você sofre o seguinte efeito.\nNão Pode Ouvir. Você não pode ouvir e falha automaticamente em qualquer teste de habilidade que requeira audição.",
  exhaustion: "Enquanto você tem a condição Exaustão, você sofre os seguintes efeitos.\nNíveis de Exaustão. Esta condição é cumulativa. Cada vez que você a recebe, ganha 1 nível de Exaustão. Você morre se seu nível de Exaustão chegar a 6.\nTestes d20 Afetados. Quando você faz um Teste d20, a rolagem é reduzida em 2 vezes seu nível de Exaustão.\nVelocidade Reduzida. Sua Velocidade é reduzida em um número de pés igual a 5 vezes seu nível de Exaustão.\nRemovendo Níveis. Completar um Descanso Longo remove 1 nível de Exaustão.",
  frightened: "Enquanto você tem a condição Amedrontado, você sofre os seguintes efeitos.\nTestes e Ataques Afetados. Você tem Desvantagem em testes de habilidade e jogadas de ataque enquanto a fonte do medo estiver em sua linha de visão.\nNão Pode se Aproximar. Você não pode se mover voluntariamente para mais perto da fonte do medo.",
  grappled: "Enquanto você tem a condição Agarrado, você sofre os seguintes efeitos.\nVelocidade 0. Sua Velocidade é 0 e não pode aumentar.\nAtaques Afetados. Você tem Desvantagem em jogadas de ataque contra qualquer alvo que não seja o agarrador.\nMóvel. O agarrador pode arrastar ou carregar você quando se move, mas cada pé de movimento custa 1 pé extra, a menos que você seja Miúdo ou dois ou mais tamanhos menor.",
  incapacitated: "Enquanto você tem a condição Incapacitado, você sofre os seguintes efeitos.\nInativo. Você não pode realizar nenhuma Ação, Ação Bônus ou Reação.\nSem Concentração. Sua Concentração é quebrada.\nSem Fala. Você não pode falar.\nSurpreso. Se você estiver Incapacitado quando rolar Iniciativa, você tem Desvantagem na rolagem.",
  invisible: "Enquanto você tem a condição Invisível, você sofre os seguintes efeitos.\nSurpresa. Se você estiver Invisível quando rolar Iniciativa, você tem Vantagem na rolagem.\nOculto. Você não é afetado por nenhum efeito que requeira que o alvo seja visto, a menos que o criador do efeito possa de alguma forma vê-lo. Qualquer equipamento que esteja vestindo ou carregando também fica oculto.\nAtaques Afetados. Jogadas de ataque contra você têm Desvantagem, e suas jogadas de ataque têm Vantagem. Se uma criatura puder de alguma forma vê-lo, você não ganha esse benefício contra ela.",
  paralyzed: "Enquanto você tem a condição Paralisado, você sofre os seguintes efeitos.\nIncapacitado. Você tem a condição Incapacitado.\nVelocidade 0. Sua Velocidade é 0 e não pode aumentar.\nTestes de Resistência Afetados. Você falha automaticamente em Testes de Resistência de Força e Destreza.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem.\nAcertos Críticos Automáticos. Qualquer jogada de ataque que acerte você é um Acerto Crítico se o atacante estiver a até 1,5 metro.",
  petrified: "Enquanto você tem a condição Petrificado, você sofre os seguintes efeitos.\nTransformado em Substância Inanimada. Você é transformado, junto com quaisquer objetos não mágicos que esteja vestindo e carregando, em uma substância sólida inanimada (geralmente pedra). Seu peso aumenta por um fator de dez e você para de envelhecer.\nIncapacitado. Você tem a condição Incapacitado.\nVelocidade 0. Sua Velocidade é 0 e não pode aumentar.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem.\nTestes de Resistência Afetados. Você falha automaticamente em Testes de Resistência de Força e Destreza.\nResistência a Dano. Você tem Resistência a todos os tipos de dano.\nImunidade a Veneno. Você tem Imunidade à condição Envenenado.",
  poisoned: "Enquanto você tem a condição Envenenado, você sofre o seguinte efeito.\nTestes e Ataques Afetados. Você tem Desvantagem em jogadas de ataque e testes de habilidade.",
  prone: "Enquanto você tem a condição Caído, você sofre os seguintes efeitos.\nMovimento Restrito. Suas únicas opções de movimento são Rastejar ou gastar uma quantidade de movimento igual a metade da sua Velocidade (arredondado para baixo) para se levantar e encerrar a condição. Se sua Velocidade for 0, você não pode se levantar.\nAtaques Afetados. Você tem Desvantagem em jogadas de ataque. Uma jogada de ataque contra você tem Vantagem se o atacante estiver a até 1,5 metro. Caso contrário, a jogada tem Desvantagem.",
  restrained: "Enquanto você tem a condição Contido, você sofre os seguintes efeitos.\nVelocidade 0. Sua Velocidade é 0 e não pode aumentar.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem, e suas jogadas de ataque têm Desvantagem.\nTestes de Resistência Afetados. Você tem Desvantagem em Testes de Resistência de Destreza.",
  stunned: "Enquanto você tem a condição Atordoado, você sofre os seguintes efeitos.\nIncapacitado. Você tem a condição Incapacitado.\nTestes de Resistência Afetados. Você falha automaticamente em Testes de Resistência de Força e Destreza.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem.",
  unconscious: "Enquanto você tem a condição Inconsciente, você sofre os seguintes efeitos.\nInerte. Você tem as condições Incapacitado e Caído, e larga o que estiver segurando. Quando esta condição termina, você permanece Caído.\nVelocidade 0. Sua Velocidade é 0 e não pode aumentar.\nAtaques Afetados. Jogadas de ataque contra você têm Vantagem.\nTestes de Resistência Afetados. Você falha automaticamente em Testes de Resistência de Força e Destreza.\nAcertos Críticos Automáticos. Qualquer jogada de ataque que acerte você é um Acerto Crítico se o atacante estiver a até 1,5 metro.\nInconsciente. Você não tem consciência do que acontece ao seu redor.",
};

const LABELS = {
  en: {
    title: "D&D 5e Conditions",
    subtitle: "Quick reference for all conditions in D&D 5th Edition",
    all: "All",
    debuff: "Debuff",
    control: "Control",
    movement: "Movement",
    sensory: "Sensory",
    version2014: "2014",
    version2024: "2024",
    exhaustionLevels: "Exhaustion Levels",
    level: "Level",
    effect: "Effect",
    clickToExpand: "Click to expand",
    searchPlaceholder: "Search conditions...",
    langEn: "EN",
    langPt: "PT",
  },
  "pt-BR": {
    title: "Condições D&D 5e",
    subtitle: "Referência rápida de todas as condições do D&D 5ª Edição",
    all: "Todas",
    debuff: "Debuff",
    control: "Controle",
    movement: "Movimento",
    sensory: "Sentidos",
    version2014: "2014",
    version2024: "2024",
    exhaustionLevels: "Níveis de Exaustão",
    level: "Nível",
    effect: "Efeito",
    clickToExpand: "Clique para expandir",
    searchPlaceholder: "Buscar condições...",
    langEn: "EN",
    langPt: "PT",
  },
} as const;

// ── 2014 Exhaustion levels table ──────────────────────────────────
const EXHAUSTION_2014 = {
  en: [
    { level: 1, effect: "Disadvantage on ability checks" },
    { level: 2, effect: "Speed halved" },
    { level: 3, effect: "Disadvantage on attack rolls and saving throws" },
    { level: 4, effect: "Hit point maximum halved" },
    { level: 5, effect: "Speed reduced to 0" },
    { level: 6, effect: "Death" },
  ],
  "pt-BR": [
    { level: 1, effect: "Desvantagem em testes de habilidade" },
    { level: 2, effect: "Velocidade reduzida à metade" },
    { level: 3, effect: "Desvantagem em jogadas de ataque e testes de resistência" },
    { level: 4, effect: "Máximo de pontos de vida reduzido à metade" },
    { level: 5, effect: "Velocidade reduzida a 0" },
    { level: 6, effect: "Morte" },
  ],
};

// ── Color mapping for severity ────────────────────────────────────
function levelColor(level: number): string {
  if (level <= 2) return "text-yellow-400";
  if (level <= 4) return "text-orange-400";
  return "text-red-400";
}

// ── Component ─────────────────────────────────────────────────────
export function PublicConditionsGrid({ conditions, locale = "en" }: PublicConditionsGridProps) {
  const [version, setVersion] = useState<"2014" | "2024">("2024");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [descLang, setDescLang] = useState<"en" | "pt-BR">(locale);
  const L = LABELS[locale];

  // Filter only core conditions (not diseases/statuses)
  const coreConditions = conditions
    .filter((c) => c.category === "condition" && c.ruleset_version === version)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Apply category filter
  const categoryFiltered =
    filter === "all"
      ? coreConditions
      : coreConditions.filter((c) => {
          const baseName = c.name.toLowerCase();
          return CATEGORY_MAP[baseName] === filter;
        });

  // Apply search filter (bilingual — matches EN name, PT name, EN description, or PT description)
  const activePtDescs = version === "2024" ? CONDITION_DESCRIPTIONS_PT_2024 : CONDITION_DESCRIPTIONS_PT_2014;
  const filtered = search.trim()
    ? categoryFiltered.filter((c) => {
        const q = search.toLowerCase();
        const baseName = c.name.toLowerCase();
        const ptName = (CONDITION_NAMES_PT[baseName] ?? "").toLowerCase();
        const ptDesc = (activePtDescs[baseName] ?? "").toLowerCase();
        return (
          baseName.includes(q) ||
          ptName.includes(q) ||
          c.description.toLowerCase().includes(q) ||
          ptDesc.includes(q)
        );
      })
    : categoryFiltered;

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: L.all },
    { key: "debuff", label: L.debuff },
    { key: "control", label: L.control },
    { key: "movement", label: L.movement },
    { key: "sensory", label: L.sensory },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Version toggle + Language toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800">
            <button
              onClick={() => setVersion("2014")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                version === "2014"
                  ? "bg-[#D4A853] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {L.version2014}
            </button>
            <button
              onClick={() => setVersion("2024")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                version === "2024"
                  ? "bg-[#D4A853] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {L.version2024}
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800">
            <button
              onClick={() => setDescLang("en")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                descLang === "en"
                  ? "bg-[#D4A853] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {L.langEn}
            </button>
            <button
              onClick={() => setDescLang("pt-BR")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                descLang === "pt-BR"
                  ? "bg-[#D4A853] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {L.langPt}
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                filter === key
                  ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                  : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={L.searchPlaceholder}
          className="w-full sm:max-w-sm rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-sm text-[#F5F0E8] placeholder-gray-600 focus:outline-none focus:border-[#D4A853]/50 transition-colors"
        />
      </div>

      {/* Conditions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((cond) => {
          const baseName = cond.name.toLowerCase();
          const icon = CONDITION_ICONS[baseName] ?? <SrdIconSkull className="w-6 h-6" />;
          const ptName = CONDITION_NAMES_PT[baseName] ?? cond.name;
          const displayName = descLang === "pt-BR" ? ptName : cond.name;
          const subtitleName = descLang === "pt-BR" ? cond.name : (locale === "pt-BR" ? ptName : null);
          const ptDescs = version === "2024" ? CONDITION_DESCRIPTIONS_PT_2024 : CONDITION_DESCRIPTIONS_PT_2014;
          const displayDescription = descLang === "pt-BR"
            ? (ptDescs[baseName] ?? cond.description)
            : cond.description;
          const isExpanded = expanded === cond.id;
          const cat = CATEGORY_MAP[baseName] ?? "debuff";

          const catColors: Record<CategoryFilter, string> = {
            all: "border-gray-700",
            debuff: "border-red-900/40",
            control: "border-purple-900/40",
            movement: "border-blue-900/40",
            sensory: "border-yellow-900/40",
          };

          return (
            <button
              key={cond.id}
              onClick={() => setExpanded(isExpanded ? null : cond.id)}
              className={`text-left rounded-xl border ${catColors[cat]} bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer ${
                isExpanded ? "ring-1 ring-[#D4A853]/30" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-[#D4A853]" aria-hidden>
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-base">
                    {displayName}
                  </h3>
                  {subtitleName && subtitleName.toLowerCase() !== displayName.toLowerCase() && (
                    <p className="text-xs text-gray-500 italic">{subtitleName}</p>
                  )}
                  <p
                    className={`text-sm text-gray-400 mt-1.5 ${
                      isExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {displayDescription}
                  </p>
                  {!isExpanded && displayDescription.length > 120 && (
                    <span className="text-xs text-[#D4A853] mt-1 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                      {L.clickToExpand}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Exhaustion special section */}
      {(filter === "all" || filter === "debuff") && (
        <div className="mt-8 rounded-xl border border-red-900/30 bg-gray-900/50 p-5">
          <h2 className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-4 flex items-center gap-2">
            <SrdIconSleepZz className="w-5 h-5 text-[#D4A853]" />
            {L.exhaustionLevels}
            <span className="text-xs font-normal text-gray-500 ml-2">{version}</span>
          </h2>

          {version === "2014" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 text-[#D4A853] font-medium w-20">
                    {L.level}
                  </th>
                  <th className="text-left py-2 text-[#D4A853] font-medium">
                    {L.effect}
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXHAUSTION_2014[descLang === "pt-BR" ? "pt-BR" : "en"].map(({ level, effect }) => (
                  <tr key={level} className="border-b border-gray-800/50">
                    <td className={`py-2.5 font-bold ${levelColor(level)}`}>
                      {level}
                    </td>
                    <td className="py-2.5 text-gray-300">{effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <strong className="text-yellow-400">
                  {descLang === "pt-BR" ? "Cumulativo" : "Cumulative"}:
                </strong>{" "}
                {descLang === "pt-BR"
                  ? "Cada vez que você recebe Exaustão, ganha 1 nível."
                  : "Each time you receive Exhaustion, you gain 1 level."}
              </p>
              <p>
                <strong className="text-orange-400">
                  {descLang === "pt-BR" ? "Testes d20" : "D20 Tests"}:
                </strong>{" "}
                {descLang === "pt-BR"
                  ? "Rolagem reduzida em 2 × nível de Exaustão."
                  : "Roll is reduced by 2 × your Exhaustion level."}
              </p>
              <p>
                <strong className="text-orange-400">
                  {descLang === "pt-BR" ? "Velocidade" : "Speed"}:
                </strong>{" "}
                {descLang === "pt-BR"
                  ? "Reduzida em 5 × nível de Exaustão (pés)."
                  : "Reduced by 5 × your Exhaustion level (feet)."}
              </p>
              <p>
                <strong className="text-red-400">
                  {descLang === "pt-BR" ? "Nível 6" : "Level 6"}:
                </strong>{" "}
                {descLang === "pt-BR" ? "Você morre." : "You die."}
              </p>
              <p className="text-gray-500 text-xs">
                {descLang === "pt-BR"
                  ? "Descanso Longo remove 1 nível de Exaustão."
                  : "Finishing a Long Rest removes 1 Exhaustion level."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
