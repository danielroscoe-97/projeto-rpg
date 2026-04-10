"use client";

import { useState } from "react";
import { ACTIONS, type ActionEntry } from "@/lib/data/combat-actions";

// ── Types ─────────────────────────────────────────────────────────
type Locale = "en" | "pt-BR";
type RulesetVersion = "2014" | "2024";
type SectionId = "actions" | "bonus" | "reactions" | "other";

interface PublicActionsGridProps {
  locale?: Locale;
}

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Actions in Combat",
    subtitle: "Quick reference for all combat actions in D&D 5th Edition",
    turnStructureTitle: "Your Turn",
    movement: "Movement",
    action: "Action",
    bonusAction: "Bonus Action",
    reaction: "Reaction",
    freeInteraction: "Free Interaction",
    ifAvailable: "if available",
    onTrigger: "on trigger",
    sectionActions: "Actions",
    sectionBonus: "Bonus Actions",
    sectionReactions: "Reactions",
    sectionOther: "Other Activities",
    version2014: "2014",
    version2024: "2024",
    clickToExpand: "Click for full rules",
    keyRule: "Key Rule",
    changedIn2024: "Changed in 2024",
  },
  "pt-BR": {
    title: "Ações em Combate D&D 5e",
    subtitle: "Referência rápida de todas as ações de combate do D&D 5a Edição",
    turnStructureTitle: "Seu Turno",
    movement: "Movimento",
    action: "Ação",
    bonusAction: "Ação Bônus",
    reaction: "Reação",
    freeInteraction: "Interação Livre",
    ifAvailable: "se disponível",
    onTrigger: "ao gatilho",
    sectionActions: "Ações",
    sectionBonus: "Ações Bônus",
    sectionReactions: "Reações",
    sectionOther: "Outras Atividades",
    version2014: "2014",
    version2024: "2024",
    clickToExpand: "Clique para ver as regras completas",
    keyRule: "Regra-Chave",
    changedIn2024: "Alterado em 2024",
  },
} as const;

// ── Section config ────────────────────────────────────────────────
const SECTIONS: { id: SectionId; color: string; borderColor: string; bgHover: string }[] = [
  { id: "actions", color: "#E53E3E", borderColor: "border-l-[#E53E3E]", bgHover: "hover:border-[#E53E3E]/30" },
  { id: "bonus", color: "#D4A853", borderColor: "border-l-gold", bgHover: "hover:border-gold/30" },
  { id: "reactions", color: "#805AD5", borderColor: "border-l-[#805AD5]", bgHover: "hover:border-[#805AD5]/30" },
  { id: "other", color: "#718096", borderColor: "border-l-[#718096]", bgHover: "hover:border-[#718096]/30" },
];

function getSectionLabel(id: SectionId, locale: Locale): string {
  const L = LABELS[locale];
  switch (id) {
    case "actions": return L.sectionActions;
    case "bonus": return L.sectionBonus;
    case "reactions": return L.sectionReactions;
    case "other": return L.sectionOther;
  }
}

