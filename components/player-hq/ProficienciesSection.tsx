"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Shield, BookOpen, Wrench, Globe, Shirt, Swords, ChevronDown, ChevronUp, Check, Star, Pencil } from "lucide-react";
import type { CharacterProficiencies, SkillProficiency } from "@/lib/types/database";
import {
  ABILITY_SCORES,
  SKILLS,
  profBonusForLevel,
  getModifier,
  formatMod,
  type AbilityScore,
} from "@/lib/constants/dnd-skills";

const SAVING_THROWS = ABILITY_SCORES;

// ── Section toggle (used for collapsible groups) ──────────────────
function SectionToggle({
  label,
  icon: Icon,
  count,
  open,
  onToggle,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-gold shrink-0" />
      <span className="text-sm font-semibold text-foreground flex-1">{label}</span>
      {count > 0 && (
        <span className="text-[10px] font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
      {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

// ── Proficiency dot indicator ─────────────────────────────────────
function ProfDot({ level }: { level: SkillProficiency | undefined }) {
  if (level === "expertise") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-gold flex items-center justify-center" title="Expertise">
        <Star className="w-2 h-2 text-background" />
      </div>
    );
  }
  if (level === "proficient") {
    return (
      <div className="w-3.5 h-3.5 rounded-full bg-gold/80 flex items-center justify-center" title="Proficient">
        <Check className="w-2 h-2 text-background" />
      </div>
    );
  }
  return <div className="w-3.5 h-3.5 rounded-full border border-white/10" />;
}

// ── Saving throw row ──────────────────────────────────────────────
function SaveRow({
  ability,
  label,
  mod,
  profBonus,
  isProficient,
  onToggle,
  editing,
}: {
  ability: string;
  label: string;
  mod: number;
  profBonus: number;
  isProficient: boolean;
  onToggle: () => void;
  editing: boolean;
}) {
  const total = mod + (isProficient ? profBonus : 0);
  return (
    <div className="flex items-center gap-2 py-1">
      {editing ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center hover:border-gold/50 transition-colors"
        >
          {isProficient && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
        </button>
      ) : (
        <ProfDot level={isProficient ? "proficient" : undefined} />
      )}
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className={`text-sm font-mono font-semibold ${isProficient ? "text-gold" : "text-muted-foreground"}`}>
        {formatMod(total)}
      </span>
    </div>
  );
}

// ── Skill row ─────────────────────────────────────────────────────
function SkillRow({
  skill,
  label,
  abilityLabel,
  mod,
  profBonus,
  profLevel,
  onCycle,
  editing,
}: {
  skill: string;
  label: string;
  abilityLabel: string;
  mod: number;
  profBonus: number;
  profLevel: SkillProficiency | undefined;
  onCycle: () => void;
  editing: boolean;
}) {
  const bonus = profLevel === "expertise" ? profBonus * 2 : profLevel === "proficient" ? profBonus : 0;
  const total = mod + bonus;

  return (
    <div className="flex items-center gap-2 py-1">
      {editing ? (
        <button
          type="button"
          onClick={onCycle}
          className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center hover:border-gold/50 transition-colors"
          title="Click: none → proficient → expertise → none"
        >
          {profLevel === "expertise" && <Star className="w-2.5 h-2.5 text-gold" />}
          {profLevel === "proficient" && <div className="w-2.5 h-2.5 rounded-full bg-gold" />}
        </button>
      ) : (
        <ProfDot level={profLevel} />
      )}
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className="text-[10px] text-muted-foreground/60 uppercase">{abilityLabel}</span>
      <span className={`text-sm font-mono font-semibold min-w-[28px] text-right ${profLevel ? "text-gold" : "text-muted-foreground"}`}>
        {formatMod(total)}
      </span>
    </div>
  );
}

// ── Tag list (for tools, languages, armor, weapons) ───────────────
function TagList({
  items,
  emptyLabel,
  editing,
  onAdd,
  onRemove,
}: {
  items: string[];
  emptyLabel: string;
  editing: boolean;
  onAdd: (item: string) => void;
  onRemove: (item: string) => void;
}) {
  const [input, setInput] = useState("");

  if (items.length === 0 && !editing) {
    return <p className="text-xs text-muted-foreground/50 italic py-1">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-foreground"
        >
          {item}
          {editing && (
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = input.trim();
            if (v && !items.includes(v)) {
              onAdd(v);
              setInput("");
            }
          }}
          className="inline-flex"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="+ add..."
            className="text-xs px-2 py-1 rounded-md bg-white/[0.02] border border-dashed border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-gold/30 w-24"
          />
        </form>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
interface ProficienciesSectionProps {
  proficiencies: CharacterProficiencies;
  level: number | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  intScore: number | null;
  wis: number | null;
  chaScore: number | null;
  onSave: (updates: { proficiencies: CharacterProficiencies }) => void;
}

export function ProficienciesSection({
  proficiencies,
  level,
  str,
  dex,
  con,
  intScore,
  wis,
  chaScore,
  onSave,
}: ProficienciesSectionProps) {
  const t = useTranslations("player_hq.proficiencies");
  const [editing, setEditing] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    saves: true,
    skills: true,
  });

  const profBonus = profBonusForLevel(level);

  const abilityMods: Record<AbilityScore, number> = {
    str: getModifier(str),
    dex: getModifier(dex),
    con: getModifier(con),
    int: getModifier(intScore),
    wis: getModifier(wis),
    cha: getModifier(chaScore),
  };

  const savingThrows = proficiencies.saving_throws ?? [];
  const skills = proficiencies.skills ?? {};
  const tools = proficiencies.tools ?? [];
  const languages = proficiencies.languages ?? [];
  const armor = proficiencies.armor ?? [];
  const weapons = proficiencies.weapons ?? [];

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const update = useCallback(
    (partial: Partial<CharacterProficiencies>) => {
      onSave({ proficiencies: { ...proficiencies, ...partial } });
    },
    [proficiencies, onSave]
  );

  const toggleSave = (ability: string) => {
    const next = savingThrows.includes(ability)
      ? savingThrows.filter((a) => a !== ability)
      : [...new Set([...savingThrows, ability])];
    update({ saving_throws: next });
  };

  const cycleSkill = (skill: string) => {
    const current = skills[skill];
    let next: SkillProficiency | undefined;
    if (!current) next = "proficient";
    else if (current === "proficient") next = "expertise";
    else next = undefined;

    const newSkills = { ...skills };
    if (next) newSkills[skill] = next;
    else delete newSkills[skill];
    update({ skills: newSkills });
  };

  const addTag = (field: keyof CharacterProficiencies, item: string) => {
    const current = (proficiencies[field] as string[] | undefined) ?? [];
    update({ [field]: [...current, item] });
  };

  const removeTag = (field: keyof CharacterProficiencies, item: string) => {
    const current = (proficiencies[field] as string[] | undefined) ?? [];
    update({ [field]: current.filter((v) => v !== item) });
  };

  const skillCount = Object.keys(skills).length;
  const saveCount = savingThrows.length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          {t("title")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            {t("proficiency_bonus")}: <span className="text-gold font-bold">{formatMod(profBonus)}</span>
          </span>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 text-xs font-medium transition-colors px-3 py-2 rounded-lg ${
              editing
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-muted-foreground hover:text-gold border border-transparent hover:border-gold/20"
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? "Done" : t("edit")}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Saving Throws */}
        <div>
          <SectionToggle
            label={t("saving_throws")}
            icon={Shield}
            count={saveCount}
            open={openSections.saves !== false}
            onToggle={() => toggleSection("saves")}
          />
          {openSections.saves !== false && (
            <div className="pl-2 mt-1">
              {SAVING_THROWS.map((ability) => (
                <SaveRow
                  key={ability}
                  ability={ability}
                  label={t(`${ability}_save`)}
                  mod={abilityMods[ability]}
                  profBonus={profBonus}
                  isProficient={savingThrows.includes(ability)}
                  onToggle={() => toggleSave(ability)}
                  editing={editing}
                />
              ))}
            </div>
          )}
        </div>

        {/* Skills */}
        <div>
          <SectionToggle
            label={t("skills")}
            icon={BookOpen}
            count={skillCount}
            open={openSections.skills !== false}
            onToggle={() => toggleSection("skills")}
          />
          {openSections.skills !== false && (
            <div className="pl-2 mt-1">
              {SKILLS.map(({ key, ability }) => (
                <SkillRow
                  key={key}
                  skill={key}
                  label={t(`skill_${key}`)}
                  abilityLabel={ability.toUpperCase()}
                  mod={abilityMods[ability]}
                  profBonus={profBonus}
                  profLevel={skills[key]}
                  onCycle={() => cycleSkill(key)}
                  editing={editing}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tools */}
        <div>
          <SectionToggle
            label={t("tools")}
            icon={Wrench}
            count={tools.length}
            open={!!openSections.tools}
            onToggle={() => toggleSection("tools")}
          />
          {openSections.tools && (
            <div className="pl-2 mt-1">
              <TagList
                items={tools}
                emptyLabel={t("none_set")}
                editing={editing}
                onAdd={(item) => addTag("tools", item)}
                onRemove={(item) => removeTag("tools", item)}
              />
            </div>
          )}
        </div>

        {/* Languages */}
        <div>
          <SectionToggle
            label={t("languages")}
            icon={Globe}
            count={languages.length}
            open={!!openSections.languages}
            onToggle={() => toggleSection("languages")}
          />
          {openSections.languages && (
            <div className="pl-2 mt-1">
              <TagList
                items={languages}
                emptyLabel={t("none_set")}
                editing={editing}
                onAdd={(item) => addTag("languages", item)}
                onRemove={(item) => removeTag("languages", item)}
              />
            </div>
          )}
        </div>

        {/* Armor */}
        <div>
          <SectionToggle
            label={t("armor")}
            icon={Shirt}
            count={armor.length}
            open={!!openSections.armor}
            onToggle={() => toggleSection("armor")}
          />
          {openSections.armor && (
            <div className="pl-2 mt-1">
              <TagList
                items={armor}
                emptyLabel={t("none_set")}
                editing={editing}
                onAdd={(item) => addTag("armor", item)}
                onRemove={(item) => removeTag("armor", item)}
              />
            </div>
          )}
        </div>

        {/* Weapons */}
        <div>
          <SectionToggle
            label={t("weapons")}
            icon={Swords}
            count={weapons.length}
            open={!!openSections.weapons}
            onToggle={() => toggleSection("weapons")}
          />
          {openSections.weapons && (
            <div className="pl-2 mt-1">
              <TagList
                items={weapons}
                emptyLabel={t("none_set")}
                editing={editing}
                onAdd={(item) => addTag("weapons", item)}
                onRemove={(item) => removeTag("weapons", item)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
