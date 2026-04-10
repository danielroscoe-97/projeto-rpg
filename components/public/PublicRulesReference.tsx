"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RULES_LABELS, SECTION_IDS, type SectionId } from "@/lib/data/rules-labels";

// ── Types ─────────────────────────────────────────────────────────
type Locale = "en" | "pt-BR";

interface PublicRulesReferenceProps {
  locale?: Locale;
}

// ── Icons (SVG inline for zero dependencies) ──────────────────────
function SwordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ── Section icons mapping ─────────────────────────────────────────
const SECTION_ICONS: Record<SectionId, React.FC<{ className?: string }>> = {
  "combat-flow": SwordIcon,
  "making-attacks": TargetIcon,
  "damage-healing": HeartIcon,
  "cover": ShieldIcon,
  "resting": MoonIcon,
  "conditions": AlertIcon,
  "spellcasting": SparklesIcon,
};

// ── Labels ────────────────────────────────────────────────────────
const LABELS = RULES_LABELS;

// ── Rule Card Component ───────────────────────────────────────────
function RuleCard({
  title,
  children,
  highlight,
}: {
  title?: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-l-4 p-4 ${
        highlight
          ? "border-gold bg-gold/[0.06]"
          : "border-gold/40 bg-gray-800/40"
      }`}
    >
      {title && (
        <h4 className="text-sm font-bold text-gold mb-2 uppercase tracking-wider">
          {title}
        </h4>
      )}
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ── Key Value Highlight ───────────────────────────────────────────
function GoldNum({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-gold font-bold tabular-nums">{children}</span>
  );
}

// ── Table Component ───────────────────────────────────────────────
function RulesTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gold/10">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left text-gold font-semibold px-3 py-2 border-b border-gold/20 text-xs uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2.5 ${
                    j === 0 ? "text-gray-200 font-medium" : "text-gray-400"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Combat Turn Flow Visual ───────────────────────────────────────
function CombatTurnVisual({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";
  const steps = [
    {
      label: L ? "Movimento" : "Movement",
      desc: L ? "Até sua velocidade" : "Up to your speed",
      color: "from-blue-500/20 to-blue-600/20",
      border: "border-blue-500/40",
      dot: "bg-blue-500",
    },
    {
      label: L ? "Ação" : "Action",
      desc: L ? "Atacar, conjurar, etc." : "Attack, cast spell, etc.",
      color: "from-red-500/20 to-red-600/20",
      border: "border-red-500/40",
      dot: "bg-red-500",
    },
    {
      label: L ? "Ação Bônus" : "Bonus Action",
      desc: L ? "Se disponível" : "If available",
      color: "from-amber-500/20 to-amber-600/20",
      border: "border-amber-500/40",
      dot: "bg-amber-500",
    },
    {
      label: L ? "Interação Livre" : "Free Interaction",
      desc: L ? "Abrir porta, sacar arma" : "Open door, draw weapon",
      color: "from-emerald-500/20 to-emerald-600/20",
      border: "border-emerald-500/40",
      dot: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
        {L ? "Estrutura do Seu Turno" : "Your Turn Structure"}
      </p>
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-stretch gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-stretch flex-1 min-w-0">
            <div
              className={`flex-1 rounded-lg bg-gradient-to-b ${step.color} border ${step.border} p-3 text-center`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${step.dot}`} />
                <span className="text-gray-200 text-sm font-semibold whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              <p className="text-gray-500 text-xs">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center px-1 text-gray-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Mobile: vertical */}
      <div className="sm:hidden space-y-2">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div
              className={`rounded-lg bg-gradient-to-r ${step.color} border ${step.border} p-3 flex items-center gap-3`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${step.dot} shrink-0`} />
              <div>
                <span className="text-gray-200 text-sm font-semibold">
                  {step.label}
                </span>
                <p className="text-gray-500 text-xs">{step.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5 text-gray-700">
                <ChevronDown className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Death Save Tracker Visual ─────────────────────────────────────
function DeathSaveTracker({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";
  const [successes, setSuccesses] = useState(0);
  const [failures, setFailures] = useState(0);

  const reset = () => {
    setSuccesses(0);
    setFailures(0);
  };

  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
        {L ? "Rastreador de Testes Contra a Morte" : "Death Saving Throw Tracker"}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Successes */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium w-20">
            {L ? "Sucessos" : "Successes"}
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={`s-${n}`}
                onClick={() => setSuccesses(successes >= n ? n - 1 : n)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  n <= successes
                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    : "bg-gray-800 border-gray-600 hover:border-emerald-500/50"
                }`}
                aria-label={`${L ? "Sucesso" : "Success"} ${n}`}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-gray-700" />

        {/* Failures */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium w-20">
            {L ? "Falhas" : "Failures"}
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={`f-${n}`}
                onClick={() => setFailures(failures >= n ? n - 1 : n)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  n <= failures
                    ? "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                    : "bg-gray-800 border-gray-600 hover:border-red-500/50"
                }`}
                aria-label={`${L ? "Falha" : "Failure"} ${n}`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={reset}
          className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Outcome messages */}
      {successes >= 3 && (
        <p className="mt-3 text-emerald-400 text-sm font-semibold animate-pulse">
          {L
            ? "Estabilizado! A criatura não precisa mais fazer testes."
            : "Stabilized! The creature no longer needs to make death saves."}
        </p>
      )}
      {failures >= 3 && (
        <p className="mt-3 text-red-400 text-sm font-semibold animate-pulse">
          {L ? "Morto. A criatura falhou em 3 testes." : "Dead. The creature failed 3 death saving throws."}
        </p>
      )}
    </div>
  );
}

// ── Cover Visual ──────────────────────────────────────────────────
function CoverDiagram({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  const covers = [
    {
      label: L ? "Meia Cobertura" : "Half Cover",
      bonus: "+2 AC, +2 DEX saves",
      example: L ? "Muro baixo, criatura" : "Low wall, creature",
      coverPct: 50,
      color: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
    },
    {
      label: L ? "3/4 de Cobertura" : "Three-Quarters Cover",
      bonus: "+5 AC, +5 DEX saves",
      example: L ? "Portcullis, seteira" : "Portcullis, arrow slit",
      coverPct: 75,
      color: "text-orange-400",
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
    },
    {
      label: L ? "Cobertura Total" : "Full Cover",
      bonus: L ? "Não pode ser alvo" : "Can't be targeted",
      example: L ? "Parede completa" : "Complete wall",
      coverPct: 100,
      color: "text-red-400",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {covers.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border ${c.border} ${c.bg} p-4 text-center`}
        >
          {/* Visual silhouette with cover */}
          <div className="relative w-16 h-24 mx-auto mb-3">
            {/* Person silhouette */}
            <div className="absolute inset-0 flex flex-col items-center justify-end">
              {/* Head */}
              <div className="w-5 h-5 rounded-full bg-gray-400/60 mb-0.5" />
              {/* Body */}
              <div className="w-6 h-8 rounded-t-lg bg-gray-400/40" />
              {/* Legs */}
              <div className="flex gap-0.5">
                <div className="w-2.5 h-5 rounded-b bg-gray-400/30" />
                <div className="w-2.5 h-5 rounded-b bg-gray-400/30" />
              </div>
            </div>
            {/* Cover block */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gray-600/80 rounded-t border-t-2 border-gray-500 transition-all"
              style={{ height: `${c.coverPct}%` }}
            />
          </div>

          <h4 className={`text-sm font-bold ${c.color} mb-1`}>{c.label}</h4>
          <p className="text-gold text-xs font-semibold mb-1">
            {c.bonus}
          </p>
          <p className="text-gray-500 text-xs">{c.example}</p>
        </div>
      ))}
    </div>
  );
}