// ── Turn Structure Visual ─────────────────────────────────────────
function TurnStructure({ locale }: { locale: Locale }) {
  const L = LABELS[locale];

  const segments = [
    { label: L.movement, color: "bg-blue-500", note: null },
    { label: L.action, color: "bg-[#E53E3E]", note: null },
    { label: L.bonusAction, color: "bg-gold", note: L.ifAvailable },
    { label: L.freeInteraction, color: "bg-gray-500", note: null },
  ];

  const reactionSegment = { label: L.reaction, color: "bg-[#805AD5]", note: L.onTrigger };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-8">
      <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-cinzel)] mb-4">
        {L.turnStructureTitle}
      </h2>

      {/* Main turn bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-600 text-lg font-light">+</span>}
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${seg.color} shrink-0`} />
                <span className="text-sm text-gray-200 font-medium whitespace-nowrap">
                  {seg.label}
                </span>
                {seg.note && (
                  <span className="text-xs text-gray-500 italic">({seg.note})</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reaction (separate, outside of your turn) */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${reactionSegment.color} shrink-0`} />
            <span className="text-sm text-gray-200 font-medium whitespace-nowrap">
              {reactionSegment.label}
            </span>
            <span className="text-xs text-gray-500 italic">({reactionSegment.note})</span>
          </div>
        </div>
      </div>

      {/* Visual bar representation */}
      <div className="mt-4 rounded-lg overflow-hidden h-3 flex" role="presentation">
        <div className="bg-blue-500/70 flex-[3]" title={L.movement} />
        <div className="bg-[#E53E3E]/70 flex-[4]" title={L.action} />
        <div className="bg-gold/70 flex-[2]" title={L.bonusAction} />
        <div className="bg-gray-500/70 flex-[1]" title={L.freeInteraction} />
      </div>
      <div className="flex mt-1 text-[10px] text-gray-600">
        <span className="flex-[3]">{L.movement}</span>
        <span className="flex-[4]">{L.action}</span>
        <span className="flex-[2]">{L.bonusAction}</span>
        <span className="flex-[1]">{L.freeInteraction}</span>
      </div>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────
function ActionCard({
  action,
  locale,
  version,
  sectionColor,
  isExpanded,
  onToggle,
}: {
  action: ActionEntry;
  locale: Locale;
  version: RulesetVersion;
  sectionColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const L = LABELS[locale];

  // Check for version override
  const override = action.versionOverride?.[version];
  const description = override?.description?.[locale] ?? action.description[locale];
  const keyRule = override?.keyRule?.[locale] ?? action.keyRule[locale];
  const fullText = override?.fullText?.[locale] ?? action.fullText[locale];
  const hasOverride = !!action.versionOverride?.[version];

  return (
    <button
      aria-expanded={isExpanded}
      onClick={onToggle}
      className={`text-left rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer border-l-4 ${
        isExpanded ? "ring-1 ring-gold/30" : ""
      }`}
      style={{ borderLeftColor: sectionColor }}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 text-gold" aria-hidden>
          {action.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground font-[family-name:var(--font-cinzel)] text-base">
              {action.name[locale]}
            </h3>
            {hasOverride && version === "2024" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/30">
                {L.changedIn2024}
              </span>
            )}
          </div>
          {locale === "pt-BR" && (
            <p className="text-xs text-gray-500 italic">{action.name.en}</p>
          )}
          <p className={`text-sm text-gray-400 mt-1.5 ${isExpanded ? "" : "line-clamp-2"}`}>
            {description}
          </p>

          {/* Key Rule highlight */}
          <div className="mt-2 rounded-md bg-gray-800/60 border border-gray-700/50 px-3 py-2">
            <p className="text-xs font-semibold text-gold mb-0.5">{L.keyRule}</p>
            <p className="text-xs text-gray-300">{keyRule}</p>
          </div>

          {/* Expanded full text */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {fullText}
              </p>
            </div>
          )}

          {!isExpanded && (
            <span className="text-xs text-gold mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
              {L.clickToExpand}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function PublicActionsGrid({ locale = "en" }: PublicActionsGridProps) {
  const [version, setVersion] = useState<RulesetVersion>("2024");
  const [expanded, setExpanded] = useState<string | null>(null);
  const L = LABELS[locale];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Version toggle */}
      <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800 w-fit">
        <button
          onClick={() => setVersion("2014")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            version === "2014"
              ? "bg-gold text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {L.version2014}
        </button>
        <button
          onClick={() => setVersion("2024")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            version === "2024"
              ? "bg-gold text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {L.version2024}
        </button>
      </div>

      {/* Turn structure visual */}
      <TurnStructure locale={locale} />

      {/* Sections */}
      {SECTIONS.map((section) => {
        const sectionActions = ACTIONS.filter((a) => a.section === section.id);
        if (sectionActions.length === 0) return null;

        return (
          <div key={section.id} className="space-y-3">
            <h2
              className="text-xl font-bold text-foreground font-[family-name:var(--font-cinzel)] flex items-center gap-2"
              style={{ color: section.color }}
            >
              <span
                className="inline-block w-1 h-6 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              {getSectionLabel(section.id, locale)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sectionActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  locale={locale}
                  version={version}
                  sectionColor={section.color}
                  isExpanded={expanded === action.id}
                  onToggle={() =>
                    setExpanded(expanded === action.id ? null : action.id)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
