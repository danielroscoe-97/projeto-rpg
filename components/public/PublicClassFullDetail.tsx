"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  List,
  BookOpen,
  Sparkles,
  Swords,
  Shield,
  ScrollText,
  X,
} from "lucide-react";
import type {
  SrdClassFull,
  SubclassEntry,
  ClassFeature,
  ClassTableRow,
} from "@/lib/types/srd-class";
import { SrdClassIcon } from "./SrdIcons";

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function profBonusForLevel(level: number): string {
  if (level <= 4) return "+2";
  if (level <= 8) return "+3";
  if (level <= 12) return "+4";
  if (level <= 16) return "+5";
  return "+6";
}

// ── Role badge styling ──────────────────────────────────────────────

const ROLE_BADGE: Record<
  SrdClassFull["role"],
  { badge: string; label: string; labelPt: string }
> = {
  martial: {
    badge: "bg-red-900/30 text-red-300 border-red-500/30",
    label: "Martial",
    labelPt: "Marcial",
  },
  caster: {
    badge: "bg-blue-900/30 text-blue-300 border-blue-500/30",
    label: "Full Caster",
    labelPt: "Conjurador",
  },
  "half-caster": {
    badge: "bg-purple-900/30 text-purple-300 border-purple-500/30",
    label: "Half-Caster",
    labelPt: "Semi-Conjurador",
  },
  support: {
    badge: "bg-green-900/30 text-green-300 border-green-500/30",
    label: "Support",
    labelPt: "Suporte",
  },
};

// ── Labels ──────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  en: {
    hitDie: "Hit Die",
    primaryAbility: "Primary Ability",
    savingThrows: "Saving Throws",
    armorProf: "Armor Proficiencies",
    weaponProf: "Weapon Proficiencies",
    spellcasting: "Spellcasting",
    spellcastingAbility: "Spellcasting Ability",
    yes: "Yes",
    no: "No",
    none: "None",
    toc: "Contents",
    description: "Description",
    quickBuild: "Quick Build",
    classTable: "Class Table",
    classFeatures: "Class Features",
    subclasses: "Subclasses",
    startingEquipment: "Starting Equipment",
    multiclassing: "Multiclassing",
    multiclassPrereqs: "Prerequisites",
    multiclassProf: "Proficiencies Gained",
    spellcastingSection: "Spellcasting",
    ritualCasting: "Ritual Casting",
    spellcastingFocus: "Spellcasting Focus",
    cantrips: "Cantrips",
    srdNote:
      "This page contains content from the Systems Reference Document 5.1 (SRD), licensed under the Creative Commons Attribution 4.0 International License.",
    level: "Level",
    profBonus: "Prof. Bonus",
    features: "Features",
    cantripsKnown: "Cantrips Known",
    spellsKnown: "Spells Known",
    spellSlots: "Spell Slots per Level",
    showSubclasses: "Show Subclass Features",
    hideSubclasses: "Hide Subclass Features",
    subclassLevel: "Subclass at Level",
    viewSubclass: "View Full Subclass",
    srdSubclass: "SRD",
    proficiencies: "Proficiencies",
    overview: "Overview",
    hitPoints: "Hit Points",
    toolProf: "Tool Proficiencies",
    skillChoices: "Skills",
  },
  "pt-BR": {
    hitDie: "Dado de Vida",
    primaryAbility: "Habilidade Primaria",
    savingThrows: "Salvaguardas",
    armorProf: "Proficiencias em Armaduras",
    weaponProf: "Proficiencias em Armas",
    spellcasting: "Conjuracao",
    spellcastingAbility: "Habilidade de Conjuracao",
    yes: "Sim",
    no: "Nao",
    none: "Nenhuma",
    toc: "Sumario",
    description: "Descricao",
    quickBuild: "Construcao Rapida",
    classTable: "Tabela da Classe",
    classFeatures: "Habilidades de Classe",
    subclasses: "Subclasses",
    startingEquipment: "Equipamento Inicial",
    multiclassing: "Multiclasse",
    multiclassPrereqs: "Pre-requisitos",
    multiclassProf: "Proficiencias Obtidas",
    spellcastingSection: "Conjuracao",
    ritualCasting: "Conjuracao Ritual",
    spellcastingFocus: "Foco de Conjuracao",
    cantrips: "Truques",
    srdNote:
      "Esta pagina contem conteudo do Systems Reference Document 5.1 (SRD), licenciado sob a Licenca Creative Commons Attribution 4.0 Internacional.",
    level: "Nivel",
    profBonus: "Bonus Prof.",
    features: "Habilidades",
    cantripsKnown: "Truques Conhecidos",
    spellsKnown: "Magias Conhecidas",
    spellSlots: "Espacos de Magia por Nivel",
    showSubclasses: "Mostrar Habilidades de Subclasse",
    hideSubclasses: "Ocultar Habilidades de Subclasse",
    subclassLevel: "Subclasse no Nivel",
    viewSubclass: "Ver Subclasse Completa",
    srdSubclass: "SRD",
    proficiencies: "Proficiencias",
    overview: "Visao Geral",
    hitPoints: "Pontos de Vida",
    toolProf: "Ferramentas",
    skillChoices: "Pericias",
  },
};

