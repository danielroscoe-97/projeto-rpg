"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Backpack,
  GitFork,
  Wand2,
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
    armor: "Armor",
    weapons: "Weapons",
    tools: "Tools",
    skills: "Skills",
    saves: "Saving Throws",
    showMore: "Show more",
    showLess: "Show less",
  },
  "pt-BR": {
    hitDie: "Dado de Vida",
    primaryAbility: "Habilidade Primária",
    savingThrows: "Salvaguardas",
    armorProf: "Proficiências em Armaduras",
    weaponProf: "Proficiências em Armas",
    spellcasting: "Conjuração",
    spellcastingAbility: "Habilidade de Conjuração",
    yes: "Sim",
    no: "Não",
    none: "Nenhuma",
    toc: "Sumário",
    description: "Descrição",
    quickBuild: "Construção Rápida",
    classTable: "Tabela da Classe",
    classFeatures: "Habilidades de Classe",
    subclasses: "Subclasses",
    startingEquipment: "Equipamento Inicial",
    multiclassing: "Multiclasse",
    multiclassPrereqs: "Pré-requisitos",
    multiclassProf: "Proficiências Obtidas",
    spellcastingSection: "Conjuração",
    ritualCasting: "Conjuração Ritual",
    spellcastingFocus: "Foco de Conjuração",
    cantrips: "Truques",
    srdNote:
      "Esta página contém conteúdo do Systems Reference Document 5.1 (SRD), licenciado sob a Licença Creative Commons Attribution 4.0 Internacional.",
    level: "Nível",
    profBonus: "Bônus Prof.",
    features: "Habilidades",
    cantripsKnown: "Truques Conhecidos",
    spellsKnown: "Magias Conhecidas",
    spellSlots: "Espaços de Magia por Nível",
    showSubclasses: "Mostrar Habilidades de Subclasse",
    hideSubclasses: "Ocultar Habilidades de Subclasse",
    subclassLevel: "Subclasse no Nível",
    viewSubclass: "Ver Subclasse Completa",
    srdSubclass: "SRD",
    proficiencies: "Proficiências",
    overview: "Visão Geral",
    hitPoints: "Pontos de Vida",
    toolProf: "Ferramentas",
    skillChoices: "Perícias",
    armor: "Armaduras",
    weapons: "Armas",
    tools: "Ferramentas",
    skills: "Perícias",
    saves: "Salvaguardas",
    showMore: "Mostrar mais",
    showLess: "Mostrar menos",
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
  children?: { id: string; label: string; level: number }[];
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
  const [currentLocale, setCurrentLocale] = useState(locale);
  const L = LABELS[currentLocale];
  const isPt = currentLocale === "pt-BR";
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
        id: "overview",
        label: L.overview,
        icon: <Shield className="w-4 h-4" />,
      },
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
      children: (cls.class_features ?? []).map((f) => ({
        id: `feature-${slugify(f.name)}`,
        label: isPt ? f.name_pt : f.name,
        level: f.level,
      })),
    });
    if (subclasses.length > 0) {
      items.push({
        id: "subclasses",
        label: isPt ? cls.subclass_name_pt : cls.subclass_name,
        icon: <GitFork className="w-4 h-4" />,
      });
    }
    if (cls.starting_equipment_en) {
      items.push({
        id: "starting-equipment",
        label: L.startingEquipment,
        icon: <Backpack className="w-4 h-4" />,
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
        icon: <Wand2 className="w-4 h-4" />,
      });
    }
    return items;
  }, [cls, L, isPt, subclasses.length]);

  // Intersection Observer for active section highlighting (sections + individual features)
  useEffect(() => {
    // Collect all section IDs + feature sub-item IDs
    const allIds: string[] = [];
    for (const item of tocItems) {
      allIds.push(item.id);
      if (item.children) {
        for (const child of item.children) {
          allIds.push(child.id);
        }
      }
    }
    const elements = allIds
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
    const el = document.getElementById(id);
    if (el) {
      const navbarHeight = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTocOpen(false);
  }, []);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <article className="relative">
      {/* ── EN/PT Language Toggle ─────────────────────────────── */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden">
          <button
            onClick={() => setCurrentLocale("en")}
            className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              !isPt
                ? "bg-gold text-gray-950"
                : "bg-white/[0.04] text-gray-500 hover:text-gray-300"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setCurrentLocale("pt-BR")}
            className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
              isPt
                ? "bg-gold text-gray-950"
                : "bg-white/[0.04] text-gray-500 hover:text-gray-300"
            }`}
          >
            PT
          </button>
        </div>
      </div>

      {/* ── Layout: content + sticky TOC ────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-8">
        {/* ── Main content column ──────────────────────────────── */}
        <div className="space-y-8 min-w-0">
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

          {/* 2. Hit Points & Proficiencies (stat-block style) */}
          <section id="overview" className="scroll-mt-20">
            <StatBlockSection cls={cls} isPt={isPt} L={L} />
          </section>

          {/* 3. Class Description */}
          <section id="description" className="scroll-mt-20">
            <SectionCard>
              <SectionHeader>{L.description}</SectionHeader>
              <GoldDivider />
              <Prose
                text={
                  isPt
                    ? cls.description_full_pt
                    : cls.description_full_en
                }
                dropcap
              />
            </SectionCard>
          </section>

          {/* 4. Quick Build */}
          {cls.quick_build_en && (
            <section id="quick-build" className="scroll-mt-20">
              <SectionCard>
                <button
                  onClick={() => setQuickBuildOpen(!quickBuildOpen)}
                  className="w-full flex items-center justify-between group"
                >
                  <SectionHeader as="span">{L.quickBuild}</SectionHeader>
                  <ChevronDown
                    className={`w-5 h-5 text-gold/60 transition-transform duration-200 ${
                      quickBuildOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    quickBuildOpen
                      ? "max-h-[2000px] opacity-100 mt-2"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <GoldDivider />
                  <Prose
                    text={isPt ? cls.quick_build_pt : cls.quick_build_en}
                  />
                </div>
              </SectionCard>
            </section>
          )}

          {/* 5. Class Table */}
          <section id="class-table" className="scroll-mt-20">
            <SectionCard noPadding>
              <div className="px-6 md:px-8 pt-6 md:pt-8">
                <SectionHeader>{L.classTable}</SectionHeader>
              </div>
              <div className="mt-2 border-t-2 border-gold/30">
                <ClassProgressionTable
                  rows={cls.class_table ?? []}
                  isCaster={isCaster}
                  hasSpellSlots={hasSpellSlots ?? false}
                  maxSlotLevel={maxSlotLevel}
                  extrasColumns={extrasColumns}
                  isPt={isPt}
                  L={L}
                />
              </div>
            </SectionCard>
          </section>

          {/* 6. Class Features */}
          <section id="class-features" className="scroll-mt-20">
            <div className="mb-6">
              <SectionHeader>{L.classFeatures}</SectionHeader>
              <GoldDivider className="mt-2" />
            </div>
            <div className="space-y-4">
              {(cls.class_features ?? []).map((feat, i) => (
                <FeatureCard
                  key={`${feat.name}-${feat.level}-${i}`}
                  feature={feat}
                  isPt={isPt}
                  L={L}
                />
              ))}
            </div>
          </section>

          {/* 7. Subclasses */}
          {subclasses.length > 0 && (
            <section id="subclasses" className="scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <SectionHeader>
                    {isPt ? cls.subclass_name_pt : cls.subclass_name}
                  </SectionHeader>
                  <p className="text-sm text-muted-foreground mt-1">
                    {L.subclassLevel} {cls.subclass_level}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setShowSubclassFeatures(!showSubclassFeatures)
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    showSubclassFeatures
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "bg-transparent border-gold/30 text-gold/70 hover:text-gold hover:border-gold/50 hover:bg-gold/5"
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
            </section>
          )}

          {/* 8. Starting Equipment */}
          {cls.starting_equipment_en && (
            <section id="starting-equipment" className="scroll-mt-20">
              <SectionCard>
                <SectionHeader>{L.startingEquipment}</SectionHeader>
                <GoldDivider />
                <Prose
                  text={
                    isPt
                      ? cls.starting_equipment_pt
                      : cls.starting_equipment_en
                  }
                />
              </SectionCard>
            </section>
          )}

          {/* 9. Multiclassing */}
          {cls.multiclass_prerequisites && (
            <section id="multiclassing" className="scroll-mt-20">
              <SectionCard>
                <SectionHeader>{L.multiclassing}</SectionHeader>
                <GoldDivider />
                <div className="space-y-5 mt-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-2">
                      {L.multiclassPrereqs}
                    </h3>
                    <p className="text-foreground/80 text-base leading-relaxed">
                      {isPt
                        ? cls.multiclass_prerequisites_pt
                        : cls.multiclass_prerequisites}
                    </p>
                  </div>
                  <div
                    className="h-px"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgba(146,38,16,0.3), rgba(201,169,89,0.3), rgba(146,38,16,0.3), transparent)",
                    }}
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-gold uppercase tracking-wider mb-2">
                      {L.multiclassProf}
                    </h3>
                    <p className="text-foreground/80 text-base leading-relaxed">
                      {isPt
                        ? cls.multiclass_proficiencies_pt
                        : cls.multiclass_proficiencies}
                    </p>
                  </div>
                </div>
              </SectionCard>
            </section>
          )}

          {/* 10. Spellcasting */}
          {cls.spellcasting && (
            <section id="spellcasting" className="scroll-mt-20">
              <SectionCard>
                <SectionHeader>{L.spellcastingSection}</SectionHeader>
                <GoldDivider />
                <Prose
                  text={
                    isPt
                      ? cls.spellcasting.description_pt
                      : cls.spellcasting.description_en
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <PropLine
                    label={L.spellcastingAbility}
                    value={cls.spellcasting.ability}
                  />
                  {cls.spellcasting.cantrips !== undefined && (
                    <PropLine
                      label={L.cantrips}
                      value={cls.spellcasting.cantrips ? L.yes : L.no}
                    />
                  )}
                  {cls.spellcasting.ritual_casting !== undefined && (
                    <PropLine
                      label={L.ritualCasting}
                      value={
                        cls.spellcasting.ritual_casting ? L.yes : L.no
                      }
                    />
                  )}
                  {cls.spellcasting.spellcasting_focus && (
                    <PropLine
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
              </SectionCard>
            </section>
          )}

          {/* 11. SRD Attribution */}
          <p className="text-xs text-muted-foreground/60 text-center leading-relaxed px-4 pb-8">
            {L.srdNote}
          </p>
        </div>

        {/* ── Sticky TOC (desktop) ─────────────────────────────── */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20">
            <h2 className="text-[11px] font-semibold text-gold uppercase tracking-[0.15em] mb-4 font-[family-name:var(--font-cinzel)]">
              {L.toc}
            </h2>
            <ul className="space-y-0.5 relative">
              {/* Gold accent line */}
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-white/[0.06]" />
              {tocItems.map((item) => {
                const isActive = activeSection === item.id;
                const hasActiveChild = item.children?.some((c) => activeSection === c.id);
                const isExpanded = isActive || hasActiveChild;
                return (
                  <li key={item.id} className="relative">
                    {/* Gold dot */}
                    <div
                      className={`absolute left-[4px] top-[12px] w-[7px] h-[7px] rounded-full border transition-all duration-200 ${
                        isActive || hasActiveChild
                          ? "bg-gold border-gold shadow-[0_0_6px_rgba(212,168,83,0.4)]"
                          : "bg-surface-primary border-white/[0.15]"
                      }`}
                    />
                    <button
                      onClick={() => scrollTo(item.id)}
                      className={`w-full text-left pl-6 pr-2 py-1.5 rounded-r-md text-[13px] transition-all duration-200 ${
                        isActive || hasActiveChild
                          ? "text-gold font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="truncate block">{item.label}</span>
                    </button>
                    {/* Sub-items for features */}
                    {item.children && item.children.length > 0 && isExpanded && (
                      <ul className="ml-6 mt-0.5 space-y-0 border-l border-white/[0.06] pl-3">
                        {item.children.map((child) => {
                          const isChildActive = activeSection === child.id;
                          return (
                            <li key={child.id}>
                              <button
                                onClick={() => scrollTo(child.id)}
                                className={`w-full text-left py-1 text-[11px] transition-all duration-200 truncate ${
                                  isChildActive
                                    ? "text-gold font-medium"
                                    : "text-muted-foreground/70 hover:text-foreground"
                                }`}
                              >
                                {child.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>

      {/* ── Mobile TOC (floating button + bottom sheet) ──────────── */}
      <div className="lg:hidden">
        <button
          onClick={() => setTocOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-surface-secondary/90 backdrop-blur-md border border-gold/30 text-gold shadow-lg shadow-black/40 hover:shadow-gold-subtle transition-all"
          aria-label={L.toc}
        >
          <ScrollText className="w-5 h-5" />
          <span className="text-sm font-medium">{L.toc}</span>
        </button>

        {/* Bottom sheet overlay */}
        {tocOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setTocOpen(false)}
            />
            <nav className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-gold/20 bg-surface-secondary/95 backdrop-blur-md p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-gold uppercase tracking-wider font-[family-name:var(--font-cinzel)]">
                  {L.toc}
                </h2>
                <button
                  onClick={() => setTocOpen(false)}
                  className="text-gray-500 hover:text-gray-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="space-y-0.5">
                {tocItems.map((item) => {
                  const isActive = activeSection === item.id;
                  const hasActiveChild = item.children?.some((c) => activeSection === c.id);
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollTo(item.id)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all ${
                          isActive || hasActiveChild
                            ? "text-gold bg-gold/10 font-medium"
                            : "text-foreground/70 hover:bg-white/[0.04] hover:text-foreground"
                        }`}
                      >
                        <span className={`${isActive || hasActiveChild ? "text-gold" : "text-muted-foreground"}`}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </button>
                      {item.children && (isActive || hasActiveChild) && (
                        <ul className="ml-10 mt-1 mb-2 space-y-0.5 border-l border-white/[0.06] pl-3">
                          {item.children.map((child) => (
                            <li key={child.id}>
                              <button
                                onClick={() => scrollTo(child.id)}
                                className={`w-full text-left py-1.5 text-xs transition-all truncate ${
                                  activeSection === child.id
                                    ? "text-gold font-medium"
                                    : "text-muted-foreground/70 hover:text-foreground"
                                }`}
                              >
                                {child.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

/** Card with the stat-block texture background */
function SectionCard({
  children,
  noPadding,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-surface-secondary shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_8px_rgba(146,38,16,0.1)] transition-shadow duration-200 ${
        noPadding ? "" : "p-6 md:p-8"
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%231A1A28'/%3E%3Crect width='1' height='1' x='1' y='1' fill='%231e1e2a' fill-opacity='0.4'/%3E%3C/svg%3E")`,
      }}
    >
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
  const className =
    "text-xl md:text-2xl font-bold text-foreground font-[family-name:var(--font-cinzel)] tracking-wide";
  if (as === "span") return <span className={className}>{children}</span>;
  return <h2 className={className}>{children}</h2>;
}

/** The decorative gold/red gradient divider from 5e stat cards */
function GoldDivider({ className: cn }: { className?: string }) {
  return (
    <div
      className={`h-[2px] my-4 ${cn ?? ""}`}
      style={{
        background:
          "linear-gradient(to right, transparent, #922610, #c9a959, #922610, transparent)",
      }}
    />
  );
}

function Prose({ text, dropcap }: { text: string; dropcap?: boolean }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="mt-4 space-y-4 max-w-prose">
      {paragraphs.map((p, i) => {
        const lines = p.split("\n");
        const isList = lines.every(
          (l) => l.startsWith("- ") || l.startsWith("* ") || l.trim() === ""
        );

        if (isList) {
          return (
            <ul
              key={i}
              className="space-y-1.5 text-foreground/80 text-base leading-relaxed ml-4"
            >
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="text-gold mt-1.5 text-xs">&#9670;</span>
                    <span>{l.replace(/^[-*]\s*/, "")}</span>
                  </li>
                ))}
            </ul>
          );
        }

        const isFirstParagraph = i === 0 && dropcap;

        return (
          <p
            key={i}
            className={`text-foreground/80 text-base leading-relaxed ${
              isFirstParagraph ? "first-letter:text-4xl first-letter:font-bold first-letter:text-gold first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-[family-name:var(--font-cinzel)]" : ""
            }`}
          >
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

/** Stat-block style property line */
function PropLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-3">
      <p className="text-[11px] text-gold font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/15 text-gold text-sm font-bold font-mono border border-gold/20 shrink-0">
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
    <div className="relative rounded-xl border border-white/[0.06] bg-surface-secondary overflow-hidden">
      {/* Left gold accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background:
            "linear-gradient(to bottom, var(--accent-gold), #B8903D, var(--accent-gold))",
        }}
      />

      <div className="p-6 md:p-8 pl-8 md:pl-10">
        <div className="flex items-start gap-5">
          {/* Icon with subtle glow */}
          <div className="shrink-0 relative">
            <div className="absolute inset-0 bg-gold/10 rounded-xl blur-xl" />
            <span className="relative text-gold" aria-hidden="true">
              <SrdClassIcon iconName={cls.icon} className="w-14 h-14 md:w-16 md:h-16" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-[family-name:var(--font-cinzel)] leading-tight tracking-wide">
              {displayName}
            </h1>
            {isPt && (
              <p className="text-sm text-muted-foreground italic mt-1">{cls.name}</p>
            )}
            <p className="text-foreground/70 text-lg mt-3 leading-relaxed max-w-prose">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${roleMeta.badge}`}
              >
                {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-surface-primary border border-gold/20 text-sm font-mono text-gold font-bold">
                {cls.hit_die}
              </span>
              {cls.spellcaster && cls.spellcasting_ability && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-900/20 border border-indigo-500/20 text-xs text-indigo-300">
                  <Wand2 className="w-3 h-3" />
                  {cls.spellcasting_ability}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Block Section (Hit Points + Proficiencies) ─────────────────

function StatBlockSection({
  cls,
  isPt,
  L,
}: {
  cls: SrdClassFull;
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  return (
    <SectionCard>
      {/* Hit Points block */}
      {cls.hit_points_en && (
        <>
          <h3 className="text-sm font-bold text-srd-accent uppercase tracking-wider italic">
            {L.hitPoints}
          </h3>
          <div className="mt-2 space-y-1">
            {(isPt ? cls.hit_points_pt : cls.hit_points_en)
              .split("\n")
              .filter((l) => l.trim())
              .map((line, i) => {
                const colonIdx = line.indexOf(":");
                if (colonIdx === -1)
                  return (
                    <p key={i} className="text-foreground/80 text-sm leading-relaxed">
                      {line}
                    </p>
                  );
                const label = line.slice(0, colonIdx + 1);
                const value = line.slice(colonIdx + 1);
                return (
                  <p key={i} className="text-sm leading-relaxed">
                    <span className="font-bold text-foreground">{label}</span>
                    <span className="text-foreground/70">{value}</span>
                  </p>
                );
              })}
          </div>
        </>
      )}

      <GoldDivider />

      {/* Proficiencies block */}
      <h3 className="text-sm font-bold text-srd-accent uppercase tracking-wider italic">
        {L.proficiencies}
      </h3>
      <div className="mt-3 space-y-2">
        <ProfLine
          label={L.armor}
          value={cls.armor_proficiencies === "None" ? L.none : cls.armor_proficiencies}
        />
        <ProfLine label={L.weapons} value={cls.weapon_proficiencies} />
        {cls.tool_proficiencies_en && (
          <ProfLine
            label={L.tools}
            value={isPt ? cls.tool_proficiencies_pt : cls.tool_proficiencies_en}
          />
        )}
        {cls.skill_choices_en && (
          <ProfLine
            label={L.skills}
            value={isPt ? cls.skill_choices_pt : cls.skill_choices_en}
          />
        )}
        <ProfLine label={L.saves} value={cls.saving_throws.join(", ")} />
      </div>

      <GoldDivider />

      {/* Quick stats row */}
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <span className="font-bold text-foreground text-sm">{L.hitDie}: </span>
          <span className="text-gold font-mono font-bold text-sm">{cls.hit_die}</span>
        </div>
        <div>
          <span className="font-bold text-foreground text-sm">{L.primaryAbility}: </span>
          <span className="text-foreground/70 text-sm">{cls.primary_ability}</span>
        </div>
        {cls.spellcaster && (
          <div>
            <span className="font-bold text-foreground text-sm">{L.spellcasting}: </span>
            <span className="text-foreground/70 text-sm">{cls.spellcasting_ability}</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ProfLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-bold text-gold">{label}: </span>
      <span className="text-foreground/70">{value}</span>
    </p>
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
      <p className="text-muted-foreground text-sm p-6 italic">
        No class table data available.
      </p>
    );
  }

  const slotHeaders = SLOT_LEVELS.slice(0, maxSlotLevel);
  const extraKeys = Array.from(extrasColumns.keys());

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr
            className="text-[11px] uppercase tracking-wider"
            style={{
              background:
                "linear-gradient(to right, rgba(212,168,83,0.08), transparent)",
            }}
          >
            <th className="sticky left-0 z-10 px-3 py-3 text-left font-semibold text-gold bg-surface-secondary">
              {L.level}
            </th>
            <th className="px-3 py-3 text-center font-semibold text-gold">
              {L.profBonus}
            </th>
            <th className="px-3 py-3 text-left font-semibold text-gold min-w-[200px]">
              {L.features}
            </th>
            {extraKeys.map((key) => (
              <th
                key={key}
                className="px-3 py-3 text-center font-semibold text-gold whitespace-nowrap"
              >
                {extrasColumns.get(key)}
              </th>
            ))}
            {isCaster &&
              rows.some((r) => r.cantrips_known !== undefined) && (
                <th className="px-3 py-3 text-center font-semibold text-gold whitespace-nowrap">
                  {L.cantripsKnown}
                </th>
              )}
            {isCaster &&
              rows.some((r) => r.spells_known !== undefined) && (
                <th className="px-3 py-3 text-center font-semibold text-gold whitespace-nowrap">
                  {L.spellsKnown}
                </th>
              )}
            {hasSpellSlots &&
              slotHeaders.map((lvl) => (
                <th
                  key={lvl}
                  className="px-2 py-3 text-center font-semibold text-gold whitespace-nowrap"
                >
                  {lvl}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const features = isPt ? row.features_pt : row.features;
            const extras = isPt ? row.extras_pt ?? row.extras : row.extras;
            const isEven = i % 2 === 0;

            return (
              <tr
                key={row.level}
                className={`${
                  isEven ? "bg-transparent" : "bg-white/[0.02]"
                } hover:bg-gold/[0.04] transition-colors border-b border-white/[0.04]`}
              >
                <td className="sticky left-0 z-10 px-3 py-2.5 font-bold text-gold font-mono text-center bg-inherit">
                  {row.level}
                </td>
                <td className="px-3 py-2.5 text-center text-foreground/60 font-mono text-xs">
                  {row.proficiency_bonus || profBonusForLevel(row.level)}
                </td>
                <td className="px-3 py-2.5 text-foreground/80">
                  {features ? (
                    <FeatureLinks features={features} />
                  ) : (
                    <span className="text-white/10">&mdash;</span>
                  )}
                </td>
                {extraKeys.map((key) => (
                  <td
                    key={key}
                    className="px-3 py-2.5 text-center text-foreground/70 font-mono tabular-nums"
                  >
                    {extras?.[key] || (
                      <span className="text-white/10">&mdash;</span>
                    )}
                  </td>
                ))}
                {isCaster &&
                  rows.some((r) => r.cantrips_known !== undefined) && (
                    <td className="px-3 py-2.5 text-center text-foreground/70 font-mono tabular-nums">
                      {row.cantrips_known ?? (
                        <span className="text-white/10">&mdash;</span>
                      )}
                    </td>
                  )}
                {isCaster &&
                  rows.some((r) => r.spells_known !== undefined) && (
                    <td className="px-3 py-2.5 text-center text-foreground/70 font-mono tabular-nums">
                      {row.spells_known ?? (
                        <span className="text-white/10">&mdash;</span>
                      )}
                    </td>
                  )}
                {hasSpellSlots &&
                  slotHeaders.map((lvl) => {
                    const val = row.spell_slots?.[lvl];
                    return (
                      <td
                        key={lvl}
                        className="px-2 py-2.5 text-center font-mono tabular-nums text-foreground/70"
                      >
                        {val ? (
                          val
                        ) : (
                          <span className="text-white/10">&mdash;</span>
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
              className="text-foreground/80 hover:text-gold underline decoration-dotted decoration-gold/30 underline-offset-2 transition-colors"
            >
              {feat}
            </a>
          </span>
        );
      })}
    </span>
  );
}

// ── Feature Card ────────────────────────────────────────────────────

function FeatureCard({
  feature,
  isPt,
  L,
}: {
  feature: ClassFeature;
  isPt: boolean;
  L: (typeof LABELS)["en"];
}) {
  const name = isPt ? feature.name_pt : feature.name;
  const desc = isPt ? feature.description_pt : feature.description_en;
  const slug = slugify(feature.name);
  const isLong = desc.length > 500;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div
      id={`feature-${slug}`}
      className="scroll-mt-20 rounded-lg border border-white/[0.04] bg-surface-secondary/80 hover:border-white/[0.08] transition-all duration-200 overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%231A1A28'/%3E%3Crect width='1' height='1' x='1' y='1' fill='%231e1e2a' fill-opacity='0.3'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <LevelBadge level={feature.level} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gold-light font-[family-name:var(--font-cinzel)] leading-tight">
              {name}
            </h3>
            {isPt && feature.name !== feature.name_pt && (
              <p className="text-xs text-muted-foreground italic mt-0.5">
                {feature.name}
              </p>
            )}
          </div>
        </div>

        {/* Thin divider */}
        <div
          className="h-px mt-3 mb-3"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(146,38,16,0.2), rgba(201,169,89,0.2), rgba(146,38,16,0.2), transparent)",
          }}
        />

        {/* Description with collapse */}
        <div
          className={`relative ${
            !expanded ? "max-h-[120px] overflow-hidden" : ""
          }`}
        >
          <Prose text={desc} />
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-secondary to-transparent" />
          )}
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-gold hover:text-gold-light transition-colors flex items-center gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> {L.showLess}
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> {L.showMore}
              </>
            )}
          </button>
        )}
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
      className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
        sub.is_srd
          ? "border-gold/20 hover:border-gold/30"
          : "border-white/[0.06] hover:border-white/[0.1]"
      } bg-surface-secondary`}
    >
      {/* Gold left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background: sub.is_srd
            ? "linear-gradient(to bottom, var(--accent-gold), #B8903D)"
            : "linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)",
        }}
      />

      <div className="p-5 md:p-6 pl-6 md:pl-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-cinzel)]">
                {name}
              </h3>
              {sub.is_srd && (
                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold/15 text-gold border border-gold/20">
                  {L.srdSubclass}
                </span>
              )}
              {sub.source && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {sub.source}
                </span>
              )}
            </div>
            {isPt && sub.name !== sub.name_pt && (
              <p className="text-xs text-muted-foreground italic mt-0.5">{sub.name}</p>
            )}
          </div>
          <Link
            href={`/classes/${classId}/subclasses/${sub.id}`}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-md hover:bg-gold/10 hover:border-gold/50 transition-all whitespace-nowrap"
          >
            {L.viewSubclass}
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {desc && (
          <p className="text-foreground/60 text-sm mt-3 leading-relaxed line-clamp-3">
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
            <div className="pt-4 space-y-4">
              <GoldDivider />
              {sub.features.map((feat, i) => (
                <FeatureCard
                  key={`${feat.name}-${feat.level}-${i}`}
                  feature={feat}
                  isPt={isPt}
                  L={L}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