// ── Collapsible Section ───────────────────────────────────────────
function CollapsibleSection({
  id,
  number,
  title,
  children,
  defaultOpen,
  icon: Icon,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
  defaultOpen: boolean;
  icon: React.FC<{ className?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 py-4 group text-left"
        aria-expanded={isOpen}
        aria-controls={`content-${id}`}
      >
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 text-gold shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-gold/60 text-lg font-bold font-[family-name:var(--font-cinzel)] tabular-nums">
            {number}.
          </span>
          <h2 className="text-lg md:text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] truncate">
            {title}
          </h2>
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        id={`content-${id}`}
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[5000px] opacity-100 pb-8" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pl-0 md:pl-[52px] space-y-4">{children}</div>
      </div>
      <div className="border-b border-gray-800/60" />
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
// ██ SECTION CONTENT COMPONENTS
// ══════════════════════════════════════════════════════════════════

// ── 1. Combat Flow ────────────────────────────────────────────────
function CombatFlowSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <RuleCard
        title={L ? "Iniciativa" : "Initiative"}
        highlight
      >
        <p>
          {L
            ? "No início do combate, cada participante faz um teste de Destreza para determinar a ordem dos turnos. Isso determina a ordem da rodada."
            : "At the start of combat, every participant makes a Dexterity check to determine turn order. This sets the order for the round."}
        </p>
        <p className="mt-2 text-gray-400">
          {L ? "Teste de Iniciativa = " : "Initiative Check = "}
          <GoldNum>d20</GoldNum> + {L ? "modificador de Destreza" : "Dexterity modifier"}
        </p>
      </RuleCard>

      <CombatTurnVisual locale={locale} />

      <RuleCard title={L ? "Seu Turno" : "Your Turn"}>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="text-blue-400 shrink-0">&#9654;</span>
            <span>
              <strong className="text-gray-200">{L ? "Movimento" : "Movement"}:</strong>{" "}
              {L
                ? "Mova até sua velocidade (em qualquer direção). Pode ser dividido antes e depois da ação."
                : "Move up to your speed (in any direction). Can be split before and after your action."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">&#9654;</span>
            <span>
              <strong className="text-gray-200">{L ? "Ação" : "Action"}:</strong>{" "}
              {L
                ? "Atacar, Conjurar uma Magia, Disparada, Esquivar, Desengajar, Ajudar, Esconder-se, Preparar, Procurar, ou Usar um Objeto."
                : "Attack, Cast a Spell, Dash, Dodge, Disengage, Help, Hide, Ready, Search, or Use an Object."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">&#9654;</span>
            <span>
              <strong className="text-gray-200">{L ? "Ação Bônus" : "Bonus Action"}:</strong>{" "}
              {L
                ? "Somente se uma habilidade de classe, magia ou outra característica diz que você pode. Apenas uma por turno."
                : "Only if a class feature, spell, or other ability says you can. Only one per turn."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400 shrink-0">&#9654;</span>
            <span>
              <strong className="text-gray-200">{L ? "Interação com Objetos" : "Object Interaction"}:</strong>{" "}
              {L
                ? "Uma interação gratuita por turno (sacar uma espada, abrir uma porta). Interações adicionais requerem a ação Usar um Objeto."
                : "One free interaction per turn (draw a sword, open a door). Additional interactions require the Use an Object action."}
            </span>
          </li>
        </ul>
      </RuleCard>

      <RuleCard title={L ? "Reações" : "Reactions"}>
        <p>
          {L
            ? "Você tem uma reação por rodada. Ela se recupera no início do seu próximo turno."
            : "You get one reaction per round. It resets at the start of your next turn."}
        </p>
        <ul className="mt-2 space-y-1 text-gray-400">
          <li>
            &#8226;{" "}
            <strong className="text-gray-300">{L ? "Ataque de Oportunidade" : "Opportunity Attack"}:</strong>{" "}
            {L
              ? "Quando uma criatura hostil sai do seu alcance"
              : "When a hostile creature moves out of your reach"}
          </li>
          <li>
            &#8226;{" "}
            <strong className="text-gray-300">{L ? "Ação Preparada" : "Readied Action"}:</strong>{" "}
            {L
              ? "Gatilho definido durante sua ação Preparar"
              : "Trigger defined during your Ready action"}
          </li>
          <li>
            &#8226;{" "}
            <strong className="text-gray-300">{L ? "Magias Específicas" : "Specific Spells"}:</strong>{" "}
            {L
              ? "Shield, counterspell, feather fall, etc."
              : "Shield, counterspell, feather fall, etc."}
          </li>
        </ul>
      </RuleCard>
    </>
  );
}

// ── 2. Making Attacks ─────────────────────────────────────────────
function MakingAttacksSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <RuleCard
        title={L ? "Jogada de Ataque" : "Attack Roll"}
        highlight
      >
        <p className="text-base text-gray-200">
          <GoldNum>d20</GoldNum> +{" "}
          {L ? "modificador de habilidade" : "ability modifier"} +{" "}
          {L ? "bônus de proficiência" : "proficiency bonus"} {L ? "vs" : "vs"}{" "}
          <GoldNum>AC</GoldNum>
        </p>
        <p className="mt-2 text-gray-400">
          {L
            ? "Se o total igualar ou exceder a CA (Classe de Armadura) do alvo, o ataque acerta."
            : "If the total equals or exceeds the target's AC (Armor Class), the attack hits."}
        </p>
      </RuleCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard title={L ? "Corpo a Corpo" : "Melee Attacks"}>
          <ul className="space-y-1">
            <li>&#8226; {L ? "Alcance padrão: " : "Standard reach: "}<GoldNum>{L ? "1,5m" : "5 ft."}</GoldNum></li>
            <li>&#8226; {L ? "Usa Força (ou Destreza com armas acuidade)" : "Uses Strength (or Dexterity with finesse weapons)"}</li>
            <li>&#8226; {L ? "Desarmado: " : "Unarmed strike: "}<GoldNum>1</GoldNum> + {L ? "mod de Força" : "Strength mod"}</li>
          </ul>
        </RuleCard>

        <RuleCard title={L ? "Ataques a Distância" : "Ranged Attacks"}>
          <ul className="space-y-1">
            <li>&#8226; {L ? "Alcance normal / longo (desvantagem)" : "Normal range / long range (disadvantage)"}</li>
            <li>&#8226; {L ? "Usa Destreza" : "Uses Dexterity"}</li>
            <li>
              &#8226;{" "}
              <span className="text-amber-400">
                {L
                  ? "Desvantagem se inimigo hostil estiver a 1,5m"
                  : "Disadvantage if hostile enemy within 5 ft."}
              </span>
            </li>
          </ul>
        </RuleCard>
      </div>

      <RuleCard
        title={L ? "Combate com Duas Armas" : "Two-Weapon Fighting"}
      >
        <ul className="space-y-1">
          <li>
            &#8226;{" "}
            {L
              ? "Ambas as armas devem ter a propriedade Leve"
              : "Both weapons must have the Light property"}
          </li>
          <li>
            &#8226;{" "}
            {L
              ? "Ataque extra como ação bônus"
              : "Extra attack as a bonus action"}
          </li>
          <li>
            &#8226;{" "}
            <span className="text-amber-400">
              {L
                ? "Não adiciona modificador de habilidade ao dano do segundo ataque (exceto se negativo)"
                : "Don't add ability modifier to damage of the second attack (unless negative)"}
            </span>
          </li>
        </ul>
      </RuleCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard title={L ? "Agarrar" : "Grappling"}>
          <p>
            {L
              ? "Substitui um dos ataques. Alvo deve ser no máximo uma categoria maior."
              : "Replaces one of your attacks. Target must be no more than one size larger."}
          </p>
          <p className="mt-2">
            {L ? "Seu " : "Your "}
            <GoldNum>{L ? "Atletismo" : "Athletics"}</GoldNum>{" "}
            {L ? "vs " : "vs target's "}
            <GoldNum>{L ? "Atletismo ou Acrobacia do alvo" : "Athletics or Acrobatics"}</GoldNum>
          </p>
          <p className="mt-1 text-amber-400">
            {L
              ? "Sucesso: velocidade do alvo se torna 0"
              : "Success: target's speed becomes 0"}
          </p>
        </RuleCard>

        <RuleCard title={L ? "Empurrar" : "Shoving"}>
          <p>
            {L
              ? "Substitui um dos ataques. Alvo no máximo uma categoria maior."
              : "Replaces one of your attacks. Target at most one size larger."}
          </p>
          <p className="mt-2">
            {L ? "Seu " : "Your "}
            <GoldNum>{L ? "Atletismo" : "Athletics"}</GoldNum>{" "}
            {L ? "vs " : "vs target's "}
            <GoldNum>{L ? "Atletismo ou Acrobacia do alvo" : "Athletics or Acrobatics"}</GoldNum>
          </p>
          <p className="mt-1 text-amber-400">
            {L
              ? "Sucesso: derruba Caído ou empurra 1,5m"
              : "Success: knock Prone or push 5 ft. away"}
          </p>
        </RuleCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard title={L ? "Acerto Crítico" : "Critical Hit"} highlight>
          <p>
            {L ? "Resultado natural " : "Natural "}
            <GoldNum>20</GoldNum>{" "}
            {L ? "no d20" : "on the d20"}
          </p>
          <p className="mt-1">
            {L
              ? "Dobre todos os dados de dano do ataque (não os modificadores)."
              : "Double all the attack's damage dice (not modifiers)."}
          </p>
          <p className="mt-1 text-gray-400">
            {L ? "Sempre acerta, independente da CA." : "Always hits, regardless of AC."}
          </p>
        </RuleCard>

        <RuleCard title={L ? "Falha Crítica" : "Critical Miss"}>
          <p>
            {L ? "Resultado natural " : "Natural "}
            <GoldNum>1</GoldNum>{" "}
            {L ? "no d20" : "on the d20"}
          </p>
          <p className="mt-1">
            {L
              ? "O ataque erra automaticamente, independente de modificadores ou da CA do alvo."
              : "The attack automatically misses, regardless of any modifiers or the target's AC."}
          </p>
        </RuleCard>
      </div>
    </>
  );
}

// ── 3. Damage & Healing ───────────────────────────────────────────
function DamageHealingSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <RuleCard title={L ? "Jogadas de Dano" : "Damage Rolls"} highlight>
        <p className="text-base text-gray-200">
          {L ? "Dado da arma + modificador de habilidade" : "Weapon die + ability modifier"}
        </p>
        <p className="mt-1 text-gray-400">
          {L
            ? "Dano de magia: conforme descrito na magia (geralmente sem adicionar modificador)"
            : "Spell damage: as described in the spell (usually no modifier added)"}
        </p>
      </RuleCard>

      <RulesTable
        headers={[
          L ? "Tipo" : "Type",
          L ? "Efeito" : "Effect",
          L ? "Exemplo" : "Example",
        ]}
        rows={[
          [
            L ? "Resistência" : "Resistance",
            L ? "Dano / 2 (arredonda para baixo)" : "Damage / 2 (round down)",
            L ? "Tiefling vs dano de fogo" : "Tiefling vs fire damage",
          ],
          [
            L ? "Vulnerabilidade" : "Vulnerability",
            L ? "Dano x 2" : "Damage x 2",
            L ? "Morto-vivo vs dano radiante" : "Undead vs radiant damage",
          ],
          [
            L ? "Imunidade" : "Immunity",
            L ? "0 dano" : "0 damage",
            L ? "Golem vs veneno" : "Golem vs poison",
          ],
        ]}
      />

      <RuleCard title={L ? "Cura" : "Healing"}>
        <p>
          {L
            ? "Cura nunca pode exceder os pontos de vida máximos da criatura. Uma criatura morta não pode recuperar pontos de vida."
            : "Healing can never exceed a creature's hit point maximum. A dead creature can't regain hit points."}
        </p>
      </RuleCard>

      <RuleCard
        title={L ? "Caindo a 0 Pontos de Vida" : "Dropping to 0 Hit Points"}
        highlight
      >
        <p>
          {L
            ? "Se o dano reduz você a 0 PV, você cai inconsciente e começa a fazer testes contra a morte."
            : "If damage reduces you to 0 HP, you fall unconscious and begin making death saving throws."}
        </p>
      </RuleCard>

      <RuleCard
        title={L ? "Testes Contra a Morte" : "Death Saving Throws"}
        highlight
      >
        <ul className="space-y-2">
          <li>
            &#8226;{" "}
            {L ? "Jogue " : "Roll "}
            <GoldNum>d20</GoldNum>
            {L ? " no início de cada turno (sem modificadores)" : " at the start of each turn (no modifiers)"}
          </li>
          <li>
            &#8226;{" "}
            <GoldNum>{L ? "10+" : "10+"}</GoldNum>
            {L ? " = sucesso, " : " = success, "}
            <GoldNum>{L ? "9-" : "9-"}</GoldNum>
            {L ? " = falha" : " = failure"}
          </li>
          <li>
            &#8226; <GoldNum>3</GoldNum>{" "}
            {L ? "sucessos = estabilizado" : "successes = stabilized"}
          </li>
          <li>
            &#8226; <GoldNum>3</GoldNum>{" "}
            {L ? "falhas = morte" : "failures = death"}
          </li>
          <li className="text-emerald-400">
            &#8226;{" "}
            {L ? "Resultado natural " : "Natural "}
            <span className="font-bold">20</span>
            {L ? " = recupera " : " = regain "}
            <span className="font-bold">1 HP</span>
            {L ? " e acorda" : " and wake up"}
          </li>
          <li className="text-red-400">
            &#8226;{" "}
            {L ? "Resultado natural " : "Natural "}
            <span className="font-bold">1</span>
            {L ? " = conta como " : " = counts as "}
            <span className="font-bold">{L ? "2 falhas" : "2 failures"}</span>
          </li>
        </ul>
      </RuleCard>

      <DeathSaveTracker locale={locale} />

      <RuleCard title={L ? "Morte Instantânea" : "Instant Death"}>
        <p className="text-red-400 font-semibold">
          {L
            ? "Se o dano restante após chegar a 0 PV for igual ou maior que o máximo de pontos de vida da criatura, ela morre instantaneamente."
            : "If remaining damage after reaching 0 HP equals or exceeds the creature's hit point maximum, it dies instantly."}
        </p>
        <p className="mt-2 text-gray-400">
          {L ? "Exemplo: um personagem com " : "Example: a character with "}
          <GoldNum>12 HP</GoldNum>
          {L ? " (máximo " : " (max "}
          <GoldNum>20 HP</GoldNum>
          {L ? ") que toma " : ") who takes "}
          <GoldNum>{L ? "32 de dano" : "32 damage"}</GoldNum>
          {L
            ? " morre instantaneamente (20 sobram após chegar a 0, que iguala o máximo de 20)."
            : " dies instantly (20 remaining after reaching 0, which equals the max of 20)."}
        </p>
      </RuleCard>
    </>
  );
}