// ── Spell slot column headers ───────────────────────────────────────

const SLOT_LEVELS = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
] as const;

// ── Section definitions for TOC ─────────────────────────────────────

interface TocItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ── Component ───────────────────────────────────────────────────────

interface Props {
  cls: SrdClassFull;
  subclasses: SubclassEntry[];
  locale?: "en" | "pt-BR";
}

export function PublicClassFullDetail({
  cls,
  subclasses,
  locale = "en",
}: Props) {
  const L = LABELS[locale];
  const isPt = locale === "pt-BR";
  const roleMeta = ROLE_BADGE[cls.role];
  const displayName = isPt ? cls.name_pt : cls.name;
  const description = isPt ? cls.description_pt : cls.description_en;
  const roleLabel = isPt ? roleMeta.labelPt : roleMeta.label;

  // Interactive state
  const [showSubclassFeatures, setShowSubclassFeatures] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [quickBuildOpen, setQuickBuildOpen] = useState(false);

  // Determine caster columns
  const isCaster = cls.spellcaster;
  const hasSpellSlots = cls.class_table?.some(
    (r) => r.spell_slots && Object.keys(r.spell_slots).length > 0
  );
  const maxSlotLevel = useMemo(() => {
    if (!hasSpellSlots) return 0;
    let max = 0;
    for (const row of cls.class_table ?? []) {
      if (row.spell_slots) {
        for (const key of Object.keys(row.spell_slots)) {
          const idx = SLOT_LEVELS.indexOf(key as (typeof SLOT_LEVELS)[number]);
          if (idx >= 0 && idx + 1 > max) max = idx + 1;
        }
      }
    }
    return max;
  }, [cls.class_table, hasSpellSlots]);

  // Extras columns from the table
  const extrasColumns = useMemo(() => {
    const cols = new Map<string, string>();
    for (const row of cls.class_table ?? []) {
      const extras = isPt ? row.extras_pt ?? row.extras : row.extras;
      if (extras) {
        for (const key of Object.keys(extras)) {
          if (!cols.has(key)) {
            cols.set(key, formatExtraHeader(key));
          }
        }
      }
    }
    return cols;
  }, [cls.class_table, isPt]);

  // Build TOC items
  const tocItems: TocItem[] = useMemo(() => {
    const items: TocItem[] = [
      {
        id: "description",
        label: L.description,
        icon: <BookOpen className="w-4 h-4" />,
      },
    ];
    if (cls.quick_build_en) {
      items.push({
        id: "quick-build",
        label: L.quickBuild,
        icon: <Sparkles className="w-4 h-4" />,
      });
    }
    items.push({
      id: "class-table",
      label: L.classTable,
      icon: <List className="w-4 h-4" />,
    });
    items.push({
      id: "class-features",
      label: L.classFeatures,
      icon: <Swords className="w-4 h-4" />,
    });
    if (subclasses.length > 0) {
      items.push({
        id: "subclasses",
        label: isPt ? cls.subclass_name_pt : cls.subclass_name,
        icon: <Shield className="w-4 h-4" />,
      });
    }
    if (cls.starting_equipment_en) {
      items.push({
        id: "starting-equipment",
        label: L.startingEquipment,
        icon: <Shield className="w-4 h-4" />,
      });
    }
    if (cls.multiclass_prerequisites) {
      items.push({
        id: "multiclassing",
        label: L.multiclassing,
        icon: <Swords className="w-4 h-4" />,
      });
    }
    if (cls.spellcasting) {
      items.push({
        id: "spellcasting",
        label: L.spellcastingSection,
        icon: <Sparkles className="w-4 h-4" />,
      });
    }
    return items;
  }, [cls, L, isPt, subclasses.length]);

  // Intersection Observer for active section highlighting
  useEffect(() => {
    const ids = tocItems.map((t) => t.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [tocItems]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <article className="relative">
      {/* ── Layout: content + sticky TOC ────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-8">
        {/* ── Main content column ──────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          {/* 1. Hero Section */}
          <HeroSection
            cls={cls}
            displayName={displayName}
            description={description}
            roleLabel={roleLabel}
            roleMeta={roleMeta}
            isPt={isPt}
            L={L}
          />

          {/* 2. Overview Stats */}
          <OverviewSection cls={cls} isPt={isPt} L={L} />

          {/* 3. Class Description */}
          <section id="description" className="scroll-mt-20">
            <Card>
              <SectionHeader>{L.description}</SectionHeader>
              <Prose
                text={
                  isPt
                    ? cls.description_full_pt
                    : cls.description_full_en
                }
              />
            </Card>
          </section>

          {/* 4. Quick Build */}
          {cls.quick_build_en && (
            <section id="quick-build" className="scroll-mt-20">
              <Card>
                <button
                  onClick={() => setQuickBuildOpen(!quickBuildOpen)}
                  className="w-full flex items-center justify-between group"
                >
                  <SectionHeader as="span">{L.quickBuild}</SectionHeader>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      quickBuildOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    quickBuildOpen
                      ? "max-h-[2000px] opacity-100 mt-4"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <Prose
                    text={isPt ? cls.quick_build_pt : cls.quick_build_en}
                  />
                </div>
              </Card>
            </section>
          )}

          {/* 5. Class Table */}
          <section id="class-table" className="scroll-mt-20">
            <Card>
              <SectionHeader>{L.classTable}</SectionHeader>
              <ClassProgressionTable
                rows={cls.class_table ?? []}
                isCaster={isCaster}
                hasSpellSlots={hasSpellSlots ?? false}
                maxSlotLevel={maxSlotLevel}
                extrasColumns={extrasColumns}
                isPt={isPt}
                L={L}
              />
            </Card>
          </section>

          {/* 6. Class Features */}
          <section id="class-features" className="scroll-mt-20">
            <Card>
              <SectionHeader>{L.classFeatures}</SectionHeader>
              <div className="space-y-8 mt-6">
                {(cls.class_features ?? []).map((feat, i) => (
                  <FeatureBlock
                    key={`${feat.name}-${feat.level}-${i}`}
                    feature={feat}
                    isPt={isPt}
                    showDivider={i > 0}
                  />
                ))}
              </div>
            </Card>
          </section>

          {/* 7. Subclasses */}
          {subclasses.length > 0 && (
            <section id="subclasses" className="scroll-mt-20">
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <div>
                    <SectionHeader as="span">
                      {isPt ? cls.subclass_name_pt : cls.subclass_name}
                    </SectionHeader>
                    <p className="text-sm text-gray-500 mt-1">
                      {L.subclassLevel} {cls.subclass_level}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setShowSubclassFeatures(!showSubclassFeatures)
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      showSubclassFeatures
                        ? "bg-[#D4A853]/10 border-[#D4A853]/30 text-[#D4A853]"
                        : "bg-gray-800/60 border-white/[0.06] text-gray-400 hover:text-gray-200 hover:border-white/10"
                    }`}
                  >
                    {showSubclassFeatures ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        {L.hideSubclasses}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        {L.showSubclasses}
                      </>
                    )}
                  </button>
                </div>

                <div className="grid gap-4">
                  {subclasses.map((sub) => (
                    <SubclassCard
                      key={sub.id}
                      sub={sub}
                      classId={cls.id}
                      isPt={isPt}
                      showFeatures={showSubclassFeatures}
                      L={L}
                    />
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* 8. Starting Equipment */}
          {cls.starting_equipment_en && (
            <section id="starting-equipment" className="scroll-mt-20">
              <Card>
                <SectionHeader>{L.startingEquipment}</SectionHeader>
                <Prose
                  text={
                    isPt
                      ? cls.starting_equipment_pt
                      : cls.starting_equipment_en
                  }
                />
              </Card>
            </section>
          )}

          {/* 9. Multiclassing */}
          {cls.multiclass_prerequisites && (
            <section id="multiclassing" className="scroll-mt-20">
              <Card>
                <SectionHeader>{L.multiclassing}</SectionHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#D4A853] mb-1">
                      {L.multiclassPrereqs}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {isPt
                        ? cls.multiclass_prerequisites_pt
                        : cls.multiclass_prerequisites}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#D4A853] mb-1">
                      {L.multiclassProf}
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {isPt
                        ? cls.multiclass_proficiencies_pt
                        : cls.multiclass_proficiencies}
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* 10. Spellcasting */}
          {cls.spellcasting && (
            <section id="spellcasting" className="scroll-mt-20">
              <Card>
                <SectionHeader>{L.spellcastingSection}</SectionHeader>
                <Prose
                  text={
                    isPt
                      ? cls.spellcasting.description_pt
                      : cls.spellcasting.description_en
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  <MiniStat
                    label={L.spellcastingAbility}
                    value={cls.spellcasting.ability}
                  />
                  {cls.spellcasting.cantrips !== undefined && (
                    <MiniStat
                      label={L.cantrips}
                      value={cls.spellcasting.cantrips ? L.yes : L.no}
                    />
                  )}
                  {cls.spellcasting.ritual_casting !== undefined && (
                    <MiniStat
                      label={L.ritualCasting}
                      value={
                        cls.spellcasting.ritual_casting ? L.yes : L.no
                      }
                    />
                  )}
                  {cls.spellcasting.spellcasting_focus && (
                    <MiniStat
                      label={L.spellcastingFocus}
                      value={
                        isPt
                          ? cls.spellcasting.spellcasting_focus_pt ??
                            cls.spellcasting.spellcasting_focus
                          : cls.spellcasting.spellcasting_focus
                      }
                    />
                  )}
                </div>
              </Card>
            </section>
          )}

          {/* 11. SRD Attribution */}
          <p className="text-xs text-gray-600 text-center leading-relaxed px-4 pb-8">
            {L.srdNote}
          </p>
        </div>

        {/* ── Sticky TOC (desktop) ─────────────────────────────── */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 rounded-xl border border-white/[0.06] bg-gray-900/60 p-4">
            <h2 className="text-sm font-semibold text-[#D4A853] uppercase tracking-wider mb-3 font-[family-name:var(--font-cinzel)]">
              {L.toc}
            </h2>
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollTo(item.id)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      activeSection === item.id
                        ? "text-[#D4A853] bg-[#D4A853]/10"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>

      {/* ── Mobile TOC (floating button + drawer) ──────────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setTocOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gray-800 border border-[#D4A853]/30 text-[#D4A853] shadow-lg shadow-black/40 hover:bg-gray-700 transition-colors"
          aria-label={L.toc}
        >
          <ScrollText className="w-5 h-5" />
          <span className="text-sm font-medium">{L.toc}</span>
        </button>

        {/* Drawer overlay */}
        {tocOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setTocOpen(false)}
            />
            <nav className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-white/[0.06] bg-gray-900 p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#D4A853] uppercase tracking-wider font-[family-name:var(--font-cinzel)]">
                  {L.toc}
                </h2>
                <button
                  onClick={() => setTocOpen(false)}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollTo(item.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        activeSection === item.id
                          ? "text-[#D4A853] bg-[#D4A853]/10"
                          : "text-gray-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
      {children}
    </div>
  );
}

function SectionHeader({
  children,
  as = "h2",
}: {
  children: React.ReactNode;
  as?: "h2" | "span";
}) {
  const cls =
    "text-xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)]";
  if (as === "span") return <span className={cls}>{children}</span>;
  return <h2 className={cls}>{children}</h2>;
}

function Prose({ text }: { text: string }) {
  if (!text) return null;
  // Split on double newlines for paragraphs, single newlines for line breaks
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="mt-4 space-y-4 max-w-prose">
      {paragraphs.map((p, i) => {
        // Check if this is a bullet list
        const lines = p.split("\n");
        const isList = lines.every(
          (l) => l.startsWith("- ") || l.startsWith("* ") || l.trim() === ""
        );

        if (isList) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 text-gray-300 text-sm leading-relaxed">
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{l.replace(/^[-*]\s*/, "")}</li>
                ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-gray-300 text-sm leading-relaxed">
            {p.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-800/50 border border-white/[0.04] p-3">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-200">{value}</p>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#D4A853]/15 text-[#D4A853] text-xs font-semibold tabular-nums min-w-[2rem]">
      {level}
    </span>
  );
}

// ── Hero Section ────────────────────────────────────────────────────

function HeroSection({
  cls,
  displayName,
  description,
  roleLabel,
  roleMeta,
  isPt,
  L,
}: {
  cls: SrdClassFull;
  displayName: string;
  description: string;
  roleLabel: string;
  roleMeta: { badge: string };
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gray-900/60 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span className="shrink-0 text-[#D4A853]" aria-hidden="true">
          <SrdClassIcon iconName={cls.icon} className="w-12 h-12" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] leading-tight">
            {displayName}
          </h1>
          {isPt && (
            <p className="text-sm text-gray-500 italic mt-0.5">{cls.name}</p>
          )}
          <p className="text-gray-400 text-lg mt-2">{description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span
              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.badge}`}
            >
              {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-sm font-mono text-[#D4A853]">
              {cls.hit_die}
            </span>
            {cls.spellcaster && cls.spellcasting_ability && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-900/30 border border-indigo-500/20 text-xs text-indigo-300">
                {L.spellcasting}: {cls.spellcasting_ability}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Overview Section ────────────────────────────────────────────────

function OverviewSection({
  cls,
  isPt,
  L,
}: {
  cls: SrdClassFull;
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  return (
    <Card>
      <SectionHeader>{L.overview}</SectionHeader>

      {/* Hit Points block */}
      {cls.hit_points_en && (
        <div className="mt-4 mb-5 rounded-lg bg-gray-800/50 border border-white/[0.04] p-4">
          <h3 className="text-sm font-semibold text-[#D4A853] mb-2">{L.hitPoints}</h3>
          <p className="text-gray-300 text-sm whitespace-pre-line">
            {isPt ? cls.hit_points_pt : cls.hit_points_en}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <MiniStat label={L.hitDie} value={cls.hit_die} />
        <MiniStat label={L.primaryAbility} value={cls.primary_ability} />
        <MiniStat label={L.savingThrows} value={cls.saving_throws.join(", ")} />
        <MiniStat
          label={L.armorProf}
          value={cls.armor_proficiencies === "None" ? L.none : cls.armor_proficiencies}
        />
        <MiniStat label={L.weaponProf} value={cls.weapon_proficiencies} />
        {cls.tool_proficiencies_en && (
          <MiniStat
            label={L.toolProf}
            value={isPt ? cls.tool_proficiencies_pt : cls.tool_proficiencies_en}
          />
        )}
        {cls.skill_choices_en && (
          <MiniStat
            label={L.skillChoices}
            value={isPt ? cls.skill_choices_pt : cls.skill_choices_en}
          />
        )}
        <MiniStat
          label={L.spellcasting}
          value={
            cls.spellcaster
              ? `${L.yes} (${cls.spellcasting_ability})`
              : L.no
          }
        />
      </div>
    </Card>
  );
}

// ── Class Progression Table ─────────────────────────────────────────

function ClassProgressionTable({
  rows,
  isCaster,
  hasSpellSlots,
  maxSlotLevel,
  extrasColumns,
  isPt,
  L,
}: {
  rows: ClassTableRow[];
  isCaster: boolean;
  hasSpellSlots: boolean;
  maxSlotLevel: number;
  extrasColumns: Map<string, string>;
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm mt-4 italic">
        No class table data available.
      </p>
    );
  }

  const slotHeaders = SLOT_LEVELS.slice(0, maxSlotLevel);
  const extraKeys = Array.from(extrasColumns.keys());

  return (
    <div className="mt-4 -mx-6 md:-mx-8 overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-gray-800 text-[#D4A853] text-xs uppercase tracking-wider">
            <th className="sticky left-0 z-10 bg-gray-800 px-3 py-2.5 text-left font-semibold">
              {L.level}
            </th>
            <th className="px-3 py-2.5 text-center font-semibold">
              {L.profBonus}
            </th>
            <th className="px-3 py-2.5 text-left font-semibold min-w-[180px]">
              {L.features}
            </th>
            {/* Class-specific extras */}
            {extraKeys.map((key) => (
              <th
                key={key}
                className="px-3 py-2.5 text-center font-semibold whitespace-nowrap"
              >
                {extrasColumns.get(key)}
              </th>
            ))}
            {/* Cantrips Known */}
            {isCaster &&
              rows.some((r) => r.cantrips_known !== undefined) && (
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                  {L.cantripsKnown}
                </th>
              )}
            {/* Spells Known */}
            {isCaster &&
              rows.some((r) => r.spells_known !== undefined) && (
                <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                  {L.spellsKnown}
                </th>
              )}
            {/* Spell Slot columns */}
            {hasSpellSlots &&
              slotHeaders.map((lvl) => (
                <th
                  key={lvl}
                  className="px-2 py-2.5 text-center font-semibold whitespace-nowrap"
                >
                  {lvl}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((row, i) => {
            const features = isPt ? row.features_pt : row.features;
            const extras = isPt ? row.extras_pt ?? row.extras : row.extras;
            const isEven = i % 2 === 0;

            return (
              <tr
                key={row.level}
                className={`${
                  isEven ? "bg-transparent" : "bg-white/[0.02]"
                } hover:bg-white/[0.04] transition-colors`}
              >
                <td className="sticky left-0 z-10 px-3 py-2.5 font-semibold text-gray-200 tabular-nums bg-inherit">
                  {row.level}
                </td>
                <td className="px-3 py-2.5 text-center text-[#D4A853] font-mono text-xs">
                  {row.proficiency_bonus || profBonusForLevel(row.level)}
                </td>
                <td className="px-3 py-2.5 text-gray-300">
                  {features ? (
                    <FeatureLinks features={features} />
                  ) : (
                    <span className="text-gray-600">&mdash;</span>
                  )}
                </td>
                {/* Extras */}
                {extraKeys.map((key) => (
                  <td
                    key={key}
                    className="px-3 py-2.5 text-center text-gray-300 tabular-nums"
                  >
                    {extras?.[key] || (
                      <span className="text-gray-600">&mdash;</span>
                    )}
                  </td>
                ))}
                {/* Cantrips Known */}
                {isCaster &&
                  rows.some((r) => r.cantrips_known !== undefined) && (
                    <td className="px-3 py-2.5 text-center text-gray-300 tabular-nums">
                      {row.cantrips_known ?? (
                        <span className="text-gray-600">&mdash;</span>
                      )}
                    </td>
                  )}
                {/* Spells Known */}
                {isCaster &&
                  rows.some((r) => r.spells_known !== undefined) && (
                    <td className="px-3 py-2.5 text-center text-gray-300 tabular-nums">
                      {row.spells_known ?? (
                        <span className="text-gray-600">&mdash;</span>
                      )}
                    </td>
                  )}
                {/* Spell Slots */}
                {hasSpellSlots &&
                  slotHeaders.map((lvl) => {
                    const val = row.spell_slots?.[lvl];
                    return (
                      <td
                        key={lvl}
                        className="px-2 py-2.5 text-center tabular-nums text-gray-300"
                      >
                        {val ? (
                          val
                        ) : (
                          <span className="text-gray-600">&mdash;</span>
                        )}
                      </td>
                    );
                  })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Turns "rage_damage" into "Rage Damage" */
function formatExtraHeader(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Renders comma-separated features as anchor links */
function FeatureLinks({ features }: { features: string }) {
  const parts = features.split(",").map((f) => f.trim());
  return (
    <span className="text-sm">
      {parts.map((feat, i) => {
        const slug = slugify(feat);
        return (
          <span key={i}>
            {i > 0 && ", "}
            <a
              href={`#feature-${slug}`}
              className="text-gray-300 hover:text-[#D4A853] underline decoration-dotted underline-offset-2 transition-colors"
            >
              {feat}
            </a>
          </span>
        );
      })}
    </span>
  );
}

// ── Feature Block ───────────────────────────────────────────────────

function FeatureBlock({
  feature,
  isPt,
  showDivider,
}: {
  feature: ClassFeature;
  isPt: boolean;
  showDivider: boolean;
}) {
  const name = isPt ? feature.name_pt : feature.name;
  const desc = isPt ? feature.description_pt : feature.description_en;
  const slug = slugify(feature.name);

  return (
    <div id={`feature-${slug}`} className="scroll-mt-20">
      {showDivider && (
        <div className="border-t border-white/[0.06] mb-8" />
      )}
      <div className="flex items-start gap-3">
        <LevelBadge level={feature.level} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
            {name}
          </h3>
          {isPt && feature.name !== feature.name_pt && (
            <p className="text-xs text-gray-500 italic">{feature.name}</p>
          )}
          <Prose text={desc} />
        </div>
      </div>
    </div>
  );
}

// ── Subclass Card ───────────────────────────────────────────────────

function SubclassCard({
  sub,
  classId,
  isPt,
  showFeatures,
  L,
}: {
  sub: SubclassEntry;
  classId: string;
  isPt: boolean;
  showFeatures: boolean;
  L: (typeof LABELS)["en"];
}) {
  const name = isPt ? sub.name_pt : sub.name;
  const desc = isPt ? sub.description_pt : sub.description_en;

  return (
    <div
      className={`rounded-xl border transition-colors duration-200 ${
        sub.is_srd
          ? "border-[#D4A853]/20 bg-gradient-to-r from-[#D4A853]/[0.04] to-gray-900/60"
          : "border-white/[0.06] bg-gray-900/40"
      } p-5 md:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)]">
              {name}
            </h3>
            {sub.is_srd && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#D4A853]/15 text-[#D4A853] border border-[#D4A853]/20">
                {L.srdSubclass}
              </span>
            )}
          </div>
          {isPt && sub.name !== sub.name_pt && (
            <p className="text-xs text-gray-500 italic mt-0.5">{sub.name}</p>
          )}
          {sub.source && (
            <p className="text-xs text-gray-600 mt-0.5">{sub.source}</p>
          )}
        </div>
        <Link
          href={`/classes/${classId}/subclasses/${sub.id}`}
          className="shrink-0 text-xs text-gray-500 hover:text-[#D4A853] underline decoration-dotted underline-offset-2 transition-colors whitespace-nowrap"
        >
          {L.viewSubclass} <ChevronRight className="w-3 h-3 inline" />
        </Link>
      </div>

      {desc && (
        <p className="text-gray-400 text-sm mt-2 leading-relaxed line-clamp-3">
          {desc}
        </p>
      )}

      {/* Expandable features */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          showFeatures && sub.features?.length > 0
            ? "max-h-[5000px] opacity-100 mt-4"
            : "max-h-0 opacity-0"
        }`}
      >
        {sub.features?.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4 space-y-6">
            {sub.features.map((feat, i) => (
              <FeatureBlock
                key={`${feat.name}-${feat.level}-${i}`}
                feature={feat}
                isPt={isPt}
                showDivider={i > 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