// ── 4. Cover ──────────────────────────────────────────────────────
function CoverSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <p className="text-gray-400 text-sm">
        {L
          ? "Paredes, árvores, criaturas e outros obstáculos podem fornecer cobertura durante o combate, tornando alvos mais difíceis de acertar."
          : "Walls, trees, creatures, and other obstacles can provide cover during combat, making targets harder to hit."}
      </p>

      <CoverDiagram locale={locale} />

      <RulesTable
        headers={[
          L ? "Cobertura" : "Cover",
          L ? "Bônus de CA" : "AC Bonus",
          L ? "Bônus em Testes de DEX" : "DEX Save Bonus",
          L ? "Exemplos" : "Examples",
        ]}
        rows={[
          [
            L ? "Meia (+2)" : "Half (+2)",
            "+2",
            "+2",
            L ? "Muro baixo, mobília, outra criatura" : "Low wall, furniture, another creature",
          ],
          [
            L ? "3/4 (+5)" : "Three-Quarters (+5)",
            "+5",
            "+5",
            L ? "Portcullis, seteira" : "Portcullis, arrow slit",
          ],
          [
            L ? "Total" : "Full",
            L ? "Não pode ser alvo" : "Can't be targeted",
            "N/A",
            L ? "Parede completa, pilar largo" : "Complete wall, wide pillar",
          ],
        ]}
      />

      <RuleCard>
        <p className="text-gray-400">
          {L
            ? "Um alvo com cobertura total não pode ser alvo direto de um ataque ou magia, embora algumas magias possam incluir um alvo atingindo uma área de efeito."
            : "A target with full cover can't be targeted directly by an attack or spell, although some spells can reach a target by including it in an area of effect."}
        </p>
      </RuleCard>
    </>
  );
}

// ── 5. Resting ────────────────────────────────────────────────────
function RestingSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuleCard title={L ? "Descanso Curto" : "Short Rest"} highlight>
          <p className="text-gray-400 mb-2">
            <GoldNum>{L ? "1+ hora" : "1+ hour"}</GoldNum>
            {L ? " de descanso" : " of downtime"}
          </p>
          <ul className="space-y-1.5">
            <li>
              &#8226;{" "}
              {L
                ? "Gaste Dados de Vida para recuperar PV"
                : "Spend Hit Dice to regain HP"}
            </li>
            <li>
              &#8226;{" "}
              {L ? "Por dado gasto: " : "Per die spent: "}
              <GoldNum>{L ? "dado + mod CON" : "die + CON mod"}</GoldNum>
            </li>
            <li>
              &#8226;{" "}
              {L
                ? "Algumas habilidades de classe se recuperam"
                : "Some class features recharge"}
            </li>
          </ul>
        </RuleCard>

        <RuleCard title={L ? "Descanso Longo" : "Long Rest"} highlight>
          <p className="text-gray-400 mb-2">
            <GoldNum>{L ? "8+ horas" : "8+ hours"}</GoldNum>
            {L ? " (6 sono + 2 atividade leve)" : " (6 sleep + 2 light activity)"}
          </p>
          <ul className="space-y-1.5">
            <li>
              &#8226;{" "}
              {L ? "Recupera todos os pontos de vida" : "Regain all hit points"}
            </li>
            <li>
              &#8226;{" "}
              {L ? "Recupera Dados de Vida gastos (até " : "Regain spent Hit Dice (up to "}
              <GoldNum>{L ? "metade do total" : "half your total"}</GoldNum>)
            </li>
            <li>
              &#8226;{" "}
              {L
                ? "Espaços de magia se recuperam"
                : "Spell slots are restored"}
            </li>
            <li>
              &#8226;{" "}
              {L
                ? "Máximo de 1 descanso longo por 24h"
                : "Max 1 long rest per 24 hours"}
            </li>
          </ul>
        </RuleCard>
      </div>
    </>
  );
}

// ── 6. Conditions ─────────────────────────────────────────────────
function ConditionsSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  const conditions = L
    ? [
        { name: "Cego", brief: "Não pode ver, falha em testes de visão" },
        { name: "Encantado", brief: "Não pode atacar quem encantou" },
        { name: "Surdo", brief: "Não pode ouvir, falha em testes de audição" },
        { name: "Amedrontado", brief: "Desvantagem enquanto a fonte de medo estiver visível" },
        { name: "Agarrado", brief: "Velocidade se torna 0" },
        { name: "Incapacitado", brief: "Não pode realizar ações ou reações" },
        { name: "Invisível", brief: "Impossível de ver sem magia/sentido especial" },
        { name: "Paralisado", brief: "Incapacitado, falha em testes de FOR e DEX" },
        { name: "Petrificado", brief: "Transformado em substância sólida" },
        { name: "Envenenado", brief: "Desvantagem em jogadas de ataque e testes de habilidade" },
        { name: "Caído", brief: "Desvantagem em ataques; ataques corpo a corpo têm vantagem" },
        { name: "Contido", brief: "Velocidade 0, desvantagem em ataques e DEX saves" },
        { name: "Atordoado", brief: "Incapacitado, falha em FOR e DEX saves" },
        { name: "Inconsciente", brief: "Incapacitado, derruba tudo, não percebe arredores" },
        { name: "Exaustão", brief: "6 níveis, efeitos cumulativos, morte no nível 6" },
      ]
    : [
        { name: "Blinded", brief: "Can't see, auto-fails sight checks" },
        { name: "Charmed", brief: "Can't attack the charmer" },
        { name: "Deafened", brief: "Can't hear, auto-fails hearing checks" },
        { name: "Frightened", brief: "Disadvantage while source of fear is visible" },
        { name: "Grappled", brief: "Speed becomes 0" },
        { name: "Incapacitated", brief: "Can't take actions or reactions" },
        { name: "Invisible", brief: "Impossible to see without magic/special sense" },
        { name: "Paralyzed", brief: "Incapacitated, auto-fails STR & DEX saves" },
        { name: "Petrified", brief: "Transformed into solid substance" },
        { name: "Poisoned", brief: "Disadvantage on attack rolls & ability checks" },
        { name: "Prone", brief: "Disadvantage on attacks; melee attacks have advantage" },
        { name: "Restrained", brief: "Speed 0, disadvantage on attacks & DEX saves" },
        { name: "Stunned", brief: "Incapacitated, auto-fails STR & DEX saves" },
        { name: "Unconscious", brief: "Incapacitated, drops everything, unaware" },
        { name: "Exhaustion", brief: "6 levels, cumulative effects, death at level 6" },
      ];

  return (
    <>
      <p className="text-gray-400 text-sm">
        {L
          ? "As 15 condicoes do SRD 5.1. Clique para ver a referencia completa."
          : "The 15 conditions from SRD 5.1. Click to see the full reference."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {conditions.map((c) => (
          <div
            key={c.name}
            className="rounded-lg bg-gray-800/40 border border-gray-700/40 px-3 py-2.5 hover:border-gold/30 transition-colors"
          >
            <span className="text-gray-200 text-sm font-semibold">{c.name}</span>
            <p className="text-gray-500 text-xs mt-0.5">{c.brief}</p>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <Link
          href={L ? "/condicoes" : "/conditions"}
          className="inline-flex items-center gap-1.5 text-gold text-sm font-semibold hover:underline transition-colors"
        >
          {L ? "Ver referência completa de condições" : "View full conditions reference"}{" "}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>
    </>
  );
}

// ── 7. Spellcasting ───────────────────────────────────────────────
function SpellcastingSection({ locale }: { locale: Locale }) {
  const L = locale === "pt-BR";

  return (
    <>
      <RuleCard
        title={L ? "Espaços de Magia" : "Spell Slots"}
        highlight
      >
        <p>
          {L
            ? "Conjurar uma magia de nível 1 ou superior gasta um espaço de magia do nível correspondente (ou superior). Espaços gastos são recuperados após um descanso longo."
            : "Casting a spell of 1st level or higher expends a spell slot of the spell's level (or higher). Expended slots are regained after a long rest."}
        </p>
      </RuleCard>

      <RuleCard title={L ? "Truques" : "Cantrips"}>
        <p>
          {L
            ? "Magias de nível 0. Podem ser conjuradas à vontade, sem gastar espaços de magia. Dominadas e sempre disponíveis."
            : "Level 0 spells. Can be cast at will without expending spell slots. Mastered and always available."}
        </p>
      </RuleCard>

      <RuleCard
        title={L ? "Concentração" : "Concentration"}
        highlight
      >
        <ul className="space-y-2">
          <li>
            &#8226;{" "}
            {L
              ? "Apenas uma magia de concentração ativa por vez"
              : "Only one concentration spell active at a time"}
          </li>
          <li>
            &#8226;{" "}
            {L ? "Ao tomar dano, faça um teste de CON:" : "When you take damage, make a CON save:"}
          </li>
          <li className="pl-4 text-gray-200">
            DC = {L ? "o maior entre " : "the greater of "}
            <GoldNum>10</GoldNum>
            {L ? " ou " : " or "}
            <GoldNum>{L ? "metade do dano" : "half the damage"}</GoldNum>
          </li>
          <li>
            &#8226;{" "}
            {L
              ? "Falha = a magia termina imediatamente"
              : "Failure = the spell ends immediately"}
          </li>
          <li>
            &#8226;{" "}
            {L
              ? "Ser incapacitado ou morto também encerra a concentração"
              : "Being incapacitated or killed also ends concentration"}
          </li>
        </ul>
      </RuleCard>

      <RuleCard title={L ? "Conjuração Ritual" : "Ritual Casting"}>
        <p>
          {L
            ? "Se uma magia tem a tag ritual, pode ser conjurada sem gastar um espaço de magia, adicionando "
            : "If a spell has the ritual tag, it can be cast without expending a spell slot by adding "}
          <GoldNum>{L ? "10 minutos extras" : "10 extra minutes"}</GoldNum>
          {L ? " ao tempo de conjuração." : " to the casting time."}
        </p>
        <p className="mt-1 text-gray-400">
          {L
            ? "A magia não pode ser conjurada em nível superior ao usar conjuração ritual."
            : "The spell can't be cast at a higher level when using ritual casting."}
        </p>
      </RuleCard>

      <RuleCard title={L ? "Componentes" : "Components"}>
        <RulesTable
          headers={[
            L ? "Componente" : "Component",
            L ? "Abreviação" : "Abbreviation",
            L ? "Requer" : "Requires",
          ]}
          rows={[
            [
              L ? "Verbal" : "Verbal",
              "V",
              L ? "Falar palavras místicas em voz audível" : "Speaking mystic words aloud",
            ],
            [
              L ? "Somático" : "Somatic",
              "S",
              L ? "Gestos com uma mão livre" : "Gestures with a free hand",
            ],
            [
              L ? "Material" : "Material",
              "M",
              L
                ? "Itens específicos (ou foco arcano/saco de componentes)"
                : "Specific items (or arcane focus / component pouch)",
            ],
          ]}
        />
      </RuleCard>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// ██ MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export function PublicRulesReference({
  locale = "en",
}: PublicRulesReferenceProps) {
  const L = LABELS[locale];

  // Desktop: detect screen size for default open state
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTocId, setActiveTocId] = useState<SectionId>("combat-flow");

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Intersection observer for TOC highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTocId(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Section renderers
  const SECTION_CONTENT: Record<SectionId, React.ReactNode> = {
    "combat-flow": <CombatFlowSection locale={locale} />,
    "making-attacks": <MakingAttacksSection locale={locale} />,
    "damage-healing": <DamageHealingSection locale={locale} />,
    "cover": <CoverSection locale={locale} />,
    "resting": <RestingSection locale={locale} />,
    "conditions": <ConditionsSection locale={locale} />,
    "spellcasting": <SpellcastingSection locale={locale} />,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-gray-400 mt-2 text-sm max-w-xl mx-auto">
          {L.subtitle}
        </p>
        <p className="text-gray-600 text-xs mt-2">{L.srdNotice}</p>
      </header>

      {/* Layout: sidebar TOC + content */}
      <div className="flex gap-8">
        {/* Sidebar TOC — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
              {L.toc}
            </h3>
            <nav className="space-y-1">
              {SECTION_IDS.map((id, i) => {
                const Icon = SECTION_ICONS[id];
                const isActive = activeTocId === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollToSection(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      isActive
                        ? "bg-gold/10 text-gold font-semibold"
                        : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      <span className="tabular-nums opacity-50 mr-1">
                        {i + 1}.
                      </span>
                      {L.sections[id]}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {SECTION_IDS.map((id, i) => (
            <CollapsibleSection
              key={id}
              id={id}
              number={i + 1}
              title={L.sections[id]}
              icon={SECTION_ICONS[id]}
              defaultOpen={isDesktop}
            >
              {SECTION_CONTENT[id]}
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </div>
  );
}
